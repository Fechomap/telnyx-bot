/**
 * Plantilla TeXML para el mensaje de bienvenida
 * Versión mejorada con opciones avanzadas y soporte AI
 */
const XMLBuilder = require('../helpers/xmlBuilder');
const config = require('../../config/texml');

/**
 * Genera el XML para la pantalla de bienvenida estándar
 * @returns {string} Documento TeXML completo
 */
function generateWelcomeXML() {
  const welcomeMessage = 
    "Bienvenido al sistema de consulta. " +
    "Para seguimiento de expediente, presione 1 o diga 'expediente'. " +
    "Para solicitar o cotizar un servicio, presione 2 o diga 'servicio'.";
  
  // Simplificar opciones para usar solo voice
  const sayOptions = {
    voice: 'Polly.Mia-Neural'
  };
  
  // Crear elemento Say independiente
  const sayElement = XMLBuilder.addSay(welcomeMessage, sayOptions);
  
  // Configurar Gather separado
  const gatherOptions = {
    action: '/expediente',
    method: 'POST',
    numDigits: '1',
    validDigits: '12',
    timeout: '5',
    input: 'dtmf speech',
    interruptible: 'true',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    language: 'es-MX',
    hints: 'expediente,consulta,servicio,cotizar,uno,dos'
  };
  
  // Crear elemento Gather
  const gatherElement = XMLBuilder.addGather(gatherOptions);
  
  // Construir respuesta XML con Say ANTES de Gather
  return XMLBuilder.buildResponse([sayElement, gatherElement]);
}

/**
 * Genera el XML para la pantalla de bienvenida con AI Assistant
 * @returns {string} Documento TeXML completo con AI
 */
function generateWelcomeWithAIXML() {
  const initialPrompt = 
    "Hola, soy tu asistente virtual para consultas de expedientes. " +
    "¿En qué puedo ayudarte hoy? Puedes preguntarme sobre tu expediente, " +
    "consultar el estado, costos, o cualquier otra información que necesites.";
  
  // Simplificar opciones AI
  const aiOptions = {
    aiProvider: 'telnyx',
    model: 'meta-llama/Meta-Llama-3-1-70B-Instruct',
    initialPrompt: initialPrompt,
    action: '/ai-response',
    fallbackAction: '/expediente',
    language: 'es-MX',
    voice: 'Polly.Mia-Neural',  // Solo especificar voice
    maxTurns: '5',
    interruptible: 'true'
  };
  
  // Crear elemento AI Assistant
  const aiElement = XMLBuilder.addAIAssistant(aiOptions);
  
  // Construir respuesta XML
  return XMLBuilder.buildResponse([aiElement]);
}

/**
 * Genera el XML para solicitar número de expediente
 * @returns {string} Documento TeXML completo
 */
function generateRequestExpedienteXML() {
  const requestMessage = 
    "Por favor, ingrese su número de expediente seguido de la tecla numeral " +
    "o díctelo claramente dígito por dígito.";
  
  // Simplificar opciones para usar solo voice
  const sayOptions = {
    voice: 'Polly.Mia-Neural'
  };
  
  console.log('🔊 Usando voz Polly.Mia-Neural para solicitud de expediente');
  
  // Crear elemento Say
  const sayElement = XMLBuilder.addSay(requestMessage, sayOptions);
  
  // Configurar Gather con opciones avanzadas
  const gatherOptions = {
    action: '/validar-expediente',
    method: 'POST',
    finishOnKey: '#',
    validDigits: '0123456789',
    timeout: '10',
    input: 'dtmf speech',
    interruptible: 'true',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    language: 'es-MX',
    nested: sayElement  // Anidamos el Say para permitir interrupción
  };
  
  // Crear elemento Gather
  const gatherElement = XMLBuilder.addGather(gatherOptions);
  
  // Construir respuesta XML
  return XMLBuilder.buildResponse([gatherElement]);
}

// Exportar todas las funciones
module.exports = {
  generateWelcomeXML,
  generateWelcomeWithAIXML,
  generateRequestExpedienteXML
};
