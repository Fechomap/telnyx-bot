/**
 * Controlador principal mejorado para endpoints TeXML
 * Versión optimizada con soporte para reconocimiento de voz y manejo avanzado de errores
 */
const { RESPONSE_TYPES, sendResponse } = require('../texml/handlers/templateHandler');
const { ERROR_TYPES, respondWithError } = require('../texml/handlers/errorHandler');
const sessionCache = require('../cache/sessionCache');
const speechHelper = require('../texml/helpers/speechHelper');
const { consultaUnificada, formatearDatosParaIVR } = require('../services/optimizedDataService');
const config = require('../config/texml');
const monitoring = require('../utils/monitoring');

/**
 * Controlador para endpoint /welcome
 * Muestra mensaje de bienvenida y opciones iniciales
 */
async function handleWelcome(req, res) {
  console.log('📞 Nueva llamada recibida, enviando bienvenida');
  
  // Registrar inicio de llamada en métricas
  monitoring.trackSessionEvent('created', 'new_call');
  
  // Enviar respuesta de bienvenida
  sendResponse(res, RESPONSE_TYPES.WELCOME);
}

/**
 * Controlador para endpoint /expediente
 * Solicita número de expediente al usuario
 */
async function handleExpediente(req, res) {
  try {
    console.log('🔢 Usuario seleccionó opción para consultar expediente');
    
    // Verificar entrada de voz y procesarla si existe
    const speechResult = req.body.SpeechResult || '';
    if (speechResult) {
      console.log(`🗣️ Entrada de voz recibida: "${speechResult}"`);
      monitoring.trackSpeechRecognition('attempt', speechResult, 'expediente');
      
      // Si la entrada incluye "servicio" o "cotizar", redirigir a ese flujo
      const normalizedInput = speechResult.toLowerCase();
      if (normalizedInput.includes('servicio') || 
          normalizedInput.includes('cotizar') || 
          normalizedInput.includes('cotizacion') ||
          normalizedInput.includes('cotización')) {
        
        monitoring.trackSpeechRecognition('success', speechResult, 'servicio');
        // Aquí se implementaría la redirección al flujo de cotización
        // Por ahora, informamos que no está disponible
        const notAvailableMessage = "Lo sentimos, la cotización de servicios no está disponible actualmente por este medio. Por favor, intente de nuevo seleccionando consulta de expediente.";
        const sayElement = XMLBuilder.addSay(notAvailableMessage);
        const redirectElement = XMLBuilder.addRedirect("/welcome");
        const responseXML = XMLBuilder.buildResponse([sayElement, redirectElement]);
        
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
      monitoring.trackSpeechRecognition('success', speechResult, 'expediente');
    }
    
    // Obtener contador de intentos para manejo de errores
    const attempt = parseInt(req.query.attempt) || 1;
    
    // Enviar respuesta solicitando número de expediente
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
      
      // Limpiar y normalizar la entrada
      expediente = speechResult.replace(/[^0-9]/g, '');
      
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
    
    if (speechResult) {
      console.log(`🗣️ Comando de voz recibido: "${speechResult}"`);
      monitoring.trackSpeechRecognition('attempt', speechResult, 'menu');
      
      // Interpretar entrada de voz utilizando el helper
      opcion = speechHelper.interpretSpeechInput(speechResult);
      
      if (opcion) {
        monitoring.trackSpeechRecognition('success', speechResult, opcion);
      } else {
        monitoring.trackSpeechRecognition('failure', speechResult, 'No reconocido');
        
        // Generar respuesta para entrada no reconocida
        return res.header('Content-Type', 'application/xml')
          .send(speechHelper.generateUnrecognizedInputXML(sessionId, datosExpediente.estatus));
      }
    } else if (digits) {
      opcion = digits;
    } else {
      console.log('❌ No se recibió ninguna entrada');
      monitoring.trackError('input_missing', req.originalUrl, { sessionId });
      return respondWithError(res, ERROR_TYPES.INPUT_INVALID, { sessionId });
    }
    
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
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
async function handleAIResponse(req, res) {
  try {
    const sessionId = req.query.sessionId || '';
    
    // Obtener texto de la respuesta del usuario
    const userInput = req.body.SpeechResult || req.body.input || '';
    
    // Recuperar datos de la sesión
    const expedienteData = sessionCache.getSession(sessionId);
    
    if (!expedienteData && userInput.toLowerCase().includes('expediente')) {
      // Si menciona expediente pero no hay sesión, redirigir a captura de expediente
      return sendResponse(res, RESPONSE_TYPES.REQUEST_EXPEDIENTE);
    }
    
    // Formatear contexto para AI
    const context = aiService.formatContextForAI(expedienteData);
    
    // Procesar con AI
    const aiResponse = await aiService.processQuery(userInput, context);
    
    // Generar respuesta XML con la respuesta del AI
    const sayElement = XMLBuilder.addSay(aiResponse, {
      voice: 'female',
      language: 'es-MX',
      engine: 'neural'
    });
    
    // Configurar opciones para continuar conversación
    const aiOptions = {
      aiProvider: 'telnyx',
      model: 'meta-llama/Meta-Llama-3-1-70B-Instruct',
      action: `/ai-response?sessionId=${sessionId}`,
      fallbackAction: `/menu?sessionId=${sessionId}`,
      language: 'es-MX',
      voice: 'female',
      maxTurns: '5',
      interruptible: 'true'
    };
    
    // Crear elemento AI para continuar conversación
    const aiElement = XMLBuilder.addAIAssistant(aiOptions);
    
    // Enviar respuesta completa
    const responseXML = XMLBuilder.buildResponse([sayElement, aiElement]);
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
    
  } catch (error) {
    console.error('❌ Error al procesar respuesta AI:', error);
    
    // En caso de error, redirigir al menú principal
    respondWithError(res, ERROR_TYPES.SYSTEM_ERROR, {
      sessionId: req.query.sessionId
    });
  }
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