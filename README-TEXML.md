# Sistema IVR basado en TeXML

## 📌 Descripción
Sistema de respuesta de voz interactiva (IVR) implementado con la arquitectura TeXML de Telnyx y Node.js. Este sistema permite consultar información de expedientes mediante comandos de voz o tonos DTMF (teclas del teléfono), proporcionando una experiencia optimizada, robusta y con baja latencia.

---

## 🚀 Características Principales

- **Arquitectura TeXML nativa** - Respuestas XML directamente procesadas por Telnyx
- **Reconocimiento de voz** - Interacción mediante comandos de voz o teclas
- **Consulta unificada** - Obtención de todos los datos en una sola operación
- **Sistema de caché** - Almacenamiento temporal de datos para respuestas más rápidas
- **Manejo avanzado de errores** - Recuperación automática ante fallos
- **Monitoreo en tiempo real** - Dashboard de métricas y rendimiento
- **Experiencia optimizada** - Flujo de conversación intuitivo y eficiente

---

## 📊 Comparativa antes/después

### 🕰️ Sistema Anterior (Call Control API)
- Múltiples interacciones cliente-servidor por llamada
- Alta latencia en respuestas (1-2 segundos por interacción)
- Sin reconocimiento de voz
- Sin caché de datos
- Manejo limitado de errores
- Sin monitoreo en tiempo real

### 🚀 Sistema Actual (TeXML)
- Arquitectura optimizada para bajar latencia
- Respuestas hasta 3x más rápidas
- Interacción por voz o teclado
- Caché optimizado de datos frecuentes
- Recuperación automática ante errores
- Dashboard completo de monitoreo
- Mayor escalabilidad y concurrencia

---

## 🛠️ Tecnologías Utilizadas

- **Node.js**: Servidor backend
- **Express**: Framework web
- **TeXML**: Lenguaje XML específico de Telnyx para IVR
- **Heroku**: Plataforma de despliegue
- **Axios**: Cliente HTTP para integraciones
- **Chart.js**: Visualización de datos para dashboard

---

## 📂 Estructura del Proyecto

```
.
├── texmlServer.js               # Punto de entrada principal
├── src/
│   ├── controllers/             # Controladores de endpoints
│   │   └── texmlController.js   # Controlador principal
│   ├── services/                # Servicios de negocio
│   │   ├── optimizedDataService.js  # Servicio optimizado 
│   │   └── telnyxService.js     # Integración con Telnyx
│   ├── texml/                   # Componentes TeXML
│   │   ├── handlers/            # Manejadores de respuesta
│   │   ├── helpers/             # Funciones auxiliares
│   │   └── templates/           # Plantillas XML
│   ├── cache/                   # Sistema de caché
│   ├── routes/                  # Rutas del servidor
│   ├── config/                  # Configuración
│   └── utils/                   # Utilidades (monitoreo, etc)
├── test/                        # Pruebas automatizadas
├── scripts/                     # Scripts de despliegue
├── public/                      # Assets públicos (dashboard)
└── logs/                        # Archivos de registro
```

---

## 📋 Requisitos

- Node.js 16+
- Cuenta en Telnyx con número de teléfono y conexión
- Heroku CLI (para despliegue)

---

## 🔧 Instalación

1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/telnyx-bot.git
cd telnyx-bot
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. Ejecutar en modo desarrollo
```bash
npm run dev
```

---

## ⚙️ Configuración

### Variables de Entorno Principales

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `TELNYX_API_KEY` | API Key de Telnyx | `KEY01234...` |
| `TELNYX_CALLER_ID` | Número de teléfono saliente | `+525512345678` |
| `TELNYX_CONNECTION_ID` | ID de conexión en Telnyx | `1234567...` |
| `BASE_URL` | URL base del servidor | `https://tu-app.herokuapp.com` |
| `AGENT_NUMBER` | Número para transferencia a agentes | `+525587654321` |
| `ADMIN_TOKEN` | Token para acceso al dashboard | `tu-token-secreto` |

### Configuración en Telnyx

1. Acceder al [Portal de Telnyx](https://portal.telnyx.com/)
2. Ir a "Voice API" → "TeXML Applications"
3. Crear una nueva aplicación TeXML
4. Configurar la URL de Webhook como: `https://tu-app.herokuapp.com/welcome`
5. Asignar un número de teléfono a esta aplicación TeXML

---

## 🚀 Despliegue

### Despliegue Manual

```bash
# Desplegar a Heroku
git push heroku main

# Verificar logs
heroku logs --tail
```

### Despliegue Automatizado

```bash
# Despliegue a entorno de desarrollo
./scripts/deploy.sh dev

# Despliegue a staging
./scripts/deploy.sh staging

# Despliegue a producción con 10% de tráfico
./scripts/deploy.sh production 10
```

Consulta el documento `ESTRATEGIA-DESPLIEGUE.md` para más detalles sobre el despliegue gradual.

---

## 📊 Monitoreo

El sistema incluye un dashboard de monitoreo accesible en:

```
https://tu-app.herokuapp.com/admin/dashboard?token=tu-token-secreto
```

El dashboard proporciona métricas en tiempo real:
- Llamadas activas y totales
- Tiempos de respuesta
- Tasa de reconocimiento de voz
- Uso de recursos
- Tasa de errores
- Distribución de tráfico por endpoint

---

## 🧪 Pruebas

### Pruebas Funcionales

```bash
# Ejecutar pruebas básicas
npm test

# Ejecutar tests específicos
npm test -- --grep "reconocimiento de voz"
```

### Pruebas de Carga

```bash
# Prueba de carga básica (10 llamadas concurrentes)
node test/load-test.js

# Prueba personalizada
node test/load-test.js --calls 20 --duration 120
```

Consulta el documento `PLAN-PRUEBAS-TEXML.md` para más detalles sobre las pruebas.

---

## 📝 Uso del Sistema

### Flujo Básico de Llamada

1. **Bienvenida**
   - Se presenta mensaje de bienvenida con opciones
   - Usuario puede presionar 1 o decir "expediente" para consultar

2. **Entrada de Expediente**
   - Sistema solicita número de expediente
   - Usuario ingresa dígitos seguidos de # o los dicta

3. **Menú Principal**
   - Sistema presenta datos generales del expediente
   - Ofrece opciones según estado del expediente:
     - Presionar 1 o decir "costos" para información de costos
     - Presionar 2 o decir "unidad" para datos de la grúa/operador
     - Presionar 3 o decir "ubicación"/"tiempos" según estado
     - Presionar 0 o decir "agente" para hablar con operador

4. **Información Detallada**
   - Sistema presenta información solicitada
   - Vuelve a ofrecer menú de opciones

---

## 📞 Soporte

Para dudas o soporte técnico, contactar a:
📧 **jonathan.vargas@troya.com**

---

## 🔜 Próximos Pasos

- Integración con sistema de tickets
- Análisis de sentimiento en reconocimiento de voz
- Expansión a nuevos flujos de negocio
- Implementación de IA conversacional para respuestas avanzadas
- Analíticas avanzadas de uso y satisfacción