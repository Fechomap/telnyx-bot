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
    console.log('📞 Nueva llamada recibida, configurando Gather con mejores parámetros');
    
    const responseXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather 
    action="/procesar-expediente" 
    method="POST" 
    input="dtmf" 
    timeout="15"
    finishOnKey="#"
    validDigits="0123456789">
    <Say voice="Polly.Mia-Neural">
      Bienvenido al sistema de consulta de expedientes. Por favor, ingrese el número de expediente usando el teclado numérico y presione numeral al terminar.
    </Say>
  </Gather>
  <Redirect>/welcome</Redirect>
</Response>`;
    
    console.log('📝 XML de respuesta (solo DTMF):\n', responseXML);
    
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
    const confidence = parseFloat(req.body.Confidence || req.query.Confidence || '0');
    
    console.log(`🔍 Procesando expediente:`);
    console.log(`   Voz: "${userInput}"`);
    console.log(`   DTMF: "${digits}"`);
    console.log(`   Confianza: ${confidence}`);
    
    // Extraer número de expediente
    let expediente = '';
    
    if (digits && digits.trim()) {
      // Priorizar DTMF si está disponible
      expediente = digits.replace(/#$/, '').trim();
      console.log(`✅ Expediente de DTMF: "${expediente}"`);
    } else if (userInput && confidence > 0.5) { // Solo usar voz si la confianza es alta
      // Extraer de voz usando utilidad
      expediente = speechUtils.extractExpedienteFromText(userInput);
      console.log(`🔢 Expediente extraído de voz: "${expediente}"`);
    }
    
    // Si no se identificó un expediente válido o es muy corto
    if (!expediente || expediente.length < 3) {
      console.log('❌ Expediente inválido o muy corto');
      
      const retryXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia-Neural">
    No pude entender el número de expediente.
  </Say>
  <Gather 
    action="/procesar-expediente" 
    method="POST" 
    input="dtmf" 
    timeout="15"
    finishOnKey="#"
    validDigits="0123456789">
    <Say voice="Polly.Mia-Neural">
      Por favor, ingrese el número de expediente usando el teclado numérico y presione numeral al terminar.
    </Say>
  </Gather>
  <Redirect>/welcome</Redirect>
</Response>`;
      
      res.header('Content-Type', 'application/xml');
      return res.send(retryXML);
    }
    
    console.log(`✅ Procesando expediente: ${expediente}`);
    
    // Iniciar medición de tiempo para consulta
    const endDataQueryTimer = monitoring.startDataQuery();
    
    // Registrar consulta de expediente
    monitoring.trackExpediente('query', expediente);
    console.log(`[LOG] Iniciando consultaUnificada para expediente: ${expediente}`);
    
    // Consultar todos los endpoints a la vez
    const datosExpediente = await consultaUnificada(expediente);
    console.log('[LOG] Resultado de consultaUnificada:', JSON.stringify(datosExpediente, null, 2));
    
    // Finalizar medición
    endDataQueryTimer(!!datosExpediente);
    
    // Si no se encontró el expediente
    if (!datosExpediente) {
      console.log(`❌ Expediente no encontrado: ${expediente}`);
      monitoring.trackExpediente('notFound', expediente);
      
      // Mensaje simple sin AI para reintentar
      const notFoundXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia-Neural">
    No se encontró el expediente número ${expediente}.
  </Say>
  <Gather 
    action="/procesar-expediente" 
    method="POST" 
    input="dtmf" 
    timeout="15"
    finishOnKey="#"
    validDigits="0123456789">
    <Say voice="Polly.Mia-Neural">
      Por favor, verifique el número e intente nuevamente.
    </Say>
  </Gather>
  <Redirect>/welcome</Redirect>
</Response>`;
      
      res.header('Content-Type', 'application/xml');
      return res.send(notFoundXML);
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
    
    // Formatear datos para respuesta
    const context = speechUtils.formatContextForAI(datosExpediente);
    console.log('[LOG] Contexto formateado para AI:', JSON.stringify(context, null, 2));
    
    // Construir el texto del prompt para el AI Assistant
    // const promptTextContent = `He encontrado el expediente número ${expediente}.
    // Cliente: ${context.nombre}.
    // Vehículo: ${context.vehiculo}.
    // Estado: ${context.estatus}.

    // ¿Qué información necesitas? Puedo ayudarte con costos, datos de la unidad, ubicación o tiempos. También puedes preguntarme cualquier cosa sobre tu expediente.`;
    // console.log('[LOG] promptTextContent para AI (original):', promptTextContent);

    // --- PRUEBA CON PROMPT SIMPLE ---
    const promptTextContent = "Hola. Expediente encontrado. ¿Qué deseas consultar?";
    console.log('[LOG] promptTextContent para AI (PRUEBA SIMPLE):', promptTextContent);
    // --- FIN PRUEBA CON PROMPT SIMPLE ---

    // Configurar opciones para XMLBuilder.addAIAssistant, similar a welcome.js
    const aiAssistantOptions = {
        aiProvider: 'telnyx',
        model: 'meta-llama/Meta-Llama-3-1-70B-Instruct',
        initialPrompt: promptTextContent,
        action: `/interactuar?sessionId=${sessionId}`,
        fallbackAction: '/procesar-expediente', // Permite reintentar si AI falla
        language: 'es-MX',
        voice: 'Polly.Mia-Neural',
        maxTurns: '5',
        interruptible: 'true'
    };
    
    console.log('[LOG] Opciones para addAIAssistant (aiAssistantOptions):', JSON.stringify(aiAssistantOptions, null, 2));
    
    // Generar el elemento AIAssistant y la respuesta TeXML usando XMLBuilder
    const aiElement = XMLBuilder.addAIAssistant(aiAssistantOptions);
    console.log('[LOG] Elemento AIAssistant generado:', aiElement);
    const successXML = XMLBuilder.buildResponse([aiElement]);
    
    console.log('📝 [LOG] XML de respuesta final para expediente encontrado (con XMLBuilder):\n', successXML);
    
    res.header('Content-Type', 'application/xml');
    return res.send(successXML);
    
  } catch (error) {
    console.error('❌ Error al procesar expediente (detalle completo):', error); // Log completo del error
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
    const sessionId = req.query.sessionId || '';
    const userInput = req.body.SpeechResult || req.body.TextResult || '';
    
    // Validar sesión
    if (!sessionId) {
      return handleSessionError(req, res);
    }
    
    // Obtener datos de la sesión
    const expedienteData = sessionCache.getSession(sessionId);
    
    if (!expedienteData) {
      return handleSessionError(req, res);
    }
    
    // Detectar intención del usuario
    const intent = speechUtils.detectUserIntent(userInput);
    
    // Si el usuario quiere terminar
    if (intent.intent === 'hangup') {
      const goodbyeXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia-Neural">
    Gracias por utilizar nuestro servicio. Que tenga un buen día.
  </Say>
  <Hangup/>
</Response>`;
      res.header('Content-Type', 'application/xml');
      return res.send(goodbyeXML);
    }
    
    // Si quiere hablar con un agente
    if (intent.intent === 'agent') {
      return handleAgentRequest(req, res, sessionId);
    }
    
    // Continuar conversación con AI
    const context = speechUtils.formatContextForAI(expedienteData);
    const responseXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <AIAssistant
    voice="Polly.Mia-Neural"
    language="es-MX"
    action="/interactuar?sessionId=${sessionId}"
    interruptible="true"
    context='${JSON.stringify(context)}'>
    <!-- El AI responderá basándose en la pregunta del usuario y el contexto del expediente -->
  </AIAssistant>
</Response>`;
    
    res.header('Content-Type', 'application/xml');
    return res.send(responseXML);
    
  } catch (error) {
    console.error('❌ Error en interacción:', error);
    handleError(req, res, 'interaction', error);
  }
}

