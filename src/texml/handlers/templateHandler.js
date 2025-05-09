/**
 * Controlador centralizado para plantillas TeXML
 * Proporciona una interfaz unificada para todas las plantillas XML
 */
const welcomeTemplates = require('../templates/welcome');
// Eliminar o actualizar estas líneas que causan el error:
// const menuTemplates = require('../templates/menu');  // ELIMINAR
// const agentTemplates = require('../templates/agent'); // ELIMINAR

const XMLBuilder = require('../helpers/xmlBuilder');
const config = require('../../config/texml');

/**
 * Constantes para tipos de respuesta
 */
const RESPONSE_TYPES = {
  WELCOME: 'welcome',
  AI_ASSISTANT: 'aiAssistant',
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
      return welcomeTemplates.generateWelcomeXML();
      
    case RESPONSE_TYPES.AI_ASSISTANT:
      // Usar XMLBuilder directamente para AI Assistant
      const aiElement = XMLBuilder.addAIAssistant(params);
      return XMLBuilder.buildResponse([aiElement]);
      
    case RESPONSE_TYPES.ERROR:
      // Generar mensaje de error simple
      const errorMessage = params.message || "Ha ocurrido un error. Por favor intente nuevamente.";
      const sayElement = XMLBuilder.addSay(errorMessage, { voice: config.tts.voice });
      const redirectElement = XMLBuilder.addRedirect('/welcome');
      return XMLBuilder.buildResponse([sayElement, redirectElement]);
      
    default:
      console.error(`Tipo de respuesta TeXML desconocido: ${type}`);
      return generateResponse(RESPONSE_TYPES.ERROR, { message: 'Error del sistema' });
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