const { 
  RESPONSE_TYPES,
  generateResponse,
  sendResponse
} = require('../../../../src/texml/handlers/templateHandler');
const XMLBuilder = require('../../../../src/texml/helpers/xmlBuilder');

describe('TemplateHandler', () => {
  describe('RESPONSE_TYPES', () => {
    it('should have all expected response types defined', () => {
      expect(RESPONSE_TYPES).to.have.property('WELCOME');
      expect(RESPONSE_TYPES).to.have.property('REQUEST_EXPEDIENTE');
      expect(RESPONSE_TYPES).to.have.property('MAIN_MENU');
      expect(RESPONSE_TYPES).to.have.property('RESPONSE_MENU');
      expect(RESPONSE_TYPES).to.have.property('AGENT_TRANSFER');
      // Añadir otros tipos de respuesta esperados
    });
  });

  describe('generateResponse', () => {
    beforeEach(() => {
      sinon.stub(XMLBuilder, 'buildResponse').returns('<respuesta-mock>');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should generate welcome response', () => {
      const result = generateResponse(RESPONSE_TYPES.WELCOME);
      expect(XMLBuilder.buildResponse).to.have.been.called;
      expect(result).to.equal('<respuesta-mock>');
    });

    it('should generate expediente request response', () => {
      const result = generateResponse(RESPONSE_TYPES.REQUEST_EXPEDIENTE);
      expect(XMLBuilder.buildResponse).to.have.been.called;
      expect(result).to.equal('<respuesta-mock>');
    });

    // Añadir pruebas para otros tipos de respuesta
  });

  describe('sendResponse', () => {
    let resStub;
    
    beforeEach(() => {
      resStub = {
        header: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
      sinon.stub(XMLBuilder, 'buildResponse').returns('<respuesta-mock>');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should set XML content type and send response', () => {
      const responseType = RESPONSE_TYPES.WELCOME;
      
      sendResponse(resStub, responseType);
      
      expect(resStub.header).to.have.been.calledWith('Content-Type', 'application/xml');
      expect(resStub.send).to.have.been.called;
    });
  });
});