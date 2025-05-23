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
    // Prioritize options.voice if provided. Default to Polly.Mia-Neural if no voice is specified.
    const voiceAttribute = options.voice || "Polly.Mia-Neural"; 
    // Prioritize options.language if provided. Default to es-MX.
    const languageAttribute = options.language || "es-MX"; 

    // The voiceAttribute should be the full string like "Polly.Mia-Neural" or "Azure.es-MX-DaliaNeural".
    // The languageAttribute is standard. Telnyx will interpret these for the respective TTS engine.
    
    return `  <Say voice="${voiceAttribute}" language="${languageAttribute}">\n    ${this.escapeXML(text)}\n  </Say>\n`;
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
   * Agrega elemento Record para grabación de audio
   * @param {Object} options - Opciones de configuración
   * @returns {string} Elemento Record en XML
   */
  static addRecord(options = {}) {
    const action = options.action || '/procesar-grabacion';
    const method = options.method || 'POST';
    const timeout = options.timeout || '5';
    const maxLength = options.maxLength || '15';
    const playBeep = options.playBeep || 'true';
    const finishOnKey =
      Object.prototype.hasOwnProperty.call(options, 'finishOnKey')
        ? options.finishOnKey
        : '#';
    const recordingStatusCallback = options.recordingStatusCallback || '/recording-status';

    let recordAttrs = `action="${action}" method="${method}" timeout="${timeout}" maxLength="${maxLength}" playBeep="${playBeep}"`;
    if (finishOnKey !== undefined) recordAttrs += ` finishOnKey="${finishOnKey}"`;
    recordAttrs += ` recordingStatusCallback="${recordingStatusCallback}"`;
    
    return `  <Record ${recordAttrs}></Record>\n`;
  }

  /**
   * Agrega elemento para AI Assistant optimizado para conversación
   * @param {Object} options - Opciones de configuración
   * @returns {string} Elemento AI Assistant en XML
   */
  static addAIAssistant(options = {}) {
    const config = require('../../config/texml');
    const aiConfig = config.ai || {};
    const ttsConfig = config.tts || {};
    
    // ID del asistente - CRUCIAL para que funcione con Telnyx
    const assistantId = options.assistantId || "assistant-83651b27-4186-43b9-a635-ad58c4fafbfc"; // ID proporcionado por el usuario
    
    // Opciones esenciales para AI Assistant
    const initialPrompt = options.initialPrompt || '';
    const voiceName = options.voice || ttsConfig.voice || 'Polly.Mia-Neural';
    
    // Construir el elemento completo usando el nuevo formato de Telnyx
    return `  <Start>
    <Suppression direction="both" />
  </Start>
  <Connect>
    <AIAssistant id="${assistantId}">
      <Greeting>${this.escapeXML(initialPrompt)}</Greeting>
      <Voice name="${voiceName}" />
    </AIAssistant>
  </Connect>\n`;
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
    
    // Usar el formato correcto para la voz
    let voiceFormat = "Polly.Mia-Neural";
    if (options.voice) {
      switch (options.voice.toLowerCase()) {
        case "Mia":
          voiceFormat = "Polly.Mia-Neural";
          break;
        case "pedro":
          voiceFormat = "Polly.Pedro-Neural";
          break;
        case "joanna":
          voiceFormat = "Polly.Joanna-Neural";
          break;
        case "matthew":
          voiceFormat = "Polly.Matthew-Neural";
          break;
      }
    }
    
    const context = options.context || '';
    const maxTurns = options.maxTurns || '5';
    const interruptible = options.interruptible || 'true';
    
    let voiceBotAttrs = `
      action="${action}" 
      language="${language}" 
      voice="${voiceFormat}"
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