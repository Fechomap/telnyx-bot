/**
 * Constructor de documentos TeXML mejorado
 * Facilita la creación de respuestas XML para Telnyx con soporte avanzado
 */
class XMLBuilder {
  /**
   * Crea un documento TeXML básico
   * @returns {string} Header XML
   */
  static createDocument() {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';
  }

  /**
   * Finaliza un documento TeXML
   * @returns {string} Cierre del documento
   */
  static closeDocument() {
    return '</Response>';
  }

  /**
   * Agrega elemento Say para texto hablado con opciones avanzadas
   * @param {string} text - Texto a pronunciar
   * @param {Object} options - Opciones adicionales
   * @returns {string} Elemento Say en XML
   */
  static addSay(text, options = {}) {
    // Importar configuración TTS
    const config = require('../../config/texml');
    const ttsConfig = config.tts || {};
    
    // Usar opciones proporcionadas o valores de configuración
    const provider = 'amazon';             // Forzar uso exclusivo de Amazon Polly
    const voice = 'Mia';                   // Voz predeterminada (puedes cambiarla si prefieres otra)
    const language = 'es-MX';              // Español mexicano
    const engine = 'neural';              // Motor de síntesis avanzado de Polly
    const rate = '1.0';                    // Velocidad normal
    const pitch = '1.0';                   // Tono neutral
    
    // Construir atributos para el elemento Say
    let sayAttrs = `provider="${provider}" voice="${voice}" language="${language}" engine="${engine}"`;
    if (rate !== '1.0') sayAttrs += ` rate="${rate}"`;
    if (pitch !== '1.0') sayAttrs += ` pitch="${pitch}"`;
    
    return `  <Say ${sayAttrs}>\n    ${this.escapeXML(text)}\n  </Say>\n`;
  }

  /**
   * Agrega elemento Gather con funciones avanzadas para recolección de dígitos o voz
   * @param {Object} options - Opciones de configuración
   * @returns {string} Elemento Gather en XML
   */
  static addGather(options = {}) {
    const action = options.action || '/handle-input';
    const method = options.method || 'POST';
    const numDigits = options.numDigits || '';
    const timeout = options.timeout || '5';
    const finishOnKey = options.finishOnKey || '#';
    const input = options.input || 'dtmf speech';
    const validDigits = options.validDigits || '';
    const speechTimeout = options.speechTimeout || 'auto';
    const language = options.language || 'es-MX';
    const speechModel = options.speechModel || 'phone_call';
    const hints = options.hints || '';
    const profanityFilter = options.profanityFilter || 'true';
    const interruptible = options.interruptible || 'true'; // CRUCIAL para interrumpir con DTMF
    
    let gatherAttrs = `action="${action}" method="${method}" input="${input}" interruptible="${interruptible}"`;
    
    if (numDigits) gatherAttrs += ` numDigits="${numDigits}"`;
    if (timeout) gatherAttrs += ` timeout="${timeout}"`;
    if (finishOnKey) gatherAttrs += ` finishOnKey="${finishOnKey}"`;
    if (validDigits) gatherAttrs += ` validDigits="${validDigits}"`;
    if (speechTimeout) gatherAttrs += ` speechTimeout="${speechTimeout}"`;
    if (language) gatherAttrs += ` language="${language}"`;
    if (speechModel) gatherAttrs += ` speechModel="${speechModel}"`;
    if (hints) gatherAttrs += ` hints="${hints}"`;
    if (profanityFilter) gatherAttrs += ` profanityFilter="${profanityFilter}"`;
    
    // Si hay contenido anidado (como Say), permitir agregar
    if (options.nested) {
      return `  <Gather ${gatherAttrs}>\n${options.nested}  </Gather>\n`;
    }
    
    return `  <Gather ${gatherAttrs}></Gather>\n`;
  }

