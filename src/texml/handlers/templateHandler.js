/**
 * Controlador centralizado para plantillas TeXML
 * Proporciona una interfaz unificada para todas las plantillas XML
 */
const XMLBuilder = require('../helpers/xmlBuilder');
const config = require('../../config/texml');

const RESPONSE_TYPES = {
  WELCOME: 'welcome',
  AI_ASSISTANT: 'aiAssistant',
  ERROR: 'error'
};

function generateResponse(type, params = {}) {
  switch (type) {
    case RESPONSE_TYPES.WELCOME:
      // Generar bienvenida directamente con XMLBuilder
      const welcomeMessage = "Bienvenido al sistema de consulta de expedientes.";
      const sayElement = XMLBuilder.addSay(welcomeMessage, { voice: config.tts.voice });
      return XMLBuilder.buildResponse([sayElement]);
      
    case RESPONSE_TYPES.AI_ASSISTANT:
      const aiElement = XMLBuilder.addAIAssistant(params);
      return XMLBuilder.buildResponse([aiElement]);
      
    case RESPONSE_TYPES.ERROR:
      const errorMessage = params.message || "Ha ocurrido un error.";
      const errorSay = XMLBuilder.addSay(errorMessage, { voice: config.tts.voice });
      const redirect = XMLBuilder.addRedirect('/welcome');
      return XMLBuilder.buildResponse([errorSay, redirect]);
      
    default:
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