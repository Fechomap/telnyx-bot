// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/adminAuth');

// Aplicar autenticación a todas las rutas admin
router.use(authenticateAdmin);

// Rutas de configuración
router.get('/config', adminController.getConfig);
router.post('/config', adminController.updateConfig);

// Rutas de sistema
router.get('/status', adminController.getSystemStatus);
router.get('/test-system', adminController.testSystem);
router.post('/restart', adminController.restartSystem);

// Rutas de logs y monitoreo
router.get('/logs', adminController.getLogs);
router.get('/metrics', adminController.getMetrics);

module.exports = router;