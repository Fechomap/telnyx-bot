/**
 * Controlador unificado para interacción con AI Assistant
 * Maneja todo el flujo conversacional del sistema
 */
const XMLBuilder = require('../texml/helpers/xmlBuilder');
const { consultaUnificada } = require('../services/dataService');
const sessionCache = require('../cache/sessionCache');
const speechUtils = require('../utils/speechUtils');
const config = require('../config/texml');
const monitoring = require('../utils/monitoring');

/**
 * Inicia la conversación con bienvenida
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 */
async function handleWelcome(req, res) {
  try {
    console.log('📞 Nueva llamada recibida, usando Say + Gather');
    
    const responseXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="/procesar-expediente" method="POST" input="dtmf speech" language="es-MX" timeout="10">
    <Say voice="Polly.Mia-Neural">
      Bienvenido al sistema de consulta de expedientes. Por favor, diga o ingrese el número de expediente.
    </Say>
  </Gather>
</Response>`;
    
    console.log('📝 XML de respuesta:\n', responseXML);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
    
  } catch (error) {
    console.error('❌ Error en bienvenida:', error);
    res.status(500).send('Error interno');
  }
}

/**
 * Procesa la entrada del usuario para extraer el número de expediente
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 */
async function handleProcessExpediente(req, res) {
  try {
    // Obtener entrada del usuario (voz y/o DTMF)
    const userInput = req.body.SpeechResult || req.query.SpeechResult || '';
    const digits = req.body.Digits || req.query.Digits || '';
    
    console.log(`🔍 Procesando posible expediente. Voz: "${userInput}", DTMF: "${digits}"`);
    
    // Extraer número de expediente
    let expediente = '';
    
    if (digits) {
      // Priorizar DTMF si está disponible
      expediente = digits.replace(/#$/, ''); // Eliminar # final si existe
    } else if (userInput) {
      // Extraer de voz usando utilidad
      expediente = speechUtils.extractExpedienteFromText(userInput);
      console.log(`🔢 Expediente extraído de voz: "${expediente}"`);
    }
    
    // Si no se identificó un expediente válido
    if (!expediente) {
      console.log('❌ No se pudo identificar un expediente válido');
      
      // Pedir nuevamente con AI Assistant
      const retryPrompt = 
        "No pude identificar un número de expediente válido. " +
        "Por favor, intenta nuevamente diciendo o ingresando el número del expediente que deseas consultar.";
      
      const aiOptions = {
        aiProvider: config.ai.provider,
        model: config.ai.model,
        initialPrompt: retryPrompt,
        action: config.routes.processExpediente,
        fallbackAction: config.routes.welcome,
        language: config.tts.language,
        voice: config.tts.voice,
        maxTurns: String(config.ai.maxTurns),
        interruptible: 'true',
        enhanced: 'true'
      };
      
      const aiElement = XMLBuilder.addAIAssistant(aiOptions);
      const responseXML = XMLBuilder.buildResponse([aiElement]);
      
      res.header('Content-Type', 'application/xml');
      return res.send(responseXML);
    }
    
    // Iniciar medición de tiempo para consulta
    const endDataQueryTimer = monitoring.startDataQuery();
    
    // Registrar consulta de expediente
    monitoring.trackExpediente('query', expediente);
    console.log(`🔍 Consultando expediente: ${expediente}`);
    
    // Consultar todos los endpoints a la vez
    const datosExpediente = await consultaUnificada(expediente);
    
    // Finalizar medición
    endDataQueryTimer(!!datosExpediente);
    
    // Si no se encontró el expediente
    if (!datosExpediente) {
      console.log(`❌ Expediente no encontrado: ${expediente}`);
      monitoring.trackExpediente('notFound', expediente);
      
      // Mensaje de expediente no encontrado con AI
      const notFoundPrompt = 
        `No se encontró el expediente número ${expediente}. ` +
        "Por favor, verifica el número e intenta nuevamente, o dime si necesitas ayuda con otro asunto.";
      
      const aiOptions = {
        aiProvider: config.ai.provider,
        model: config.ai.model,
        initialPrompt: notFoundPrompt,
        action: config.routes.processExpediente,
        fallbackAction: config.routes.welcome,
        language: config.tts.language,
        voice: config.tts.voice,
        maxTurns: String(config.ai.maxTurns),
        interruptible: 'true',
        enhanced: 'true'
      };
      
      const aiElement = XMLBuilder.addAIAssistant(aiOptions);
      const responseXML = XMLBuilder.buildResponse([aiElement]);
      
      res.header('Content-Type', 'application/xml');
      return res.send(responseXML);
    }
    
    // Expediente encontrado
    console.log(`✅ Expediente encontrado: ${expediente}`);
    monitoring.trackExpediente('found', expediente);
    
    // Crear ID de sesión único
    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // Almacenar datos en caché
    sessionCache.createSession(sessionId, datosExpediente);
    console.log(`✅ Sesión creada con ID: ${sessionId}`);
    
    // Registrar sesión activa
    monitoring.trackSessionEvent('active', sessionId);
    
    // Formatear datos para AI Assistant
    const context = speechUtils.formatContextForAI(datosExpediente);
    
    // Crear prompt inicial con información relevante
    const successPrompt = 
      `He encontrado el expediente número ${expediente}. ` +
      `Cliente: ${context.nombre}. ` +
      `Vehículo: ${context.vehiculo}. ` +
      `Estado: ${context.estatus}. ` +
      `¿Qué información necesitas sobre este expediente? Puedes preguntarme por costos, ` +
      `datos de la unidad, ubicación, tiempos o cualquier otra información disponible.`;
    
    // Configurar AI Assistant con variables de contexto
    const aiOptions = {
      aiProvider: config.ai.provider,
      model: config.ai.model,
      initialPrompt: successPrompt,
      action: `${config.routes.interact}?sessionId=${sessionId}`,
      fallbackAction: config.routes.welcome,
      language: config.tts.language,
      voice: config.tts.voice,
      maxTurns: String(config.ai.maxTurns),
      interruptible: 'true',
      enhanced: 'true',
      contextVars: context  // Variables de contexto con TODOS los datos
    };
    
    const aiElement = XMLBuilder.addAIAssistant(aiOptions);
    const responseXML = XMLBuilder.buildResponse([aiElement]);
    
    res.header('Content-Type', 'application/xml');
    return res.send(responseXML);
    
  } catch (error) {
    console.error('❌ Error al procesar expediente:', error);
    handleError(req, res, 'process_expediente', error);
  }
}

/**
 * Maneja la interacción continua con el usuario
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 */
async function handleInteraction(req, res) {
  try {
    // Obtener ID de sesión
    const sessionId = req.query.sessionId || '';
    
    // Validar sesión
    if (!sessionId) {
      console.log('❌ ID de sesión no proporcionado en interacción');
      return handleSessionError(req, res);
    }
    
    // Obtener datos de la sesión
    const expedienteData = sessionCache.getSession(sessionId);
    
    if (!expedienteData) {
      console.log(`❌ Sesión no encontrada: ${sessionId}`);
      monitoring.trackSessionEvent('expired', sessionId);
      return handleSessionError(req, res);
    }
    
    // Obtener entrada del usuario
    const userInput = req.body.SpeechResult || req.query.SpeechResult || '';
    
    // Detectar intención del usuario
    const { intent } = speechUtils.detectUserIntent(userInput);
    console.log(`🧠 Intención detectada: ${intent}, Entrada: "${userInput}"`);
    
    // Manejar según intención
    switch (intent) {
      case 'new_expediente':
        return handleNewExpedienteRequest(req, res, sessionId);
        
      case 'agent':
        return handleAgentRequest(req, res, sessionId);
        
      case 'hangup':
        return handleHangupRequest(req, res, sessionId);
        
      case 'query':
      default:
        // Continuar conversación normal
        return handleContinueConversation(req, res, sessionId, expedienteData);
    }
    
  } catch (error) {
    console.error('❌ Error en interacción:', error);
    handleError(req, res, 'interaction', error);
  }
}

/**
 * Maneja solicitud de consultar nuevo expediente
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 * @param {string} sessionId - ID de la sesión actual
 */
function handleNewExpedienteRequest(req, res, sessionId) {
  // Limpiar sesión actual
  sessionCache.removeSession(sessionId);
  console.log(`🔄 Usuario solicitó nuevo expediente, eliminando sesión ${sessionId}`);
  
  // Volver a pedir expediente
  const newExpedientePrompt = 
    "De acuerdo. Por favor, dime o ingresa el número del nuevo expediente que deseas consultar.";
  
  const aiOptions = {
    aiProvider: config.ai.provider,
    model: config.ai.model,
    initialPrompt: newExpedientePrompt,
    action: config.routes.processExpediente,
    fallbackAction: config.routes.welcome,
    language: config.tts.language,
    voice: config.tts.voice,
    maxTurns: String(config.ai.maxTurns),
    interruptible: 'true',
    enhanced: 'true'
  };
  
  const aiElement = XMLBuilder.addAIAssistant(aiOptions);
  const responseXML = XMLBuilder.buildResponse([aiElement]);
  
  res.header('Content-Type', 'application/xml');
  return res.send(responseXML);
}

/**
 * Maneja solicitud de hablar con agente humano
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 * @param {string} sessionId - ID de la sesión actual
 */
function handleAgentRequest(req, res, sessionId) {
  console.log(`📞 Usuario solicitó hablar con agente humano (sesión ${sessionId})`);
  
  // Verificar si la transferencia está habilitada
  if (!config.transfer.enabled || !config.transfer.agentNumber) {
    console.log('❌ Transferencia a agentes deshabilitada en configuración');
    
    // Mensaje de no disponibilidad
    const unavailableMessage = 
      "Lo siento, en este momento no es posible transferirte con un agente. " +
      "¿Hay algo más en lo que pueda ayudarte con el expediente?";
    
    const aiOptions = {
      aiProvider: config.ai.provider,
      model: config.ai.model,
      initialPrompt: unavailableMessage,
      action: `${config.routes.interact}?sessionId=${sessionId}`,
      fallbackAction: config.routes.welcome,
      language: config.tts.language,
      voice: config.tts.voice,
      maxTurns: String(config.ai.maxTurns),
      interruptible: 'true',
      enhanced: 'true'
    };
    
    const aiElement = XMLBuilder.addAIAssistant(aiOptions);
    const responseXML = XMLBuilder.buildResponse([aiElement]);
    
    res.header('Content-Type', 'application/xml');
    return res.send(responseXML);
  }
  
  // Mensaje de transferencia
  const transferMessage = config.transfer.transferMessage || 
    "Transfiriendo a un agente humano. Por favor espere un momento...";
  
  const sayElement = XMLBuilder.addSay(transferMessage, { 
    voice: config.tts.voice 
  });
  
  // Configurar número de agente
  const agentNumber = config.transfer.agentNumber;
  const dialElement = XMLBuilder.addDial(agentNumber, {
    callerId: config.service.callerId,
    timeout: '30'
  });
  
  const responseXML = XMLBuilder.buildResponse([sayElement, dialElement]);
  
  res.header('Content-Type', 'application/xml');
  return res.send(responseXML);
}

/**
 * Maneja solicitud de colgar
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 * @param {string} sessionId - ID de la sesión actual
 */
function handleHangupRequest(req, res, sessionId) {
  console.log(`👋 Usuario solicitó finalizar la llamada (sesión ${sessionId})`);
  
  // Limpiar sesión
  sessionCache.removeSession(sessionId);
  
  // Mensaje de despedida
  const goodbyeMessage = 
    "Gracias por comunicarte con nosotros. Que tengas un excelente día. ¡Hasta pronto!";
  
  const sayElement = XMLBuilder.addSay(goodbyeMessage, { 
    voice: config.tts.voice 
  });
  
  const hangupElement = XMLBuilder.addHangup();
  
  const responseXML = XMLBuilder.buildResponse([sayElement, hangupElement]);
  
  res.header('Content-Type', 'application/xml');
  return res.send(responseXML);
}

/**
 * Continúa conversación normal con AI
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 * @param {string} sessionId - ID de la sesión actual
 * @param {Object} expedienteData - Datos del expediente
 */
function handleContinueConversation(req, res, sessionId, expedienteData) {
  console.log(`💬 Continuando conversación normal (sesión ${sessionId})`);
  
  // Formatear datos para AI Assistant
  const context = speechUtils.formatContextForAI(expedienteData);
  
  // Configurar AI Assistant con variables de contexto
  const aiOptions = {
    aiProvider: config.ai.provider,
    model: config.ai.model,
    action: `${config.routes.interact}?sessionId=${sessionId}`,
    fallbackAction: config.routes.welcome,
    language: config.tts.language,
    voice: config.tts.voice,
    maxTurns: String(config.ai.maxTurns),
    interruptible: 'true',
    enhanced: 'true',
    contextVars: context  // Actualizar variables de contexto
  };
  
  const aiElement = XMLBuilder.addAIAssistant(aiOptions);
  const responseXML = XMLBuilder.buildResponse([aiElement]);
  
  res.header('Content-Type', 'application/xml');
  return res.send(responseXML);
}

/**
 * Maneja error de sesión
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 */
function handleSessionError(req, res) {
  const sessionErrorPrompt = 
    "Lo siento, parece que la sesión ha expirado. " +
    "Por favor, dime nuevamente el número de expediente que deseas consultar.";
  
  const aiOptions = {
    aiProvider: config.ai.provider,
    model: config.ai.model,
    initialPrompt: sessionErrorPrompt,
    action: config.routes.processExpediente,
    fallbackAction: config.routes.welcome,
    language: config.tts.language,
    voice: config.tts.voice,
    maxTurns: String(config.ai.maxTurns),
    interruptible: 'true',
    enhanced: 'true'
  };
  
  const aiElement = XMLBuilder.addAIAssistant(aiOptions);
  const responseXML = XMLBuilder.buildResponse([aiElement]);
  
  res.header('Content-Type', 'application/xml');
  return res.send(responseXML);
}

/**
 * Maneja errores generales
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 * @param {string} errorContext - Contexto del error
 * @param {Error} error - Error ocurrido
 */
function handleError(req, res, errorContext, error) {
  // Registrar error
  monitoring.trackError(`ai_${errorContext}_error`, req.originalUrl, { 
    error: error.message 
  });
  
  // Mensaje genérico de error
  const errorPrompt = 
    "Lo siento, ha ocurrido un problema técnico. " +
    "¿Te gustaría intentar nuevamente o hablar con un agente?";
  
  const aiOptions = {
    aiProvider: config.ai.provider,
    model: config.ai.model,
    initialPrompt: errorPrompt,
    action: config.routes.processExpediente,
    fallbackAction: config.routes.welcome,
    language: config.tts.language,
    voice: config.tts.voice,
    maxTurns: String(config.ai.maxTurns),
    interruptible: 'true',
    enhanced: 'true'
  };
  
  const aiElement = XMLBuilder.addAIAssistant(aiOptions);
  const responseXML = XMLBuilder.buildResponse([aiElement]);
  
  res.header('Content-Type', 'application/xml');
  return res.send(responseXML);
}

module.exports = {
  handleWelcome,
  handleProcessExpediente,
  handleInteraction
};