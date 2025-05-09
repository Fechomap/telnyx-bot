/**
 * Plantilla TeXML para menús de opciones
 * Genera XML para presentar opciones al usuario según estado del expediente
 */
const XMLBuilder = require('../helpers/xmlBuilder');
const config = require('../../config/texml');

/**
 * Genera XML para el menú principal después de validar expediente
 * @param {Object} datosFormateados - Datos formateados para presentación
 * @param {string} sessionId - ID de la sesión
 * @param {string} estatus - Estado del expediente ('Concluido' u otro)
 * @returns {string} Documento TeXML completo
 */
function generateMainMenuXML(datosFormateados, sessionId, estatus) {
  let menuOptions = '';
  let validDigits = '';
  
  // Determinar opciones según el estado
  if (estatus === 'Concluido') {
    menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para tiempos, o 0 para hablar con un agente.";
    validDigits = "1230";
  } else {
    menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para ubicación, 4 para tiempos, o 0 para hablar con un agente.";
    validDigits = "12340";
  }
  
  // Crear mensaje completo
  const fullMessage = `${datosFormateados.mensajeGeneral} ${menuOptions}`;
  
  // Simplificar opciones para usar solo voice
  const sayOptions = {
    voice: 'Mia'
  };
  
  console.log('🔊 Usando voz Mia para menú principal del agente');
  
  // Crear elementos XML
  const sayElement = XMLBuilder.addSay(fullMessage, sayOptions);
  
  const gatherOptions = {
    action: `/respuesta?sessionId=${sessionId}`,
    method: 'POST',
    numDigits: '1',
    validDigits: validDigits,
    timeout: '7',
    input: 'dtmf speech'
  };
  
  const gatherElement = XMLBuilder.addGather(gatherOptions);
  
  // Construir respuesta completa
  return XMLBuilder.buildResponse([sayElement, gatherElement]);
}

/**
 * Genera XML para el menú de respuesta específica
 * @param {string} mensajeRespuesta - Mensaje de respuesta según la opción seleccionada
 * @param {string} sessionId - ID de la sesión
 * @param {string} estatus - Estado del expediente ('Concluido' u otro)
 * @returns {string} Documento TeXML completo
 */
function generateResponseMenuXML(mensajeRespuesta, sessionId, estatus) {
  let menuOptions = '';
  let validDigits = '';
  
  // Determinar opciones según el estado
  if (estatus === 'Concluido') {
    menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para tiempos, 0 para hablar con un agente, o 9 para consultar otro expediente.";
    validDigits = "12309";
  } else {
    menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para ubicación, 4 para tiempos, 0 para hablar con un agente, o 9 para consultar otro expediente.";
    validDigits = "123409";
  }
  
  // Simplificar opciones para usar solo voice
  const sayOptions = {
    voice: 'Mia'
  };
  
  console.log('🔊 Usando voz Mia para menú de respuesta del agente');
  
  // Crear elementos XML
  const sayResponseElement = XMLBuilder.addSay(mensajeRespuesta, sayOptions);
  const sayMenuElement = XMLBuilder.addSay(menuOptions, sayOptions);
  
  const gatherOptions = {
    action: `/respuesta?sessionId=${sessionId}`,
    method: 'POST',
    numDigits: '1',
    validDigits: validDigits,
    timeout: '7',
    input: 'dtmf speech'
  };
  
  const gatherElement = XMLBuilder.addGather(gatherOptions);
  
  // Construir respuesta completa
  return XMLBuilder.buildResponse([
    sayResponseElement,
    sayMenuElement,
    gatherElement
  ]);
}

/**
 * Genera XML para error de expediente no encontrado
 * @returns {string} Documento TeXML completo
 */
function generateExpedienteNotFoundXML() {
  const notFoundMessage = "Expediente no encontrado. Intente nuevamente.";
  
  // Simplificar opciones para usar solo voice
  const sayOptions = {
    voice: 'Mia'
  };
  
  console.log('🔊 Usando voz Mia para mensaje de expediente no encontrado');
  
  const sayElement = XMLBuilder.addSay(notFoundMessage, sayOptions);
  const redirectElement = XMLBuilder.addRedirect("/expediente");
  
  return XMLBuilder.buildResponse([sayElement, redirectElement]);
}

/**
 * Genera XML para error de sesión caducada
 * @returns {string} Documento TeXML completo
 */
function generateSessionExpiredXML() {
  const expiredMessage = "Su sesión ha expirado. Por favor, inicie nuevamente.";
  
  // Simplificar opciones para usar solo voice
  const sayOptions = {
    voice: 'Mia'
  };
  
  console.log('🔊 Usando voz Mia para mensaje de sesión expirada');
  
  const sayElement = XMLBuilder.addSay(expiredMessage, sayOptions);
  const redirectElement = XMLBuilder.addRedirect("/welcome");
  
  return XMLBuilder.buildResponse([sayElement, redirectElement]);
}

/**
 * Genera XML para error general
 * @returns {string} Documento TeXML completo
 */
function generateErrorXML() {
  const errorMessage = "Ocurrió un error al procesar su solicitud. Intente nuevamente más tarde.";
  
  // Simplificar opciones para usar solo voice
  const sayOptions = {
    voice: 'Mia'
  };
  
  console.log('🔊 Usando voz Mia para mensaje de error');
  
  const sayElement = XMLBuilder.addSay(errorMessage, sayOptions);
  const hangupElement = XMLBuilder.addHangup();
  
  return XMLBuilder.buildResponse([sayElement, hangupElement]);
}

/**
 * Genera XML para transferir a un agente humano
 * @param {string} sessionId - ID de la sesión
 * @returns {string} Documento TeXML completo
 */
function generateAgentTransferXML(sessionId) {
  const transferMessage = "Transfiriendo su llamada a un agente. Por favor espere un momento...";
  
  // Simplificar opciones para usar solo voice
  const sayOptions = {
    voice: 'Mia'
  };
  
  console.log('🔊 Usando voz Mia para mensaje de transferencia a agente');
  
  const sayElement = XMLBuilder.addSay(transferMessage, sayOptions);
  
  // Configurar número de agente (desde config)
  const agentNumber = config?.transfer?.agentNumber || '+15551234567';
  
  const dialElement = XMLBuilder.addDial(agentNumber, {
    callerId: config?.service?.callerId,
    timeout: '30'
  });
  
  return XMLBuilder.buildResponse([sayElement, dialElement]);
}

/**
 * Genera XML para ofrecer callback cuando no hay agentes disponibles
 * @param {string} sessionId - ID de la sesión
 * @returns {string} Documento TeXML completo
 */
function generateCallbackXML(sessionId) {
  const callbackMessage = "Todos nuestros agentes están ocupados en este momento. Un representante se comunicará con usted lo antes posible. Gracias por su paciencia.";
  
  // Simplificar opciones para usar solo voice
  const sayOptions = {
    voice: 'Mia'
  };
  
  console.log('🔊 Usando voz Mia para mensaje de callback');
  
  const sayElement = XMLBuilder.addSay(callbackMessage, sayOptions);
  
  const hangupElement = XMLBuilder.addHangup();
  
  return XMLBuilder.buildResponse([sayElement, hangupElement]);
}

module.exports = {
  generateMainMenuXML,
  generateResponseMenuXML,
  generateExpedienteNotFoundXML,
  generateSessionExpiredXML,
  generateErrorXML,
  generateAgentTransferXML,
  generateCallbackXML
};