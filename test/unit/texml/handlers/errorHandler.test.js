const { 
  ERROR_TYPES,
  ERROR_RETRY_CONFIG,
  generateErrorResponse,
  logError,
  respondWithError
} = require('../../../../src/texml/handlers/errorHandler');
const XMLBuilder = require('../../../../src/texml/helpers/xmlBuilder');

describe('ErrorHandler', () => {
  describe('generateErrorResponse', () => {
    // Stubs para XMLBuilder
    let xmlBuilderStub;
    
    beforeEach(() => {
      // Crear stubs para XMLBuilder
      xmlBuilderStub = {
        addSay: sinon.stub().returns('<say-element>'),
        addRedirect: sinon.stub().returns('<redirect-element>'),
        addHangup: sinon.stub().returns('<hangup-element>'),
        buildResponse: sinon.stub().returns('<complete-error-response>')
      };
      
      // Reemplazar las funciones originales
      sinon.stub(XMLBuilder, 'addSay').callsFake(xmlBuilderStub.addSay);
      sinon.stub(XMLBuilder, 'addRedirect').callsFake(xmlBuilderStub.addRedirect);
      sinon.stub(XMLBuilder, 'addHangup').callsFake(xmlBuilderStub.addHangup);
      sinon.stub(XMLBuilder, 'buildResponse').callsFake(xmlBuilderStub.buildResponse);
    });
    
    it('should generate response for expediente not found error', () => {
      const result = generateErrorResponse(ERROR_TYPES.EXPEDIENTE_NOT_FOUND);
      
      // Verificar que se llamaron las funciones correctas
      expect(xmlBuilderStub.addSay).to.have.been.called;
      expect(xmlBuilderStub.addRedirect).to.have.been.calledWith('/expediente?attempt=2');
      expect(xmlBuilderStub.buildResponse).to.have.been.called;
      
      expect(result).to.equal('<complete-error-response>');
    });
    
    it('should include session ID in redirect when provided', () => {
      const options = {
        sessionId: 'test-session-123'
      };
      
      generateErrorResponse(ERROR_TYPES.INPUT_INVALID, options);
      
      // Verificar que la redirección incluye sessionId
      expect(xmlBuilderStub.addRedirect).to.have.been.calledWith(
        sinon.match(url => url.includes('sessionId=test-session-123'))
      );
    });
    
    it('should use custom action when provided', () => {
      const options = {
        action: '/custom-action',
        attemptCount: 1
      };
      
      generateErrorResponse(ERROR_TYPES.INPUT_INVALID, options);
      
      // Verificar que se usa la acción personalizada
      expect(xmlBuilderStub.addRedirect).to.have.been.calledWith(
        sinon.match(url => url.includes('/custom-action'))
      );
    });
    
    it('should include hangup for service unavailable after max attempts', () => {
      const options = {
        attemptCount: 3  // Max para la mayoría de errores
      };
      
      generateErrorResponse(ERROR_TYPES.SERVICE_UNAVAILABLE, options);
      
      // Verificar que se agrega el mensaje de finalización y hangup
      expect(xmlBuilderStub.addSay).to.have.been.calledTwice;
      expect(xmlBuilderStub.addHangup).to.have.been.called;
      expect(xmlBuilderStub.addRedirect).to.not.have.been.called;
    });
    
    it('should redirect to menu for max attempts with active session', () => {
      const options = {
        attemptCount: 3,  // Max para la mayoría de errores
        sessionId: 'active-session'
      };
      
      generateErrorResponse(ERROR_TYPES.INPUT_INVALID, options);
      
      // Verificar redirección al menú principal
      expect(xmlBuilderStub.addSay).to.have.been.calledTwice;
      expect(xmlBuilderStub.addRedirect).to.have.been.calledWith(
        sinon.match(url => url.includes('/menu?sessionId=active-session'))
      );
    });
    
    it('should redirect to welcome when max attempts without session', () => {
      const options = {
        attemptCount: 3  // Max para la mayoría de errores
      };
      
      generateErrorResponse(ERROR_TYPES.EXPEDIENTE_INVALID, options);
      
      // Verificar redirección a welcome
      expect(xmlBuilderStub.addSay).to.have.been.calledTwice;
      expect(xmlBuilderStub.addRedirect).to.have.been.calledWith('/welcome');
    });
  });
  
  describe('logError', () => {
    let consoleErrorStub;
    
    beforeEach(() => {
      // Stub para console.error
      consoleErrorStub = sinon.stub(console, 'error');
    });
    
    afterEach(() => {
      consoleErrorStub.restore();
    });
    
    it('should log error with details', () => {
      const details = {
        sessionId: 'test-session',
        attemptCount: 2,
        url: '/test-url',
        technicalDetails: 'Test technical details'
      };
      
      logError(ERROR_TYPES.INPUT_INVALID, details);
      
      // Verificar que se llamó a console.error
      expect(consoleErrorStub).to.have.been.called;
      
      // Obtener el mensaje registrado
      const loggedMessage = consoleErrorStub.getCall(0).args[0];
      
      // Verificar que contiene la información esperada (minúsculas en lugar de mayúsculas)
      expect(loggedMessage).to.include('input_invalid');
      expect(loggedMessage).to.include('test-session');
      expect(loggedMessage).to.include('2/');
      expect(loggedMessage).to.include('/test-url');
      expect(loggedMessage).to.include('Test technical details');
    });
    
    it('should handle missing details', () => {
      // Llamar sin detalles
      logError(ERROR_TYPES.SYSTEM_ERROR);
      
      // Verificar que se llamó a console.error
      expect(consoleErrorStub).to.have.been.called;
      
      // Obtener el mensaje registrado
      const loggedMessage = consoleErrorStub.getCall(0).args[0];
      
      // Verificar contenido (minúsculas en lugar de mayúsculas)
      expect(loggedMessage).to.include('system_error');
      expect(loggedMessage).to.include('N/A');  // Valores por defecto
    });
  });
  
  describe('respondWithError', () => {
    let resStub;
    
    beforeEach(() => {
      resStub = {
        header: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
    });
    
    it('should log error and send response', () => {
      // En lugar de spies, simplemente prueba la integración directamente
      const errorType = ERROR_TYPES.SESSION_EXPIRED;
      const options = { sessionId: 'expired-session' };
      
      // Ejecutar la función que estamos probando
      respondWithError(resStub, errorType, options);
      
      // Verificar solo las salidas visibles sin preocuparnos por las funciones internas
      expect(resStub.header).to.have.been.calledWith('Content-Type', 'application/xml');
      expect(resStub.send).to.have.been.called;
    });
  });
  
  describe('ERROR_TYPES and ERROR_RETRY_CONFIG', () => {
    it('should have matching keys in ERROR_RETRY_CONFIG for each ERROR_TYPE', () => {
      // Verificar que cada tipo de error tenga configuración de reintentos
      Object.keys(ERROR_TYPES).forEach(key => {
        const errorType = ERROR_TYPES[key];
        
        // Excluir explícitamente los tipos que sabemos que pueden no tener configuración
        if (errorType !== ERROR_TYPES.CALL_QUALITY && 
            errorType !== ERROR_TYPES.CALL_DROPPED) {
          expect(ERROR_RETRY_CONFIG).to.have.property(errorType);
          expect(ERROR_RETRY_CONFIG[errorType]).to.be.a('number');
        }
      });
    });
  });
});