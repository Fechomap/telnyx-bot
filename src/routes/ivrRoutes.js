// src/routes/ivrRoutes.js
const express = require('express');
const router = express.Router();
const ivrController = require('../controllers/ivrController');
const option2Controller = require('../controllers/option2Controller');

// Menú principal
router.get('/welcome', ivrController.handleWelcome.bind(ivrController));
router.post('/welcome', ivrController.handleWelcome.bind(ivrController));

// Procesar selección del menú principal
router.get('/menu-selection', ivrController.handleMenuSelection.bind(ivrController));
router.post('/menu-selection', ivrController.handleMenuSelection.bind(ivrController));

// Solicitar número de expediente
router.get('/solicitar-expediente', ivrController.requestExpediente.bind(ivrController));
router.post('/solicitar-expediente', ivrController.requestExpediente.bind(ivrController));

// Validar expediente
router.get('/validar-expediente', ivrController.validateExpediente.bind(ivrController));
router.post('/validar-expediente', ivrController.validateExpediente.bind(ivrController));

// Menú del expediente - CORREGIDO: asegurar que acepta GET y POST
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
router.get('/procesar-opcion', ivrController.processOption.bind(ivrController));
router.post('/procesar-opcion', ivrController.processOption.bind(ivrController));

// Rutas para Opción 2 - Cotización
router.get('/iniciar-cotizacion', option2Controller.initializeQuotation.bind(option2Controller));
router.post('/iniciar-cotizacion', option2Controller.initializeQuotation.bind(option2Controller));

// MODIFICADO: Añadir soporte para GET y POST en procesar-audio
router.get('/procesar-audio', option2Controller.processAudio.bind(option2Controller));
router.post('/procesar-audio', option2Controller.processAudio.bind(option2Controller));

router.get('/finalizar-cotizacion', option2Controller.finalizeQuotation.bind(option2Controller));
router.post('/finalizar-cotizacion', option2Controller.finalizeQuotation.bind(option2Controller));

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