/**
 * Configuración de rutas para endpoints TeXML
 * Versión mejorada con soporte para GET y POST
 */
const express = require('express');
const router = express.Router();
const texmlController = require('../controllers/texmlController');

// Endpoint de bienvenida - Punto de entrada para llamadas
router.post('/welcome', texmlController.handleWelcome);
router.get('/welcome', texmlController.handleWelcome);

// Endpoint para solicitar número de expediente
router.post('/expediente', texmlController.handleExpediente);
router.get('/expediente', texmlController.handleExpediente);

// Endpoint para validar expediente y cargar datos
router.post('/validar-expediente', texmlController.handleValidarExpediente);
router.get('/validar-expediente', texmlController.handleValidarExpediente);

// Endpoint para responder según la opción seleccionada
router.post('/respuesta', texmlController.handleRespuesta);
router.get('/respuesta', texmlController.handleRespuesta);

// Endpoint para transferir a un agente
router.post('/agent', texmlController.handleAgent);
router.get('/agent', texmlController.handleAgent);

// Endpoint para AI Assistant (nuevo)
router.post('/ai-response', texmlController.handleAIResponse);
router.get('/ai-response', texmlController.handleAIResponse);

// Endpoint para volver al menú principal
router.post('/menu', texmlController.handleMenu);
router.get('/menu', texmlController.handleMenu);

// Endpoint para compatibilidad con sistema anterior
router.post('/webhook', (req, res) => {
  console.log('⚠️ Recibida solicitud en endpoint legacy /webhook');
  res.send('OK');
});

module.exports = router;