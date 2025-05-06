const { 
  handleWelcome,
  handleExpediente,
  handleValidarExpediente,
  handleRespuesta,
  handleAgent,
  handleMetrics
} = require('../../../src/controllers/texmlController');
const { RESPONSE_TYPES } = require('../../../src/texml/handlers/templateHandler');
const { ERROR_TYPES } = require('../../../src/texml/handlers/errorHandler');
const sessionCache = require('../../../src/cache/sessionCache');
const speechHelper = require('../../../src/texml/helpers/speechHelper');
const monitoring = require('../../../src/utils/monitoring');
const config = require('../../../src/config/texml');

describe('TexmlController', () => {
  // Setup variables to hold our stubs
  let resStub;
  let sendResponseStub;
  let respondWithErrorStub;
  let sessionCacheStub;
  let monitoringStub;
  let speechHelperStub;
  let dataServiceStub;
  
  beforeEach(() => {
    // Clean all previous stubs
    sinon.restore();
    
    // Create stubs for response
    resStub = {
      header: sinon.stub().returnsThis(),
      send: sinon.stub(),
      json: sinon.stub()
    };
    
    // Create specific stubs for key functions
    sendResponseStub = sinon.stub();
    respondWithErrorStub = sinon.stub();
    
    // Override the imported modules with our stubs
    sinon.stub(require('../../../src/texml/handlers/templateHandler'), 'sendResponse').callsFake(sendResponseStub);
    sinon.stub(require('../../../src/texml/handlers/errorHandler'), 'respondWithError').callsFake(respondWithErrorStub);
    
    // Set up stubs for sessionCache
    sessionCacheStub = {
      getSession: sinon.stub(),
      createSession: sinon.stub(),
      getActiveSessionsCount: sinon.stub()
    };
    sinon.stub(sessionCache, 'getSession').callsFake(sessionCacheStub.getSession);
    sinon.stub(sessionCache, 'createSession').callsFake(sessionCacheStub.createSession);
    sinon.stub(sessionCache, 'getActiveSessionsCount').callsFake(sessionCacheStub.getActiveSessionsCount);
    
    // Set up stubs for monitoring
    monitoringStub = {
      trackSessionEvent: sinon.stub(),
      startDataQuery: sinon.stub().returns(() => 100),
      trackError: sinon.stub(),
      trackSpeechRecognition: sinon.stub(),
      trackExpediente: sinon.stub(),
      getMetricsSummary: sinon.stub().returns({
        uptime: '1h 30m',
        requests: { total: 100, errors: { rate: '2%' } },
        sessions: { active: 5, created: 10 }
      })
    };
    sinon.stub(monitoring, 'trackSessionEvent').callsFake(monitoringStub.trackSessionEvent);
    sinon.stub(monitoring, 'startDataQuery').callsFake(monitoringStub.startDataQuery);
    sinon.stub(monitoring, 'trackError').callsFake(monitoringStub.trackError);
    sinon.stub(monitoring, 'trackSpeechRecognition').callsFake(monitoringStub.trackSpeechRecognition);
    sinon.stub(monitoring, 'trackExpediente').callsFake(monitoringStub.trackExpediente);
    sinon.stub(monitoring, 'getMetricsSummary').callsFake(monitoringStub.getMetricsSummary);
    
    // Set up stubs for speechHelper
    speechHelperStub = {
      interpretSpeechInput: sinon.stub(),
      generateUnrecognizedInputXML: sinon.stub().returns('<unrecognized-xml>')
    };
    sinon.stub(speechHelper, 'interpretSpeechInput').callsFake(speechHelperStub.interpretSpeechInput);
    sinon.stub(speechHelper, 'generateUnrecognizedInputXML').callsFake(speechHelperStub.generateUnrecognizedInputXML);
    
    // Set up stubs for optimizedDataService
    dataServiceStub = {
      consultaUnificada: sinon.stub(),
      formatearDatosParaIVR: sinon.stub()
    };
    sinon.stub(require('../../../src/services/optimizedDataService'), 'consultaUnificada')
      .callsFake(dataServiceStub.consultaUnificada);
    sinon.stub(require('../../../src/services/optimizedDataService'), 'formatearDatosParaIVR')
      .callsFake(dataServiceStub.formatearDatosParaIVR);
    
    // Mock the config object
    sinon.stub(config, 'transfer').value({ 
      enabled: true,
      agentNumber: '+15551234567' 
    });
    
    // Add adminToken property to mocked config
    if (!config.adminToken) {
      config.adminToken = 'valid-token';
    }
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('handleWelcome', () => {
    it('should send welcome response and track session event', async () => {
      const req = {}; // No data needed for welcome
      
      await handleWelcome(req, resStub);
      
      // Verify function was called (don't check exact arguments)
      expect(monitoringStub.trackSessionEvent.called).to.be.true;
      expect(sendResponseStub.called).to.be.true;
      
      // If you need to check arguments, use sinon's calledWith directly
      sinon.assert.calledWith(sendResponseStub, resStub, RESPONSE_TYPES.WELCOME);
    });
  });
  
  describe('handleExpediente', () => {
    it('should process regular DTMF request', async () => {
      const req = {
        body: { Digits: '1' },
        query: {}
      };
      
      await handleExpediente(req, resStub);
      
      // Verify functions were called
      expect(sendResponseStub.called).to.be.true;
      sinon.assert.calledWith(sendResponseStub, resStub, RESPONSE_TYPES.REQUEST_EXPEDIENTE);
    });
    
    it('should process speech input for expediente option', async () => {
      const req = {
        body: { SpeechResult: 'quiero consultar un expediente' },
        query: {}
      };
      
      await handleExpediente(req, resStub);
      
      // Verify speech recognition was tracked
      expect(monitoringStub.trackSpeechRecognition.called).to.be.true;
      
      // Verify response was sent
      expect(sendResponseStub.called).to.be.true;
      sinon.assert.calledWith(sendResponseStub, resStub, RESPONSE_TYPES.REQUEST_EXPEDIENTE);
    });
    
    it('should handle speech input for service option', async () => {
      const req = {
        body: { SpeechResult: 'quiero cotizar un servicio' },
        query: {}
      };
      
      await handleExpediente(req, resStub);
      
      // Verify speech recognition was tracked
      expect(monitoringStub.trackSpeechRecognition.called).to.be.true;
      
      // In this case, we just check that some response was sent
      expect(resStub.header.called).to.be.true;
      expect(resStub.send.called).to.be.true;
    });
    
    it('should handle errors gracefully', async () => {
      const req = { body: {} };
      
      // Force an error
      sendResponseStub.throws(new Error('Test error'));
      
      await handleExpediente(req, resStub);
      
      // Verify error was tracked
      expect(monitoringStub.trackError.called).to.be.true;
      
      // Verify error response was sent
      expect(respondWithErrorStub.called).to.be.true;
    });
  });
  
  describe('handleValidarExpediente', () => {
    it('should process valid expediente and create session', async () => {
      // Setup test data
      const mockExpediente = {
        nombre: 'Juan Pérez',
        vehiculo: 'Honda Civic 2020',
        estatus: 'En proceso'
      };
      
      const mockFormateado = {
        mensajeGeneral: 'Expediente encontrado. Juan Pérez.',
        estatus: 'En proceso'
      };
      
      // Configure stubs
      dataServiceStub.consultaUnificada.resolves(mockExpediente);
      dataServiceStub.formatearDatosParaIVR.returns(mockFormateado);
      sessionCacheStub.createSession.returns('test-session-id');
      
      const req = {
        body: { Digits: '54321' },
        query: {}
      };
      
      await handleValidarExpediente(req, resStub);
      
      // Verify data service was called
      expect(dataServiceStub.consultaUnificada.called).to.be.true;
      
      // Verify session was created
      expect(sessionCacheStub.createSession.called).to.be.true;
      
      // Verify response was sent (check that the function was called, not specific args)
      expect(sendResponseStub.called).to.be.true;
    });
    
    // Add remaining tests for handleValidarExpediente
    // ...
  });
  
  // Add tests for the remaining handler methods similarly
  // ...
  
  describe('handleMetrics', () => {
    it('should return metrics when authorized', async () => {
      // Setup request with valid token
      const req = {
        query: { token: 'valid-token' }
      };
      
      await handleMetrics(req, resStub);
      
      // Verify response contains metrics
      expect(resStub.json.called).to.be.true;
    });
    
    it('should reject unauthorized requests', async () => {
      // Setup request with invalid token
      const req = {
        query: { token: 'invalid-token' }
      };
      
      // Create status stub for this test
      const resWithStatus = {
        ...resStub,
        status: sinon.stub().returnsThis()
      };
      
      await handleMetrics(req, resWithStatus);
      
      // Verify unauthorized response
      expect(resWithStatus.status.called).to.be.true;
      sinon.assert.calledWith(resWithStatus.status, 401);
      expect(resWithStatus.json.called).to.be.true;
    });
  });
});