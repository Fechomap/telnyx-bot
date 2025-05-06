// Configuración global para todas las pruebas
require('dotenv').config({ path: '.env.test' });

// Importar librerías de testing
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

// Configurar chai
chai.use(sinonChai);
chai.use(chaiAsPromised);

// Exponer globalmente para todas las pruebas
global.expect = chai.expect;
global.sinon = sinon;

// Desactivar logs durante las pruebas
console.log = () => {};
console.error = () => {};
console.warn = () => {};

// Limpiar todos los stubs/mocks después de cada prueba
afterEach(() => {
  sinon.restore();
});

// Variables de entorno de prueba por defecto
process.env.API_BASE_URL = 'https://test-api.example.com';
process.env.TELNYX_API_KEY = 'test_key_12345';
process.env.TELNYX_CONNECTION_ID = 'test_connection_id';
process.env.TELNYX_CALLER_ID = '+15551234567';
process.env.BASE_URL = 'https://test-server.example.com';
process.env.ADMIN_TOKEN = 'test_admin_token';