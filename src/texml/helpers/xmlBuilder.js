/**
 * Constructor de documentos TeXML
 * Facilita la creación de respuestas XML para Telnyx
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
     * Agrega elemento Say para texto hablado
     * @param {string} text - Texto a pronunciar
     * @param {Object} options - Opciones adicionales
     * @returns {string} Elemento Say en XML
     */
    static addSay(text, options = {}) {
      const voice = options.voice || 'female';
      const language = options.language || 'es-MX';
      
      return `  <Say voice="${voice}" language="${language}">\n    ${this.escapeXML(text)}\n  </Say>\n`;
    }
  
    /**
     * Agrega elemento Gather para recolección de dígitos o voz
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
      
      let gatherAttrs = `action="${action}" method="${method}"`;
      
      if (numDigits) gatherAttrs += ` numDigits="${numDigits}"`;
      if (timeout) gatherAttrs += ` timeout="${timeout}"`;
      if (finishOnKey) gatherAttrs += ` finishOnKey="${finishOnKey}"`;
      if (input) gatherAttrs += ` input="${input}"`;
      if (validDigits) gatherAttrs += ` validDigits="${validDigits}"`;
      if (speechTimeout) gatherAttrs += ` speechTimeout="${speechTimeout}"`;
      
      // Si hay contenido anidado, permitir agregar al llamador
      if (options.nested) {
        return `  <Gather ${gatherAttrs}>\n${options.nested}  </Gather>\n`;
      }
      
      return `  <Gather ${gatherAttrs}></Gather>\n`;
    }
  
    /**
     * Agrega elemento Dial para transferencia de llamada
     * @param {string} number - Número a marcar
     * @param {Object} options - Opciones adicionales
     * @returns {string} Elemento Dial en XML
     */
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
  
    /**
     * Agrega elemento Hangup para finalizar llamada
     * @returns {string} Elemento Hangup en XML
     */
    static addHangup() {
      return '  <Hangup></Hangup>\n';
    }
  
    /**
     * Agrega elemento Play para reproducir audio
     * @param {string} url - URL del archivo de audio a reproducir
     * @returns {string} Elemento Play en XML
     */
    static addPlay(url) {
      return `  <Play>${url}</Play>\n`;
    }
  
    /**
     * Agrega elemento Redirect para redirigir a otra URL
     * @param {string} url - URL a la que redirigir
     * @param {string} method - Método HTTP a utilizar
     * @returns {string} Elemento Redirect en XML
     */
    static addRedirect(url, method = 'POST') {
      return `  <Redirect method="${method}">${url}</Redirect>\n`;
    }
  
    /**
     * Escapa caracteres especiales para XML
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    static escapeXML(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }
  
    /**
     * Construye un documento TeXML completo
     * @param {Array<string>} elements - Elementos XML a incluir
     * @returns {string} Documento TeXML completo
     */
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