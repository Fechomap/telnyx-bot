// src/routes/ivrRoutes.js
const express = require('express');
const router = express.Router();
const ivrController = require('../controllers/ivrController');

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

// Menú del expediente
router.get('/menu-expediente', ivrController.showExpedienteMenu.bind(ivrController));
router.post('/menu-expediente', ivrController.showExpedienteMenu.bind(ivrController));

// Procesar opción del menú
router.get('/procesar-opcion', ivrController.processOption.bind(ivrController));
router.post('/procesar-opcion', ivrController.processOption.bind(ivrController));

// Fallback para rutas no definidas
router.all('*', (req, res) => {
  console.log(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.redirect('/welcome');
});

module.exports = router;