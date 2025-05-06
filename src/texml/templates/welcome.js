/**
 * Plantilla TeXML para el mensaje de bienvenida
 */
const XMLBuilder = require('../helpers/xmlBuilder');

/**
 * Genera el XML para la pantalla de bienvenida
 * @returns {string} Documento TeXML completo
 */
function generateWelcomeXML() {
  const welcomeMessage = 
    "Bienvenido al sistema de consulta. " +
    "Para seguimiento de expediente, presione 1. " +
    "Para solicitar o cotizar un servicio, presione 2.";
  
  const sayElement = XMLBuilder.addSay(welcomeMessage);
  
  const gatherOptions = {
    action: '/expediente',
    method: 'POST',
    numDigits: '1',
    validDigits: '12',
    timeout: '5'
  };
  
  const gatherElement = XMLBuilder.addGather(gatherOptions);
  
  return XMLBuilder.buildResponse([sayElement, gatherElement]);
}

/**
 * Genera el XML para solicitar número de expediente
 * @returns {string} Documento TeXML completo
 */
function generateRequestExpedienteXML() {
  const requestMessage = 
    "Por favor, ingrese su número de expediente seguido de la tecla numeral";
  
  const sayElement = XMLBuilder.addSay(requestMessage);
  
  const gatherOptions = {
    action: '/validar-expediente',
    method: 'POST',
    finishOnKey: '#',
    validDigits: '0123456789',
    timeout: '7'
  };
  
  const gatherElement = XMLBuilder.addGather(gatherOptions);
  
  return XMLBuilder.buildResponse([sayElement, gatherElement]);
}

module.exports = {
  generateWelcomeXML,
  generateRequestExpedienteXML
};