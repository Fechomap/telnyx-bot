/**
 * Controlador centralizado para plantillas TeXML
 * Proporciona una interfaz unificada para todas las plantillas XML
 */
const welcomeTemplates = require('../templates/welcome');
const menuTemplates = require('../templates/menu');
const agentTemplates = require('../templates/agent');

/**
 * Constantes para tipos de respuesta
 */
const RESPONSE_TYPES = {
  WELCOME: 'welcome',
  REQUEST_EXPEDIENTE: 'requestExpediente',
  MAIN_MENU: 'mainMenu',
  RESPONSE_MENU: 'responseMenu',
  AGENT_TRANSFER: 'agentTransfer',
  CALLBACK: 'callback',
  EXPEDIENTE_NOT_FOUND: 'expedienteNotFound',
  SESSION_EXPIRED: 'sessionExpired',
  ERROR: 'error'
};

/**
 * Genera respuesta XML según el tipo solicitado y los parámetros
 * @param {string} type - Tipo de respuesta (usar constantes RESPONSE_TYPES)
 * @param {Object} params - Parámetros específicos para la plantilla
 * @returns {string} Documento TeXML completo
 */
function generateResponse(type, params = {}) {
  console.log(`Generando respuesta TeXML de tipo: ${type}`);
  
  switch (type) {
    case RESPONSE_TYPES.WELCOME:
      // Siempre usar la versión estándar, nunca la versión con AI
      return welcomeTemplates.generateWelcomeXML();
      
    case RESPONSE_TYPES.REQUEST_EXPEDIENTE:
      return welcomeTemplates.generateRequestExpedienteXML();
      
    case RESPONSE_TYPES.MAIN_MENU:
      return menuTemplates.generateMainMenuXML(
        params.datosFormateados,
        params.sessionId,
        params.estatus
      );
      
    case RESPONSE_TYPES.RESPONSE_MENU:
      return menuTemplates.generateResponseMenuXML(
        params.mensajeRespuesta,
        params.sessionId,
        params.estatus
      );
      
    case RESPONSE_TYPES.AGENT_TRANSFER:
      return agentTemplates.generateAgentTransferXML(params.sessionId);
      
    case RESPONSE_TYPES.CALLBACK:
      return agentTemplates.generateCallbackXML(params.sessionId);
      
    case RESPONSE_TYPES.EXPEDIENTE_NOT_FOUND:
      return menuTemplates.generateExpedienteNotFoundXML();
      
    case RESPONSE_TYPES.SESSION_EXPIRED:
      return menuTemplates.generateSessionExpiredXML();
      
    case RESPONSE_TYPES.ERROR:
      return menuTemplates.generateErrorXML();
      
    default:
      console.error(`Tipo de respuesta TeXML desconocido: ${type}`);
      return menuTemplates.generateErrorXML();
  }
}

/**
 * Envía respuesta TeXML al cliente
 * @param {Object} res - Objeto de respuesta Express
 * @param {string} type - Tipo de respuesta (usar constantes RESPONSE_TYPES)
 * @param {Object} params - Parámetros específicos para la plantilla
 */
function sendResponse(res, type, params = {}) {
  const responseXML = generateResponse(type, params);
  
  console.log(`📝 ENVIANDO XML:\n${responseXML}`);
  
  res.header('Content-Type', 'application/xml');
  res.send(responseXML);
}

module.exports = {
  RESPONSE_TYPES,
  generateResponse,
  sendResponse
};
