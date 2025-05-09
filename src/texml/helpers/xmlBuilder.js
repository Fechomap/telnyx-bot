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
    // Usar el formato específico requerido por Telnyx
    // El formato correcto es voice="Polly.Mia-Neural" en lugar de los múltiples atributos
    
    // Valor por defecto: voz Mia en español mexicano
    let voiceFormat = "Polly.Mia-Neural";
    
    // Permitir personalización de voz si se proporciona en options
    if (options && options.voice) {
      switch (options.voice.toLowerCase()) {
        case "lupe":
          voiceFormat = "Polly.Lupe-Neural";
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
        case "mia":
        default:
          voiceFormat = "Polly.Mia-Neural";
          break;
      }
    }
    
    // Construir el elemento Say con el atributo voice correcto
    return `  <Say voice="${voiceFormat}">\n    ${this.escapeXML(text)}\n  </Say>\n`;
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
   * Agrega elemento para AI Assistant optimizado para conversación
   * @param {Object} options - Opciones de configuración
   * @returns {string} Elemento AI Assistant en XML
   */
  static addAIAssistant(options = {}) {
    // Importar configuración
    const config = require('../../config/texml');
    const aiConfig = config.ai || {};
    const ttsConfig = config.tts || {};
    
    // Opciones con defaults de configuración
    const aiProvider = options.aiProvider || aiConfig.provider || 'telnyx';
    const model = options.model || aiConfig.model || 'meta-llama/Meta-Llama-3-1-70B-Instruct';
    const initialPrompt = options.initialPrompt || '';
    const action = options.action || '/interactuar';
    const fallbackAction = options.fallbackAction || '/welcome';
    const language = options.language || ttsConfig.language || 'es-MX';
    const voiceName = options.voice || ttsConfig.voice || 'Lupe';
    const maxTurns = options.maxTurns || aiConfig.maxTurns || '15';
    const interruptible = options.interruptible || (aiConfig.interruptible ? 'true' : 'false');
    const contextVars = options.contextVars || null;
    const enhanced = options.enhanced || 'true';
    
    // Usar el formato correcto para la voz
    let voiceFormat = `Polly.${voiceName}-Neural`;
    
    // Construir atributos del elemento - VERIFICAR QUE ESTE FORMATO SEA CORRECTO
    let aiAssistantAttrs = '';
    aiAssistantAttrs += ` provider="${aiProvider}"`;
    aiAssistantAttrs += ` model="${model}"`;
    aiAssistantAttrs += ` language="${language}"`;
    aiAssistantAttrs += ` voice="${voiceFormat}"`;
    aiAssistantAttrs += ` maxTurns="${maxTurns}"`;
    aiAssistantAttrs += ` interruptible="${interruptible}"`;
    aiAssistantAttrs += ` action="${action}"`;
    aiAssistantAttrs += ` fallbackAction="${fallbackAction}"`;
    aiAssistantAttrs += ` enhanced="${enhanced}"`;
    
    // Si hay contexto de variables, construir elementos Variable
    let contextElements = '';
    if (contextVars && typeof contextVars === 'object') {
      for (const [key, value] of Object.entries(contextVars)) {
        if (value !== undefined && value !== null) {
          contextElements += `    <Variable name="${key}" value="${this.escapeXML(String(value))}"/>\n`;
        }
      }
    }
    
    // Construir el elemento completo
    if (initialPrompt || contextElements) {
      return `  <AIAssistant${aiAssistantAttrs}>\n${contextElements}${
        initialPrompt ? `    ${this.escapeXML(initialPrompt)}\n` : ''
      }  </AIAssistant>\n`;
    } else {
      return `  <AIAssistant${aiAssistantAttrs}></AIAssistant>\n`;
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
    
    // Usar el formato correcto para la voz
    let voiceFormat = "Polly.Mia-Neural";
    if (options.voice) {
      switch (options.voice.toLowerCase()) {
        case "lupe":
          voiceFormat = "Polly.Lupe-Neural";
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