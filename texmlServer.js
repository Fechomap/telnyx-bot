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
const path = require('path');
const ivrRoutes = require('./src/routes/ivrRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const redisService = require('./src/services/redisService');
const config = require('./src/config/texml');
const monitoring = require('./src/utils/monitoring');
const { authenticateAdminPage } = require('./src/middleware/adminAuth');

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

// Servir archivos estáticos para el panel de administración
app.use('/admin/static', express.static(path.join(__dirname, 'public')));

// Ruta del panel de administración
app.get('/admin', authenticateAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes para administración
app.use('/admin', adminRoutes);

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
// Fragmento mejorado para texmlServer.js

// Esta función debe reemplazar la función existente startServer()
async function startServer() {
  try {
    console.log('📊 Información del entorno:');
    console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'no definido'}`);
    console.log(`- PORT: ${process.env.PORT || '3000 (default)'}`);
    console.log(`- REDIS_URL: ${process.env.REDIS_URL ? 'definido' : 'no definido'}`);
    if (process.env.REDIS_URL && process.env.REDIS_URL.includes('${{')) {
      console.log(`  ⚠️ Advertencia: REDIS_URL contiene un placeholder: ${process.env.REDIS_URL}`);
    }
    console.log(`- BASE_URL: ${process.env.BASE_URL || 'no definido'}`);
    
    // Variables específicas de Railway
    const railwayVars = Object.keys(process.env).filter(key => 
      key.startsWith('RAILWAY_') || key === 'NIXPACKS_TYPE'
    );
    if (railwayVars.length > 0) {
      console.log('- Variables Railway detectadas:', railwayVars.join(', '));
    }
    
    // Intentar conectar a Redis primero
    console.log('\n⏳ Intentando conectar a Redis...');
    const redisConnected = await redisService.connect();
    
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
- Redis: ${redisConnected ? '✅ Conectado' : '❌ Desconectado (modo limitado)'}
- TTS Voice: ${config.tts.voice}
- Transferencia a agentes: ${config.transfer.enabled ? '✅' : '❌'}
- Monitoreo: ✅
- Dashboard: ${process.env.DASHBOARD_ENABLED === 'true' ? '✅' : '❌'}
========================================
      `);
      
      if (!redisConnected) {
        console.log('\n⚠️ ADVERTENCIA: Redis no está disponible. Algunas funciones estarán limitadas:');
        console.log('- No habrá caché de expedientes');
        console.log('- No se podrán mantener sesiones entre solicitudes');
        console.log('- Las consultas serán más lentas (sin caching)');
        console.log('El sistema funcionará, pero con capacidades reducidas.\n');
      }
    });
    
    // Configurar timeout para el servidor
    server.timeout = 30000; // 30 segundos
    
    return server;
  } catch (error) {
    console.error('❌ Error crítico al iniciar el servidor:', error);
    
    // Imprimir información adicional para diagnóstico
    console.error('\n📊 Información de diagnóstico:');
    console.error(`- NODE_ENV: ${process.env.NODE_ENV || 'no definido'}`);
    console.error(`- PORT: ${process.env.PORT || '3000 (default)'}`);
    console.error(`- REDIS_URL: ${redisService.maskUrl(process.env.REDIS_URL || 'no definido')}`);
    
    // Solo salir si estamos en producción
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Terminando proceso en entorno de producción debido a error crítico');
      process.exit(1);
    }
    
    throw error;
  }
}

// Iniciar servidor SOLO si no estamos en ambiente de test
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;