// test/ivr-complete.test.js
const request = require('supertest');
const app = require('../texmlServer');
const redisService = require('../src/services/redisService');
const ivrController = require('../src/controllers/ivrController');

describe('IVR System Complete Test Suite', () => {
  
  beforeAll(async () => {
    await redisService.connect();
  });
  
  afterAll(async () => {
    await redisService.disconnect();
  });
  
  afterEach(async () => {
    // Limpiar Redis después de cada test
    await redisService.deletePattern('session_*');
  });
  
  describe('1. Welcome Menu Tests', () => {
    test('should display welcome menu with correct options', async () => {
      const response = await request(app)
        .get('/welcome')
        .expect(200)
        .expect('Content-Type', /xml/);
      
      expect(response.text).toContain('Bienvenido');
      expect(response.text).toContain('Para seguimiento de expediente, presione 1');
      expect(response.text).toContain('Para cotizar un servicio, presione 2');
      expect(response.text).toContain('Polly.Mia-Neural');
    });
    
    test('should handle POST requests to welcome', async () => {
      const response = await request(app)
        .post('/welcome')
        .expect(200);
      
      expect(response.text).toContain('Bienvenido');
    });
  });
  
  describe('2. Menu Selection Tests', () => {
    test('should redirect to expediente request for option 1', async () => {
      const response = await request(app)
        .post('/menu-selection')
        .send({ Digits: '1' })
        .expect(302);
      
      expect(response.headers.location).toBe('/solicitar-expediente');
    });
    
    test('should show coming soon message for option 2', async () => {
      const response = await request(app)
        .post('/menu-selection')
        .send({ Digits: '2' })
        .expect(200);
      
      expect(response.text).toContain('Esta opción estará disponible próximamente');
    });
    
    test('should redirect to welcome for invalid option', async () => {
      const response = await request(app)
        .post('/menu-selection')
        .send({ Digits: '9' })
        .expect(302);
      
      expect(response.headers.location).toBe('/welcome');
    });
  });
  
  describe('3. Expediente Request Tests', () => {
    test('should prompt for expediente number', async () => {
      const response = await request(app)
        .get('/solicitar-expediente')
        .expect(200);
      
      expect(response.text).toContain('proporcione el número de expediente');
      expect(response.text).toContain('tecla numeral');
    });
    
    test('should handle timeout in expediente request', async () => {
      const response = await request(app)
        .get('/solicitar-expediente')
        .expect(200);
      
      expect(response.text).toContain('timeout="10"');
    });
  });
  
  describe('4. Expediente Validation Tests', () => {
    test('should reject short expediente numbers', async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '12#' })
        .expect(200);
      
      expect(response.text).toContain('no es válido');
      expect(response.text).toContain('al menos 3 dígitos');
    });
    
    test('should handle non-numeric input', async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: 'ABC#' })
        .expect(200);
      
      expect(response.text).toContain('no es válido');
    });
    
    test('should process valid expediente', async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '12345#' })
        .expect(200);
      
      // Debería buscar o mostrar error de no encontrado
      expect(response.text).toMatch(/encontrado|no fue localizado/);
    });
  });
  
  describe('5. Redis Integration Tests', () => {
    test('should store session data in Redis', async () => {
      const sessionId = 'test_session_' + Date.now();
      const testData = {
        expediente: '12345',
        datos: { test: true }
      };
      
      await redisService.set(sessionId, testData);
      const retrieved = await redisService.get(sessionId);
      
      expect(retrieved).toEqual(testData);
    });
    
    test('should handle Redis disconnection gracefully', async () => {
      // Simular desconexión
      const originalIsConnected = redisService.isConnected;
      redisService.isConnected = false;
      
      const result = await redisService.get('test_key');
      expect(result).toBeNull();
      
      redisService.isConnected = originalIsConnected;
    });
  });
  
  describe('6. Menu Navigation Tests', () => {
    test('should handle new query option', async () => {
      const sessionId = 'test_session_nav';
      
      // Primero guardar datos en Redis
      await redisService.set(sessionId, { test: true });
      
      const response = await request(app)
        .post('/procesar-opcion')
        .query({ sessionId, expediente: '12345' })
        .send({ Digits: '9' })
        .expect(200);
      
      expect(response.text).toContain('nueva consulta');
      
      // Verificar que se eliminó de Redis
      const data = await redisService.get(sessionId);
      expect(data).toBeNull();
    });
  });
  
  describe('7. Error Handling Tests', () => {
    test('should handle unknown routes', async () => {
      const response = await request(app)
        .get('/ruta-inexistente')
        .expect(302);
      
      expect(response.headers.location).toBe('/welcome');
    });
    
    test('should handle missing sessionId', async () => {
      const response = await request(app)
        .get('/menu-expediente')
        .expect(302);
      
      expect(response.headers.location).toBe('/welcome');
    });
  });
  
  describe('8. Health Check Tests', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
      expect(response.body.redis_status).toBeDefined();
    });
  });
});

// test/simulate-call.js
/**
 * Script para simular una llamada completa
 */
const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function simulateCall() {
  console.log('🚀 Iniciando simulación de llamada...\n');
  
  try {
    // Flujo completo de llamada
    console.log('1. Menú principal...');
    let response = await axios.get(`${BASE_URL}/welcome`);
    console.log('✅ Respuesta:', response.status);
    
    console.log('\n2. Seleccionando opción 1...');
    response = await axios.post(`${BASE_URL}/menu-selection`, {
      Digits: '1'
    }, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    console.log('✅ Redirigido a:', response.headers.location);
    
    console.log('\n3. Solicitando expediente...');
    response = await axios.get(`${BASE_URL}/solicitar-expediente`);
    console.log('✅ Formulario recibido');
    
    console.log('\n4. Enviando número 12345...');
    response = await axios.post(`${BASE_URL}/validar-expediente`, {
      Digits: '12345#'
    });
    
    if (response.data.includes('encontrado')) {
      console.log('✅ Expediente encontrado');
    } else {
      console.log('❌ Expediente no encontrado');
    }
    
    console.log('\n🎉 Simulación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  simulateCall();
}