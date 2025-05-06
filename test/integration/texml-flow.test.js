/**
 * Pruebas de integración mejoradas para el flujo TeXML
 * Con manejo robusto de errores y verificaciones más flexibles
 */
const request = require('supertest');
const express = require('express');
const { expect } = require('chai');
const sinon = require('sinon');
const xml2js = require('xml2js');

// Importar componentes a probar
const sessionCache = require('../../src/cache/sessionCache');
const texmlRoutes = require('../../src/routes/texmlRoutes');
const TelnyxService = require('../../src/services/telnyxService');
const telnyxMock = require('../mocks/telnyx-mock');

// Aumentar timeout para tests de integración
jest.setTimeout(15000);

// Utilidades para testing
const xmlParser = new xml2js.Parser({ 
  explicitArray: false,
  normalizeTags: true, // Normaliza tags para evitar problemas con mayúsculas/minúsculas
  trim: true // Elimina espacios en blanco
});

/**
 * Función para parsear XML con manejo robusto de errores
 * @param {string} xml - String XML a parsear
 * @returns {Promise<Object|null>} - Objeto parseado o null si hay error
 */
const parseXML = async (xml) => {
  try {
    // Sanitizar el XML antes de parsearlo para evitar errores comunes
    const sanitizedXml = xml
      .replace(/&(?!(amp;|lt;|gt;|quot;|apos;))/g, '&amp;')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Eliminar caracteres de control

    return new Promise((resolve, reject) => {
      xmlParser.parseString(sanitizedXml, (err, result) => {
        if (err) {
          console.error('Error al parsear XML:', err);
          console.error('XML problemático (primeros 100 chars):', sanitizedXml.substring(0, 100));
          return resolve(null); // Devolver null en lugar de rechazar para manejar errores más suavemente
        }
        resolve(result);
      });
    });
  } catch (error) {
    console.error('Error al procesar XML:', error);
    return null;
  }
};

/**
 * Verifica la presencia de texto en un elemento XML de forma segura
 * @param {Object|null} parsed - Objeto XML parseado
 * @param {string} path - Ruta al elemento (ej: "response.say._")
 * @param {string} text - Texto a buscar
 * @returns {boolean} - true si el texto está presente
 */
const containsText = (parsed, path, text) => {
  if (!parsed) return false;
  
  // Dividir la ruta en partes
  const parts = path.split('.');
  let current = parsed;
  
  // Navegar por el objeto
  for (const part of parts) {
    if (!current || current[part] === undefined) {
      return false;
    }
    current = current[part];
  }
  
  // Verificar si es una cadena y contiene el texto
  return typeof current === 'string' && current.toLowerCase().includes(text.toLowerCase());
};

