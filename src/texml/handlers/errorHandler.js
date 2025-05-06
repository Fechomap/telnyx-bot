/**
 * Sistema avanzado de manejo de errores para TeXML
 * Gestiona diferentes tipos de errores y proporciona respuestas apropiadas
 */
const XMLBuilder = require('../helpers/xmlBuilder');
const config = require('../../config/texml');

/**
 * Tipos de error soportados
 */
const ERROR_TYPES = {
  // Errores de expediente
  EXPEDIENTE_NOT_FOUND: 'expediente_not_found',
  EXPEDIENTE_INVALID: 'expediente_invalid',
  
  // Errores de sesión
  SESSION_EXPIRED: 'session_expired',
  SESSION_INVALID: 'session_invalid',
  
  // Errores de entrada
  INPUT_INVALID: 'input_invalid',
  INPUT_TIMEOUT: 'input_timeout',
  INPUT_UNRECOGNIZED: 'input_unrecognized',
  
  // Errores de sistema
  SYSTEM_ERROR: 'system_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  DATABASE_ERROR: 'database_error',
  
  // Errores de llamada
  CALL_DROPPED: 'call_dropped',
  CALL_QUALITY: 'call_quality',
  
  // Errores de red
  NETWORK_ERROR: 'network_error',
  API_ERROR: 'api_error'
};

/**
 * Configuración de intentos por tipo de error
 */
const ERROR_RETRY_CONFIG = {
  [ERROR_TYPES.EXPEDIENTE_NOT_FOUND]: 3,
  [ERROR_TYPES.EXPEDIENTE_INVALID]: 3,
  [ERROR_TYPES.INPUT_INVALID]: 2,
  [ERROR_TYPES.INPUT_TIMEOUT]: 2,
  [ERROR_TYPES.INPUT_UNRECOGNIZED]: 2,
  [ERROR_TYPES.SYSTEM_ERROR]: 1,
  [ERROR_TYPES.SERVICE_UNAVAILABLE]: 1,
  [ERROR_TYPES.DATABASE_ERROR]: 1,
  [ERROR_TYPES.NETWORK_ERROR]: 1,
  [ERROR_TYPES.API_ERROR]: 1
};

/**
 * Mapeo de mensajes por tipo de error
 */
const ERROR_MESSAGES = {
  [ERROR_TYPES.EXPEDIENTE_NOT_FOUND]: "No se encontró el expediente con el número proporcionado. Por favor, verifique e intente nuevamente.",
  [ERROR_TYPES.EXPEDIENTE_INVALID]: "El número de expediente proporcionado no es válido. Por favor, ingrese solo dígitos numéricos.",
  [ERROR_TYPES.SESSION_EXPIRED]: "Su sesión ha expirado por inactividad. Por favor, inicie nuevamente.",
  [ERROR_TYPES.SESSION_INVALID]: "No se pudo recuperar la información de su sesión. Por favor, inicie nuevamente.",
  [ERROR_TYPES.INPUT_INVALID]: "La opción seleccionada no es válida para este menú. Por favor, seleccione una opción del menú.",
  [ERROR_TYPES.INPUT_TIMEOUT]: "No se detectó ninguna entrada. Por favor, seleccione una opción del menú.",
  [ERROR_TYPES.INPUT_UNRECOGNIZED]: "No se pudo reconocer su selección. Por favor, intente nuevamente.",
  [ERROR_TYPES.SYSTEM_ERROR]: "Ocurrió un error en el sistema. Por favor, intente nuevamente más tarde.",
  [ERROR_TYPES.SERVICE_UNAVAILABLE]: "El servicio no está disponible en este momento. Por favor, intente nuevamente más tarde.",
  [ERROR_TYPES.DATABASE_ERROR]: "Ocurrió un error al consultar la base de datos. Por favor, intente nuevamente más tarde.",
  [ERROR_TYPES.CALL_DROPPED]: "Se detectó una interrupción en la llamada. Si puede escuchar este mensaje, continúe con su consulta.",
  [ERROR_TYPES.CALL_QUALITY]: "Se detectaron problemas de calidad en la llamada. Si tiene dificultades, intente llamar nuevamente.",
  [ERROR_TYPES.NETWORK_ERROR]: "Ocurrió un error de red. Por favor, intente nuevamente más tarde.",
  [ERROR_TYPES.API_ERROR]: "Ocurrió un error al comunicarse con el servicio. Por favor, intente nuevamente más tarde."
};

/**
 * Mapeo de acciones por tipo de error
 */
const ERROR_ACTIONS = {
  [ERROR_TYPES.EXPEDIENTE_NOT_FOUND]: '/expediente',
  [ERROR_TYPES.EXPEDIENTE_INVALID]: '/expediente',
  [ERROR_TYPES.SESSION_EXPIRED]: '/welcome',
  [ERROR_TYPES.SESSION_INVALID]: '/welcome',
  [ERROR_TYPES.INPUT_INVALID]: null,  // Se determina dinámicamente
  [ERROR_TYPES.INPUT_TIMEOUT]: null,  // Se determina dinámicamente
  [ERROR_TYPES.INPUT_UNRECOGNIZED]: null,  // Se determina dinámicamente
  [ERROR_TYPES.SYSTEM_ERROR]: '/welcome',
  [ERROR_TYPES.SERVICE_UNAVAILABLE]: null,  // Termina la llamada
  [ERROR_TYPES.DATABASE_ERROR]: '/welcome',
  [ERROR_TYPES.CALL_DROPPED]: null,  // Se determina dinámicamente
  [ERROR_TYPES.CALL_QUALITY]: null,  // Se determina dinámicamente
  [ERROR_TYPES.NETWORK_ERROR]: '/welcome',
  [ERROR_TYPES.API_ERROR]: '/welcome'
};

