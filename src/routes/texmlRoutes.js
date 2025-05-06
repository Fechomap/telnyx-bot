/**
 * Configuración de rutas para endpoints TeXML
 */
const express = require('express');
const router = express.Router();
const texmlController = require('../controllers/texmlController');

// Endpoint de bienvenida - Punto de entrada para llamadas
router.post('/welcome', texmlController.handleWelcome);

// Endpoint para solicitar número de expediente
router.post('/expediente', texmlController.handleExpediente);

// Endpoint para validar expediente y cargar datos
router.post('/validar-expediente', texmlController.handleValidarExpediente);

// Endpoint para responder según la opción seleccionada
router.post('/respuesta', texmlController.handleRespuesta);

// Endpoint para transferir a un agente
router.post('/agent', texmlController.handleAgent);

// Endpoint para compatibilidad con sistema anterior
router.post('/webhook', (req, res) => {
  console.log('⚠️ Recibida solicitud en endpoint legacy /webhook');
  res.send('OK');
});

module.exports = router;