const TelnyxService = require('../../../src/services/telnyxService');
const AxiosService = require('../../../src/services/axiosService');
const telnyxMock = require('../../mocks/telnyx-mock');

describe('TelnyxService', () => {
  let telnyxService;
  let axiosServiceStub;

  beforeEach(() => {
    // Mock para AxiosService
    axiosServiceStub = {
      request: sinon.stub()
    };
    
    // Stub para el constructor de AxiosService
    sinon.stub(AxiosService.prototype, 'request').callsFake(axiosServiceStub.request);
    
    // Crear instancia de TelnyxService
    telnyxService = new TelnyxService();
  });

  describe('obtenerExpediente', () => {
    it('should return expedition data for valid number', async () => {
      // Configurar el stub para devolver datos del expediente
      axiosServiceStub.request.resolves({
        dataResponse: telnyxMock.mockExpedienteData
      });
      
      // Llamar a la función
      const result = await telnyxService.obtenerExpediente('54321');
      
      // Verificar que se llamó con los parámetros correctos
      expect(axiosServiceStub.request).to.have.been.calledWith(
        'GET',
        '/api/ConsultaExterna/ObtenerExpedienteBot?numero=54321'
      );
      
      // Verificar el resultado
      expect(result).to.deep.equal(telnyxMock.mockExpedienteData);
    });
    
    it('should return null for invalid number', async () => {
      // Configurar el stub para lanzar un error
      axiosServiceStub.request.rejects(new Error('Not found'));
      
      // Llamar a la función
      const result = await telnyxService.obtenerExpediente('99999');
      
      // Verificar que se llamó con los parámetros correctos
      expect(axiosServiceStub.request).to.have.been.calledWith(
        'GET',
        '/api/ConsultaExterna/ObtenerExpedienteBot?numero=99999'
      );
      
      // Verificar el resultado
      expect(result).to.be.null;
    });
  });

  describe('obtenerExpedienteCosto', () => {
    it('should return cost data for valid number', async () => {
      // Configurar el stub para devolver datos de costo
      axiosServiceStub.request.resolves({
        dataResponse: telnyxMock.mockCostoData
      });
      
      // Llamar a la función
      const result = await telnyxService.obtenerExpedienteCosto('54321');
      
      // Verificar que se llamó con los parámetros correctos
      expect(axiosServiceStub.request).to.have.been.calledWith(
        'GET',
        '/api/ConsultaExterna/ObtenerExpedienteCostoBot?numero=54321'
      );
      
      // Verificar el resultado
      expect(result).to.deep.equal(telnyxMock.mockCostoData);
    });
    
    it('should return null on error', async () => {
      // Configurar el stub para lanzar un error
      axiosServiceStub.request.rejects(new Error('Not found'));
      
      // Llamar a la función
      const result = await telnyxService.obtenerExpedienteCosto('99999');
      
      // Verificar el resultado
      expect(result).to.be.null;
    });
  });

  describe('obtenerExpedienteUnidadOp', () => {
    it('should return unit data for valid number', async () => {
      // Configurar el stub para devolver datos de unidad
      axiosServiceStub.request.resolves({
        dataResponse: telnyxMock.mockUnidadData
      });
      
      // Llamar a la función
      const result = await telnyxService.obtenerExpedienteUnidadOp('54321');
      
      // Verificar que se llamó con los parámetros correctos
      expect(axiosServiceStub.request).to.have.been.calledWith(
        'GET',
        '/api/ConsultaExterna/ObtenerExpedienteUnidadOpBot?numero=54321'
      );
      
      // Verificar el resultado
      expect(result).to.deep.equal(telnyxMock.mockUnidadData);
    });
  });

  describe('obtenerExpedienteUbicacion', () => {
    it('should return location data for valid number', async () => {
      // Configurar el stub para devolver datos de ubicación
      axiosServiceStub.request.resolves({
        dataResponse: telnyxMock.mockUbicacionData
      });
      
      // Llamar a la función
      const result = await telnyxService.obtenerExpedienteUbicacion('54321');
      
      // Verificar que se llamó con los parámetros correctos
      expect(axiosServiceStub.request).to.have.been.calledWith(
        'GET',
        '/api/ConsultaExterna/ObtenerExpedienteUbicacionBot?numero=54321'
      );
      
      // Verificar el resultado
      expect(result).to.deep.equal(telnyxMock.mockUbicacionData);
    });
  });

  describe('obtenerExpedienteTiempos', () => {
    it('should return time data for valid number', async () => {
      // Configurar el stub para devolver datos de tiempos
      axiosServiceStub.request.resolves({
        dataResponse: telnyxMock.mockTiemposData
      });
      
      // Llamar a la función
      const result = await telnyxService.obtenerExpedienteTiempos('54321');
      
      // Verificar que se llamó con los parámetros correctos
      expect(axiosServiceStub.request).to.have.been.calledWith(
        'GET',
        '/api/ConsultaExterna/ObtenerExpedienteTiemposBot?numero=54321'
      );
      
      // Verificar el resultado
      expect(result).to.deep.equal(telnyxMock.mockTiemposData);
    });
  });
});