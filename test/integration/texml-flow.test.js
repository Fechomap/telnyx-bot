/**
 * Pruebas de integración para el flujo TeXML
 * Verifica el funcionamiento del flujo completo de IVR
 */
const request = require('supertest');
const express = require('express');
const { expect } = require('chai');
const sinon = require('sinon');
const xml2js = require('xml2js');

// Importar componentes a probar
const sessionCache = require('../../src/cache/sessionCache');
const { 
  consultaUnificada, 
  formatearDatosParaIVR 
} = require('../../src/services/optimizedDataService');
const texmlController = require('../../src/controllers/texmlController');
const texmlRoutes = require('../../src/routes/texmlRoutes');
const TelnyxService = require('../../src/services/telnyxService');
const telnyxMock = require('../mocks/telnyx-mock');

// Utilidades para testing
const xmlParser = new xml2js.Parser({ explicitArray: false });

/**
 * Función para parsear XML a objeto
 * @param {string} xml - String XML a parsear
 * @returns {Promise<Object>} - Objeto parseado
 */
const parseXML = async (xml) => {
  return new Promise((resolve, reject) => {
    xmlParser.parseString(xml, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

describe('Flujo TeXML - Integración', function() {
  // Aumentar el timeout para pruebas más lentas
  this.timeout(5000);
  
  let app;
  let telnyxServiceStub;
  
  before(() => {
    // Configurar app con las rutas reales
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/', texmlRoutes);
    
    // Crear stubs para TelnyxService
    telnyxServiceStub = {
      obtenerExpediente: sinon.stub(),
      obtenerExpedienteCosto: sinon.stub(),
      obtenerExpedienteUnidadOp: sinon.stub(),
      obtenerExpedienteUbicacion: sinon.stub(),
      obtenerExpedienteTiempos: sinon.stub()
    };
    
    // Reemplazar métodos en TelnyxService
    sinon.stub(TelnyxService.prototype, 'obtenerExpediente').callsFake(telnyxServiceStub.obtenerExpediente);
    sinon.stub(TelnyxService.prototype, 'obtenerExpedienteCosto').callsFake(telnyxServiceStub.obtenerExpedienteCosto);
    sinon.stub(TelnyxService.prototype, 'obtenerExpedienteUnidadOp').callsFake(telnyxServiceStub.obtenerExpedienteUnidadOp);
    sinon.stub(TelnyxService.prototype, 'obtenerExpedienteUbicacion').callsFake(telnyxServiceStub.obtenerExpedienteUbicacion);
    sinon.stub(TelnyxService.prototype, 'obtenerExpedienteTiempos').callsFake(telnyxServiceStub.obtenerExpedienteTiempos);
  });
  
  beforeEach(() => {
    // Limpiar stubs para cada prueba
    sinon.resetHistory();
    
    // Configurar los stubs para respuestas predeterminadas
    telnyxServiceStub.obtenerExpediente.callsFake((expediente) => {
      if (expediente === '99999') return null;
      if (expediente === '12345') return telnyxMock.mockExpedienteConcluido;
      return telnyxMock.mockExpedienteData;
    });
    
    telnyxServiceStub.obtenerExpedienteCosto.resolves(telnyxMock.mockCostoData);
    telnyxServiceStub.obtenerExpedienteUnidadOp.resolves(telnyxMock.mockUnidadData);
    telnyxServiceStub.obtenerExpedienteUbicacion.resolves(telnyxMock.mockUbicacionData);
    telnyxServiceStub.obtenerExpedienteTiempos.resolves(telnyxMock.mockTiemposData);
    
    // Limpiar caché de sesiones
    sessionCache.clearExpiredSessions();
  });
  
  after(() => {
    // Restaurar todos los stubs
    sinon.restore();
  });
  
  describe('Flujo básico', () => {
    it('debe iniciar con bienvenida', async () => {
      const response = await request(app)
        .post('/welcome')
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar que la respuesta tiene la estructura correcta
      expect(parsed).to.have.property('Response');
      expect(parsed.Response).to.have.property('Say');
      expect(parsed.Response).to.have.property('Gather');
      
      // Verificar contenido del mensaje
      expect(parsed.Response.Say._).to.include('Bienvenido');
      expect(parsed.Response.Say._).to.include('expediente');
      
      // Verificar configuración del Gather
      expect(parsed.Response.Gather.$.action).to.equal('/expediente');
      expect(parsed.Response.Gather.$.method).to.equal('POST');
    });
    
    it('debe solicitar número de expediente', async () => {
      const response = await request(app)
        .post('/expediente')
        .send({ Digits: '1' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar que la respuesta tiene la estructura correcta
      expect(parsed).to.have.property('Response');
      expect(parsed.Response).to.have.property('Say');
      expect(parsed.Response.Say._).to.include('ingrese su número de expediente');
      
      // Verificar configuración del Gather
      expect(parsed.Response.Gather.$.action).to.equal('/validar-expediente');
      expect(parsed.Response.Gather.$.finishOnKey).to.equal('#');
    });
    
    it('debe validar expediente y presentar menú principal', async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '54321#' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Verificar que se llamaron a los servicios correctos
      expect(telnyxServiceStub.obtenerExpediente).to.have.been.calledWith('54321');
      expect(telnyxServiceStub.obtenerExpedienteCosto).to.have.been.called;
      expect(telnyxServiceStub.obtenerExpedienteUnidadOp).to.have.been.called;
      expect(telnyxServiceStub.obtenerExpedienteUbicacion).to.have.been.called;
      expect(telnyxServiceStub.obtenerExpedienteTiempos).to.have.been.called;
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar que la respuesta tiene la estructura correcta
      expect(parsed).to.have.property('Response');
      expect(parsed.Response).to.have.property('Say');
      expect(parsed.Response).to.have.property('Gather');
      
      // Verificar contenido del mensaje
      expect(parsed.Response.Say._).to.include('Expediente encontrado');
      expect(parsed.Response.Say._).to.include('Juan Pérez');
      expect(parsed.Response.Say._).to.include('Honda Civic 2020');
      
      // Verificar que incluye opciones del menú
      expect(parsed.Response.Say._).to.include('Presione 1 para costos');
      expect(parsed.Response.Say._).to.include('Presione 2 para datos de unidad');
      expect(parsed.Response.Say._).to.include('Presione 3 para ubicación');
      
      // Verificar configuración del Gather
      expect(parsed.Response.Gather.$.action).to.include('/respuesta?sessionId=');
      expect(parsed.Response.Gather.$.validDigits).to.include('1234');
    });
    
    it('debe manejar expediente no encontrado', async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '99999#' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Verificar que se llamó al servicio correcto
      expect(telnyxServiceStub.obtenerExpediente).to.have.been.calledWith('99999');
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar que la respuesta tiene la estructura correcta
      expect(parsed).to.have.property('Response');
      expect(parsed.Response).to.have.property('Say');
      
      // Verificar que tiene mensaje de error
      expect(parsed.Response.Say._).to.include('no encontrado');
      
      // Verificar que redirige a solicitar expediente nuevamente
      expect(parsed.Response).to.have.property('Redirect');
      expect(parsed.Response.Redirect._).to.equal('/expediente?attempt=2');
    });
  });
  
  describe('Flujo interactivo con sesión', () => {
    let sessionId;
    
    // Paso 1: Validar expediente y obtener sessionId
    beforeEach(async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '54321#' });
      
      const parsed = await parseXML(response.text);
      const actionUrl = parsed.Response.Gather.$.action;
      const sessionIdMatch = actionUrl.match(/sessionId=([^&]+)/);
      sessionId = sessionIdMatch[1];
    });
    
    it('debe proporcionar información de costos', async () => {
      // Verificar que se obtuvo un sessionId
      expect(sessionId).to.be.a('string');
      
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '1' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar que la respuesta tiene la estructura correcta
      expect(parsed).to.have.property('Response');
      expect(parsed.Response).to.have.property('Say');
      
      // Verificar contenido del mensaje
      const sayText = parsed.Response.Say._;
      expect(sayText).to.include('costo total');
      expect(sayText).to.include('2500');
      expect(sayText).to.include('banderazo');
    });
    
    it('debe proporcionar información de unidad', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '2' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar contenido del mensaje
      const sayText = parsed.Response.Say._;
      expect(sayText).to.include('Datos de la unidad');
      expect(sayText).to.include('Carlos Martínez');
      expect(sayText).to.include('Plataforma');
    });
    
    it('debe proporcionar información de ubicación', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '3' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar contenido del mensaje
      const sayText = parsed.Response.Say._;
      expect(sayText).to.include('tiempo estimado');
      expect(sayText).to.include('30 minutos');
    });
    
    it('debe proporcionar información de tiempos', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '4' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar contenido del mensaje
      const sayText = parsed.Response.Say._;
      expect(sayText).to.include('Tiempos del Expediente');
      expect(sayText).to.include('10:15 AM');
      expect(sayText).to.include('11:45 AM');
    });
    
    it('debe ofrecer transferencia a agente', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '0' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar redirección a agente
      expect(parsed.Response).to.have.property('Redirect');
      expect(parsed.Response.Redirect._).to.equal(`/agent?sessionId=${sessionId}`);
    });
    
    it('debe permitir consultar otro expediente', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '9' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar redirección a solicitud de expediente
      expect(parsed.Response).to.have.property('Redirect');
      expect(parsed.Response.Redirect._).to.equal('/expediente');
    });
    
    it('debe manejar opción inválida', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '7' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar mensaje de error
      expect(parsed.Response.Say._).to.include('no es válida');
    });
    
    it('debe manejar sessionId inválido', async () => {
      const response = await request(app)
        .post('/respuesta?sessionId=invalid-session')
        .send({ Digits: '1' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar mensaje de sesión expirada
      expect(parsed.Response.Say._).to.include('sesión ha expirado');
      
      // Verificar redirección a bienvenida
      expect(parsed.Response.Redirect._).to.equal('/welcome');
    });
  });
  
  describe('Flujo para expediente concluido', () => {
    let sessionId;
    
    // Paso 1: Validar expediente y obtener sessionId
    beforeEach(async () => {
      const response = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '12345#' });
      
      const parsed = await parseXML(response.text);
      const actionUrl = parsed.Response.Gather.$.action;
      const sessionIdMatch = actionUrl.match(/sessionId=([^&]+)/);
      sessionId = sessionIdMatch[1];
    });
    
    it('debe mostrar menú para expediente concluido', async () => {
      // Verificar que se obtuvo un sessionId
      expect(sessionId).to.be.a('string');
      
      // Verificar que se llamó al servicio con el expediente correcto
      expect(telnyxServiceStub.obtenerExpediente).to.have.been.calledWith('12345');
      
      // Obtener la respuesta para verificar el menú
      const initialResponse = await request(app)
        .post('/validar-expediente')
        .send({ Digits: '12345#' })
        .expect(200);
      
      // Convertir respuesta a objeto
      const initialParsed = await parseXML(initialResponse.text);
      
      // Verificar menú especial para concluido (3 opciones en lugar de 4)
      expect(initialParsed.Response.Say._).to.include('Concluido');
      expect(initialParsed.Response.Say._).to.include('Presione 1 para costos');
      expect(initialParsed.Response.Say._).to.include('Presione 2 para datos de unidad');
      expect(initialParsed.Response.Say._).to.include('Presione 3 para tiempos');
      expect(initialParsed.Response.Say._).not.to.include('Presione 4');
      
      // Verificar configuración del Gather para expediente concluido
      expect(initialParsed.Response.Gather.$.validDigits).to.equal('1230');
    });
    
    it('debe mostrar tiempos en opción 3 para expediente concluido', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '3' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar que muestra tiempos y no ubicación
      expect(parsed.Response.Say._).to.include('Tiempos del Expediente');
      expect(parsed.Response.Say._).to.include('10:15 AM');
      expect(parsed.Response.Say._).to.not.include('tiempo estimado de llegada');
    });
    
    it('debe rechazar opción 4 para expediente concluido', async () => {
      const response = await request(app)
        .post(`/respuesta?sessionId=${sessionId}`)
        .send({ Digits: '4' })
        .expect(200)
        .expect('Content-Type', /xml/);
      
      // Convertir respuesta a objeto
      const parsed = await parseXML(response.text);
      
      // Verificar mensaje de error para opción inválida
      expect(parsed.Response.Say._).to.include('no es válida');
    });
  });
});