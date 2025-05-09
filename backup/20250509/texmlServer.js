/**
 * Servidor principal avanzado para arquitectura TeXML
 * Implementa todos los endpoints necesarios para IVR con soporte para características avanzadas
 * Versión 2.2 con optimizaciones de rendimiento y reconocimiento de voz
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const texmlRoutes = require('./src/routes/texmlRoutes');
const sessionCache = require('./src/cache/sessionCache');
const config = require('./src/config/texml');
const { ERROR_TYPES, respondWithError } = require('./src/texml/handlers/errorHandler');
const monitoring = require('./src/utils/monitoring');
const { formatearDatosParaIVR, clearCache } = require('./src/services/optimizedDataService');
const XMLBuilder = require('./src/texml/helpers/xmlBuilder');

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
  clearCache();
  sessionCache.cleanExpiredSessions();
  
  res.json({ 
    status: 'OK',
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  });
});

// Montar rutas TeXML
app.use('/', texmlRoutes);

// Ruta de fallback para URLs desconocidas
app.use((req, res, next) => {
  if (res.headersSent) {
    return next();
  }
  
  console.warn(`⚠️ Ruta no encontrada: ${req.url}`);
  monitoring.trackError('route_not_found', req.url, { method: req.method });
  
  // Si es una solicitud que espera XML, responder con TeXML
  if (req.get('Accept')?.includes('xml') || req.url.includes('/texml') || req.url.match(/^\/(welcome|expediente|respuesta|agent)/)) {
    const errorXML = XMLBuilder.buildResponse([
      XMLBuilder.addSay("Lo sentimos, la opción solicitada no está disponible."),
      XMLBuilder.addRedirect("/welcome")
    ]);
    
    res.header('Content-Type', 'application/xml');
    return res.send(errorXML);
  }
  
  // Para otras solicitudes, responder con JSON
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
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
  
  // Si es una solicitud que espera XML, responder con TeXML
  if (req.get('Accept')?.includes('xml') || req.url.includes('/texml') || req.url.match(/^\/(welcome|expediente|respuesta|agent)/)) {
    respondWithError(res, ERROR_TYPES.SYSTEM_ERROR);
  } else {
    // Para otras solicitudes, responder con JSON
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
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
🚀 [${timestamp}] Servidor TeXML v2.2 iniciado:
- Puerto: ${PORT}
- Base URL: ${config.service.baseUrl || 'No configurada'}
- Caller ID: ${config.service.callerId || 'No configurado'}
- Connection ID: ${config.service.connectionId || 'No configurado'}
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

module.exports = app;