module.exports = {
  // Configuración del servicio
  service: {
    baseUrl: process.env.BASE_URL || 'https://telnyx-bot-production.up.railway.app',
    callerId: process.env.TELNYX_CALLER_ID,
    connectionId: process.env.TELNYX_CONNECTION_ID
  },
  
  // Configuración de rutas TeXML
  routes: {
    welcome: '/welcome',
    processExpediente: '/procesar-expediente',
    interact: '/interactuar',
    agent: '/agent'
  },
  
  // Configuración de Text-to-Speech
  tts: {
    provider: 'polly',  // Especifica polly como provider
    voice: 'Lupe',      // Solo el nombre base
    language: 'es-MX'
  },
  
  // Configuración de AI - usar configuración mínima
  ai: {
    enabled: true,
    model: 'telnyx',    // Usa el modelo por defecto de Telnyx
    maxTurns: 15,
    interruptible: true
  },
  
  // Configuración de tiempos
  timeout: {
    expediente: 30,   // Segundos para ingresar expediente
    conversation: 60, // Segundos sin respuesta en conversación
    session: 1800     // Duración total de sesión (30 minutos)
  },
  
  // Configuración de transferencia a agentes
  transfer: {
    enabled: true,
    agentNumber: process.env.AGENT_NUMBER || '+525588974509', // ASEGÚRATE DE TENER UN NÚMERO
    transferMessage: "Transfiriendo a un agente. Por favor espere un momento..."
  },
  
  // Token de administrador para dashboard
  adminToken: process.env.ADMIN_TOKEN || 'admin'
};