/**
 * Servidor TeXML principal optimizado para AI Assistant
 * Sistema conversacional para consulta de expedientes
 * Versión 3.0
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const aiRoutes = require('./src/routes/aiRoutes');
// const texmlRoutes = require('./src/routes/texmlRoutes'); // COMENTADO: Usando flujo AI
const sessionCache = require('./src/cache/sessionCache');
const config = require('./src/config/texml');
const monitoring = require('./src/utils/monitoring');
const dashboard = require('./src/utils/dashboard');

// Inicializar aplicación Express
const app = express();

// Configurar middleware de seguridad y optimización
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// Configurar middleware para parseo de solicitudes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para monitoreo de tiempos de respuesta
app.use(monitoring.responseTimeMiddleware());

// Middleware para logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🔍 [${timestamp}] Nueva petición TeXML recibida:`);
  console.log(`URL: ${req.url}`);
  console.log(`Método: ${req.method}`);
  console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);
  console.log(`Query: ${JSON.stringify(req.query, null, 2)}`);
  console.log(`IP: ${req.ip}`);
  console.log('-----------------------------------');
  next();
});

// Health check endpoint mejorado
app.get('/health', (req, res) => {
  // Programar limpieza de sesiones expiradas
  sessionCache.cleanExpiredSessions();
  
  // Obtener estadísticas de rendimiento
  const metricsSummary = monitoring.getMetricsSummary();
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    texml_status: 'Ready',
    ai_status: config.ai.enabled ? 'Enabled' : 'Disabled',
    active_sessions: sessionCache.getActiveSessionsCount(),
    config_status: config ? '✅' : '❌',
    uptime: metricsSummary.uptime,
    performance: {
      responseTime: metricsSummary.performance.responseTime,
      dataQueryTime: metricsSummary.performance.dataQueryTime
    },
    memory: process.memoryUsage()
  });
});

// Endpoint para limpiar caché (solo para administradores)
app.post('/admin/clear-cache', (req, res) => {
  // Verificar token de autorización
  const authToken = req.query.token || req.body.token || '';
  if (authToken !== config.adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Limpiar caché
  const dataService = require('./src/services/dataService');
  dataService.clearCache();
  sessionCache.cleanExpiredSessions();
  
  res.json({ 
    status: 'OK',
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  });
});

// Montar rutas AI (principales)
app.use('/', aiRoutes);

// Montar rutas TeXML antiguas (compatibilidad) - COMENTADO PARA EVITAR CONFLICTOS
// app.use('/', texmlRoutes);

// Ruta de fallback para URLs desconocidas
app.use((req, res, next) => {
  if (res.headersSent) {
    return next();
  }
  
  console.warn(`⚠️ Ruta no encontrada: ${req.url}`);
  monitoring.trackError('route_not_found', req.url, { method: req.method });
  
  // Redirigir al endpoint de bienvenida
  res.redirect('/welcome');
});

// Middleware mejorado para manejo de errores
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`❌ [${timestamp}] Error no controlado:`, err);
  
  monitoring.trackError('unhandled_error', req.url, { 
    error: err.message || 'Unknown error',
    stack: err.stack
  });
  
  // Si la respuesta ya fue enviada, no hacer nada
  if (res.headersSent) {
    return next(err);
  }
  
  // Redirigir al endpoint de bienvenida
  res.redirect('/welcome');
});

// Manejador para señales de terminación
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Realiza un apagado controlado del servidor
 */
function gracefulShutdown() {
  console.log('🛑 Recibida señal de terminación, cerrando servidor...');
  
  // Esperar a que se completen las solicitudes pendientes
  setTimeout(() => {
    console.log('👋 Servidor cerrado.');
    process.exit(0);
  }, 1000);
}

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`
🚀 [${timestamp}] Servidor TeXML AI v3.0 iniciado:
- Puerto: ${PORT}
- Base URL: ${config.service.baseUrl || 'No configurada'}
- Caller ID: ${config.service.callerId || 'No configurado'}
- Connection ID: ${config.service.connectionId || 'No configurado'}
- AI Assistant: ${config.ai.enabled ? '✅' : '❌'}
- AI Model: ${config.ai.model}
- Transferencia a agentes: ${config.transfer.enabled ? '✅' : '❌'}
- Reconocimiento de voz: ✅
- Caché optimizado: ✅
- Manejo avanzado de errores: ✅
- Monitoreo y métricas: ✅
- Sesiones activas: ${sessionCache.getActiveSessionsCount()}
  `);
});

// Configurar timeout para el servidor
server.timeout = 30000; // 30 segundos

// Configurar dashboard si está habilitado
if (process.env.DASHBOARD_ENABLED === 'true') {
  dashboard.setupDashboard(app);
}

module.exports = app;