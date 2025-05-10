/**
 * Utilidades para procesamiento de entrada de voz
 * Ayuda a extraer información de la entrada hablada del usuario
 */

/**
 * Extrae un número de expediente de texto hablado
 * @param {string} text - Texto reconocido del usuario
 * @returns {string} Número de expediente extraído o cadena vacía
 */
function extractExpedienteFromText(text) {
  if (!text) return '';
  
  // Normalizar texto (quitar acentos, minúsculas)
  const normalizedText = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:!?]/g, ' ');
  
  // Patrones a buscar
  const expedientePatterns = [
    /expediente\s+(?:número\s+)?(\d+)/i,     // "expediente número 12345"
    /(?:número|numero)\s+(\d+)/i,           // "número 12345"
    /es\s+(?:el\s+)?(\d+)/i,                // "es el 12345"
    /(\d+)/                                 // Cualquier secuencia de dígitos
  ];
  
  // Intentar cada patrón
  for (const pattern of expedientePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Si no hay coincidencias, buscar palabras de números
  const numberWords = {
    'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 
    'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9',
    'diez': '10', 'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14',
    'quince': '15', 'dieciseis': '16', 'diecisiete': '17', 'dieciocho': '18', 'diecinueve': '19',
    'veinte': '20', 'treinta': '30', 'cuarenta': '40', 'cincuenta': '50',
    'sesenta': '60', 'setenta': '70', 'ochenta': '80', 'noventa': '90'
  };
  
  const words = normalizedText.split(/\s+/);
  let expediente = '';
  
  // Procesar palabras una por una
  for (const word of words) {
    if (numberWords[word]) {
      expediente += numberWords[word];
    }
  }
  
  return expediente;
}

/**
 * Formatea datos del expediente para uso en AI Assistant
 * @param {Object} expedienteData - Datos del expediente
 * @returns {Object} Variables de contexto para AI
 */
function formatContextForAI(expedienteData) {
  if (!expedienteData) return {};
  
  // Extraer y formatear datos clave
  const context = {
    expediente: expedienteData.expediente || '',
    nombre: expedienteData.datosGenerales?.nombre || 'Cliente',
    vehiculo: expedienteData.datosGenerales?.vehiculo || 'No especificado',
    estatus: expedienteData.datosGenerales?.estatus || 'En proceso',
    servicio: expedienteData.datosGenerales?.servicio || 'No especificado',
    destino: expedienteData.datosGenerales?.destino || 'No especificado'
  };
  
  // Añadir información de costos
  if (expedienteData.costos) {
    context.costo = expedienteData.costos.costo || 'No disponible';
    context.km = expedienteData.costos.km || '0';
    context.costoKm = expedienteData.costos.costoKm || '0';
    context.banderazo = expedienteData.costos.banderazo || '0';
    context.plano = expedienteData.costos.plano || '0';
  }
  
  // Añadir información de unidad
  if (expedienteData.unidad) {
    context.operador = expedienteData.unidad.operador || 'No asignado';
    context.tipoGrua = expedienteData.unidad.tipoGrua || 'No especificado';
    context.color = expedienteData.unidad.color || 'No especificado';
    context.unidadOperativa = expedienteData.unidad.unidadOperativa || 'No especificado';
    context.placas = expedienteData.unidad.placas || expedienteData.unidad.placa || 'No especificado';
  }
  
  // Añadir información de ubicación
  if (expedienteData.ubicacion) {
    context.tiempoRestante = expedienteData.ubicacion.tiempoRestante || 'No disponible';
    context.ubicacionGrua = expedienteData.ubicacion.ubicacionGrua || 'No disponible';
  }
  
  // Añadir información de tiempos
  if (expedienteData.tiempos) {
    context.tiempoContacto = expedienteData.tiempos.tc || 'No registrado';
    context.tiempoTermino = expedienteData.tiempos.tt || 'No registrado';
  }
  
  return context;
}

/**
 * Detecta intención del usuario a partir de su mensaje
 * @param {string} userInput - Entrada del usuario
 * @returns {Object} Intención detectada y datos adicionales
 */
function detectUserIntent(userInput) {
  if (!userInput) return { intent: 'unknown' };
  
  const text = userInput.toLowerCase();
  
  // Consultas sobre costos
  if (text.includes('costo') || 
      text.includes('precio') || 
      text.includes('cuánto') ||
      text.includes('pagar')) {
    return { intent: 'query_cost' };
  }
  
  // Consultas sobre ubicación
  if (text.includes('ubicación') || 
      text.includes('dónde') || 
      text.includes('tiempo') ||
      text.includes('llegar')) {
    return { intent: 'query_location' };
  }
  
  // Consultas sobre la unidad
  if (text.includes('unidad') || 
      text.includes('grúa') || 
      text.includes('operador') ||
      text.includes('placas')) {
    return { intent: 'query_unit' };
  }
  
  // Agradecimiento/despedida
  if (text.includes('gracias') || 
      text.includes('adiós') || 
      text.includes('hasta luego') ||
      text.includes('terminar')) {
    return { intent: 'hangup' };
  }
  
  // Hablar con agente
  if (text.includes('agente') || 
      text.includes('operador') || 
      text.includes('humano') ||
      text.includes('persona')) {
    return { intent: 'agent' };
  }
  
  // Por defecto
  return { intent: 'query' };
}

module.exports = {
  extractExpedienteFromText,
  formatContextForAI,
  detectUserIntent
};