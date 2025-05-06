const { 
    handleWelcome,
    handleExpediente,
    handleValidarExpediente,
    handleRespuesta,
    handleAgent,
    handleMetrics
  } = require('../../../src/controllers/texmlController');
  const { RESPONSE_TYPES, sendResponse } = require('../../../src/texml/handlers/templateHandler');
  const { ERROR_TYPES, respondWithError } = require('../../../src/texml/handlers/errorHandler');
  const sessionCache = require('../../../src/cache/sessionCache');
  const speechHelper = require('../../../src/texml/helpers/speechHelper');
  const { consultaUnificada, formatearDatosParaIVR } = require('../../../src/services/optimizedDataService');
  const monitoring = require('../../../src/utils/monitoring');
  const config = require('../../../src/config/texml');
  
  describe('TexmlController', () => {
    // Mocks y stubs comunes
    let resStub;
    let sendResponseStub;
    let respondWithErrorStub;
    let sessionCacheStub;
    let monitoringStub;
    let speechHelperStub;
    let dataServiceStub;
    
    beforeEach(() => {
      // Reset stubs/spies
      sinon.restore();
      
      // Crear stubs para response
      resStub = {
        header: sinon.stub().returnsThis(),
        send: sinon.stub()
      };
      
      // Stub para sendResponse
      sendResponseStub = sinon.stub();
      sinon.stub(require('../../../src/texml/handlers/templateHandler'), 'sendResponse')
        .callsFake(sendResponseStub);
      
      // Stub para respondWithError
      respondWithErrorStub = sinon.stub();
      sinon.stub(require('../../../src/texml/handlers/errorHandler'), 'respondWithError')
        .callsFake(respondWithErrorStub);
      
      // Stubs para sessionCache
      sessionCacheStub = {
        getSession: sinon.stub(),
        createSession: sinon.stub().returns('test-session-id'),
        getActiveSessionsCount: sinon.stub().returns(5)
      };
      sinon.stub(sessionCache, 'getSession').callsFake(sessionCacheStub.getSession);
      sinon.stub(sessionCache, 'createSession').callsFake(sessionCacheStub.createSession);
      sinon.stub(sessionCache, 'getActiveSessionsCount').callsFake(sessionCacheStub.getActiveSessionsCount);
      
      // Stubs para monitoring
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
      
      // Stubs para speechHelper
      speechHelperStub = {
        interpretSpeechInput: sinon.stub(),
        generateUnrecognizedInputXML: sinon.stub().returns('<unrecognized-xml>')
      };
      sinon.stub(speechHelper, 'interpretSpeechInput').callsFake(speechHelperStub.interpretSpeechInput);
      sinon.stub(speechHelper, 'generateUnrecognizedInputXML').callsFake(speechHelperStub.generateUnrecognizedInputXML);
      
      // Stubs para dataService
      dataServiceStub = {
        consultaUnificada: sinon.stub(),
        formatearDatosParaIVR: sinon.stub()
      };
      sinon.stub(require('../../../src/services/optimizedDataService'), 'consultaUnificada')
        .callsFake(dataServiceStub.consultaUnificada);
      sinon.stub(require('../../../src/services/optimizedDataService'), 'formatearDatosParaIVR')
        .callsFake(dataServiceStub.formatearDatosParaIVR);
    });
    
    describe('handleWelcome', () => {
      it('should send welcome response and track session event', async () => {
        const req = {}; // No se necesitan datos para welcome
        
        await handleWelcome(req, resStub);
        
        // Verificar que se llamó a trackSessionEvent
        expect(monitoringStub.trackSessionEvent).to.have.been.calledWith('created', 'new_call');
        
        // Verificar que se envió la respuesta correcta
        expect(sendResponseStub).to.have.been.calledWith(resStub, RESPONSE_TYPES.WELCOME);
      });
    });
    
    describe('handleExpediente', () => {
      it('should process regular DTMF request', async () => {
        const req = {
          body: { Digits: '1' },
          query: {}
        };
        
        await handleExpediente(req, resStub);
        
        // Verificar que se envió la respuesta correcta
        expect(sendResponseStub).to.have.been.calledWith(resStub, RESPONSE_TYPES.REQUEST_EXPEDIENTE);
      });
      
      it('should process speech input for expediente option', async () => {
        const req = {
          body: { SpeechResult: 'quiero consultar un expediente' },
          query: {}
        };
        
        await handleExpediente(req, resStub);
        
        // Verificar que se registró el reconocimiento de voz
        expect(monitoringStub.trackSpeechRecognition).to.have.been.calledWith('attempt', 'quiero consultar un expediente', 'expediente');
        
        // Verificar que se envió la respuesta correcta
        expect(sendResponseStub).to.have.been.calledWith(resStub, RESPONSE_TYPES.REQUEST_EXPEDIENTE);
      });
      
      it('should handle speech input for service option', async () => {
        const req = {
          body: { SpeechResult: 'quiero cotizar un servicio' },
          query: {}
        };
        
        await handleExpediente(req, resStub);
        
        // Verificar que se registró el reconocimiento de voz
        expect(monitoringStub.trackSpeechRecognition).to.have.been.calledWith('attempt', 'quiero cotizar un servicio', 'expediente');
        expect(monitoringStub.trackSpeechRecognition).to.have.been.calledWith('success', 'quiero cotizar un servicio', 'servicio');
        
        // Verificar que se envió una respuesta (en este caso, no disponible)
        expect(resStub.header).to.have.been.calledWith('Content-Type', 'application/xml');
        expect(resStub.send).to.have.been.called;
      });
      
      it('should handle errors gracefully', async () => {
        const req = { body: {} };
        
        // Forzar un error
        sendResponseStub.throws(new Error('Test error'));
        
        await handleExpediente(req, resStub);
        
        // Verificar que se registró el error
        expect(monitoringStub.trackError).to.have.been.calledWith('expediente_request', sinon.match.any, sinon.match.has('error', 'Test error'));
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(resStub, ERROR_TYPES.SYSTEM_ERROR);
      });
    });
    
    describe('handleValidarExpediente', () => {
      it('should process valid expediente and create session', async () => {
        // Datos de prueba
        const mockExpediente = {
          nombre: 'Juan Pérez',
          vehiculo: 'Honda Civic 2020',
          estatus: 'En proceso'
        };
        
        const mockFormateado = {
          mensajeGeneral: 'Expediente encontrado. Juan Pérez.',
          estatus: 'En proceso'
        };
        
        // Configurar stubs
        dataServiceStub.consultaUnificada.resolves(mockExpediente);
        dataServiceStub.formatearDatosParaIVR.returns(mockFormateado);
        
        const req = {
          body: { Digits: '54321' },
          query: {}
        };
        
        await handleValidarExpediente(req, resStub);
        
        // Verificar que se llamó a consultaUnificada con el expediente correcto
        expect(dataServiceStub.consultaUnificada).to.have.been.calledWith('54321');
        
        // Verificar que se registró el expediente encontrado
        expect(monitoringStub.trackExpediente).to.have.been.calledWith('found', '54321');
        
        // Verificar que se creó una sesión
        expect(sessionCacheStub.createSession).to.have.been.calledWith(
          sinon.match.string,
          mockExpediente
        );
        
        // Verificar que se formatearon los datos
        expect(dataServiceStub.formatearDatosParaIVR).to.have.been.calledWith(mockExpediente);
        
        // Verificar que se envió la respuesta correcta
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.MAIN_MENU,
          sinon.match({
            datosFormateados: mockFormateado,
            sessionId: sinon.match.string,
            estatus: 'En proceso'
          })
        );
      });
      
      it('should handle speech input for expediente', async () => {
        const req = {
          body: { 
            SpeechResult: 'cincuenta y cuatro, trescientos veintiuno',
            Digits: ''
          },
          query: {}
        };
        
        // Mock para expediente no encontrado
        dataServiceStub.consultaUnificada.resolves(null);
        
        await handleValidarExpediente(req, resStub);
        
        // Verificar que se registró el reconocimiento de voz
        expect(monitoringStub.trackSpeechRecognition).to.have.been.calledWith(
          'attempt', 
          'cincuenta y cuatro, trescientos veintiuno', 
          'validación'
        );
        
        // Verificar que se intentó buscar el expediente
        expect(dataServiceStub.consultaUnificada).to.have.been.called;
        
        // Verificar que se registró el expediente no encontrado
        expect(monitoringStub.trackExpediente).to.have.been.calledWith('notFound', sinon.match.string);
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(
          resStub, 
          ERROR_TYPES.EXPEDIENTE_NOT_FOUND,
          sinon.match.object
        );
      });
      
      it('should handle expediente not found', async () => {
        const req = {
          body: { Digits: '99999' },
          query: { attempt: '1' }
        };
        
        // Mock para expediente no encontrado
        dataServiceStub.consultaUnificada.resolves(null);
        
        await handleValidarExpediente(req, resStub);
        
        // Verificar que se registró el expediente no encontrado
        expect(monitoringStub.trackExpediente).to.have.been.calledWith('notFound', '99999');
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(
          resStub, 
          ERROR_TYPES.EXPEDIENTE_NOT_FOUND,
          sinon.match({ attemptCount: 1 })
        );
      });
      
      it('should handle empty expediente number', async () => {
        const req = {
          body: { Digits: '' },
          query: {}
        };
        
        await handleValidarExpediente(req, resStub);
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(
          resStub, 
          ERROR_TYPES.EXPEDIENTE_INVALID,
          sinon.match.object
        );
      });
      
      it('should handle API errors', async () => {
        const req = {
          body: { Digits: '54321' },
          query: {}
        };
        
        // Forzar un error en la consulta
        dataServiceStub.consultaUnificada.rejects(new Error('API Connection Error'));
        
        await handleValidarExpediente(req, resStub);
        
        // Verificar que se registró el error
        expect(monitoringStub.trackError).to.have.been.calledWith(
          'expediente_validation', 
          sinon.match.any, 
          sinon.match.has('error', 'API Connection Error')
        );
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(resStub, ERROR_TYPES.SYSTEM_ERROR);
      });
    });
    
    describe('handleRespuesta', () => {
      // Configuración común para las pruebas de handleRespuesta
      let mockSession;
      let mockFormateado;
      
      beforeEach(() => {
        // Crear una sesión mock
        mockSession = {
          expediente: '54321',
          datosGenerales: { nombre: 'Juan Pérez', estatus: 'En proceso' },
          costos: { costo: '2500' },
          unidad: { operador: 'Carlos Martínez' },
          ubicacion: { tiempoRestante: '30 minutos' },
          tiempos: { tc: '10:15 AM', tt: '11:45 AM' },
          estatus: 'En proceso'
        };
        
        // Crear datos formateados mock
        mockFormateado = {
          mensajeGeneral: 'Expediente encontrado. Juan Pérez.',
          mensajeCostos: 'El costo total es 2500.',
          mensajeUnidad: 'Datos de la unidad: Operador: Carlos Martínez.',
          mensajeUbicacion: 'Tiempo estimado de llegada: 30 minutos.',
          mensajeTiempos: 'Tiempos del Expediente. Contacto: 10:15 AM. Término: 11:45 AM.',
          estatus: 'En proceso'
        };
        
        // Configurar stubs
        sessionCacheStub.getSession.returns(mockSession);
        dataServiceStub.formatearDatosParaIVR.returns(mockFormateado);
      });
      
      it('should handle DTMF input for costos option', async () => {
        const req = {
          body: { Digits: '1' },
          query: { sessionId: 'test-session-123' }
        };
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se obtuvo la sesión
        expect(sessionCacheStub.getSession).to.have.been.calledWith('test-session-123');
        
        // Verificar que se formatearon los datos
        expect(dataServiceStub.formatearDatosParaIVR).to.have.been.calledWith(mockSession);
        
        // Verificar que se envió la respuesta correcta con el mensaje de costos
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.RESPONSE_MENU,
          sinon.match({
            mensajeRespuesta: mockFormateado.mensajeCostos,
            sessionId: 'test-session-123',
            estatus: 'En proceso'
          })
        );
      });
      
      it('should handle DTMF input for unidad option', async () => {
        const req = {
          body: { Digits: '2' },
          query: { sessionId: 'test-session-123' }
        };
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se envió la respuesta correcta con el mensaje de unidad
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.RESPONSE_MENU,
          sinon.match({
            mensajeRespuesta: mockFormateado.mensajeUnidad
          })
        );
      });
      
      it('should handle DTMF input for ubicacion/tiempos option (3)', async () => {
        const req = {
          body: { Digits: '3' },
          query: { sessionId: 'test-session-123' }
        };
        
        await handleRespuesta(req, resStub);
        
        // Para estatus "En proceso", la opción 3 es ubicación
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.RESPONSE_MENU,
          sinon.match({
            mensajeRespuesta: mockFormateado.mensajeUbicacion
          })
        );
        
        // Cambiar el estatus a "Concluido" y probar nuevamente
        mockSession.estatus = 'Concluido';
        mockFormateado.estatus = 'Concluido';
        
        await handleRespuesta(req, resStub);
        
        // Para estatus "Concluido", la opción 3 es tiempos
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.RESPONSE_MENU,
          sinon.match({
            mensajeRespuesta: mockFormateado.mensajeTiempos,
            estatus: 'Concluido'
          })
        );
      });
      
      it('should handle DTMF input for tiempos option (4)', async () => {
        const req = {
          body: { Digits: '4' },
          query: { sessionId: 'test-session-123' }
        };
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se envió la respuesta correcta con el mensaje de tiempos
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.RESPONSE_MENU,
          sinon.match({
            mensajeRespuesta: mockFormateado.mensajeTiempos
          })
        );
        
        // Cambiar el estatus a "Concluido" y probar nuevamente
        mockSession.estatus = 'Concluido';
        
        // Para "Concluido", la opción 4 no es válida
        await handleRespuesta(req, resStub);
        
        // Debería enviar error de opción inválida
        expect(respondWithErrorStub).to.have.been.calledWith(
          resStub,
          ERROR_TYPES.INPUT_INVALID,
          sinon.match.object
        );
      });
      
      it('should handle agent transfer request (0)', async () => {
        const req = {
          body: { Digits: '0' },
          query: { sessionId: 'test-session-123' }
        };
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se registró el evento de finalización de sesión
        expect(monitoringStub.trackSessionEvent).to.have.been.calledWith('completed', 'test-session-123');
        
        // Verificar que se envió la transferencia a agente
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.AGENT_TRANSFER,
          sinon.match({ sessionId: 'test-session-123' })
        );
      });
      
      it('should handle request for another expediente (9)', async () => {
        const req = {
          body: { Digits: '9' },
          query: { sessionId: 'test-session-123' }
        };
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se registró el evento de finalización de sesión
        expect(monitoringStub.trackSessionEvent).to.have.been.calledWith('completed', 'test-session-123');
        
        // Verificar que se envió la solicitud de nuevo expediente
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.REQUEST_EXPEDIENTE
        );
      });
      
      it('should handle speech input', async () => {
        const req = {
          body: { 
            SpeechResult: 'quiero saber los costos',
            Digits: '' 
          },
          query: { sessionId: 'test-session-123' }
        };
        
        // Configurar el reconocimiento de voz para devolver opción "1"
        speechHelperStub.interpretSpeechInput.returns('1');
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se interpretó la entrada de voz
        expect(speechHelperStub.interpretSpeechInput).to.have.been.calledWith('quiero saber los costos');
        
        // Verificar que se registró el reconocimiento de voz
        expect(monitoringStub.trackSpeechRecognition).to.have.been.calledWith('attempt', 'quiero saber los costos', 'menu');
        expect(monitoringStub.trackSpeechRecognition).to.have.been.calledWith('success', 'quiero saber los costos', '1');
        
        // Verificar que se envió la respuesta correcta para costos
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.RESPONSE_MENU,
          sinon.match({
            mensajeRespuesta: mockFormateado.mensajeCostos
          })
        );
      });
      
      it('should handle unrecognized speech input', async () => {
        const req = {
          body: { 
            SpeechResult: 'no entiendo nada',
            Digits: '' 
          },
          query: { sessionId: 'test-session-123' }
        };
        
        // Configurar el reconocimiento de voz para devolver cadena vacía (no reconocido)
        speechHelperStub.interpretSpeechInput.returns('');
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se registró el reconocimiento fallido
        expect(monitoringStub.trackSpeechRecognition).to.have.been.calledWith('failure', 'no entiendo nada', 'No reconocido');
        
        // Verificar que se generó XML para entrada no reconocida
        expect(speechHelperStub.generateUnrecognizedInputXML).to.have.been.calledWith('test-session-123', 'En proceso');
        
        // Verificar que se envió el XML de entrada no reconocida
        expect(resStub.header).to.have.been.calledWith('Content-Type', 'application/xml');
        expect(resStub.send).to.have.been.calledWith('<unrecognized-xml>');
      });
      
      it('should handle missing session ID', async () => {
        const req = {
          body: { Digits: '1' },
          query: {} // Sin sessionId
        };
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se registró el error
        expect(monitoringStub.trackError).to.have.been.calledWith('session_missing', sinon.match.any);
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(resStub, ERROR_TYPES.SESSION_INVALID);
      });
      
      it('should handle expired session', async () => {
        const req = {
          body: { Digits: '1' },
          query: { sessionId: 'expired-session' }
        };
        
        // Configurar para devolver sesión nula (expirada)
        sessionCacheStub.getSession.returns(null);
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se registró el evento de sesión expirada
        expect(monitoringStub.trackSessionEvent).to.have.been.calledWith('expired', 'expired-session');
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(resStub, ERROR_TYPES.SESSION_EXPIRED);
      });
      
      it('should handle missing input', async () => {
        const req = {
          body: {}, // Sin Digits ni SpeechResult
          query: { sessionId: 'test-session-123' }
        };
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se registró el error
        expect(monitoringStub.trackError).to.have.been.calledWith('input_missing', sinon.match.any, sinon.match.object);
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(
          resStub, 
          ERROR_TYPES.INPUT_INVALID, 
          sinon.match({ sessionId: 'test-session-123' })
        );
      });
      
      it('should handle invalid option', async () => {
        const req = {
          body: { Digits: '7' }, // Opción inválida
          query: { sessionId: 'test-session-123' }
        };
        
        await handleRespuesta(req, resStub);
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(
          resStub, 
          ERROR_TYPES.INPUT_INVALID, 
          sinon.match({ 
            sessionId: 'test-session-123',
            action: sinon.match(/\/respuesta\?sessionId=test-session-123/)
          })
        );
      });
    });
    
    describe('handleAgent', () => {
      it('should transfer to agent when transfer is enabled', async () => {
        // Configurar el stub de config
        sinon.stub(config, 'transfer').value({ enabled: true });
        
        const req = {
          query: { sessionId: 'test-session-123' }
        };
        
        await handleAgent(req, resStub);
        
        // Verificar que se registró el evento de finalización de sesión
        expect(monitoringStub.trackSessionEvent).to.have.been.calledWith('completed', 'test-session-123');
        
        // Verificar que se envió la transferencia a agente
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.AGENT_TRANSFER,
          sinon.match({ sessionId: 'test-session-123' })
        );
      });
      
      it('should offer callback when transfer is disabled', async () => {
        // Configurar el stub de config
        sinon.stub(config, 'transfer').value({ enabled: false });
        
        const req = {
          query: { sessionId: 'test-session-123' }
        };
        
        await handleAgent(req, resStub);
        
        // Verificar que se registró el error
        expect(monitoringStub.trackError).to.have.been.calledWith('transfer_disabled', sinon.match.any, sinon.match.object);
        
        // Verificar que se envió la opción de callback
        expect(sendResponseStub).to.have.been.calledWith(
          resStub,
          RESPONSE_TYPES.CALLBACK,
          sinon.match({ sessionId: 'test-session-123' })
        );
      });
      
      it('should handle errors', async () => {
        const req = {
          query: { sessionId: 'test-session-123' }
        };
        
        // Forzar un error
        sendResponseStub.throws(new Error('Transfer error'));
        
        await handleAgent(req, resStub);
        
        // Verificar que se registró el error
        expect(monitoringStub.trackError).to.have.been.calledWith('agent_transfer', sinon.match.any, sinon.match.object);
        
        // Verificar que se envió una respuesta de error
        expect(respondWithErrorStub).to.have.been.calledWith(
          resStub, 
          ERROR_TYPES.SYSTEM_ERROR, 
          sinon.match({ sessionId: 'test-session-123' })
        );
      });
    });
    
    describe('handleMetrics', () => {
      it('should return metrics when authorized', async () => {
        // Configurar el token de admin
        sinon.stub(config, 'adminToken').value('valid-token');
        
        const req = {
          query: { token: 'valid-token' }
        };
        
        await handleMetrics(req, resStub);
        
        // Verificar que se obtuvieron las métricas
        expect(monitoringStub.getMetricsSummary).to.have.been.called;
        
        // Verificar que se enviaron las métricas en formato JSON
        expect(resStub.json).to.have.been.called;
      });
      
      it('should reject unauthorized requests', async () => {
        // Configurar el token de admin
        sinon.stub(config, 'adminToken').value('valid-token');
        
        const req = {
          query: { token: 'invalid-token' }
        };
        
        // Crear una versión especializada de resStub para esta prueba
        const resStubWithStatus = {
          ...resStub,
          status: sinon.stub().returnsThis(),
          json: sinon.stub()
        };
        
        await handleMetrics(req, resStubWithStatus);
        
        // Verificar que se rechazó la solicitud con estado 401
        expect(resStubWithStatus.status).to.have.been.calledWith(401);
        expect(resStubWithStatus.json).to.have.been.calledWith(sinon.match({ error: 'Unauthorized' }));
      });
    });
  });