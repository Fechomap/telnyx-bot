/**
 * Configuración para Telnyx TeXML
 * Contiene parámetros y rutas para la integración con Telnyx
 */

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
      expediente: '/expediente',
      validarExpediente: '/validar-expediente',
      respuesta: '/respuesta',
      agent: '/agent',
      otroExpediente: '/otro-expediente'
    },
    
    // Configuración de Text-to-Speech
    tts: {
      voice: 'female',
      language: 'es-MX'
    },
    
    // Configuración de tiempos
    timeout: {
      digit: 7, // segundos para esperar dígitos
      speech: 5, // segundos para esperar entrada de voz
      session: 1800 // segundos para duración de sesión (30 minutos)
    },
    
    // Configuración de transferencia a agentes
    transfer: {
      enabled: true,
      agentNumber: process.env.AGENT_NUMBER || '',
      maxWaitTime: 60 // segundos máximos de espera para un agente
    }
  };