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
      provider: 'amazon', // Usar Amazon Polly como proveedor
      voice: 'Mia',      // Voz femenina neural de Amazon Polly para español mexicano
      language: 'es-MX',
      engine: 'neural'   // Usar el motor neural para mejor calidad
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
    },
    
    // Configuración de AI Assistant
    ai: {
      enabled: false, // Deshabilitar AI Assistant para evitar conflictos con el flujo normal
      model: 'meta-llama/Meta-Llama-3-1-70B-Instruct',
      maxTurns: 5
    }
  };
