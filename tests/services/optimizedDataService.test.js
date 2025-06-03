const { consultaUnificada, clearCache, getCacheStats } = require('../../src/services/optimizedDataService');
const TelnyxService = require('../../src/services/telnyxService');

// Mock de TelnyxService
jest.mock('../../src/services/telnyxService');
jest.mock('../../src/utils/monitoring');

describe('OptimizedDataService', () => {
  let mockTelnyxService;

  beforeEach(() => {
    // Limpiar caché antes de cada test
    clearCache();
    
    // Configurar mocks
    mockTelnyxService = {
      consultaGeneral: jest.fn(),
      consultaEstatus: jest.fn(),
      consultaDatosBeneficiario: jest.fn(),
      consultaDatosNotario: jest.fn(),
      consultaDatosContacto: jest.fn()
    };
    
    TelnyxService.mockImplementation(() => mockTelnyxService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('consultaUnificada', () => {
    it('debe obtener todos los datos de un expediente exitosamente', async () => {
      const expediente = 'TEST123';
      
      // Configurar respuestas mock
      mockTelnyxService.consultaGeneral.mockResolvedValue({
        data: { unidad: '101', manzana: 'A' }
      });
      mockTelnyxService.consultaEstatus.mockResolvedValue({
        data: { estatus: 'ACTIVO' }
      });
      mockTelnyxService.consultaDatosBeneficiario.mockResolvedValue({
        data: { nombre: 'Juan Pérez' }
      });
      mockTelnyxService.consultaDatosNotario.mockResolvedValue({
        data: { notario: 'Notario 123' }
      });
      mockTelnyxService.consultaDatosContacto.mockResolvedValue({
        data: { telefono: '555-1234' }
      });

      const resultado = await consultaUnificada(expediente);

      expect(resultado).toHaveProperty('general');
      expect(resultado).toHaveProperty('estatus');
      expect(resultado).toHaveProperty('beneficiario');
      expect(resultado).toHaveProperty('notario');
      expect(resultado).toHaveProperty('contacto');
      expect(resultado.general.unidad).toBe('101');
      expect(resultado.estatus.estatus).toBe('ACTIVO');
    });

    it('debe usar caché en la segunda llamada', async () => {
      const expediente = 'TEST123';
      
      // Primera llamada
      mockTelnyxService.consultaGeneral.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaEstatus.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosBeneficiario.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosNotario.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosContacto.mockResolvedValue({ data: {} });

      await consultaUnificada(expediente);
      
      // Segunda llamada
      await consultaUnificada(expediente);
      
      // Verificar que solo se llamó una vez a cada servicio
      expect(mockTelnyxService.consultaGeneral).toHaveBeenCalledTimes(1);
      expect(mockTelnyxService.consultaEstatus).toHaveBeenCalledTimes(1);
    });

    it('debe manejar errores parciales sin fallar completamente', async () => {
      const expediente = 'TEST123';
      
      mockTelnyxService.consultaGeneral.mockResolvedValue({ data: { unidad: '101' } });
      mockTelnyxService.consultaEstatus.mockRejectedValue(new Error('Error de red'));
      mockTelnyxService.consultaDatosBeneficiario.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosNotario.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosContacto.mockResolvedValue({ data: {} });

      const resultado = await consultaUnificada(expediente);

      expect(resultado).toHaveProperty('general');
      expect(resultado.general.unidad).toBe('101');
      expect(resultado.estatus).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('debe retornar estadísticas correctas del caché', async () => {
      // Agregar algunos items al caché
      const expediente1 = 'TEST1';
      const expediente2 = 'TEST2';
      
      mockTelnyxService.consultaGeneral.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaEstatus.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosBeneficiario.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosNotario.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosContacto.mockResolvedValue({ data: {} });

      await consultaUnificada(expediente1);
      await consultaUnificada(expediente2);

      const stats = getCacheStats();
      
      expect(stats.size).toBe(2);
      expect(stats.items).toContain(expediente1);
      expect(stats.items).toContain(expediente2);
    });
  });

  describe('clearCache', () => {
    it('debe limpiar el caché completamente', async () => {
      const expediente = 'TEST123';
      
      mockTelnyxService.consultaGeneral.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaEstatus.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosBeneficiario.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosNotario.mockResolvedValue({ data: {} });
      mockTelnyxService.consultaDatosContacto.mockResolvedValue({ data: {} });

      await consultaUnificada(expediente);
      
      let stats = getCacheStats();
      expect(stats.size).toBe(1);
      
      clearCache();
      
      stats = getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});