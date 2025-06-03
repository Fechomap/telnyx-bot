// src/config/texml.js
module.exports = {
  // Configuración del servicio
  service: {
    baseUrl: process.env.BASE_URL || 'https://telnyx-bot-production.up.railway.app',
    callerId: process.env.TELNYX_CALLER_ID,
    connectionId: process.env.TELNYX_CONNECTION_ID
  },
  
  // Configuración de rutas (sin AI)
  routes: {
    welcome: '/welcome',
    menuSelection: '/menu-selection',
    requestExpediente: '/solicitar-expediente',
    validateExpediente: '/validar-expediente',
    expedienteMenu: '/menu-expediente',
    processOption: '/procesar-opcion',
    transferAgent: '/transferir-agente'
  },
  
  // Configuración de Text-to-Speech
  tts: {
    provider: 'polly',
    voice: 'Polly.Mia-Neural',
    language: 'es-MX'
  },
  
  // Configuración de caché
  cache: {
    type: 'redis',
    ttl: 1800, // 30 minutos
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  // Configuración de tiempos
  timeout: {
    menuInput: 10,     // Segundos para seleccionar en menú
    expediente: 15,    // Segundos para ingresar expediente
    options: 10        // Segundos para opciones de expediente
  },
  
  // Configuración de transferencia a agentes
  transfer: {
    enabled: process.env.TRANSFER_ENABLED === 'true',
    agentNumber: process.env.AGENT_NUMBER || '+525588974509',
    transferMessage: "Transfiriendo a un asesor. Por favor espere un momento."
  },
  
  // Configuración de monitoreo
  monitoring: {
    enabled: true,
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  
  // Token de administrador
  adminToken: process.env.ADMIN_TOKEN || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_TOKEN debe estar configurado en producción');
    }
    console.warn('⚠️  ADVERTENCIA: Usando token admin por defecto. Configure ADMIN_TOKEN en .env');
    return 'dev-admin-token-change-this';
  })()
};