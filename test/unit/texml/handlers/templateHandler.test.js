const { RESPONSE_TYPES, generateResponse, sendResponse } = require('../../../../src/texml/handlers/templateHandler');
const welcomeTemplates = require('../../../../src/texml/templates/welcome');
const menuTemplates = require('../../../../src/texml/templates/menu');
const agentTemplates = require('../../../../src/texml/templates/agent');

describe('TemplateHandler', () => {
  describe('generateResponse', () => {
    // Stubs para las funciones de plantillas
    let welcomeStub;
    let menuStub;
    let agentStub;
    
    beforeEach(() => {
      // Crear stubs para las funciones de plantillas
      welcomeStub = {
        generateWelcomeXML: sinon.stub().returns('<welcome-xml>'),
        generateRequestExpedienteXML: sinon.stub().returns('<request-expediente-xml>')
      };
      
      menuStub = {
        generateMainMenuXML: sinon.stub().returns('<main-menu-xml>'),
        generateResponseMenuXML: sinon.stub().returns('<response-menu-xml>'),
        generateExpedienteNotFoundXML: sinon.stub().returns('<expediente-not-found-xml>'),
        generateSessionExpiredXML: sinon.stub().returns('<session-expired-xml>'),
        generateErrorXML: sinon.stub().returns('<error-xml>')
      };
      
      agentStub = {
        generateAgentTransferXML: sinon.stub().returns('<agent-transfer-xml>'),
        generateCallbackXML: sinon.stub().returns('<callback-xml>')
      };
      
      // Reemplazar las funciones originales
      sinon.stub(welcomeTemplates, 'generateWelcomeXML').callsFake(welcomeStub.generateWelcomeXML);
      sinon.stub(welcomeTemplates, 'generateRequestExpedienteXML').callsFake(welcomeStub.generateRequestExpedienteXML);
      
      sinon.stub(menuTemplates, 'generateMainMenuXML').callsFake(menuStub.generateMainMenuXML);
      sinon.stub(menuTemplates, 'generateResponseMenuXML').callsFake(menuStub.generateResponseMenuXML);
      sinon.stub(menuTemplates, 'generateExpedienteNotFoundXML').callsFake(menuStub.generateExpedienteNotFoundXML);
      sinon.stub(menuTemplates, 'generateSessionExpiredXML').callsFake(menuStub.generateSessionExpiredXML);
      sinon.stub(menuTemplates, 'generateErrorXML').callsFake(menuStub.generateErrorXML);
      
      sinon.stub(agentTemplates, 'generateAgentTransferXML').callsFake(agentStub.generateAgentTransferXML);
      sinon.stub(agentTemplates, 'generateCallbackXML').callsFake(agentStub.generateCallbackXML);
    });
    
    it('should generate welcome response', () => {
      const result = generateResponse(RESPONSE_TYPES.WELCOME);
      
      expect(welcomeStub.generateWelcomeXML).to.have.been.called;
      expect(result).to.equal('<welcome-xml>');
    });
    
    it('should generate request expediente response', () => {
      const result = generateResponse(RESPONSE_TYPES.REQUEST_EXPEDIENTE);
      
      expect(welcomeStub.generateRequestExpedienteXML).to.have.been.called;
      expect(result).to.equal('<request-expediente-xml>');
    });
    
    it('should generate main menu response with params', () => {
      const params = {
        datosFormateados: { test: 'data' },
        sessionId: 'test-session',
        estatus: 'En proceso'
      };
      
      const result = generateResponse(RESPONSE_TYPES.MAIN_MENU, params);
      
      expect(menuStub.generateMainMenuXML).to.have.been.calledWith(
        params.datosFormateados,
        params.sessionId,
        params.estatus
      );
      expect(result).to.equal('<main-menu-xml>');
    });
    
    it('should generate response menu with params', () => {
      const params = {
        mensajeRespuesta: 'Test response',
        sessionId: 'test-session',
        estatus: 'En proceso'
      };
      
      const result = generateResponse(RESPONSE_TYPES.RESPONSE_MENU, params);
      
      expect(menuStub.generateResponseMenuXML).to.have.been.calledWith(
        params.mensajeRespuesta,
        params.sessionId,
        params.estatus
      );
      expect(result).to.equal('<response-menu-xml>');
    });
    
    it('should generate agent transfer response', () => {
      const params = {
        sessionId: 'test-session'
      };
      
      const result = generateResponse(RESPONSE_TYPES.AGENT_TRANSFER, params);
      
      expect(agentStub.generateAgentTransferXML).to.have.been.calledWith(params.sessionId);
      expect(result).to.equal('<agent-transfer-xml>');
    });
    
    it('should generate callback response', () => {
      const params = {
        sessionId: 'test-session'
      };
      
      const result = generateResponse(RESPONSE_TYPES.CALLBACK, params);
      
      expect(agentStub.generateCallbackXML).to.have.been.calledWith(params.sessionId);
      expect(result).to.equal('<callback-xml>');
    });
    
    it('should generate expediente not found response', () => {
      const result = generateResponse(RESPONSE_TYPES.EXPEDIENTE_NOT_FOUND);
      
      expect(menuStub.generateExpedienteNotFoundXML).to.have.been.called;
      expect(result).to.equal('<expediente-not-found-xml>');
    });
    
    it('should generate session expired response', () => {
      const result = generateResponse(RESPONSE_TYPES.SESSION_EXPIRED);
      
      expect(menuStub.generateSessionExpiredXML).to.have.been.called;
      expect(result).to.equal('<session-expired-xml>');
    });
    
    it('should generate error response', () => {
      const result = generateResponse(RESPONSE_TYPES.ERROR);
      
      expect(menuStub.generateErrorXML).to.have.been.called;
      expect(result).to.equal('<error-xml>');
    });
    
    it('should default to error for unknown response type', () => {
      const result = generateResponse('UNKNOWN_TYPE');
      
      expect(menuStub.generateErrorXML).to.have.been.called;
      expect(result).to.equal('<error-xml>');
    });
  });
  
  describe('sendResponse', () => {
    let resStub;
    let generateResponseStub;
    
    beforeEach(() => {
      // Stub para res
      resStub = {
        header: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
      
      // Stub para generateResponse
      generateResponseStub = sinon.stub().returns('<test-xml>');
      sinon.stub(module.exports, 'generateResponse').callsFake(generateResponseStub);
    });
    
    // Restaurar después de cada prueba
    afterEach(() => {
      if (module.exports.generateResponse.restore) {
        module.exports.generateResponse.restore();
      }
    });
    
    it('should set content type header and send response', () => {
      const type = RESPONSE_TYPES.WELCOME;
      const params = { test: 'param' };
      
      sendResponse(resStub, type, params);
      
      expect(generateResponseStub).to.have.been.calledWith(type, params);
      expect(resStub.header).to.have.been.calledWith('Content-Type', 'application/xml');
      expect(resStub.send).to.have.been.calledWith('<test-xml>');
    });
  });
});