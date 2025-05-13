# TeXML Bot IVR - Sistema de Consulta de Expedientes

[![Railway Status](https://img.shields.io/badge/Railway-Deployed-success)](https://telnyx-bot-production.up.railway.app)
[![Telnyx](https://img.shields.io/badge/Telnyx-API-blue)](https://developers.telnyx.com/docs/api/v2/call-control/TeXML)
[![Redis](https://img.shields.io/badge/Redis-Cache-red)](https://redis.io/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green)](https://nodejs.org/)

## 📋 Descripción

Sistema IVR (Respuesta de Voz Interactiva) para consulta de expedientes y cotización de servicios utilizando Telnyx TeXML. El proyecto permite a los usuarios interactuar vía telefónica para:

- Consultar expedientes existentes mediante DTMF (marcación por tonos)
- Obtener información detallada como: datos generales, costos, unidad operativa, ubicación y tiempos
- Realizar cotizaciones de servicios mediante voz (con integración OpenAI)
- Transferir llamadas a agentes humanos

## 🏗️ Arquitectura

El sistema está construido con las siguientes tecnologías:

- **Backend**: Node.js + Express
- **Telefonía**: Telnyx TeXML API
- **Almacenamiento**: Redis para caché y sesiones
- **IA**: OpenAI para procesamiento de voz (opcional)
- **Infraestructura**: Railway para hosting y servicios

![Arquitectura](/docs/architecture.png)

## 🚀 Instalación

### Prerrequisitos

- Node.js v18+ y npm
- Redis (opcional para desarrollo local)
- Cuenta Telnyx con número de teléfono
- Cuenta Railway (para producción)

### Pasos de instalación

1. Clonar el repositorio
   ```bash
   git clone https://github.com/tu-usuario/telnyx-bot.git
   cd telnyx-bot
   ```

2. Instalar dependencias
   ```bash
   npm install
   ```

3. Configurar variables de entorno (ver sección de configuración)
   ```bash
   cp .env.example .env
   # Editar archivo .env con tus credenciales
   ```

4. Iniciar Redis (opcional para desarrollo)
   ```bash
   npm run redis:start
   ```

5. Iniciar la aplicación en modo desarrollo
   ```bash
   npm run dev
   ```

## ⚙️ Configuración

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# API y Base URL
API_BASE_URL=https://tu-api.com/api

# Telnyx
TELNYX_API_KEY=KEY0123456789
TELNYX_CONNECTION_ID=1234567890
TELNYX_CALLER_ID=+12345678901
TELNYX_PHONE_NUMBER=+12345678901
TELNYX_PUBLIC_KEY=AbCdEfGhIjKlMnOp
TELNYX_OUTBOUND_VOICE_PROFILE_ID=1234567890

# Redis
REDIS_URL=redis://localhost:6379

# Transferencia
TRANSFER_ENABLED=true
AGENT_NUMBER="+12345678901,+12345678902"

# OpenAI (opcional)
OPENAI_API_KEY=sk-abcdefg123456
OPENAI_ASSISTANT_ID=asst_abcdefg123456
OPENAI_TIMEOUT=30000
```

### Configuración para Railway

Para desplegar en Railway, configura las siguientes variables:

- `REDIS_URL`: URL completa de conexión a Redis (por ejemplo: `redis://default:password@switchyard.proxy.rlwy.net:port`)
- `NODE_ENV`: Establecer como `production`
- `BASE_URL`: URL de tu aplicación en Railway

## 🔧 Uso y Funcionalidades

### Menú Principal
```
1. Seguimiento a expediente
2. Cotizar un servicio
```

### Funcionalidades principales

#### 1. Consulta de Expedientes

- Consulta por número de expediente
- Información detallada basada en estatus del expediente
- Menú contextual adaptado al estatus
- Caché para expedientes frecuentes
- Opciones de transferencia a agentes

#### 2. Cotización de Servicios

- Captura de coordenadas mediante voz
- Procesamiento con IA para extraer información
- Cotización automática basada en distancia
- Confirmación y seguimiento

### Especificaciones técnicas

- **Sistema de caché**: Optimizado para rendimiento con TTL de 30 minutos
- **Monitoreo**: Sistema completo de métricas y logs
- **Manejo de errores**: Detección y recuperación automática
- **Seguridad**: Enmascaramiento de credenciales en logs

## 📂 Estructura del Proyecto

```
telnyx-bot/
├── src/
│   ├── config/            # Configuración del sistema
│   ├── controllers/       # Controladores de rutas
│   ├── routes/            # Definición de rutas Express
│   ├── services/          # Servicios y lógica de negocio
│   │   ├── ai/            # Servicios de IA (OpenAI)
│   │   ├── ivr/           # Servicios relacionados con IVR
│   │   ├── speech/        # Servicios de reconocimiento de voz
│   │   ├── telnyxService.js  # Servicio de Telnyx API
│   │   ├── redisService.js   # Servicio de Redis
│   ├── texml/             # Helpers para generación TeXML
│   ├── utils/             # Utilidades
├── texmlServer.js         # Punto de entrada principal
├── test/                  # Pruebas
├── scripts/               # Scripts de utilidad
├── .env                   # Variables de entorno (local)
├── .env.test              # Variables para pruebas
└── package.json           # Dependencias y scripts
```

## 🧪 Pruebas

### Ejecución de pruebas

```bash
# Todas las pruebas
npm test

# Pruebas unitarias
npm run test:unit

# Pruebas de integración
npm run test:integration

# Cobertura
npm run test:coverage
```

### Simulación de llamadas

Para probar el sistema sin realizar llamadas reales:

```bash
npm run simulate
```

## 🌐 Deployment

### Railway

1. Conecta tu repositorio a Railway
2. Configura las variables de entorno requeridas
3. Railway detectará automáticamente la aplicación Node.js
4. Asegúrate de crear un servicio Redis en Railway
5. Vincula ambos servicios configurando la variable `REDIS_URL` correctamente

### Conexión Redis en Railway

Para garantizar la correcta conexión con Redis en Railway:

1. Usa la URL pública de Redis proporcionada por Railway
2. Configura la variable `REDIS_URL` con el formato: `redis://default:password@switchyard.proxy.rlwy.net:port`
3. No uses referencias de variables (`${{Redis.REDIS_URL}}`) ya que pueden no resolverse correctamente

## ⚠️ Solución de problemas comunes

### Problemas de conexión a Redis

Si tienes problemas conectando a Redis en Railway:

1. Verifica que estás usando la URL pública completa y correcta
2. Confirma que la contraseña en la URL es la correcta
3. Asegúrate de que el puerto en la URL sea el correcto
4. Revisa los logs para mensajes de error específicos

### Problemas con las llamadas Telnyx

1. Verifica que el TELNYX_CONNECTION_ID esté configurado correctamente
2. Confirma que el número de teléfono está activado para TeXML
3. Asegúrate de que la URL de callback apunte a tu servicio desplegado

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Contacto

Para soporte o consultas, contacta al equipo de desarrollo.