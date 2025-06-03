// src/routes/ivrRoutes.js
const express = require('express');
const router = express.Router();
const ivrController = require('../controllers/ivrController');
const option2Controller = require('../controllers/option2Controller');
const validators = require('../middleware/validation');

// Menú principal
router.get('/welcome', validators.welcome, ivrController.handleWelcome.bind(ivrController));
router.post('/welcome', validators.welcome, ivrController.handleWelcome.bind(ivrController));

// Procesar selección del menú principal
router.get('/menu-selection', validators.menuSelection, ivrController.handleMenuSelection.bind(ivrController));
router.post('/menu-selection', validators.menuSelection, ivrController.handleMenuSelection.bind(ivrController));

// Solicitar número de expediente
router.get('/solicitar-expediente', validators.expediente, ivrController.requestExpediente.bind(ivrController));
router.post('/solicitar-expediente', validators.expediente, ivrController.requestExpediente.bind(ivrController));

// Validar expediente
router.get('/validar-expediente', validators.expediente, ivrController.validateExpediente.bind(ivrController));
router.post('/validar-expediente', validators.expediente, ivrController.validateExpediente.bind(ivrController));

// Menú del expediente
router.get('/menu-expediente', (req, res, next) => {
  console.log('📍 GET /menu-expediente called');
  console.log('Query params:', req.query);
  ivrController.showExpedienteMenu(req, res, next);
});
router.post('/menu-expediente', (req, res, next) => {
  console.log('📍 POST /menu-expediente called');
  console.log('Query params:', req.query);
  console.log('Body params:', req.body);
  ivrController.showExpedienteMenu(req, res, next);
});

// Procesar opción del menú
router.get('/procesar-opcion', validators.processOption, ivrController.processOption.bind(ivrController));
router.post('/procesar-opcion', validators.processOption, ivrController.processOption.bind(ivrController));

// Rutas para Opción 2 - Cotización
router.get('/iniciar-cotizacion', validators.cotizacion, option2Controller.initializeQuotation.bind(option2Controller));
router.post('/iniciar-cotizacion', validators.cotizacion, option2Controller.initializeQuotation.bind(option2Controller));

// Mantener compatibilidad con el método anterior
router.get('/procesar-audio', option2Controller.processAudio.bind(option2Controller));
router.post('/procesar-audio', option2Controller.processAudio.bind(option2Controller));

// Nuevas rutas para grabación
router.get('/procesar-grabacion', validators.grabacion, option2Controller.procesarGrabacion.bind(option2Controller));
router.post('/procesar-grabacion', validators.grabacion, option2Controller.procesarGrabacion.bind(option2Controller));

router.get('/recording-status', validators.statusGrabacion, option2Controller.statusGrabacion.bind(option2Controller));
router.post('/recording-status', validators.statusGrabacion, option2Controller.statusGrabacion.bind(option2Controller));

router.get('/esperar-procesamiento', validators.procesamiento, (req, res, next) => {
  console.log('📍 GET /esperar-procesamiento called');
  console.log('Query params:', req.query);
  option2Controller.esperarProcesamiento(req, res, next);
});
router.post('/esperar-procesamiento', validators.procesamiento, option2Controller.esperarProcesamiento.bind(option2Controller));

router.get('/finalizar-cotizacion', validators.cotizacion, option2Controller.finalizeQuotation.bind(option2Controller));
router.post('/finalizar-cotizacion', validators.cotizacion, option2Controller.finalizeQuotation.bind(option2Controller));

// Middleware de debugging
router.use((req, res, next) => {
  console.log(`🔍 Middleware Debug - ${req.method} ${req.originalUrl}`);
  next();
});

// Fallback para rutas no definidas
router.all('*', (req, res) => {
  console.log(`⚠️  Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  res.redirect('/welcome');
});

module.exports = router;