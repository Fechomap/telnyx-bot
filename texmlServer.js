// texmlServer.js
/**
 * Servidor TeXML optimizado para IVR sin AI
 * Sistema determinístico con menús DTMF y caché Redis
 * Versión 4.0
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const ivrRoutes = require('./src/routes/ivrRoutes');
const redisService = require('./src/services/redisService');
const config = require('./src/config/texml');
const monitoring = require('./src/utils/monitoring');

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

// Middleware para logging detallado (solo si no estamos en tests)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [${timestamp}] Nueva petición TeXML:`);
    console.log(`   Método: ${req.method}`);
    console.log(`   URL: ${req.url}`);
    console.log(`   Body: ${JSON.stringify(req.body, null, 2)}`);
    console.log(`   Query: ${JSON.stringify(req.query, null, 2)}`);
    console.log(`   IP: ${req.ip}`);
    console.log('----------------------------------------');
    next();
  });
}

// Health check endpoint mejorado
app.get('/health', async (req, res) => {
  const redisStatus = redisService.isConnected ? 'Connected' : 'Disconnected';
  
  // Obtener estadísticas de rendimiento
  const metricsSummary = monitoring.getMetricsSummary();
  
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    redis_status: redisStatus,
    config_status: config ? '✅' : '❌',
    uptime: metricsSummary.uptime,
    performance: {
      responseTime: metricsSummary.performance.responseTime,
      dataQueryTime: metricsSummary.performance.dataQueryTime
    },
    sessions: metricsSummary.sessions,
    memory: process.memoryUsage()
  });
});

// Endpoint para limpiar caché manualmente (solo admin)
app.post('/admin/clear-cache', async (req, res) => {
  const authToken = req.query.token || req.body.token || '';
  
  if (authToken !== config.adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Limpiar todo el caché de Redis
    await redisService.deletePattern('session_*');
    
    res.json({ 
      status: 'OK',
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// DEBUG TEMPORAL: registrar detalles de cada petición
app.use((req, res, next) => {
  console.log(`🔍 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
});
// Montar rutas IVR principales
app.use('/', ivrRoutes);

// Middleware para manejo de errores
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
  
  // Redirigir al menú principal
  res.redirect('/welcome');
});

// Manejador para señales de terminación
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Apagado controlado del servidor
 */
async function gracefulShutdown() {
  console.log('🛑 Recibida señal de terminación, cerrando servidor...');
  
  try {
    // Desconectar Redis
    await redisService.disconnect();
    console.log('✅ Redis desconectado');
    
    // Esperar a que se completen las solicitudes pendientes
    setTimeout(() => {
      console.log('👋 Servidor cerrado.');
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('Error durante el apagado:', error);
    process.exit(1);
  }
}

// Función para iniciar el servidor
async function startServer() {
  try {
    // Conectar a Redis primero
    const redisConnected = await redisService.connect();
    
    if (!redisConnected) {
      console.warn('⚠️  Redis no está disponible. El sistema funcionará con limitaciones.');
    }
    
    // Iniciar servidor HTTP
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      const timestamp = new Date().toISOString();
      console.log(`
🚀 [${timestamp}] Servidor TeXML IVR v4.0 iniciado:
========================================
- Puerto: ${PORT}
- Base URL: ${config.service.baseUrl || 'No configurada'}
- Caller ID: ${config.service.callerId || 'No configurado'}
- Connection ID: ${config.service.connectionId || 'No configurado'}
- Redis: ${redisConnected ? '✅ Conectado' : '❌ Desconectado'}
- TTS Voice: ${config.tts.voice}
- Transferencia a agentes: ${config.transfer.enabled ? '✅' : '❌'}
- Monitoreo: ✅
- Dashboard: ${process.env.DASHBOARD_ENABLED === 'true' ? '✅' : '❌'}
========================================
      `);
    });
    
    // Configurar timeout para el servidor
    server.timeout = 30000; // 30 segundos
    
    return server;
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor SOLO si no estamos en ambiente de test
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;