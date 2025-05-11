// test/ivr-integration.test.js
const request = require('supertest');
const app = require('../texmlServer');
const redisService = require('../src/services/redisService');

describe('IVR System Integration Tests', () => {
  let server;
  
  beforeAll(async () => {
    // Asegurar que Redis está conectado
    await redisService.connect();
    
    // Crear servidor en puerto aleatorio para tests
    server = app.listen(0); // Puerto 0 = puerto aleatorio disponible
  });
  
  afterAll(async () => {
    // Limpiar caché de Redis
    await redisService.deletePattern('session_*');
    
    // Cerrar servidor correctamente
    await new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
    
    // Desconectar Redis
    await redisService.disconnect();
  });
  
  afterEach(async () => {
    // Limpiar Redis después de cada test
    await redisService.deletePattern('session_*');
  });
  
  describe('Welcome Menu', () => {
    it('should return welcome menu with correct options', async () => {
      const response = await request(server)
        .get('/welcome')
        .expect(200)
        .expect('Content-Type', /xml/);
      
      expect(response.text).toContain('Bienvenido');
      expect(response.text).toContain('presione 1');
      expect(response.text).toContain('presione 2');
    });
  });
  
  describe('Menu Selection', () => {
    it('should redirect to expediente request for option 1', async () => {
      const response = await request(server)
        .post('/menu-selection')
        .send({ Digits: '1' })
        .expect(302);
      
      expect(response.headers.location).toBe('/solicitar-expediente');
    });
    
    it('should show unavailable message for option 2', async () => {
      const response = await request(server)
        .post('/menu-selection')
        .send({ Digits: '2' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      expect(response.text).toContain('estará disponible próximamente');
    });
  });
  
  describe('Expediente Flow', () => {
    it('should request expediente number', async () => {
      const response = await request(server)
        .get('/solicitar-expediente')
        .expect(200)
        .expect('Content-Type', /xml/);
      
      expect(response.text).toContain('número de expediente');
      expect(response.text).toContain('numeral');
    });
    
    it('should validate short expediente numbers', async () => {
      const response = await request(server)
        .post('/validar-expediente')
        .send({ Digits: '12#' })
        .expect(200);
      
      expect(response.text).toContain('no es válido');
    });
    
    it('should handle non-existent expediente', async () => {
      const response = await request(server)
        .post('/validar-expediente')
        .send({ Digits: '999999#' })
        .expect(200);
      
      expect(response.text).toContain('no fue localizado');
    });
  });
  
  describe('Cache Management', () => {
    it('should store session data in Redis', async () => {
      const sessionId = 'test_session_123';
      const testData = {
        expediente: '12345',
        datos: { test: true }
      };
      
      await redisService.set(sessionId, testData);
      const retrieved = await redisService.get(sessionId);
      
      expect(retrieved).toEqual(testData);
    });
    
    it('should delete session data when starting new query', async () => {
      const sessionId = 'test_session_456';
      await redisService.set(sessionId, { test: true });
      
      const response = await request(server)
        .post('/procesar-opcion')
        .query({ sessionId, expediente: '12345' })
        .send({ Digits: '9' })
        .expect(200);
      
      expect(response.text).toContain('nueva consulta');
      
      const data = await redisService.get(sessionId);
      expect(data).toBeNull();
    });
  });
});