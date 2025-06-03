const texmlConfig = require('../../src/config/texml');

describe('TeXML Configuration', () => {
  let originalEnv;

  beforeEach(() => {
    // Guardar el estado original de las variables de entorno
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restaurar las variables de entorno
    process.env = originalEnv;
  });

  describe('adminToken', () => {
    it('debe usar el token de las variables de entorno si está definido', () => {
      process.env.ADMIN_TOKEN = 'my-secure-token';
      
      // Recargar el módulo para que tome los nuevos valores
      delete require.cache[require.resolve('../../src/config/texml')];
      const config = require('../../src/config/texml');
      
      expect(config.adminToken).toBe('my-secure-token');
    });

    it('debe lanzar error en producción si no hay token', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ADMIN_TOKEN;
      
      // Recargar el módulo
      delete require.cache[require.resolve('../../src/config/texml')];
      
      expect(() => {
        require('../../src/config/texml');
      }).toThrow('ADMIN_TOKEN debe estar configurado en producción');
    });

    it('debe usar token por defecto en desarrollo', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ADMIN_TOKEN;
      
      // Espiar console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Recargar el módulo
      delete require.cache[require.resolve('../../src/config/texml')];
      const config = require('../../src/config/texml');
      
      expect(config.adminToken).toBe('dev-admin-token-change-this');
      expect(warnSpy).toHaveBeenCalledWith(
        '⚠️  ADVERTENCIA: Usando token admin por defecto. Configure ADMIN_TOKEN en .env'
      );
      
      warnSpy.mockRestore();
    });
  });

  describe('service configuration', () => {
    it('debe tener configuración completa del servicio', () => {
      expect(texmlConfig.service).toHaveProperty('baseUrl');
      expect(texmlConfig.service).toHaveProperty('callerId');
      expect(texmlConfig.service).toHaveProperty('connectionId');
    });
  });

  describe('routes configuration', () => {
    it('debe tener todas las rutas necesarias', () => {
      const requiredRoutes = [
        'welcome',
        'menuSelection',
        'requestExpediente',
        'validateExpediente',
        'expedienteMenu',
        'processOption',
        'transferAgent'
      ];

      requiredRoutes.forEach(route => {
        expect(texmlConfig.routes).toHaveProperty(route);
        expect(texmlConfig.routes[route]).toMatch(/^\//); // Debe empezar con /
      });
    });
  });

  describe('tts configuration', () => {
    it('debe tener configuración TTS válida', () => {
      expect(texmlConfig.tts.provider).toBe('polly');
      expect(texmlConfig.tts.voice).toBe('Polly.Mia-Neural');
      expect(texmlConfig.tts.language).toBe('es-MX');
    });
  });

  describe('cache configuration', () => {
    it('debe tener configuración de caché válida', () => {
      expect(texmlConfig.cache.type).toBe('redis');
      expect(texmlConfig.cache.ttl).toBe(1800); // 30 minutos
      expect(texmlConfig.cache.redisUrl).toBeDefined();
    });
  });

  describe('timeout configuration', () => {
    it('debe tener timeouts razonables', () => {
      expect(texmlConfig.timeout.menuInput).toBeGreaterThan(0);
      expect(texmlConfig.timeout.expediente).toBeGreaterThan(0);
      expect(texmlConfig.timeout.options).toBeGreaterThan(0);
    });
  });

  describe('transfer configuration', () => {
    it('debe tener configuración de transferencia', () => {
      expect(texmlConfig.transfer).toHaveProperty('enabled');
      expect(texmlConfig.transfer).toHaveProperty('agentNumber');
      expect(texmlConfig.transfer).toHaveProperty('transferMessage');
    });
  });
});