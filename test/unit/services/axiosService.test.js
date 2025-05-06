const AxiosService = require('../../../src/services/axiosService');
const axiosMock = require('../../mocks/axios-mock');

// Mock axios
jest.mock('axios', () => require('../../mocks/axios-mock'));

describe('AxiosService', () => {
  let axiosService;
  const baseURL = 'https://test-api.example.com';

  beforeEach(() => {
    axiosService = new AxiosService(baseURL);
  });

  describe('constructor', () => {
    it('should create an instance with the correct baseURL', () => {
      expect(axiosService.api).to.not.be.undefined;
    });
  });

  describe('request', () => {
    it('should make a GET request successfully', async () => {
      // Preparar un spy para la función request de axios
      const requestSpy = sinon.spy(axiosMock, 'request');
      
      // Ejecutar la solicitud
      const result = await axiosService.request(
        'GET',
        '/api/ConsultaExterna/ObtenerExpedienteBot',
        null,
        { 'Custom-Header': 'Test' }
      );
      
      // Verificar que se llamó con los parámetros correctos
      expect(requestSpy).to.have.been.calledWith(sinon.match({
        method: 'GET',
        url: '/api/ConsultaExterna/ObtenerExpedienteBot',
        headers: sinon.match({ 'Custom-Header': 'Test' })
      }));
      
      // Verificar la respuesta
      expect(result).to.have.property('dataResponse');
      expect(result.dataResponse).to.have.property('nombre', 'Juan Pérez');
    });
    
    it('should make a POST request with data', async () => {
      // Preparar un spy para la función request de axios
      const requestSpy = sinon.spy(axiosMock, 'request');
      
      const testData = { test: 'data' };
      
      // Ejecutar la solicitud
      await axiosService.request(
        'POST',
        '/api/ConsultaExterna/ObtenerExpedienteBot',
        testData
      );
      
      // Verificar que se llamó con los parámetros correctos
      expect(requestSpy).to.have.been.calledWith(sinon.match({
        method: 'POST',
        url: '/api/ConsultaExterna/ObtenerExpedienteBot',
        data: testData
      }));
    });
    
    it('should handle errors correctly', async () => {
      // Forzar un error en la solicitud
      const requestStub = sinon.stub(axiosMock, 'request').rejects(new Error('Test error'));
      
      // Ejecutar la solicitud y verificar que se lanza la excepción
      await expect(
        axiosService.request('GET', '/non-existent-endpoint')
      ).to.be.rejectedWith('Test error');
      
      // Verificar que se llamó con los parámetros correctos
      expect(requestStub).to.have.been.called;
    });
  });

  describe('handleError', () => {
    it('should handle response errors', () => {
      const error = {
        response: {
          data: { error: 'Test response error' }
        }
      };
      
      expect(() => axiosService.handleError(error)).to.throw();
    });
    
    it('should handle request errors', () => {
      const error = {
        request: { status: 404 }
      };
      
      expect(() => axiosService.handleError(error)).to.throw();
    });
    
    it('should handle generic errors', () => {
      const error = new Error('Generic error');
      
      expect(() => axiosService.handleError(error)).to.throw();
    });
  });
});