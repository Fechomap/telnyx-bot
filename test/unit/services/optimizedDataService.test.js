const { 
    consultaUnificada,
    formatearDatosParaIVR,
    clearCache, 
    getCacheStats 
  } = require('../../../src/services/optimizedDataService');
  const TelnyxService = require('../../../src/services/telnyxService');
  const telnyxMock = require('../../mocks/telnyx-mock');
  
  describe('OptimizedDataService', () => {
    let telnyxServiceStub;
    
    beforeEach(() => {
      // Crear stubs para todos los métodos de TelnyxService
      telnyxServiceStub = {
        obtenerExpediente: sinon.stub(),
        obtenerExpedienteCosto: sinon.stub(),
        obtenerExpedienteUnidadOp: sinon.stub(),
        obtenerExpedienteUbicacion: sinon.stub(),
        obtenerExpedienteTiempos: sinon.stub()
      };
      
      // Reemplazar el constructor de TelnyxService
      sinon.stub(TelnyxService.prototype, 'obtenerExpediente').callsFake(telnyxServiceStub.obtenerExpediente);
      sinon.stub(TelnyxService.prototype, 'obtenerExpedienteCosto').callsFake(telnyxServiceStub.obtenerExpedienteCosto);
      sinon.stub(TelnyxService.prototype, 'obtenerExpedienteUnidadOp').callsFake(telnyxServiceStub.obtenerExpedienteUnidadOp);
      sinon.stub(TelnyxService.prototype, 'obtenerExpedienteUbicacion').callsFake(telnyxServiceStub.obtenerExpedienteUbicacion);
      sinon.stub(TelnyxService.prototype, 'obtenerExpedienteTiempos').callsFake(telnyxServiceStub.obtenerExpedienteTiempos);
      
      // Limpiar el caché antes de cada prueba
      clearCache();
    });
    
    describe('consultaUnificada', () => {
      it('should fetch all data in parallel for valid expedition', async () => {
        // Configurar stubs para devolver datos de prueba
        telnyxServiceStub.obtenerExpediente.resolves(telnyxMock.mockExpedienteData);
        telnyxServiceStub.obtenerExpedienteCosto.resolves(telnyxMock.mockCostoData);
        telnyxServiceStub.obtenerExpedienteUnidadOp.resolves(telnyxMock.mockUnidadData);
        telnyxServiceStub.obtenerExpedienteUbicacion.resolves(telnyxMock.mockUbicacionData);
        telnyxServiceStub.obtenerExpedienteTiempos.resolves(telnyxMock.mockTiemposData);
        
        // Ejecutar consulta unificada
        const result = await consultaUnificada('54321');
        
        // Verificar que todos los métodos fueron llamados con el número de expediente correcto
        expect(telnyxServiceStub.obtenerExpediente).to.have.been.calledWith('54321');
        expect(telnyxServiceStub.obtenerExpedienteCosto).to.have.been.calledWith('54321');
        expect(telnyxServiceStub.obtenerExpedienteUnidadOp).to.have.been.calledWith('54321');
        expect(telnyxServiceStub.obtenerExpedienteUbicacion).to.have.been.calledWith('54321');
        expect(telnyxServiceStub.obtenerExpedienteTiempos).to.have.been.calledWith('54321');
        
        // Verificar estructura del resultado
        expect(result).to.have.property('expediente', '54321');
        expect(result).to.have.property('datosGenerales').that.deep.equals(telnyxMock.mockExpedienteData);
        expect(result).to.have.property('costos').that.deep.equals(telnyxMock.mockCostoData);
        expect(result).to.have.property('unidad').that.deep.equals(telnyxMock.mockUnidadData);
        expect(result).to.have.property('ubicacion').that.deep.equals(telnyxMock.mockUbicacionData);
        expect(result).to.have.property('tiempos').that.deep.equals(telnyxMock.mockTiemposData);
        expect(result).to.have.property('timestamp').that.is.a('number');
        expect(result).to.have.property('estatus', 'En proceso');
        
        // Verificar que la segunda llamada usa el caché
        // Resetear stubs para verificar que no se llaman nuevamente
        telnyxServiceStub.obtenerExpediente.resetHistory();
        telnyxServiceStub.obtenerExpedienteCosto.resetHistory();
        telnyxServiceStub.obtenerExpedienteUnidadOp.resetHistory();
        telnyxServiceStub.obtenerExpedienteUbicacion.resetHistory();
        telnyxServiceStub.obtenerExpedienteTiempos.resetHistory();
        
        // Segunda llamada para el mismo expediente
        const cachedResult = await consultaUnificada('54321');
        
        // Verificar que no se llamaron los métodos de nuevo
        expect(telnyxServiceStub.obtenerExpediente).to.not.have.been.called;
        expect(telnyxServiceStub.obtenerExpedienteCosto).to.not.have.been.called;
        expect(telnyxServiceStub.obtenerExpedienteUnidadOp).to.not.have.been.called;
        expect(telnyxServiceStub.obtenerExpedienteUbicacion).to.not.have.been.called;
        expect(telnyxServiceStub.obtenerExpedienteTiempos).to.not.have.been.called;
        
        // Verificar que los resultados son iguales
        expect(cachedResult).to.deep.equal(result);
      });
      
      it('should return null when expedition is not found', async () => {
        // Configurar stubs para simular expediente no encontrado
        telnyxServiceStub.obtenerExpediente.resolves(null);
        
        // Ejecutar consulta unificada
        const result = await consultaUnificada('99999');
        
        // Verificar que se llamó al método principal
        expect(telnyxServiceStub.obtenerExpediente).to.have.been.calledWith('99999');
        
        // Verificar que el resultado es null
        expect(result).to.be.null;
      });
      
      it('should handle timeout errors in API calls', async () => {
        // Configurar stubs para simular éxito en datos principales pero timeouts en secundarios
        telnyxServiceStub.obtenerExpediente.resolves(telnyxMock.mockExpedienteData);
        
        // Simular timeout en costo
        const timeoutError = new Error('Timeout');
        timeoutError.message = 'Timeout';
        telnyxServiceStub.obtenerExpedienteCosto.rejects(timeoutError);
        
        telnyxServiceStub.obtenerExpedienteUnidadOp.resolves(telnyxMock.mockUnidadData);
        telnyxServiceStub.obtenerExpedienteUbicacion.resolves(telnyxMock.mockUbicacionData);
        telnyxServiceStub.obtenerExpedienteTiempos.resolves(telnyxMock.mockTiemposData);
        
        // Ejecutar consulta unificada
        const result = await consultaUnificada('54321');
        
        // Verificar que no falla y devuelve datos con objeto vacío para costos
        expect(result).to.have.property('expediente', '54321');
        expect(result).to.have.property('datosGenerales').that.deep.equals(telnyxMock.mockExpedienteData);
        expect(result).to.have.property('costos').that.deep.equals({});  // Objeto vacío para costos
        expect(result).to.have.property('unidad').that.deep.equals(telnyxMock.mockUnidadData);
        expect(result).to.have.property('ubicacion').that.deep.equals(telnyxMock.mockUbicacionData);
        expect(result).to.have.property('tiempos').that.deep.equals(telnyxMock.mockTiemposData);
      });
      
      it('should handle errors in main expedition API call', async () => {
        // Configurar stub para simular error al obtener expediente
        const apiError = new Error('API error');
        telnyxServiceStub.obtenerExpediente.rejects(apiError);
        
        try {
          await consultaUnificada('54321');
          // Si llegamos aquí, el test debería fallar
          expect.fail('Expected an error but none was thrown');
        } catch (error) {
          // Verificar que ocurrió un error
          expect(error).to.be.an.instanceOf(Error);
        }
      });
    });
    
    describe('formatearDatosParaIVR', () => {
      it('should format data with safe property access', () => {
        const datosUnificados = {
          expediente: '54321',
          datosGenerales: { 
            nombre: 'Juan Pérez',
            estatus: 'En proceso'
            // Sin otros campos
          },
          costos: {}, // Objeto vacío
          unidad: null, // Null
          ubicacion: undefined, // Undefined
          tiempos: { tc: '10:15 AM' }, // Parcial
          timestamp: Date.now(),
          estatus: 'En proceso'
        };
        
        const result = formatearDatosParaIVR(datosUnificados);
        
        // Verificar manejo seguro de propiedades faltantes
        expect(result.mensajeGeneral).to.include('Juan Pérez');
        expect(result.mensajeGeneral).to.include('No disponible'); // Para campos faltantes
        
        // Todas las propiedades deben existir sin errores
        expect(result.mensajeCostos).to.be.a('string');
        expect(result.mensajeUnidad).to.be.a('string');
        expect(result.mensajeUbicacion).to.be.a('string');
        expect(result.mensajeTiempos).to.be.a('string');
        expect(result.mensajeTiempos).to.include('10:15 AM');
      });
    });
    
    describe('clearCache', () => {
      it('should clear all cached data', async () => {
        // Configurar stubs
        telnyxServiceStub.obtenerExpediente.resolves(telnyxMock.mockExpedienteData);
        telnyxServiceStub.obtenerExpedienteCosto.resolves(telnyxMock.mockCostoData);
        telnyxServiceStub.obtenerExpedienteUnidadOp.resolves(telnyxMock.mockUnidadData);
        telnyxServiceStub.obtenerExpedienteUbicacion.resolves(telnyxMock.mockUbicacionData);
        telnyxServiceStub.obtenerExpedienteTiempos.resolves(telnyxMock.mockTiemposData);
        
        // Llenar el caché con algunas consultas
        await consultaUnificada('12345');
        await consultaUnificada('54321');
        
        // Verificar que el caché tiene elementos
        const statsBefore = getCacheStats();
        expect(statsBefore.count).to.equal(2);
        
        // Limpiar el caché
        clearCache();
        
        // Verificar que el caché está vacío
        const statsAfter = getCacheStats();
        expect(statsAfter.count).to.equal(0);
      });
    });
    
    describe('getCacheStats', () => {
      it('should return correct statistics about cache', async () => {
        // Configurar stubs
        telnyxServiceStub.obtenerExpediente.resolves(telnyxMock.mockExpedienteData);
        telnyxServiceStub.obtenerExpedienteCosto.resolves(telnyxMock.mockCostoData);
        telnyxServiceStub.obtenerExpedienteUnidadOp.resolves(telnyxMock.mockUnidadData);
        telnyxServiceStub.obtenerExpedienteUbicacion.resolves(telnyxMock.mockUbicacionData);
        telnyxServiceStub.obtenerExpedienteTiempos.resolves(telnyxMock.mockTiemposData);
        
        // Caché inicialmente vacío
        const emptyStats = getCacheStats();
        expect(emptyStats.count).to.equal(0);
        expect(emptyStats.items).to.be.an('array').that.is.empty;
        expect(emptyStats.timestamp).to.be.a('number');
        
        // Llenar el caché con algunas consultas
        await consultaUnificada('12345');
        await consultaUnificada('54321');
        
        // Verificar estadísticas actualizadas
        const stats = getCacheStats();
        expect(stats.count).to.equal(2);
        expect(stats.items).to.be.an('array').that.includes('12345', '54321');
        expect(stats.timestamp).to.be.a('number');
      });
    });
  });