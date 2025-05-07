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
  
  // Configurar opciones avanzadas para voz más natural
  // Forzar configuración de Amazon Polly con voz Mia
  const sayOptions = {
    provider: 'amazon',
    voice: 'Mia',
    language: 'es-MX',
    engine: 'neural', // Voz más natural
    rate: '0.95'      // Ligeramente más lento para mejor comprensión
  };
  
  console.log('🔊 Usando voz Amazon Polly Mia para mensaje de bienvenida');
  
  // Crear elemento Say con las opciones mejoradas
  const sayElement = XMLBuilder.addSay(welcomeMessage, sayOptions);
  
  // Configurar Gather con opciones avanzadas y soporte completo para voz
  const gatherOptions = {
    action: '/expediente',
    method: 'POST',
    numDigits: '1',
    validDigits: '12',
    timeout: '5',
    input: 'dtmf speech',
    interruptible: 'true',   // CRUCIAL: permite interrumpir con DTMF
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    language: 'es-MX',
    hints: 'expediente,consulta,servicio,cotizar,uno,dos',
    // Anidamos el Say dentro del Gather para permitir interrupción
    nested: sayElement
  };
  
  // Crear elemento Gather (con Say anidado para interrupción)
  const gatherElement = XMLBuilder.addGather(gatherOptions);
  
  // Construir respuesta XML
  return XMLBuilder.buildResponse([gatherElement]);
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
  
  // Configurar AI Assistant con opciones avanzadas
  const aiOptions = {
    aiProvider: 'telnyx',  // Usando el servicio nativo de Telnyx
    model: 'meta-llama/Meta-Llama-3-1-70B-Instruct',
    initialPrompt: initialPrompt,
    action: '/ai-response',
    fallbackAction: '/expediente',
    language: 'es-MX',
    voice: 'Mia',
    provider: 'amazon',
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
  
  // Configurar opciones avanzadas para voz
  const sayOptions = {
    provider: 'amazon',
    voice: 'Mia',
    language: 'es-MX',
    engine: 'neural'
  };
  
  console.log('🔊 Usando voz Amazon Polly Mia para solicitud de expediente');
  
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
