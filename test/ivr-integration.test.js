// test/ivr-integration.test.js
const request = require('supertest');
const app = require('../texmlServer');
const redisService = require('../src/services/redisService');

describe('IVR System Integration Tests', () => {
  
  beforeAll(async () => {
    await redisService.connect();
  });
  
  afterAll(async () => {
    await redisService.disconnect();
  });
  
  describe('Welcome Menu', () => {
    it('should return welcome menu with correct options', async () => {
      const response = await request(app)
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
      const response = await request(app)
        .post('/menu-selection')
        .send({ Digits: '1' })
        .expect(302);
      
      expect(response.headers.location).toBe('/solicitar-expediente');
    });
    
    it('should show unavailable message for option 2', async () => {
      const response = await request(app)
        .post('/menu-selection')
        .send({ Digits: '2' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      expect(response.text).toContain('estará disponible próximamente');
    });
  });
  
  describe('Expediente Flow', () => {
    it('should request expediente number', async () => {
      const response = await request(app)
        .get('/solicitar-expediente')
        .expect(200)
        .expect('Content-Type', /xml/);
      
      expect(response.text).toContain('número de expediente');
      expect(response.text).toContain('numeral');
    });
    
    it('should validate short expediente numbers', async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '12#' })
        .expect(200);
      
      expect(response.text).toContain('no es válido');
    });
    
    it('should handle non-existent expediente', async () => {
      const response = await request(app)
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
      
      const response = await request(app)
        .post('/procesar-opcion')
        .query({ sessionId, expediente: '12345' })
        .send({ Digits: '9' })
        .expect(200);
      
      const data = await redisService.get(sessionId);
      expect(data).toBeNull();
    });
  });
});

// test/simulate-call.js
/**
 * Script para simular una llamada completa al sistema
 */
const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function simulateCall() {
  console.log('🚀 Iniciando simulación de llamada...\n');
  
  try {
    // 1. Menú principal
    console.log('1. Solicitando menú principal...');
    let response = await axios.get(`${BASE_URL}/welcome`);
    console.log('✅ Menú principal recibido');
    
    // 2. Seleccionar opción 1
    console.log('\n2. Seleccionando opción 1 (Expediente)...');
    response = await axios.post(`${BASE_URL}/menu-selection`, {
      Digits: '1'
    }, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    console.log('✅ Redirigido a solicitud de expediente');
    
    // 3. Solicitar expediente
    console.log('\n3. Obteniendo solicitud de expediente...');
    response = await axios.get(`${BASE_URL}/solicitar-expediente`);
    console.log('✅ Solicitud de expediente recibida');
    
    // 4. Enviar número de expediente
    console.log('\n4. Enviando número de expediente...');
    response = await axios.post(`${BASE_URL}/validar-expediente`, {
      Digits: '12345#'
    });
    
    // Analizar respuesta
    if (response.data.includes('encontrado')) {
      console.log('✅ Expediente encontrado');
      
      // Extraer sessionId de la respuesta (si está en redirect)
      const sessionMatch = response.data.match(/sessionId=([^&"]+)/);
      
      if (sessionMatch) {
        const sessionId = sessionMatch[1];
        console.log(`   SessionID: ${sessionId}`);
        
        // 5. Probar menú de expediente
        console.log('\n5. Probando menú de expediente...');
        response = await axios.get(`${BASE_URL}/menu-expediente?sessionId=${sessionId}&expediente=12345`);
        console.log('✅ Menú de expediente recibido');
        
        // 6. Seleccionar opción de costos
        console.log('\n6. Consultando costos...');
        response = await axios.post(`${BASE_URL}/procesar-opcion?sessionId=${sessionId}&expediente=12345`, {
          Digits: '1'
        });
        console.log('✅ Información de costos recibida');
      }
    } else {
      console.log('❌ Expediente no encontrado');
    }
    
    console.log('\n🎉 Simulación completada exitosamente');
    
  } catch (error) {
    console.error('\n❌ Error en la simulación:', error.message);
    if (error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }
  }
}

simulateCall();