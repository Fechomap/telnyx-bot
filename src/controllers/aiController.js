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
    console.log(`🔍 Consultando expediente: ${expediente}`);
    
    // Consultar todos los endpoints a la vez
    const datosExpediente = await consultaUnificada(expediente);
    
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
    
    // Primero dar información básica, luego menú de opciones
    const successXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia-Neural">
    He encontrado el expediente número ${expediente}.
    Cliente: ${context.nombre}.
    Vehículo: ${context.vehiculo}.
    Estado: ${context.estatus}.
  </Say>
  <Gather 
    action="/interactuar?sessionId=${sessionId}" 
    method="POST" 
    input="dtmf" 
    numDigits="1"
    timeout="10">
    <Say voice="Polly.Mia-Neural">
      Para consultar costos, presione 1.
      Para datos de la unidad, presione 2.
      Para ubicación, presione 3.
      Para tiempos, presione 4.
      Para hablar con un agente, presione 0.
    </Say>
  </Gather>
  <Redirect>/welcome</Redirect>
</Response>`;
    
    res.header('Content-Type', 'application/xml');
    return res.send(successXML);
    
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
    const digits = req.body.Digits || req.query.Digits || '';
    
    console.log(`🔢 Opción seleccionada: ${digits} (sesión: ${sessionId})`);
    
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
    
    // Manejar según opción seleccionada
    let responseMessage = '';
    
    switch (digits) {
      case '1': // Costos
        responseMessage = formatCostsMessage(expedienteData);
        break;
      case '2': // Unidad
        responseMessage = formatUnitMessage(expedienteData);
        break;
      case '3': // Ubicación
        responseMessage = formatLocationMessage(expedienteData);
        break;
      case '4': // Tiempos
        responseMessage = formatTimesMessage(expedienteData);
        break;
      case '0': // Agente
        return handleAgentRequest(req, res, sessionId);
      default:
        responseMessage = "Opción no válida.";
    }
    
    // Responder con la información y volver al menú
    const responseXML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia-Neural">
    ${responseMessage}
  </Say>
  <Gather 
    action="/interactuar?sessionId=${sessionId}" 
    method="POST" 
    input="dtmf" 
    numDigits="1"
    timeout="10">
    <Say voice="Polly.Mia-Neural">
      Para consultar otra información, seleccione una opción del menú.
      Costos: 1. Unidad: 2. Ubicación: 3. Tiempos: 4. Agente: 0.
    </Say>
  </Gather>
  <Redirect>/welcome</Redirect>
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
    error: error.message 
  });
  
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