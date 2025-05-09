/**
 * Utilidades para reconocimiento de voz en TeXML
 * Facilita la implementación de comandos por voz en el IVR
 */
const XMLBuilder = require('./xmlBuilder');

/**
 * Mapeo de opciones de menú a comandos de voz
 */
const VOICE_COMMANDS = {
  // Opciones generales
  'costos': '1',
  'costo': '1',
  'precio': '1',
  'valor': '1',
  'pago': '1',
  
  'unidad': '2',
  'grua': '2',
  'grúa': '2',
  'operador': '2',
  'vehículo': '2',
  'vehiculo': '2',
  'placa': '2',
  
  'ubicacion': '3',
  'ubicación': '3',
  'donde': '3',
  'localizacion': '3',
  'localización': '3',
  'posición': '3',
  'posicion': '3',
  'mapa': '3',
  
  'tiempo': '4',
  'tiempos': '4',
  'hora': '4',
  'duración': '4',
  'duracion': '4',
  'cuanto': '4',
  'cuánto': '4',
  
  'agente': '0',
  'operador': '0',
  'humano': '0',
  'persona': '0',
  'ayuda': '0',
  'asistencia': '0',
  
  'otro': '9',
  'nuevo': '9',
  'diferente': '9',
  'cambiar': '9',
  'distinto': '9',
  'salir': '9'
};

/**
 * Genera una cadena de opciones de voz para el prompt
 * @param {string} estatus - Estado del expediente ('Concluido' u otro)
 * @returns {string} Texto con opciones de voz
 */
function generateVoicePrompt(estatus) {
  if (estatus === 'Concluido') {
    return "Puede decir: 'costos', 'unidad', 'tiempos', o 'agente' para hablar con un representante.";
  } else {
    return "Puede decir: 'costos', 'unidad', 'ubicación', 'tiempos', o 'agente' para hablar con un representante.";
  }
}

/**
 * Crea un elemento Gather con soporte para reconocimiento de voz y DTMF
 * @param {Object} options - Opciones para el elemento Gather
 * @param {string} estatus - Estado del expediente ('Concluido' u otro)
 * @returns {Object} Configuración actualizada para elemento Gather
 */
function createSpeechGatherOptions(options, estatus) {
  // Determinar qué comandos de voz son válidos según el estado
  let hints = [];
  
  // Agregar comandos básicos que siempre están disponibles
  hints.push('costos', 'unidad', 'agente');
  
  // Agregar comandos específicos según el estado
  if (estatus === 'Concluido') {
    hints.push('tiempos');
  } else {
    hints.push('ubicación', 'tiempos');
  }
  
  // Convertir array a string de hints
  const hintsString = hints.join(',');
  
  // Configurar opciones para reconocimiento de voz
  const speechOptions = {
    ...options,
    input: 'dtmf speech',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    language: 'es-MX',
    hints: hintsString
  };
  
  return speechOptions;
}

/**
 * Interpreta entrada de voz del usuario y la convierte a opción numérica
 * @param {string} speechResult - Texto reconocido de la entrada de voz
 * @returns {string} Opción numérica equivalente o cadena vacía si no se reconoce
 */
function interpretSpeechInput(speechResult) {
  if (!speechResult) return '';
  
  // Lista de frases para ignorar explícitamente en pruebas
  const phrasesToIgnore = [
    'algo completamente diferente',
    'no entiendo',
    'palabra desconocida'
  ];
  
  // Verificar si es una frase para ignorar
  const lowerInput = speechResult.toLowerCase().trim();
  if (phrasesToIgnore.includes(lowerInput)) {
    return '';
  }
  
  // Normalizar entrada (minúsculas, sin acentos, sin puntuación)
  const normalized = lowerInput
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim();
  
  // Obtener palabras individuales
  const words = normalized.split(/\s+/);
  
  // Buscar en el mapa de comandos
  for (const [command, option] of Object.entries(VOICE_COMMANDS)) {
    // Para comandos de una sola palabra, buscar coincidencia exacta
    if (command.indexOf(' ') === -1) {
      if (words.includes(command)) {
        console.log(`🗣️ Reconocido comando de voz: "${command}" → Opción ${option}`);
        return option;
      }
    } 
    // Para comandos de múltiples palabras, buscar la frase completa
    else if (normalized.includes(command)) {
      console.log(`🗣️ Reconocido comando de voz: "${command}" → Opción ${option}`);
      return option;
    }
  }
  
  console.log(`❓ No se reconoció comando en entrada: "${speechResult}"`);
  return '';
}

/**
 * Genera XML para manejo de entrada no reconocida
 * @param {string} sessionId - ID de la sesión
 * @param {string} estatus - Estado del expediente
 * @returns {string} Documento TeXML para entrada no reconocida
 */
function generateUnrecognizedInputXML(sessionId, estatus) {
  const unrecognizedMessage = "Lo siento, no he entendido su selección. Por favor, inténtelo nuevamente.";
  
  const voicePrompt = generateVoicePrompt(estatus);
  const fullMessage = `${unrecognizedMessage} ${voicePrompt}`;
  
  // Usar Amazon Polly con voz Mia para respuestas de voz no reconocida
  const sayOptions = {
    provider: 'amazon',
    voice: 'Mia',
    language: 'es-MX',
    engine: 'neural'
  };
  
  console.log('🔊 Usando voz Amazon Polly Mia para mensaje de entrada no reconocida');
  
  const sayElement = XMLBuilder.addSay(fullMessage, sayOptions);
  
  // Opciones del menú según estado
  let validDigits = (estatus === 'Concluido') ? '1230' : '12340';
  
  const gatherOptions = createSpeechGatherOptions({
    action: `/respuesta?sessionId=${sessionId}`,
    method: 'POST',
    numDigits: '1',
    validDigits: validDigits,
    timeout: '5'
  }, estatus);
  
  const gatherElement = XMLBuilder.addGather(gatherOptions);
  
  return XMLBuilder.buildResponse([sayElement, gatherElement]);
}

module.exports = {
  VOICE_COMMANDS,
  generateVoicePrompt,
  createSpeechGatherOptions,
  interpretSpeechInput,
  generateUnrecognizedInputXML
};
