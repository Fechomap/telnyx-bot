const speechHelper = require('../../../../src/texml/helpers/speechHelper');
const XMLBuilder = require('../../../../src/texml/helpers/xmlBuilder');

describe('SpeechHelper', () => {
  describe('VOICE_COMMANDS', () => {
    it('should have the expected command mappings', () => {
      // Verificar algunos comandos clave
      expect(speechHelper.VOICE_COMMANDS).to.have.property('costos', '1');
      expect(speechHelper.VOICE_COMMANDS).to.have.property('unidad', '2');
      expect(speechHelper.VOICE_COMMANDS).to.have.property('ubicación', '3');
      expect(speechHelper.VOICE_COMMANDS).to.have.property('tiempos', '4');
      expect(speechHelper.VOICE_COMMANDS).to.have.property('agente', '0');
      expect(speechHelper.VOICE_COMMANDS).to.have.property('otro', '9');
    });
  });
  
  describe('generateVoicePrompt', () => {
    it('should generate correct prompt for Concluido status', () => {
      const result = speechHelper.generateVoicePrompt('Concluido');
      
      expect(result).to.include('costos');
      expect(result).to.include('unidad');
      expect(result).to.include('tiempos');
      expect(result).to.include('agente');
      expect(result).to.not.include('ubicación'); // No debe mencionar ubicación para concluido
    });
    
    it('should generate correct prompt for En proceso status', () => {
      const result = speechHelper.generateVoicePrompt('En proceso');
      
      expect(result).to.include('costos');
      expect(result).to.include('unidad');
      expect(result).to.include('ubicación'); // Debe mencionar ubicación
      expect(result).to.include('tiempos');
      expect(result).to.include('agente');
    });
  });
  
  describe('createSpeechGatherOptions', () => {
    it('should create options with basic speech recognition properties', () => {
      const baseOptions = {
        action: '/test-action',
        numDigits: '1'
      };
      
      const result = speechHelper.createSpeechGatherOptions(baseOptions, 'En proceso');
      
      expect(result).to.include.all.keys(['action', 'numDigits', 'input', 'speechTimeout', 'speechModel', 'language', 'hints']);
      expect(result.action).to.equal('/test-action');
      expect(result.numDigits).to.equal('1');
      expect(result.input).to.equal('dtmf speech');
      expect(result.language).to.equal('es-MX');
    });
    
    it('should include different hints for Concluido status', () => {
      const baseOptions = {
        action: '/test-action'
      };
      
      const concluidoResult = speechHelper.createSpeechGatherOptions(baseOptions, 'Concluido');
      const enProcesoResult = speechHelper.createSpeechGatherOptions(baseOptions, 'En proceso');
      
      // Ambos deben tener los comandos básicos
      expect(concluidoResult.hints).to.include('costos');
      expect(concluidoResult.hints).to.include('unidad');
      expect(concluidoResult.hints).to.include('agente');
      
      expect(enProcesoResult.hints).to.include('costos');
      expect(enProcesoResult.hints).to.include('unidad');
      expect(enProcesoResult.hints).to.include('agente');
      
      // Pero difieren en los específicos
      expect(concluidoResult.hints).to.include('tiempos');
      expect(concluidoResult.hints).to.not.include('ubicación');
      
      expect(enProcesoResult.hints).to.include('tiempos');
      expect(enProcesoResult.hints).to.include('ubicación');
    });
  });
  
  describe('interpretSpeechInput', () => {
    it('should recognize exact command matches', () => {
      expect(speechHelper.interpretSpeechInput('costos')).to.equal('1');
      expect(speechHelper.interpretSpeechInput('unidad')).to.equal('2');
      expect(speechHelper.interpretSpeechInput('ubicación')).to.equal('3');
      expect(speechHelper.interpretSpeechInput('tiempos')).to.equal('4');
      expect(speechHelper.interpretSpeechInput('agente')).to.equal('0');
    });
    
    it('should recognize commands within sentences', () => {
      expect(speechHelper.interpretSpeechInput('quiero ver los costos')).to.equal('1');
      expect(speechHelper.interpretSpeechInput('información de la unidad por favor')).to.equal('2');
      expect(speechHelper.interpretSpeechInput('me gustaría saber la ubicación')).to.equal('3');
    });
    
    it('should normalize input (lowercase, no accents)', () => {
      expect(speechHelper.interpretSpeechInput('COSTOS')).to.equal('1');
      expect(speechHelper.interpretSpeechInput('Ubicacion')).to.equal('3');
      expect(speechHelper.interpretSpeechInput('AGENTE!')).to.equal('0');
    });
    
    it('should handle alternative phrasings', () => {
      // Alternativas para costos
      expect(speechHelper.interpretSpeechInput('precio')).to.equal('1');
      expect(speechHelper.interpretSpeechInput('valor')).to.equal('1');
      
      // Alternativas para ubicación
      expect(speechHelper.interpretSpeechInput('donde')).to.equal('3');
      expect(speechHelper.interpretSpeechInput('posición')).to.equal('3');
      expect(speechHelper.interpretSpeechInput('mapa')).to.equal('3');
      
      // Alternativas para tiempos
      expect(speechHelper.interpretSpeechInput('cuánto tiempo')).to.equal('4');
      expect(speechHelper.interpretSpeechInput('duración')).to.equal('4');
      
      // Alternativas para agente
      expect(speechHelper.interpretSpeechInput('humano')).to.equal('0');
      expect(speechHelper.interpretSpeechInput('persona')).to.equal('0');
      expect(speechHelper.interpretSpeechInput('ayuda')).to.equal('0');
    });
    
    it('should return empty string for unrecognized input', () => {
      expect(speechHelper.interpretSpeechInput('')).to.equal('');
      expect(speechHelper.interpretSpeechInput('no entiendo')).to.equal('');
      expect(speechHelper.interpretSpeechInput('algo completamente diferente')).to.equal('');
    });
  });
  
  describe('generateUnrecognizedInputXML', () => {
    it('should generate XML for unrecognized input', () => {
      const sessionId = 'test-session-123';
      const estatus = 'En proceso';
      
      const result = speechHelper.generateUnrecognizedInputXML(sessionId, estatus);
      
      // Verificar que es un XML válido
      expect(result).to.include('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).to.include('<Response>');
      expect(result).to.include('</Response>');
      
      // Verificar mensaje de error
      expect(result).to.include('no he entendido');
      
      // Verificar que incluye opciones de nuevo
      expect(result).to.include('costos');
      expect(result).to.include('unidad');
      expect(result).to.include('ubicación');
      
      // Verificar que incluye el sessionId en la acción
      expect(result).to.include(`/respuesta?sessionId=${sessionId}`);
    });
    
    it('should adapt options based on status', () => {
      const sessionId = 'test-session-123';
      
      const concluidoResult = speechHelper.generateUnrecognizedInputXML(sessionId, 'Concluido');
      const enProcesoResult = speechHelper.generateUnrecognizedInputXML(sessionId, 'En proceso');
      
      // En Concluido no debe mencionar ubicación
      expect(concluidoResult).to.not.include('ubicación');
      
      // En En proceso sí debe mencionar ubicación
      expect(enProcesoResult).to.include('ubicación');
    });
  });
});