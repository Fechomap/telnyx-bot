/**
 * Configuración de rutas para endpoints AI
 * Versión optimizada con enfoque conversacional
 */
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const config = require('../config/texml');

// Endpoint de bienvenida - Punto de entrada para llamadas
router.get(config.routes.welcome, aiController.handleWelcome);
router.post(config.routes.welcome, aiController.handleWelcome);

// Endpoint para procesar número de expediente
router.get(config.routes.processExpediente, aiController.handleProcessExpediente);
router.post(config.routes.processExpediente, aiController.handleProcessExpediente);

// Endpoint para interacción continua
router.get(config.routes.interact, aiController.handleInteraction);
router.post(config.routes.interact, aiController.handleInteraction);

// Endpoint para compatibilidad con sistema anterior
router.post('/webhook', (req, res) => {
  console.log('⚠️ Recibida solicitud en endpoint legacy /webhook');
  res.send('OK');
});

module.exports = router;