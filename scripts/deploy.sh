#!/bin/bash
# Script de automatización para despliegue del sistema TeXML
# Uso: ./deploy.sh [environment] [percentage]
#   environment: dev, staging, production
#   percentage: porcentaje de tráfico (solo para producción)

set -e  # Detener en caso de error

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

# Configuración
HEROKU_APP_DEV="telnyx-bot-dev"
HEROKU_APP_STAGING="telnyx-bot-staging"
HEROKU_APP_PROD="telnyx-bot-75769bef3a18"
GIT_BRANCH_DEV="feature/texml-migration"
GIT_BRANCH_STAGING="staging"
GIT_BRANCH_PROD="main"
TELNYX_API_URL="https://api.telnyx.com/v2"
LOG_DIR="./deployment-logs"

# Verificar parámetros
if [ $# -lt 1 ]; then
  echo -e "${RED}Error: Debe especificar el entorno (dev, staging, production)${NC}"
  echo "Uso: ./deploy.sh [environment] [percentage]"
  exit 1
fi

# Obtener parámetros
ENVIRONMENT=$1
TRAFFIC_PERCENTAGE=${2:-0}  # Valor por defecto 0%

# Crear directorio para logs
mkdir -p $LOG_DIR

# Nombre del archivo de log
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/deploy_${ENVIRONMENT}_${TIMESTAMP}.log"

# Función para logging
log() {
  echo -e "$1"
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" >> $LOG_FILE
}

# Función para verificar requisitos
check_requirements() {
  log "${YELLOW}Verificando requisitos...${NC}"
  
  # Verificar Heroku CLI
  if ! command -v heroku &> /dev/null; then
    log "${RED}Heroku CLI no encontrado. Por favor instale Heroku CLI.${NC}"
    exit 1
  fi
  
  # Verificar Git
  if ! command -v git &> /dev/null; then
    log "${RED}Git no encontrado. Por favor instale Git.${NC}"
    exit 1
  }
  
  # Verificar que el usuario está autenticado en Heroku
  if ! heroku auth:whoami &> /dev/null; then
    log "${RED}No autenticado en Heroku. Ejecute 'heroku login' primero.${NC}"
    exit 1
  fi
  
  # Verificar jq para procesar JSON
  if ! command -v jq &> /dev/null; then
    log "${RED}jq no encontrado. Por favor instale jq para procesar respuestas JSON.${NC}"
    exit 1
  fi
  
  log "${GREEN}Todos los requisitos cumplidos.${NC}"
}

# Función para seleccionar la aplicación y rama correcta
select_app_and_branch() {
  case $ENVIRONMENT in
    dev)
      APP_NAME=$HEROKU_APP_DEV
      GIT_BRANCH=$GIT_BRANCH_DEV
      ;;
    staging)
      APP_NAME=$HEROKU_APP_STAGING
      GIT_BRANCH=$GIT_BRANCH_STAGING
      ;;
    production)
      APP_NAME=$HEROKU_APP_PROD
      GIT_BRANCH=$GIT_BRANCH_PROD
      
      # Verificar porcentaje de tráfico para producción
      if [ $TRAFFIC_PERCENTAGE -lt 0 ] || [ $TRAFFIC_PERCENTAGE -gt 100 ]; then
        log "${RED}Error: El porcentaje de tráfico debe estar entre 0 y 100${NC}"
        exit 1
      fi
      ;;
    *)
      log "${RED}Error: Entorno desconocido. Use dev, staging o production.${NC}"
      exit 1
      ;;
  esac
  
  log "${YELLOW}Seleccionado: App=${APP_NAME}, Branch=${GIT_BRANCH}${NC}"
}

# Función para realizar backup antes del despliegue
backup_before_deploy() {
  log "${YELLOW}Realizando backup antes del despliegue...${NC}"
  
  # Crear directorio para backup
  BACKUP_DIR="./backups/${ENVIRONMENT}_${TIMESTAMP}"
  mkdir -p $BACKUP_DIR
  
  # Descargar variables de entorno
  heroku config -a $APP_NAME -j > "$BACKUP_DIR/env_vars.json"
  
  # Guardar información actual de la aplicación
  heroku apps:info -a $APP_NAME > "$BACKUP_DIR/app_info.txt"
  
  # Guardar logs recientes
  heroku logs -a $APP_NAME -n 1000 > "$BACKUP_DIR/recent_logs.txt"
  
  log "${GREEN}Backup completado en $BACKUP_DIR${NC}"
}

# Función para desplegar en Heroku
deploy_to_heroku() {
  log "${YELLOW}Iniciando despliegue en Heroku...${NC}"
  
  # Guardar rama actual
  CURRENT_BRANCH=$(git branch --show-current)
  
  # Asegurar que tenemos la última versión
  git fetch
  
  # Cambiar a la rama correcta
  git checkout $GIT_BRANCH
  git pull origin $GIT_BRANCH
  
  # Desplegar a Heroku
  log "Desplegando $GIT_BRANCH a $APP_NAME..."
  git push heroku $GIT_BRANCH:main
  
  # Verificar despliegue
  DEPLOY_STATUS=$?
  if [ $DEPLOY_STATUS -eq 0 ]; then
    log "${GREEN}Despliegue exitoso a $APP_NAME${NC}"
  else
    log "${RED}Error en el despliegue a $APP_NAME${NC}"
    git checkout $CURRENT_BRANCH
    exit 1
  fi
  
  # Volver a la rama original
  git checkout $CURRENT_BRANCH
}

