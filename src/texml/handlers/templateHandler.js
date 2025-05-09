/**
 * Controlador centralizado para plantillas TeXML
 * Proporciona una interfaz unificada para todas las plantillas XML
 */
const XMLBuilder = require('../helpers/xmlBuilder');
const config = require('../../config/texml');

const RESPONSE_TYPES = {
  WELCOME: 'welcome',
  AI_ASSISTANT: 'aiAssistant',
  ERROR: 'error',
  REQUEST_EXPEDIENTE: 'requestExpediente',
  MAIN_MENU: 'mainMenu',
  RESPONSE_MENU: 'responseMenu',
  AGENT_TRANSFER: 'agentTransfer',
  CALLBACK: 'callback'
};

function generateResponse(type, params = {}) {
  switch (type) {
    case RESPONSE_TYPES.WELCOME:
      // Para el flujo AI, la bienvenida es manejada por AI Assistant
      const initialPrompt = 
        "Bienvenido al sistema de consulta de expedientes. " +
        "Por favor, dime o ingresa el número de expediente que deseas consultar.";
      
      const aiOptions = {
        aiProvider: config.ai.provider,
        model: config.ai.model,
        initialPrompt: initialPrompt,
        action: config.routes.processExpediente,
        fallbackAction: config.routes.welcome,
        language: config.tts.language,
        voice: config.tts.voice,
        maxTurns: String(config.ai.maxTurns),
        interruptible: 'true',
        enhanced: 'true'
      };
      
      const aiElement = XMLBuilder.addAIAssistant(aiOptions);
      return XMLBuilder.buildResponse([aiElement]);
      
    case RESPONSE_TYPES.AI_ASSISTANT:
      const aiElementDirect = XMLBuilder.addAIAssistant(params);
      return XMLBuilder.buildResponse([aiElementDirect]);
      
    case RESPONSE_TYPES.ERROR:
      const errorMessage = params.message || "Ha ocurrido un error.";
      const errorSay = XMLBuilder.addSay(errorMessage, { voice: config.tts.voice });
      const redirect = XMLBuilder.addRedirect('/welcome');
      return XMLBuilder.buildResponse([errorSay, redirect]);
      
    case RESPONSE_TYPES.REQUEST_EXPEDIENTE:
      // Esto ya es manejado por AI Assistant en WELCOME
      return generateResponse(RESPONSE_TYPES.WELCOME);
      
    case RESPONSE_TYPES.AGENT_TRANSFER:
      const transferMessage = config.transfer.transferMessage || 
        "Transfiriendo a un agente. Por favor espere un momento...";
      
      const sayElement = XMLBuilder.addSay(transferMessage, { 
        voice: config.tts.voice 
      });
      
      const dialElement = XMLBuilder.addDial(config.transfer.agentNumber, {
        callerId: config.service.callerId,
        timeout: '30'
      });
      
      return XMLBuilder.buildResponse([sayElement, dialElement]);
      
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