  /**
   * Agrega elemento para AI Assistant (integración avanzada con IA)
   * @param {Object} options - Opciones de configuración
   * @returns {string} Elemento AI Assistant en XML
   */
  static addAIAssistant(options = {}) {
    // Importar configuración TTS
    const config = require('../../config/texml');
    const ttsConfig = config.tts || {};
    
    const aiProvider = options.aiProvider || 'telnyx'; // telnyx, openai, anthropic
    const model = options.model || 'meta-llama/Meta-Llama-3-1-70B-Instruct';
    const initialPrompt = options.initialPrompt || '';
    const action = options.action || '/ai-response';
    const language = options.language || ttsConfig.language || 'es-MX';
    const voice = options.voice || ttsConfig.voice || 'Mia';
    const voiceProvider = options.provider || ttsConfig.provider || 'amazon';
    const maxTurns = options.maxTurns || '5';
    const interruptible = options.interruptible || 'true';
    const fallbackAction = options.fallbackAction || '/expediente';
    
    let aiAssistantAttrs = `
      provider="${aiProvider}" 
      model="${model}" 
      language="${language}" 
      voice="${voice}"
      voiceProvider="${voiceProvider}"
      maxTurns="${maxTurns}"
      interruptible="${interruptible}"
      action="${action}"
      fallbackAction="${fallbackAction}"`;
    
    if (initialPrompt) {
      // Para prompt inicial
      return `  <AIAssistant ${aiAssistantAttrs}>\n    ${this.escapeXML(initialPrompt)}\n  </AIAssistant>\n`;
    } else {
      // Sin prompt inicial
      return `  <AIAssistant ${aiAssistantAttrs}></AIAssistant>\n`;
    }
  }

  /**
   * Agrega elemento para Voice Bot (más simple que AIAssistant)
   * @param {Object} options - Opciones de configuración
   * @returns {string} Elemento Voicebot en XML
   */
  static addVoiceBot(options = {}) {
    // Importar configuración TTS
    const config = require('../../config/texml');
    const ttsConfig = config.tts || {};
    
    const action = options.action || '/voicebot-response';
    const language = options.language || ttsConfig.language || 'es-MX';
    const voice = options.voice || ttsConfig.voice || 'Mia';
    const voiceProvider = options.provider || ttsConfig.provider || 'amazon';
    const context = options.context || '';
    const maxTurns = options.maxTurns || '5';
    const interruptible = options.interruptible || 'true';
    
    let voiceBotAttrs = `
      action="${action}" 
      language="${language}" 
      voice="${voice}"
      voiceProvider="${voiceProvider}"
      maxTurns="${maxTurns}"
      interruptible="${interruptible}"`;
    
    if (context) {
      return `  <VoiceBot ${voiceBotAttrs}>\n    ${this.escapeXML(context)}\n  </VoiceBot>\n`;
    } else {
      return `  <VoiceBot ${voiceBotAttrs}></VoiceBot>\n`;
    }
  }

  // Métodos existentes sin cambios
  static addDial(number, options = {}) {
    const callerId = options.callerId || '';
    const timeout = options.timeout || '30';
    const timeLimit = options.timeLimit || '';
    
    let dialAttrs = '';
    if (callerId) dialAttrs += ` callerId="${callerId}"`;
    if (timeout) dialAttrs += ` timeout="${timeout}"`;
    if (timeLimit) dialAttrs += ` timeLimit="${timeLimit}"`;
    
    return `  <Dial${dialAttrs}>${number}</Dial>\n`;
  }

  static addHangup() {
    return '  <Hangup></Hangup>\n';
  }

  static addPlay(url) {
    return `  <Play>${url}</Play>\n`;
  }

  static addRedirect(url, method = 'POST') {
    return `  <Redirect method="${method}">${url}</Redirect>\n`;
  }

  static escapeXML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static buildResponse(elements) {
    let response = this.createDocument();
    
    for (const element of elements) {
      response += element;
    }
    
    response += this.closeDocument();
    return response;
  }
}

module.exports = XMLBuilder;
