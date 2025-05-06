const monitoring = require('../../../src/utils/monitoring');
const fs = require('fs');
const path = require('path');

describe('Monitoring', () => {
  // Stubs para fs
  let fsStub;
  
  beforeEach(() => {
    // Crear stubs para fs.appendFile
    fsStub = sinon.stub(fs, 'appendFile').callsFake((filePath, content, callback) => {
      if (callback) callback(null);
    });
    
    // Stub para console.error (evitar mensajes de error en tests)
    sinon.stub(console, 'error');
  });
  
  afterEach(() => {
    // Restaurar stubs
    sinon.restore();
  });
  
  describe('responseTimeMiddleware', () => {
    it('should return a middleware function', () => {
      const middleware = monitoring.responseTimeMiddleware();
      
      expect(middleware).to.be.a('function');
      expect(middleware.length).to.equal(3); // req, res, next
    });
    
    it('should track response time and update metrics', (done) => {
      const middleware = monitoring.responseTimeMiddleware();
      
      // Mock para req, res y next
      const req = {
        originalUrl: '/test-endpoint',
        method: 'GET'
      };
      
      const res = {
        on: (event, callback) => {
          if (event === 'finish') {
            // Simular finalización de la respuesta después de un breve retraso
            setTimeout(() => {
              callback();
              
              // Verificar que se actualizaron las métricas
              const metrics = monitoring.getMetricsSummary();
              expect(metrics.performance.responseTime.avg).to.not.equal('0ms');
              expect(fsStub).to.have.been.called;
              
              done();
            }, 10);
          }
        },
        statusCode: 200
      };
      
      const next = sinon.spy();
      
      // Ejecutar middleware
      middleware(req, res, next);
      
      // Verificar que se llamó a next
      expect(next).to.have.been.called;
    });
  });
  
  describe('startDataQuery', () => {
    it('should return a function that tracks query time', () => {
      const endTracker = monitoring.startDataQuery();
      
      expect(endTracker).to.be.a('function');
      
      // Ejecutar la función después de un breve retraso
      setTimeout(() => {
        const duration = endTracker(true);
        
        // Verificar que devuelve una duración
        expect(duration).to.be.a('number');
        expect(duration).to.be.greaterThan(0);
        
        // Verificar que se actualizaron las métricas
        const metrics = monitoring.getMetricsSummary();
        expect(metrics.performance.dataQueryTime.avg).to.not.equal('0ms');
        
        // Verificar que se escribió en el log
        expect(fsStub).to.have.been.called;
      }, 10);
    });
    
    it('should track success/failure status', () => {
      // Éxito
      const endTrackerSuccess = monitoring.startDataQuery();
      endTrackerSuccess(true);
      
      // Fallo
      const endTrackerFailure = monitoring.startDataQuery();
      endTrackerFailure(false);
      
      // Verificar que se llamó a appendFile con los parámetros correctos
      expect(fsStub).to.have.been.calledWith(
        sinon.match(/data-queries\.log$/),
        sinon.match(/SUCCESS/)
      );
      
      expect(fsStub).to.have.been.calledWith(
        sinon.match(/data-queries\.log$/),
        sinon.match(/FAILURE/)
      );
    });
  });
  
  describe('trackSessionEvent', () => {
    it('should increment counter and log session events', () => {
      // Probar diferentes tipos de eventos
      monitoring.trackSessionEvent('created', 'session-123');
      monitoring.trackSessionEvent('active', 'session-123');
      monitoring.trackSessionEvent('completed', 'session-123');
      monitoring.trackSessionEvent('expired', 'session-123');
      
      // Verificar que se actualizaron los contadores
      const metrics = monitoring.getMetricsSummary();
      expect(metrics.sessions.created).to.be.greaterThan(0);
      expect(metrics.sessions.active).to.be.greaterThan(0);
      expect(metrics.sessions.completed).to.be.greaterThan(0);
      expect(metrics.sessions.expired).to.be.greaterThan(0);
      
      // Verificar que se escribió en el log para cada evento
      expect(fsStub).to.have.callCount(4);
      expect(fsStub).to.have.been.calledWith(
        sinon.match(/sessions\.log$/),
        sinon.match(/Session \| created \| session-123/)
      );
    });
    
    it('should handle unknown event types gracefully', () => {
      monitoring.trackSessionEvent('unknown-event', 'session-123');
      
      // Verificar que se escribió en el log pero no se actualizó contador
      expect(fsStub).to.have.been.calledWith(
        sinon.match(/sessions\.log$/),
        sinon.match(/Session \| unknown-event \| session-123/)
      );
    });
  });
  
  describe('trackError', () => {
    it('should increment error counter and log errors', () => {
      // Llamar con diferentes tipos de errores
      monitoring.trackError('api_error', '/test-endpoint', { details: 'Connection refused' });
      monitoring.trackError('session_expired', '/menu', { sessionId: 'expired-session' });
      
      // Verificar que se actualizaron los contadores
      const metrics = monitoring.getMetricsSummary();
      expect(metrics.requests.errors.total).to.be.greaterThan(0);
      
      // Verificar que se escribió en el log para cada error
      expect(fsStub).to.have.been.calledWith(
        sinon.match(/errors\.log$/),
        sinon.match(/Error \| api_error \| \/test-endpoint/)
      );
      
      expect(fsStub).to.have.been.calledWith(
        sinon.match(/errors\.log$/),
        sinon.match(/Error \| session_expired \| \/menu/)
      );
    });
  });
  
  describe('trackSpeechRecognition', () => {
    it('should track speech recognition metrics', () => {
      // Intentos
      monitoring.trackSpeechRecognition('attempt', 'costos', 'menu');
      
      // Éxitos
      monitoring.trackSpeechRecognition('success', 'costos', '1');
      monitoring.trackSpeechRecognition('success', 'unidad', '2');
      
      // Fallos
      monitoring.trackSpeechRecognition('failure', 'palabra desconocida', 'No reconocido');
      
      // Verificar que se actualizaron los contadores
      const metrics = monitoring.getMetricsSummary();
      expect(metrics.features.speechRecognition.attempts).to.be.greaterThan(0);
      expect(metrics.features.speechRecognition.successful).to.be.greaterThan(0);
      expect(metrics.features.speechRecognition.failed).to.be.greaterThan(0);
      
      // Verificar que la tasa de éxito está en un formato correcto
      expect(metrics.features.speechRecognition.successRate).to.match(/^\d+(\.\d+)?%$/);
      
      // Verificar que se escribió en el log para cada evento
      expect(fsStub).to.have.callCount(4);
      expect(fsStub).to.have.been.calledWith(
        sinon.match(/speech-recognition\.log$/),
        sinon.match(/Speech \| attempt \| "costos" \| "menu"/)
      );
    });
  });
  
  describe('trackExpediente', () => {
    it('should track expediente metrics', () => {
      // Consulta
      monitoring.trackExpediente('query', '12345');
      
      // Encontrado
      monitoring.trackExpediente('found', '12345');
      
      // No encontrado
      monitoring.trackExpediente('notFound', '99999');
      
      // Desde caché
      monitoring.trackExpediente('cached', '12345');
      
      // Verificar que se actualizaron los contadores
      const metrics = monitoring.getMetricsSummary();
      expect(metrics.features.expedientes.total).to.be.greaterThan(0);
      expect(metrics.features.expedientes.found).to.be.greaterThan(0);
      expect(metrics.features.expedientes.notFound).to.be.greaterThan(0);
      expect(metrics.features.expedientes.cached).to.be.greaterThan(0);
      
      // Verificar que se escribió en el log para cada evento
      expect(fsStub).to.have.callCount(4);
      expect(fsStub).to.have.been.calledWith(
        sinon.match(/expedientes\.log$/),
        sinon.match(/Expediente \| query \| 12345/)
      );
    });
  });
  
  describe('getMetricsSummary', () => {
    it('should return formatted metrics summary', () => {
      // Realizar algunas acciones para generar métricas
      monitoring.trackSessionEvent('created', 'session-1');
      monitoring.trackSessionEvent('active', 'session-1');
      monitoring.trackError('api_error', '/test', { details: 'Test error' });
      monitoring.trackSpeechRecognition('attempt', 'test', 'context');
      monitoring.trackSpeechRecognition('success', 'test', 'result');
      monitoring.trackExpediente('query', '12345');
      monitoring.trackExpediente('found', '12345');
      
      // Obtener resumen de métricas
      const summary = monitoring.getMetricsSummary();
      
      // Verificar que tiene la estructura esperada
      expect(summary).to.have.property('uptime').that.matches(/^\d+h \d+m$/);
      
      // Requests
      expect(summary).to.have.nested.property('requests.total').that.is.a('number');
      expect(summary).to.have.nested.property('requests.errors.total').that.is.a('number');
      expect(summary).to.have.nested.property('requests.errors.rate').that.matches(/^\d+(\.\d+)?%$/);
      
      // Sessions
      expect(summary).to.have.nested.property('sessions.created').that.is.a('number');
      expect(summary).to.have.nested.property('sessions.active').that.is.a('number');
      
      // Performance
      expect(summary).to.have.nested.property('performance.responseTime.avg').that.matches(/^\d+(\.\d+)?ms$/);
      expect(summary).to.have.nested.property('performance.dataQueryTime.avg').that.matches(/^\d+(\.\d+)?ms$/);
      
      // Features
      expect(summary).to.have.nested.property('features.speechRecognition.successRate').that.matches(/^\d+(\.\d+)?%$/);
      expect(summary).to.have.nested.property('features.expedientes.found').that.is.a('number');
    });
    
    it('should handle empty metrics gracefully', () => {
      // Crear un nuevo objeto de monitoreo sin datos (simulando un reinicio)
      // Nota: En un entorno real, esto requeriría una manera de reiniciar las métricas
      
      // Obtener resumen de métricas (debería tener valores por defecto)
      const summary = monitoring.getMetricsSummary();
      
      // Verificar que sigue siendo un objeto bien formado
      expect(summary).to.be.an('object');
      expect(summary).to.have.property('uptime');
      expect(summary).to.have.property('requests');
      expect(summary).to.have.property('sessions');
      expect(summary).to.have.property('performance');
      expect(summary).to.have.property('features');
    });
  });
  
  describe('fs error handling', () => {
    it('should handle fs.appendFile errors gracefully', () => {
      // Forzar error en fs.appendFile
      fsStub.restore();
      sinon.stub(fs, 'appendFile').callsFake((filePath, content, callback) => {
        if (callback) callback(new Error('Test fs error'));
      });
      
      // Consola ya está stubbed para capturar los mensajes de error
      
      // Realizar una acción que intente escribir en el log
      monitoring.trackSessionEvent('created', 'session-error-test');
      
      // Verificar que se llamó a console.error
      expect(console.error).to.have.been.calledWith(
        sinon.match('Error al escribir log de sesiones:')
      );
    });
  });
});