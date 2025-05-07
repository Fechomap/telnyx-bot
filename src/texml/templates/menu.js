/**
 * Plantilla TeXML para menús de opciones
 * Genera XML para presentar opciones al usuario según estado del expediente
 * Incluye soporte para reconocimiento de voz
 */
const XMLBuilder = require('../helpers/xmlBuilder');
const speechHelper = require('../helpers/speechHelper');

/**
 * Genera XML para el menú principal después de validar expediente
 * @param {Object} datosFormateados - Datos formateados para presentación
 * @param {string} sessionId - ID de la sesión
 * @param {string} estatus - Estado del expediente ('Concluido' u otro)
 * @returns {string} Documento TeXML completo
 */
function generateMainMenuXML(datosFormateados, sessionId, estatus) {
  // Obtener texto para opciones por voz
  const voicePrompt = speechHelper.generateVoicePrompt(estatus);
  
  // Determinar opciones según el estado
  let menuOptions = '';
  let validDigits = '';
  
  if (estatus === 'Concluido') {
    menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para tiempos, o 0 para hablar con un agente.";
    validDigits = "1230";
  } else {
    menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para ubicación, 4 para tiempos, o 0 para hablar con un agente.";
    validDigits = "12340";
  }
  
  // Crear mensaje completo
  const fullMessage = `${datosFormateados.mensajeGeneral} ${menuOptions} ${voicePrompt}`;
  
  // Configurar opciones de voz para Amazon Polly
  const sayOptions = {
    provider: 'amazon',
    voice: 'Mia',
    language: 'es-MX',
    engine: 'neural'
  };
  
  console.log('🔊 Usando voz Amazon Polly Mia para menú principal');
  
  // Crear elementos XML
  const sayElement = XMLBuilder.addSay(fullMessage, sayOptions);
  
  // Configurar opciones para reconocimiento de voz
  const gatherOptions = speechHelper.createSpeechGatherOptions({
    action: `/respuesta?sessionId=${sessionId}`,
    method: 'POST',
    numDigits: '1',
    validDigits: validDigits,
    timeout: '7'
  }, estatus);
  
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
  // Obtener texto para opciones por voz
  const voicePrompt = speechHelper.generateVoicePrompt(estatus);
  
  // Determinar opciones según el estado
  let menuOptions = '';
  let validDigits = '';
  
  if (estatus === 'Concluido') {
    menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para tiempos, 0 para hablar con un agente, o 9 para consultar otro expediente.";
    validDigits = "12309";
  } else {
    menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para ubicación, 4 para tiempos, 0 para hablar con un agente, o 9 para consultar otro expediente.";
    validDigits = "123409";
  }
  
  // Crear mensaje del menú con opciones de voz
  const menuMessage = `${menuOptions} ${voicePrompt}`;
  
  // Configurar opciones de voz para Amazon Polly
  const sayOptions = {
    provider: 'amazon',
    voice: 'Mia',
    language: 'es-MX',
    engine: 'neural'
  };
  
  console.log('🔊 Usando voz Amazon Polly Mia para menú de respuesta');
  
  // Crear elementos XML
  const sayResponseElement = XMLBuilder.addSay(mensajeRespuesta, sayOptions);
  const sayMenuElement = XMLBuilder.addSay(menuMessage, sayOptions);
  
  // Configurar opciones para reconocimiento de voz
  const gatherOptions = speechHelper.createSpeechGatherOptions({
    action: `/respuesta?sessionId=${sessionId}`,
    method: 'POST',
    numDigits: '1',
    validDigits: validDigits,
    timeout: '7'
  }, estatus);
  
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
  
  // Configurar opciones de voz para Amazon Polly
  const sayOptions = {
    provider: 'amazon',
    voice: 'Mia',
    language: 'es-MX',
    engine: 'neural'
  };
  
  console.log('🔊 Usando voz Amazon Polly Mia para mensaje de expediente no encontrado');
  
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
  
  // Configurar opciones de voz para Amazon Polly
  const sayOptions = {
    provider: 'amazon',
    voice: 'Mia',
    language: 'es-MX',
    engine: 'neural'
  };
  
  console.log('🔊 Usando voz Amazon Polly Mia para mensaje de sesión expirada');
  
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
  
  // Configurar opciones de voz para Amazon Polly
  const sayOptions = {
    provider: 'amazon',
    voice: 'Mia',
    language: 'es-MX',
    engine: 'neural'
  };
  
  console.log('🔊 Usando voz Amazon Polly Mia para mensaje de error');
  
  const sayElement = XMLBuilder.addSay(errorMessage, sayOptions);
  const hangupElement = XMLBuilder.addHangup();
  
  return XMLBuilder.buildResponse([sayElement, hangupElement]);
}

module.exports = {
  generateMainMenuXML,
  generateResponseMenuXML,
  generateExpedienteNotFoundXML,
  generateSessionExpiredXML,
  generateErrorXML
};
