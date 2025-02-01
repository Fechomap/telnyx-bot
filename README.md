# Proyecto: Integración de Telnyx con Node.js

## 📌 Descripción
Este proyecto implementa un sistema de automatización de llamadas utilizando **Telnyx** y **Node.js**. Se configura un servidor que maneja llamadas entrantes y salientes, permitiendo la interacción con los clientes de forma automatizada. En el futuro, este sistema se integrará con un ERP para responder con información en tiempo real.

---

## 🕰️ Antes
- No existía un sistema automatizado para gestionar llamadas entrantes y salientes.
- La comunicación con clientes dependía completamente de operadores humanos.
- No había integración con Telnyx ni posibilidad de manejar llamadas desde la API.
- No existía un webhook para recibir eventos de Telnyx.

---

## 🚀 Ahora
- Se implementó un **servidor en Node.js** que gestiona llamadas con **Telnyx**.
- Se configuraron **webhooks** para recibir y procesar eventos de llamadas entrantes.
- Se habilitó la capacidad de **realizar llamadas salientes** desde el servidor.
- Se realizó la configuración y pruebas en **Heroku** para desplegar el sistema.
- Se validaron las conexiones de Telnyx con números telefónicos reales.

---

## 🔜 Después (Próximos pasos)
- **Integrar el sistema con el ERP**, permitiendo que las respuestas de las llamadas provengan de información en tiempo real.
- Explorar **alternativas a OpenAI** para la generación de respuestas mediante IA.
- Implementar **Polling en el ERP** para extraer y proporcionar datos dinámicos durante las llamadas.
- Mejorar la interacción del bot para **responder preguntas complejas** dentro de las llamadas.
- Configurar métricas y análisis para **monitorear el uso y mejorar la experiencia**.

---

## 📂 Estructura del Proyecto
```
📁 telnyx-bot
│── 📄 server.js     # Servidor principal en Node.js
│── 📄 .env          # Variables de entorno (API keys y configuración)
│── 📄 package.json  # Dependencias del proyecto
│── 📂 logs          # Archivos de logs de llamadas y eventos
│── 📂 tests         # Pruebas y simulaciones
```

---

## 🛠️ Tecnologías Utilizadas
- **Node.js**: Servidor backend
- **Express.js**: Framework web
- **Telnyx API**: Gestión de llamadas
- **Heroku**: Despliegue en la nube
- **Axios**: Peticiones HTTP

---

## 📖 Instrucciones de Uso
### 1️⃣ Instalación
```sh
npm install
```

### 2️⃣ Configurar Variables de Entorno
Crear un archivo **.env** y agregar:
```env
TELNYX_API_KEY=tu_api_key
TELNYX_CALLER_ID=+52XXXXXXXXXX
TELNYX_CONNECTION_ID=tu_connection_id
```

### 3️⃣ Ejecutar el Servidor
```sh
node server.js
```

### 4️⃣ Pruebas con Curl
#### 🔹 Prueba de Llamada Entrante
```sh
curl -X POST https://tu-servidor.herokuapp.com/webhook -H "Content-Type: application/json" -d '{"from": "+525533344455"}'
```

#### 🔹 Prueba de Llamada Saliente
```sh
curl -X POST https://tu-servidor.herokuapp.com/llamada-saliente -H "Content-Type: application/json" -d '{"to": "+52XXXXXXXXXX"}'
```

---

## 📌 Notas Adicionales
- Asegúrate de **verificar los números en Telnyx** antes de hacer pruebas de llamadas.
- Configura correctamente el **Webhook URL** en la aplicación de Telnyx.
- Si la llamada saliente no se ejecuta, revisa los logs en **Heroku**.

---

## 📩 Contacto
Para dudas o soporte técnico, contacta con:
📧 **jonathan.vargas@troya.com**

# Telnyx Bot - Integración de Llamadas y Webhooks