/**
 * Genera XML para respuesta de error
 * @param {string} errorType - Tipo de error (usar constantes ERROR_TYPES)
 * @param {Object} options - Opciones adicionales
 * @returns {string} Documento TeXML para respuesta de error
 */
function generateErrorResponse(errorType, options = {}) {
  // Valor predeterminado para contador de intentos
  const attemptCount = options.attemptCount || 1;
  
  // Obtener mensaje de error
  const errorMessage = ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.SYSTEM_ERROR];
  
  // Obtener acción para el error
  let errorAction = ERROR_ACTIONS[errorType];
  
  // Si la acción es dinámica, usar la proporcionada en las opciones
  if (errorAction === null && options.action) {
    errorAction = options.action;
  }
  
  // Obtener el número máximo de intentos para este tipo de error
  const maxAttempts = ERROR_RETRY_CONFIG[errorType] || 1;
  
  // Verificar si se alcanzó el máximo de intentos
  const isMaxAttemptsReached = attemptCount >= maxAttempts;
  
  // Elementos a incluir en la respuesta
  const elements = [];
  
  // Agregar mensaje de error
  elements.push(XMLBuilder.addSay(errorMessage));
  
  // Si se alcanzó el máximo de intentos o no hay acción definida
  if (isMaxAttemptsReached || !errorAction) {
    if (errorType === ERROR_TYPES.SERVICE_UNAVAILABLE || 
        errorType === ERROR_TYPES.DATABASE_ERROR || 
        errorType === ERROR_TYPES.SYSTEM_ERROR) {
      
      // Mensaje de finalización para errores críticos
      const finalMessage = "Lamentamos los inconvenientes. Su consulta ha sido registrada y nos comunicaremos con usted a la brevedad.";
      elements.push(XMLBuilder.addSay(finalMessage));
      
      // Finalizar llamada
      elements.push(XMLBuilder.addHangup());
    } else if (options.sessionId) {
      // Si hay una sesión activa, ofrecer opciones
      const redirectMessage = "Le redirigiremos al menú principal.";
      elements.push(XMLBuilder.addSay(redirectMessage));
      
      // Redirigir a menú principal con la sesión existente
      elements.push(XMLBuilder.addRedirect(`/menu?sessionId=${options.sessionId}`));
    } else {
      // Redirigir al inicio para reiniciar
      const restartMessage = "Iniciaremos nuevamente.";
      elements.push(XMLBuilder.addSay(restartMessage));
      
      elements.push(XMLBuilder.addRedirect('/welcome'));
    }
  } else {
    // Hay acción definida y no se alcanzó el máximo de intentos
    
    // Construir URL con parámetros de intentos
    let actionUrl = errorAction;
    if (actionUrl.includes('?')) {
      actionUrl += `&attempt=${attemptCount + 1}`;
    } else {
      actionUrl += `?attempt=${attemptCount + 1}`;
    }
    
    // Agregar sessionId si existe
    if (options.sessionId && !actionUrl.includes('sessionId')) {
      actionUrl += `&sessionId=${options.sessionId}`;
    }
    
    // Redirigir a la acción correspondiente
    elements.push(XMLBuilder.addRedirect(actionUrl));
  }
  
  // Construir respuesta completa
  return XMLBuilder.buildResponse(elements);
}

/**
 * Registra el error en los logs
 * @param {string} errorType - Tipo de error
 * @param {Object} details - Detalles adicionales del error
 */
function logError(errorType, details = {}) {
  const timestamp = new Date().toISOString();
  
  console.error(`
❌ ERROR [${timestamp}] - Tipo: ${errorType}
- SessionID: ${details.sessionId || 'N/A'}
- Intento: ${details.attemptCount || 1}/${ERROR_RETRY_CONFIG[errorType] || 1}
- URL: ${details.url || 'N/A'}
- Mensaje: ${ERROR_MESSAGES[errorType] || 'Error desconocido'}
- Detalles técnicos: ${details.technicalDetails || 'N/A'}
  `);
}

/**
 * Responde a un error
 * @param {Object} res - Objeto de respuesta Express
 * @param {string} errorType - Tipo de error (usar constantes ERROR_TYPES)
 * @param {Object} options - Opciones adicionales
 */
function respondWithError(res, errorType, options = {}) {
  // Registrar el error
  logError(errorType, options);
  
  // Generar respuesta XML
  const errorXML = generateErrorResponse(errorType, options);
  
  // Enviar respuesta
  res.header('Content-Type', 'application/xml');
  res.send(errorXML);
}

module.exports = {
  ERROR_TYPES,
  ERROR_RETRY_CONFIG,
  generateErrorResponse,
  logError,
  respondWithError
};