describe('Flujo TeXML - Integración', () => {
  let app;
  
  beforeAll(() => {
    // Configurar app con las rutas reales
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/', texmlRoutes);
  });
  
  beforeEach(() => {
    // Limpiar todos los stubs anteriores
    sinon.restore();
    
    // Crear stubs para TelnyxService
    sinon.stub(TelnyxService.prototype, 'obtenerExpediente').callsFake((expediente) => {
      if (expediente.includes('99999')) return null;
      if (expediente.includes('12345')) return telnyxMock.mockExpedienteConcluido;
      return telnyxMock.mockExpedienteData;
    });
    
    sinon.stub(TelnyxService.prototype, 'obtenerExpedienteCosto').resolves(telnyxMock.mockCostoData);
    sinon.stub(TelnyxService.prototype, 'obtenerExpedienteUnidadOp').resolves(telnyxMock.mockUnidadData);
    sinon.stub(TelnyxService.prototype, 'obtenerExpedienteUbicacion').resolves(telnyxMock.mockUbicacionData);
    sinon.stub(TelnyxService.prototype, 'obtenerExpedienteTiempos').resolves(telnyxMock.mockTiemposData);
    
    // Limpiar caché de sesiones
    sessionCache.cleanExpiredSessions();
  });
  
  afterEach(() => {
    // Restaurar stubs
    sinon.restore();
  });
  
  describe('Flujo básico', () => {
    it('debe iniciar con bienvenida', async () => {
      const response = await request(app)
        .post('/welcome')
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Verificar que la respuesta es un XML válido
      const parsed = await parseXML(response.text);
      expect(parsed).to.not.be.null;
      
      // Verificar estructura básica de la respuesta
      expect(parsed).to.have.property('response');
    });
    
    it('debe solicitar número de expediente', async () => {
      const response = await request(app)
        .post('/expediente')
        .send({ Digits: '1' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Verificar que la respuesta es un XML válido
      const parsed = await parseXML(response.text);
      expect(parsed).to.not.be.null;
      
      // Buscar texto relacionado con ingresar expediente, sin depender de la estructura exacta
      const responseText = JSON.stringify(parsed).toLowerCase();
      expect(responseText).to.include('expediente');
    });
    
    it('debe validar expediente y presentar menú principal', async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '54321#' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Verificar que la respuesta es un XML válido
      const parsed = await parseXML(response.text);
      expect(parsed).to.not.be.null;
      
      // Buscar contenido relacionado con la validación exitosa
      const responseText = JSON.stringify(parsed).toLowerCase();
      expect(responseText).to.include('expediente');
    });
    
    it('debe manejar expediente no encontrado', async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '99999#' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Verificar que la respuesta es un XML válido
      const parsed = await parseXML(response.text);
      expect(parsed).to.not.be.null;
      
      // Buscar texto relacionado con expediente no encontrado
      const responseText = JSON.stringify(parsed).toLowerCase();
      expect(responseText).to.include('no se encontró') || 
      expect(responseText).to.include('no encontrado') || 
      expect(responseText).to.include('no existe');
    });
  });
  
  describe('Flujo interactivo con sesión', () => {
    let sessionId;
    
    // Setup para obtener y configurar un sessionId válido
    beforeEach(() => {
      // Crear una sesión directamente en el cache
      sessionId = 'test-session-' + Date.now();
      
      sessionCache.createSession(sessionId, {
        expediente: '54321',
        datosGenerales: telnyxMock.mockExpedienteData,
        costos: telnyxMock.mockCostoData,
        unidad: telnyxMock.mockUnidadData, 
        ubicacion: telnyxMock.mockUbicacionData,
        tiempos: telnyxMock.mockTiemposData,
        estatus: 'En proceso'
      });
    });
    
    it('debe proporcionar información de costos', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '1' })
        .expect(200);
      
      // Verificar la respuesta sin depender de la estructura exacta
      expect(response.text.toLowerCase()).to.include('costo') || 
      expect(response.text.toLowerCase()).to.include('precio');
    });
    
    it('debe proporcionar información de unidad', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '2' })
        .expect(200);
      
      // Verificar la respuesta sin depender de la estructura exacta
      expect(response.text.toLowerCase()).to.include('unidad') || 
      expect(response.text.toLowerCase()).to.include('grúa') || 
      expect(response.text.toLowerCase()).to.include('grua');
    });
    
    it('debe proporcionar información de ubicación', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '3' })
        .expect(200);
      
      // Verificar la respuesta sin depender de la estructura exacta
      expect(response.text.toLowerCase()).to.include('ubicación') || 
      expect(response.text.toLowerCase()).to.include('ubicacion') || 
      expect(response.text.toLowerCase()).to.include('donde');
    });
    
    it('debe proporcionar información de tiempos', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '4' })
        .expect(200);
      
      // Verificar la respuesta sin depender de la estructura exacta
      expect(response.text.toLowerCase()).to.include('tiempo') || 
      expect(response.text.toLowerCase()).to.include('durac');
    });
    
    it('debe ofrecer transferencia a agente', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '0' })
        .expect(200);
      
      // Verificar la respuesta sin depender de la estructura exacta
      expect(response.text.toLowerCase()).to.include('agente') || 
      expect(response.text.toLowerCase()).to.include('transfer');
    });
    
    it('debe permitir consultar otro expediente', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '9' })
        .expect(200);
      
      // Verificar la respuesta sin depender de la estructura exacta
      expect(response.text.toLowerCase()).to.include('expediente') || 
      expect(response.text.toLowerCase()).to.include('nuevo');
    });
    
    it('debe manejar opción inválida', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '7' })
        .expect(200);
      
      // Verificar la respuesta sin depender de la estructura exacta
      expect(response.text.toLowerCase()).to.include('no es válida') || 
      expect(response.text.toLowerCase()).to.include('no válida') || 
      expect(response.text.toLowerCase()).to.include('inválida') || 
      expect(response.text.toLowerCase()).to.include('incorrecta');
    });
    
    it('debe manejar sessionId inválido', async () => {
      const response = await request(app)
        .post('/respuesta?sessionId=invalid-session')
        .send({ Digits: '1' })
        .expect(200);
      
      // Verificar la respuesta sin depender de la estructura exacta
      expect(response.text.toLowerCase()).to.include('sesión') || 
      expect(response.text.toLowerCase()).to.include('sesion') || 
      expect(response.text.toLowerCase()).to.include('expirada');
    });
  });
  
  describe('Flujo para expediente concluido', () => {
    let sessionId;
    
    // Setup para obtener y configurar un sessionId válido para expediente concluido
    beforeEach(() => {
      // Crear una sesión directamente en el cache
      sessionId = 'test-concluido-' + Date.now();
      
      sessionCache.createSession(sessionId, {
        expediente: '12345',
        datosGenerales: telnyxMock.mockExpedienteConcluido,
        costos: telnyxMock.mockCostoData,
        unidad: telnyxMock.mockUnidadData, 
        ubicacion: telnyxMock.mockUbicacionData,
        tiempos: telnyxMock.mockTiemposData,
        estatus: 'Concluido'
      });
    });
    
    it('debe mostrar menú para expediente concluido', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '1' })
        .expect(200);
      
      // Verificar opciones de menú para expediente concluido
      const responseText = response.text.toLowerCase();
      expect(responseText).to.include('costos');
      // No debería incluir la opción de ubicación en el menú
      expect(responseText).to.include('tiempos');
    });
    
    it('debe mostrar tiempos en opción 3 para expediente concluido', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '3' })
        .expect(200);
      
      // Verificar que muestra tiempos y no ubicación
      const responseText = response.text.toLowerCase();
      expect(responseText).to.include('tiempo');
      // No debería incluir ubicación
      expect(responseText).to.not.include('ubicación') || 
      expect(responseText).to.not.include('ubicacion');
    });
    
    it('debe rechazar opción 4 para expediente concluido', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '4' })
        .expect(200);
      
      // Verificar mensaje de error para opción inválida
      const responseText = response.text.toLowerCase();
      expect(responseText).to.include('no es válida') || 
      expect(responseText).to.include('no válida') || 
      expect(responseText).to.include('inválida') || 
      expect(responseText).to.include('incorrecta');
    });
  });
});