# Función para verificar salud después del despliegue
check_health() {
  log "${YELLOW}Verificando salud de la aplicación...${NC}"
  
  # Esperar a que la aplicación esté lista
  sleep 10
  
  # Verificar endpoint de salud
  HEALTH_CHECK_URL=$(heroku apps:info -a $APP_NAME | grep "Web URL" | awk '{print $3}')
  HEALTH_CHECK_URL="${HEALTH_CHECK_URL}health"
  
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
  
  if [ $HTTP_STATUS -eq 200 ]; then
    log "${GREEN}Verificación de salud exitosa: $HTTP_STATUS${NC}"
    
    # Obtener más detalles
    curl -s $HEALTH_CHECK_URL | jq . >> $LOG_FILE
  else
    log "${RED}Error en verificación de salud: $HTTP_STATUS${NC}"
    log "${RED}La aplicación podría no estar funcionando correctamente.${NC}"
  fi
}

# Función para configurar tráfico en Telnyx (solo para producción)
configure_telnyx_traffic() {
  if [ "$ENVIRONMENT" != "production" ]; then
    log "${YELLOW}Omitiendo configuración de tráfico para entorno $ENVIRONMENT${NC}"
    return
  fi
  
  if [ -z "$TELNYX_API_KEY" ]; then
    log "${RED}Error: La variable TELNYX_API_KEY no está configurada${NC}"
    log "${YELLOW}La configuración de tráfico debe realizarse manualmente${NC}"
    return
  fi
  
  log "${YELLOW}Configurando distribución de tráfico en Telnyx: $TRAFFIC_PERCENTAGE%${NC}"
  
  # Esta es una simulación, la implementación real dependerá de la API específica de Telnyx
  # y de cómo está configurado el enrutamiento de llamadas
  
  # Ejemplo de llamada a API de Telnyx (ajustar según documentación real)
  curl -X PATCH "$TELNYX_API_URL/call_control_applications/$TELNYX_CONNECTION_ID" \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"traffic_distribution\": {\"new_system\": $TRAFFIC_PERCENTAGE, \"legacy_system\": $((100-$TRAFFIC_PERCENTAGE))}}" \
    >> $LOG_FILE 2>&1
  
  log "${GREEN}Configuración de tráfico completada${NC}"
}

# Función para escalar la aplicación según el entorno
scale_application() {
  log "${YELLOW}Configurando escala de la aplicación...${NC}"
  
  case $ENVIRONMENT in
    dev)
      # Escala mínima para desarrollo
      heroku ps:scale web=1 -a $APP_NAME
      ;;
    staging)
      # Escala para pruebas de carga
      heroku ps:scale web=2 -a $APP_NAME
      ;;
    production)
      # Escala según el porcentaje de tráfico
      if [ $TRAFFIC_PERCENTAGE -le 10 ]; then
        DYNOS=2
      elif [ $TRAFFIC_PERCENTAGE -le 25 ]; then
        DYNOS=3
      elif [ $TRAFFIC_PERCENTAGE -le 50 ]; then
        DYNOS=4
      elif [ $TRAFFIC_PERCENTAGE -le 75 ]; then
        DYNOS=5
      else
        DYNOS=6
      fi
      
      heroku ps:scale web=$DYNOS -a $APP_NAME
      ;;
  esac
  
  log "${GREEN}Aplicación escalada correctamente${NC}"
}

# Función para notificar el resultado del despliegue
notify_deployment() {
  DEPLOY_STATUS=$1
  
  log "${YELLOW}Enviando notificación de despliegue...${NC}"
  
  # Construir mensaje
  if [ $DEPLOY_STATUS -eq 0 ]; then
    STATUS_TEXT="exitoso"
    COLOR="#36a64f"  # Verde
  else
    STATUS_TEXT="fallido"
    COLOR="#ff0000"  # Rojo
  fi
  
  MESSAGE="Despliegue $STATUS_TEXT a $ENVIRONMENT ($APP_NAME)\n"
  MESSAGE+="Rama: $GIT_BRANCH\n"
  
  if [ "$ENVIRONMENT" == "production" ]; then
    MESSAGE+="Tráfico: $TRAFFIC_PERCENTAGE%\n"
  fi
  
  MESSAGE+="Fecha: $(date +"%Y-%m-%d %H:%M:%S")\n"
  MESSAGE+="Detalles completos en: $LOG_FILE"
  
  # Enviar a Slack (si está configurado)
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"$MESSAGE\", \"color\":\"$COLOR\"}" \
      $SLACK_WEBHOOK_URL
  fi
  
  # Mostrar mensaje en consola
  echo -e "\n${GREEN}=========== RESUMEN DEL DESPLIEGUE ===========${NC}"
  echo -e $MESSAGE
  echo -e "${GREEN}==============================================${NC}"
}

# Función principal
main() {
  log "${GREEN}Iniciando despliegue a $ENVIRONMENT${NC}"
  
  if [ "$ENVIRONMENT" == "production" ]; then
    log "${YELLOW}Porcentaje de tráfico: $TRAFFIC_PERCENTAGE%${NC}"
  fi
  
  # Ejecutar pasos del despliegue
  check_requirements
  select_app_and_branch
  backup_before_deploy
  deploy_to_heroku
  check_health
  scale_application
  
  if [ "$ENVIRONMENT" == "production" ]; then
    configure_telnyx_traffic
  fi
  
  # Notificar resultado
  notify_deployment 0
  
  log "${GREEN}Despliegue completado exitosamente${NC}"
}

# Ejecutar función principal
main