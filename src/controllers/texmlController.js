/**
 * Controlador principal mejorado para endpoints TeXML
 * Versión optimizada con soporte para reconocimiento de voz y manejo avanzado de errores
 * NOTA: Este controlador está siendo reemplazado por aiController para el flujo conversacional
 */
const { RESPONSE_TYPES, sendResponse } = require('../texml/handlers/templateHandler');
const { ERROR_TYPES, respondWithError } = require('../texml/handlers/errorHandler');
const sessionCache = require('../cache/sessionCache');
const speechUtils = require('../utils/speechUtils');
const { consultaUnificada, formatearDatosParaIVR } = require('../services/dataService');
const config = require('../config/texml');
const monitoring = require('../utils/monitoring');
const XMLBuilder = require('../texml/helpers/xmlBuilder');

/**
 * Controlador para endpoint /welcome
 * NOTA: Este endpoint ahora redirige al flujo AI
 */
async function handleWelcome(req, res) {
  // Redirigir al controlador AI
  const aiController = require('./aiController');
  return aiController.handleWelcome(req, res);
}

/**
 * Controlador para endpoint /expediente
 * Solicita número de expediente al usuario
 * NOTA: Mantenido para compatibilidad pero no usado en el flujo AI
 */
async function handleExpediente(req, res) {
  try {
    console.log('🔢 Usuario seleccionó opción para consultar expediente (flujo legacy)');
    
    // Para flujo legacy, enviar respuesta solicitando número de expediente
    sendResponse(res, RESPONSE_TYPES.REQUEST_EXPEDIENTE);
  } catch (error) {
    console.error('❌ Error al procesar solicitud de expediente:', error);
    monitoring.trackError('expediente_request', req.originalUrl, { error: error.message });
    respondWithError(res, ERROR_TYPES.SYSTEM_ERROR);
  }
}

/**
 * Controlador para endpoint /validar-expediente
 * Valida el expediente y carga todos los datos necesarios
 * NOTA: Mantenido para compatibilidad pero no usado en el flujo AI
 */
