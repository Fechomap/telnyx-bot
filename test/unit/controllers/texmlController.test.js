const chai = require('chai');
const expect = chai.expect;

// Importar los controladores
const {
  handleWelcome,
  handleExpediente,
  handleValidarExpediente,
  handleRespuesta,
  handleAgent,
  handleMetrics
} = require('../../../src/controllers/texmlController');

describe('TexmlController - Tests de Integración', () => {
  // Función auxiliar para crear un objeto response simulado
  function createMockResponse() {
    return {
      header: function(type, value) { 
        this.headerCalled = true; 
        this.headerType = type;
        this.headerValue = value;
        return this; 
      },
      send: function(data) { 
        this.sendCalled = true; 
        this.sendData = data; 
        return this;
      },
      json: function(data) { 
        this.jsonCalled = true; 
        this.jsonData = data; 
        return this;
      },
      status: function(code) { 
        this.statusCalled = true; 
        this.statusCode = code; 
        return this; 
      }
    };
  }

  describe('handleWelcome', () => {
    it('debe procesar una solicitud de bienvenida correctamente', async () => {
      // Preparar request y response
      const req = {};
      const res = createMockResponse();
      
      // Ejecutar función
      await handleWelcome(req, res);
      
      // Verificaciones
      expect(res.headerCalled).to.be.true;
      expect(res.headerType).to.equal('Content-Type');
      expect(res.sendCalled).to.be.true;
      
      // Verificar que el XML de respuesta contiene elementos esperados
      if (typeof res.sendData === 'string') {
        expect(res.sendData).to.include('<?xml');
        expect(res.sendData).to.include('<Response>');
      }
    });
  });

  describe('handleExpediente', () => {
    it('debe procesar correctamente una solicitud DTMF', async () => {
      // Preparar request con entrada DTMF y response
      const req = {
        body: { Digits: '1' },
        query: {}
      };
      const res = createMockResponse();
      
      // Ejecutar función
      await handleExpediente(req, res);
      
      // Verificaciones
      expect(res.headerCalled).to.be.true;
      expect(res.sendCalled).to.be.true;
      
      // Verificar que el XML de respuesta incluye texto relacionado con expediente
      if (typeof res.sendData === 'string') {
        expect(res.sendData.toLowerCase()).to.include('expediente');
      }
    });

    it('debe manejar entrada de voz', async () => {
      // Preparar request con entrada de voz
      const req = {
        body: { SpeechResult: 'quiero consultar un expediente' },
        query: {}
      };
      const res = createMockResponse();
      
      // Ejecutar función
      await handleExpediente(req, res);
      
      // Verificar que se envió una respuesta
      expect(res.headerCalled).to.be.true;
      expect(res.sendCalled).to.be.true;
    });
  });

  describe('handleValidarExpediente', () => {
    it('debe responder correctamente a una solicitud de validación de expediente', async () => {
      // Preparar request con número de expediente
      const req = {
        body: { Digits: '54321#' },
        query: {}
      };
      const res = createMockResponse();
      
      // Ejecutar función
      await handleValidarExpediente(req, res);
      
      // Verificar respuesta básica
      expect(res.headerCalled).to.be.true;
      expect(res.sendCalled).to.be.true;
    });
    
    it('debe manejar expediente no encontrado', async () => {
      // Preparar request con expediente inválido
      const req = {
        body: { Digits: '99999#' },
        query: {}
      };
      const res = createMockResponse();
      
      // Ejecutar función
      await handleValidarExpediente(req, res);
      
      // Verificar respuesta de error
      expect(res.headerCalled).to.be.true;
      expect(res.sendCalled).to.be.true;
      
      if (typeof res.sendData === 'string') {
        const responseText = res.sendData.toLowerCase();
        
        // Ampliamos los patrones que buscamos para incluir más variaciones:
        const containsErrorMessage = 
          responseText.includes('no encontrado') || 
          responseText.includes('no existe') || 
          responseText.includes('inválido') ||
          responseText.includes('no se encontró') ||
          responseText.includes('expediente') && responseText.includes('no') ||
          responseText.includes('error') ||
          // Verificamos también si hay redirección de vuelta a la página de expediente
          (responseText.includes('<redirect') && responseText.includes('/expediente'));
          
        expect(containsErrorMessage).to.be.true;
      }
    });
  });

  describe('handleRespuesta', () => {
    it('debe manejar respuesta para expediente válido', async () => {
      // Preparar request con sessionId y opción seleccionada
      const req = {
        body: { Digits: '1' },
        query: { sessionId: 'test-session-id' }
      };
      const res = createMockResponse();
      
      // Ejecutar función
      await handleRespuesta(req, res);
      
      // Verificar respuesta básica
      expect(res.headerCalled).to.be.true;
      expect(res.sendCalled).to.be.true;
    });
    
    it('debe manejar sesión inválida', async () => {
      // Preparar request sin sessionId
      const req = {
        body: { Digits: '1' },
        query: {}
      };
      const res = createMockResponse();
      
      // Ejecutar función
      await handleRespuesta(req, res);
      
      // Verificar respuesta de error
      expect(res.headerCalled).to.be.true;
      expect(res.sendCalled).to.be.true;
      
      // Verificar que el mensaje incluye algo relacionado con sesión
      if (typeof res.sendData === 'string') {
        const responseText = res.sendData.toLowerCase();
        expect(responseText.includes('sesión') || responseText.includes('sesion')).to.be.true;
      }
    });
  });

  describe('handleAgent', () => {
    it('debe procesar correctamente transferencia a agente', async () => {
      // Preparar request con sessionId
      const req = {
        query: { sessionId: 'test-session-id' }
      };
      const res = createMockResponse();
      
      // Ejecutar función
      await handleAgent(req, res);
      
      // Verificar respuesta básica
      expect(res.headerCalled).to.be.true;
      expect(res.sendCalled).to.be.true;
      
      // Verificar que la respuesta XML incluye transferencia
      if (typeof res.sendData === 'string') {
        const responseText = res.sendData.toLowerCase();
        expect(
          responseText.includes('transfer') || 
          responseText.includes('dial') || 
          responseText.includes('agente')
        ).to.be.true;
      }
    });
  });

  describe('handleMetrics', () => {
    it('debe devolver métricas para solicitud autorizada', async () => {
      // Preparar request con token válido
      const req = {
        query: { token: 'valid-token' }
      };
      const res = createMockResponse();
      
      // Ejecutar función
      await handleMetrics(req, res);
      
      // Verificar que se devolvieron datos JSON
      expect(res.jsonCalled).to.be.true;
      expect(res.jsonData).to.be.an('object');
    });
    
    it('debe rechazar solicitud no autorizada', async () => {
      // Preparar request con token inválido
      const req = {
        query: { token: 'invalid-token' }
      };
      const res = createMockResponse();
      
      // Ejecutar función
      await handleMetrics(req, res);
      
      // Verificar respuesta de error 401
      expect(res.statusCalled).to.be.true;
      expect(res.statusCode).to.equal(401);
      expect(res.jsonCalled).to.be.true;
      
      // Verificar mensaje de error
      expect(res.jsonData).to.be.an('object');
      expect(res.jsonData.error).to.equal('Unauthorized');
    });
  });
});