/**
 * Formatea mensaje de costos
 */
function formatCostsMessage(expedienteData) {
  const costos = expedienteData.costos;
  if (!costos || !costos.costo) {
    return "No hay información de costos disponible para este expediente.";
  }
  
  let message = `El costo total es ${costos.costo}.`;
  if (costos.km) message += ` Distancia: ${costos.km} kilómetros.`;
  if (costos.banderazo) message += ` Banderazo: ${costos.banderazo}.`;
  
  return message;
}

/**
 * Formatea mensaje de unidad
 */
function formatUnitMessage(expedienteData) {
  const unidad = expedienteData.unidad;
  if (!unidad || !unidad.operador) {
    return "No hay información de la unidad disponible para este expediente.";
  }
  
  let message = `Operador: ${unidad.operador}.`;
  if (unidad.tipoGrua) message += ` Tipo de grúa: ${unidad.tipoGrua}.`;
  if (unidad.placas) message += ` Placas: ${unidad.placas}.`;
  
  return message;
}

/**
 * Formatea mensaje de ubicación
 */
function formatLocationMessage(expedienteData) {
  const ubicacion = expedienteData.ubicacion;
  if (!ubicacion || !ubicacion.tiempoRestante) {
    return "No hay información de ubicación disponible para este expediente.";
  }
  
  return `Tiempo estimado de llegada: ${ubicacion.tiempoRestante}.`;
}

/**
 * Formatea mensaje de tiempos
 */
function formatTimesMessage(expedienteData) {
  const tiempos = expedienteData.tiempos;
  if (!tiempos) {
    return "No hay información de tiempos disponible para este expediente.";
  }
  
  let message = '';
  if (tiempos.tc) message += `Tiempo de contacto: ${tiempos.tc}.`;
  if (tiempos.tt) message += ` Tiempo de término: ${tiempos.tt}.`;
  
  return message || "No hay información de tiempos disponible.";
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
    console.log('❌ Transferencia a agentes deshabilitada');
    
    const unavailableXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia-Neural">
    Lo siento, en este momento no es posible transferirle con un agente.
  </Say>
  <Redirect>/welcome</Redirect>
</Response>`;
    
    res.header('Content-Type', 'application/xml');
    return res.send(unavailableXML);
  }
  
  // Transferir a agente
  const transferXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia-Neural">
    ${config.transfer.transferMessage}
  </Say>
  <Dial callerId="${config.service.callerId}" timeout="30">
    ${config.transfer.agentNumber}
  </Dial>
</Response>`;
  
  res.header('Content-Type', 'application/xml');
  return res.send(transferXML);
}

/**
 * Maneja error de sesión
 * @param {Object} req - Solicitud Express
 * @param {Object} res - Respuesta Express
 */
function handleSessionError(req, res) {
  const sessionErrorXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia-Neural">
    Lo siento, la sesión ha expirado.
  </Say>
  <Redirect>/welcome</Redirect>
</Response>`;
  
  res.header('Content-Type', 'application/xml');
  return res.send(sessionErrorXML);
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
    error: error.message,
    stack: error.stack // Incluir stack trace en el log de monitoreo
  });
  
  console.error(`[LOG] handleError fue llamado. Contexto: ${errorContext}, Error: ${error.message}`); // Log adicional en handleError
  const errorXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia-Neural">
    Lo siento, ha ocurrido un problema técnico. Por favor intente nuevamente.
  </Say>
  <Redirect>/welcome</Redirect>
</Response>`;
  
  res.header('Content-Type', 'application/xml');
  return res.send(errorXML);
}

module.exports = {
  handleWelcome,
  handleProcessExpediente,
  handleInteraction
};