async function handleValidarExpediente(req, res) {
  // Iniciar medición de tiempo para consulta de datos
  const endDataQueryTimer = monitoring.startDataQuery();
  
  try {
    // Obtener número de expediente del cuerpo de la solicitud
    let expediente = '';
    
    // Verificar si viene de entrada de voz o DTMF
    const speechResult = req.body.SpeechResult || '';
    const digits = req.body.Digits || '';
    
    if (speechResult) {
      console.log(`🗣️ Expediente recibido por voz: "${speechResult}"`);
      monitoring.trackSpeechRecognition('attempt', speechResult, 'validación');
      
      // Usar utilidad para extraer expediente del texto
      expediente = speechUtils.extractExpedienteFromText(speechResult);
      
      if (expediente) {
        monitoring.trackSpeechRecognition('success', speechResult, expediente);
      } else {
        monitoring.trackSpeechRecognition('failure', speechResult, 'No se reconocieron dígitos');
        return respondWithError(res, ERROR_TYPES.EXPEDIENTE_INVALID, {
          attemptCount: parseInt(req.query.attempt) || 1
        });
      }
    } else if (digits) {
      // Eliminar el carácter # si está presente (finishOnKey)
      expediente = digits.replace(/#$/, '');
    }
    
    console.log(`🔍 Validando expediente: ${expediente}`);
    
    // Registrar consulta de expediente
    monitoring.trackExpediente('query', expediente);
    
    if (!expediente) {
      console.log('❌ Número de expediente vacío');
      monitoring.trackExpediente('notFound', expediente);
      endDataQueryTimer(false);
      
      return respondWithError(res, ERROR_TYPES.EXPEDIENTE_INVALID, {
        attemptCount: parseInt(req.query.attempt) || 1
      });
    }
    
    // Realizar consulta unificada con el servicio optimizado
    const datosExpediente = await consultaUnificada(expediente);
    
    // Registro del tiempo de consulta
    endDataQueryTimer(!!datosExpediente);
    
    if (!datosExpediente) {
      console.log(`❌ Expediente no encontrado: ${expediente}`);
      monitoring.trackExpediente('notFound', expediente);
      
      return respondWithError(res, ERROR_TYPES.EXPEDIENTE_NOT_FOUND, {
        attemptCount: parseInt(req.query.attempt) || 1
      });
    }
    
    // Registrar expediente encontrado
    monitoring.trackExpediente('found', expediente);
    
    // Crear ID de sesión único
    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // Almacenar datos en caché
    sessionCache.createSession(sessionId, datosExpediente);
    console.log(`✅ Sesión creada con ID: ${sessionId}`);
    
    // Registrar sesión activa
    monitoring.trackSessionEvent('active', sessionId);
    
    // Formatear datos para IVR
    const datosFormateados = formatearDatosParaIVR(datosExpediente);
    
    // Enviar respuesta con menú principal
    sendResponse(res, RESPONSE_TYPES.MAIN_MENU, {
      datosFormateados,
      sessionId,
      estatus: datosExpediente.estatus
    });
  } catch (error) {
    console.error('❌ Error al validar expediente:', error);
    endDataQueryTimer(false);
    monitoring.trackError('expediente_validation', req.originalUrl, { error: error.message });
    
    respondWithError(res, ERROR_TYPES.SYSTEM_ERROR);
  }
}

/**
 * Controlador para endpoint /respuesta
 * Proporciona la información específica según la opción seleccionada
 * NOTA: Mantenido para compatibilidad pero no usado en el flujo AI
 */
async function handleRespuesta(req, res) {
  try {
    // Obtener ID de sesión
    const sessionId = req.query.sessionId || '';
    
    // Validar ID de sesión
    if (!sessionId) {
      console.log('❌ ID de sesión no proporcionado');
      monitoring.trackError('session_missing', req.originalUrl);
      return respondWithError(res, ERROR_TYPES.SESSION_INVALID);
    }
    
    // Recuperar datos de la sesión
    const datosExpediente = sessionCache.getSession(sessionId);
    
    if (!datosExpediente) {
      console.log(`❌ Sesión no encontrada: ${sessionId}`);
      monitoring.trackSessionEvent('expired', sessionId);
      return respondWithError(res, ERROR_TYPES.SESSION_EXPIRED);
    }
    
    // Determinar la opción seleccionada (por voz o DTMF)
    let opcion = '';
    const digits = req.body.Digits || '';
    const speechResult = req.body.SpeechResult || '';
    
    // Obtener opción (por ahora solo manejar dígitos en legacy)
    opcion = digits;
    
    console.log(`🔢 Usuario seleccionó opción ${opcion} para sesión ${sessionId}`);
    
    // Si el usuario eligió hablar con un agente
    if (opcion === '0') {
      console.log(`📞 Usuario solicitó hablar con un agente (sesión ${sessionId})`);
      return sendResponse(res, RESPONSE_TYPES.AGENT_TRANSFER, { sessionId });
    }
    
    // Si el usuario quiere consultar otro expediente
    if (opcion === '9') {
      console.log(`🔄 Usuario solicitó consultar otro expediente (sesión ${sessionId})`);
      monitoring.trackSessionEvent('completed', sessionId);
      return sendResponse(res, RESPONSE_TYPES.REQUEST_EXPEDIENTE);
    }
    
    // Formatear datos para IVR
    const datosFormateados = formatearDatosParaIVR(datosExpediente);
    
    // Determinar qué información mostrar según la opción
    let mensajeRespuesta = '';
    
    switch (opcion) {
      case '1': // Costos
        mensajeRespuesta = datosFormateados.mensajeCostos;
        break;
      case '2': // Datos de unidad
        mensajeRespuesta = datosFormateados.mensajeUnidad;
        break;
      case '3': // Ubicación o Tiempos según estado
        if (datosExpediente.estatus === 'Concluido') {
          mensajeRespuesta = datosFormateados.mensajeTiempos;
        } else {
          mensajeRespuesta = datosFormateados.mensajeUbicacion;
        }
        break;
      case '4': // Tiempos (solo si no está concluido)
        if (datosExpediente.estatus !== 'Concluido') {
          mensajeRespuesta = datosFormateados.mensajeTiempos;
        } else {
          return respondWithError(res, ERROR_TYPES.INPUT_INVALID, { 
            sessionId,
            action: `/respuesta?sessionId=${sessionId}`
          });
        }
        break;
      default:
        return respondWithError(res, ERROR_TYPES.INPUT_INVALID, { 
          sessionId,
          action: `/respuesta?sessionId=${sessionId}`
        });
    }
    
    // Enviar respuesta con menú de opciones
    sendResponse(res, RESPONSE_TYPES.RESPONSE_MENU, {
      mensajeRespuesta,
      sessionId,
      estatus: datosExpediente.estatus
    });
  } catch (error) {
    console.error('❌ Error al procesar respuesta:', error);
    monitoring.trackError('response_processing', req.originalUrl, { 
      error: error.message,
      sessionId: req.query.sessionId || 'unknown'
    });
    
    respondWithError(res, ERROR_TYPES.SYSTEM_ERROR, {
      sessionId: req.query.sessionId
    });
  }
}

/**
 * Controlador para endpoint /agent
 * Transfiere la llamada a un agente humano
 */
async function handleAgent(req, res) {
  try {
    const sessionId = req.query.sessionId || '';
    
    console.log(`📞 Transferencia a agente solicitada (sesión ${sessionId})`);
    
    // Registrar evento de transferencia
    if (sessionId) {
      monitoring.trackSessionEvent('completed', sessionId);
    }
    
    // Verificar si la transferencia está habilitada
    if (!config.transfer.enabled) {
      console.log('❌ Transferencia a agentes deshabilitada en configuración');
      monitoring.trackError('transfer_disabled', req.originalUrl, { sessionId });
      return sendResponse(res, RESPONSE_TYPES.CALLBACK, { sessionId });
    }
    
    // Enviar respuesta para transferir a agente
    sendResponse(res, RESPONSE_TYPES.AGENT_TRANSFER, { sessionId });
  } catch (error) {
    console.error('❌ Error al transferir a agente:', error);
    monitoring.trackError('agent_transfer', req.originalUrl, { 
      error: error.message,
      sessionId: req.query.sessionId || 'unknown'
    });
    
    respondWithError(res, ERROR_TYPES.SYSTEM_ERROR, {
      sessionId: req.query.sessionId
    });
  }
}

/**
 * Controlador para endpoint /metrics
 * Proporciona métricas y estadísticas del sistema
 */
function handleMetrics(req, res) {
  // Verificar si es una solicitud autorizada
  const authToken = req.query.token || '';
  if (authToken !== config.adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Obtener resumen de métricas
  const metricsSummary = monitoring.getMetricsSummary();
  
  // Agregar información de caché
  metricsSummary.cache = sessionCache.getActiveSessionsCount();
  
  res.json(metricsSummary);
}

/**
 * Controlador para endpoint /menu
 * Muestra menú principal con opciones
 */
async function handleMenu(req, res) {
  try {
    const sessionId = req.query.sessionId || '';
    
    // Validar ID de sesión
    if (!sessionId) {
      console.log('❌ ID de sesión no proporcionado');
      return respondWithError(res, ERROR_TYPES.SESSION_INVALID);
    }
    
    // Recuperar datos de la sesión
    const datosExpediente = sessionCache.getSession(sessionId);
    
    if (!datosExpediente) {
      console.log(`❌ Sesión no encontrada: ${sessionId}`);
      return respondWithError(res, ERROR_TYPES.SESSION_EXPIRED);
    }
    
    // Formatear datos para IVR
    const datosFormateados = formatearDatosParaIVR(datosExpediente);
    
    // Enviar respuesta con menú principal
    sendResponse(res, RESPONSE_TYPES.MAIN_MENU, {
      datosFormateados,
      sessionId,
      estatus: datosExpediente.estatus
    });
  } catch (error) {
    console.error('❌ Error al mostrar menú:', error);
    monitoring.trackError('menu_display', req.originalUrl, { 
      error: error.message,
      sessionId: req.query.sessionId || 'unknown'
    });
    
    respondWithError(res, ERROR_TYPES.SYSTEM_ERROR, {
      sessionId: req.query.sessionId
    });
  }
}

/**
 * Controlador para manejar respuestas del AI Assistant
 * NOTA: Este se mantiene por compatibilidad pero redirige al controlador AI
 */
async function handleAIResponse(req, res) {
  // Redirigir al controlador AI si existe
  const aiController = require('./aiController');
  if (aiController.handleInteraction) {
    return aiController.handleInteraction(req, res);
  }
  
  // Fallback: redirigir a welcome
  return sendResponse(res, RESPONSE_TYPES.WELCOME);
}

module.exports = {
  handleWelcome,
  handleExpediente,
  handleValidarExpediente,
  handleRespuesta,
  handleAgent,
  handleMetrics,
  handleMenu,
  handleAIResponse
};