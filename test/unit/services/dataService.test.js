const { consultaUnificada, formatearDatosParaIVR } = require('../../../src/services/dataService');
const TelnyxService = require('../../../src/services/telnyxService');
const telnyxMock = require('../../mocks/telnyx-mock');

describe('DataService', () => {
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
    });
    
    it('should return null when expedition is not found', async () => {
      // Configurar stubs para simular expediente no encontrado
      telnyxServiceStub.obtenerExpediente.resolves(null);
      
      // Ejecutar consulta unificada
      const result = await consultaUnificada('99999');
      
      // Verificar que se llamó al método principal
      expect(telnyxServiceStub.obtenerExpediente).to.have.been.calledWith('99999');
      
      // Verificar que no se llamaron los demás métodos
      expect(telnyxServiceStub.obtenerExpedienteCosto).to.not.have.been.called;
      expect(telnyxServiceStub.obtenerExpedienteUnidadOp).to.not.have.been.called;
      expect(telnyxServiceStub.obtenerExpedienteUbicacion).to.not.have.been.called;
      expect(telnyxServiceStub.obtenerExpedienteTiempos).to.not.have.been.called;
      
      // Verificar que el resultado es null
      expect(result).to.be.null;
    });
    
    it('should handle errors in API calls', async () => {
      // Configurar stubs para simular éxito en datos principales pero errores en secundarios
      telnyxServiceStub.obtenerExpediente.resolves(telnyxMock.mockExpedienteData);
      telnyxServiceStub.obtenerExpedienteCosto.rejects(new Error('API error'));
      telnyxServiceStub.obtenerExpedienteUnidadOp.resolves(telnyxMock.mockUnidadData);
      telnyxServiceStub.obtenerExpedienteUbicacion.rejects(new Error('Timeout'));
      telnyxServiceStub.obtenerExpedienteTiempos.resolves(telnyxMock.mockTiemposData);
      
      // Ejecutar consulta unificada
      let error;
      try {
        await consultaUnificada('54321');
      } catch (err) {
        error = err;
      }
      
      // Verificar que ocurrió un error
      expect(error).to.be.an.instanceOf(Error);
    });
  });
  
  describe('formatearDatosParaIVR', () => {
    it('should format data correctly for expediente En proceso', () => {
      const datosUnificados = {
        expediente: '54321',
        datosGenerales: telnyxMock.mockExpedienteData,
        costos: telnyxMock.mockCostoData,
        unidad: telnyxMock.mockUnidadData,
        ubicacion: telnyxMock.mockUbicacionData,
        tiempos: telnyxMock.mockTiemposData,
        timestamp: Date.now(),
        estatus: 'En proceso'
      };
      
      const result = formatearDatosParaIVR(datosUnificados);
      
      // Verificar que devuelve todas las propiedades esperadas
      expect(result).to.have.all.keys([
        'mensajeGeneral',
        'mensajeCostos',
        'mensajeUnidad',
        'mensajeUbicacion',
        'mensajeTiempos',
        'estatus'
      ]);
      
      // Verificar contenido de los mensajes
      expect(result.mensajeGeneral).to.include('Juan Pérez');
      expect(result.mensajeGeneral).to.include('Honda Civic 2020');
      expect(result.mensajeGeneral).to.include('En proceso');
      expect(result.mensajeGeneral).to.include('Carretero');
      
      expect(result.mensajeCostos).to.include('2500');
      expect(result.mensajeCostos).to.include('banderazo 500');
      
      expect(result.mensajeUnidad).to.include('Carlos Martínez');
      expect(result.mensajeUnidad).to.include('Plataforma');
      expect(result.mensajeUnidad).to.include('ABC-123');
      
      expect(result.mensajeUbicacion).to.include('30 minutos');
      expect(result.mensajeUbicacion).to.include('Maps');
      
      expect(result.mensajeTiempos).to.include('10:15 AM');
      expect(result.mensajeTiempos).to.include('11:45 AM');
      
      expect(result.estatus).to.equal('En proceso');
    });
    
    it('should format data correctly for expediente Concluido', () => {
      const datosUnificados = {
        expediente: '12345',
        datosGenerales: telnyxMock.mockExpedienteConcluido,
        costos: telnyxMock.mockCostoData,
        unidad: telnyxMock.mockUnidadData,
        ubicacion: telnyxMock.mockUbicacionData,
        tiempos: telnyxMock.mockTiemposData,
        timestamp: Date.now(),
        estatus: 'Concluido'
      };
      
      const result = formatearDatosParaIVR(datosUnificados);
      
      // Verificar contenido específico para Concluido
      expect(result.mensajeGeneral).to.include('María López');
      expect(result.mensajeGeneral).to.include('Nissan Versa 2019');
      expect(result.mensajeGeneral).to.include('Concluido');
      expect(result.mensajeGeneral).to.include('Local');
      
      // Verificar formato de costo para servicio Local
      expect(result.mensajeCostos).to.include('plano 2000');
      
      expect(result.estatus).to.equal('Concluido');
    });
    
    it('should handle missing or null data gracefully', () => {
      const datosUnificados = {
        expediente: '54321',
        datosGenerales: { 
          nombre: 'Juan Pérez',
          estatus: 'En proceso',
          // Faltan algunos campos
        },
        costos: null, // Sin datos de costo
        unidad: undefined, // Sin datos de unidad
        ubicacion: {}, // Objeto vacío
        tiempos: { tc: null }, // Datos parciales
        timestamp: Date.now(),
        estatus: 'En proceso'
      };
      
      const result = formatearDatosParaIVR(datosUnificados);
      
      // Verificar que sigue funcionando a pesar de los datos faltantes
      expect(result.mensajeGeneral).to.include('Juan Pérez');
      expect(result.mensajeGeneral).to.include('No especificado'); // Para campos faltantes
      
      // Detalles de costo deberían manejar el null
      expect(result.mensajeCostos).to.not.be.undefined;
      expect(result.mensajeUnidad).to.not.be.undefined;
      expect(result.mensajeUbicacion).to.not.be.undefined;
      expect(result.mensajeTiempos).to.not.be.undefined;
    });
    
    it('should return null if input is null or undefined', () => {
      expect(formatearDatosParaIVR(null)).to.be.null;
      expect(formatearDatosParaIVR(undefined)).to.be.null;
    });
  });
});