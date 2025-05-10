/**
 * Configuración de rutas para endpoints TeXML
 * Versión mejorada con soporte para GET y POST
 */
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController'); // Cambiado a aiController

// Endpoint de bienvenida - Punto de entrada para llamadas
router.post('/welcome', aiController.handleWelcome);
router.get('/welcome', aiController.handleWelcome);

// Endpoint para solicitar/procesar número de expediente
// Unificamos /expediente, /validar-expediente y /procesar-expediente a handleProcessExpediente
router.post('/expediente', aiController.handleProcessExpediente);
router.get('/expediente', aiController.handleProcessExpediente);
router.post('/validar-expediente', aiController.handleProcessExpediente);
router.get('/validar-expediente', aiController.handleProcessExpediente);
router.post('/procesar-expediente', aiController.handleProcessExpediente); // Añadido para consistencia
router.get('/procesar-expediente', aiController.handleProcessExpediente);  // Añadido para consistencia

// Endpoint para responder según la opción seleccionada (asumiendo que existe en aiController o se añadirá)
// Si handleRespuesta no existe en aiController, esto dará error.
router.post('/respuesta', aiController.handleInteraction); // Asumiendo que handleInteraction puede manejar esto
router.get('/respuesta', aiController.handleInteraction);  // Asumiendo que handleInteraction puede manejar esto

// Endpoint para transferir a un agente (asumiendo que existe en aiController o se añadirá)
// aiController tiene handleAgentRequest, pero las rutas usan handleAgent.
// Por ahora, se deja como estaba, pero podría necesitar ajuste si handleAgent no está en aiController.
// Revisando aiController, no existe handleAgent, pero sí handleInteraction que llama a handleAgentRequest.
// Podríamos dirigir /agent a handleInteraction y dejar que este decida.
router.post('/agent', aiController.handleInteraction); // Dejamos que handleInteraction decida si es para agente
router.get('/agent', aiController.handleInteraction);

// Endpoint para AI Assistant (nuevo) / Interacción continua
router.post('/ai-response', aiController.handleInteraction);
router.get('/ai-response', aiController.handleInteraction);
router.post('/interactuar', aiController.handleInteraction); // Ruta usada internamente por aiController
router.get('/interactuar', aiController.handleInteraction);  // Ruta usada internamente por aiController

// Endpoint para volver al menú principal (asumiendo que existe en aiController o se añadirá)
// Si handleMenu no existe en aiController, esto dará error.
router.post('/menu', aiController.handleWelcome); // Volver al menú principal es como una nueva bienvenida
router.get('/menu', aiController.handleWelcome);

// Endpoint para compatibilidad con sistema anterior
router.post('/webhook', (req, res) => {
  console.log('⚠️ Recibida solicitud en endpoint legacy /webhook');
  res.send('OK');
});

module.exports = router;
