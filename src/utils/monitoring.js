/**
 * Sistema de monitoreo y métricas para TeXML
 * Registra estadísticas, tiempos de respuesta y uso del sistema
 */
const fs = require('fs');
const path = require('path');

// Directorio para logs y métricas
const LOGS_DIR = path.join(process.cwd(), 'logs');

// Asegurar que el directorio de logs existe
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Almacenamiento en memoria para métricas
const metrics = {
  requests: {
    total: 0,
    byEndpoint: {},
    errors: {
      total: 0,
      byType: {}
    }
  },
  sessions: {
    created: 0,
    active: 0,
    completed: 0,
    expired: 0
  },
  performance: {
    responseTime: {
      avg: 0,
      min: Number.MAX_SAFE_INTEGER,
      max: 0,
      samples: 0,
      total: 0
    },
    dataQueryTime: {
      avg: 0,
      min: Number.MAX_SAFE_INTEGER,
      max: 0,
      samples: 0,
      total: 0
    }
  },
  features: {
    speechRecognition: {
      attempts: 0,
      successful: 0,
      failed: 0
    },
    expedientes: {
      total: 0,
      found: 0,
      notFound: 0,
      cached: 0
    }
  },
  startTime: Date.now()
};

/**
 * Middleware para registrar tiempos de respuesta
 * @returns {Function} Middleware Express
 */
function responseTimeMiddleware() {
  return (req, res, next) => {
    // Marcar tiempo de inicio
    const start = Date.now();
    
    // Almacenar URL original en caso de redirección
    const originalUrl = req.originalUrl || req.url;
    
    // Incrementar contador de solicitudes
    metrics.requests.total++;
    
    // Incrementar contador por endpoint
    const endpoint = originalUrl.split('?')[0]; // Remover query params
    metrics.requests.byEndpoint[endpoint] = (metrics.requests.byEndpoint[endpoint] || 0) + 1;
    
    // Capturar tiempo al finalizar
    res.on('finish', () => {
      // Calcular tiempo de respuesta
      const duration = Date.now() - start;
      
      // Actualizar métricas de rendimiento
      const perf = metrics.performance.responseTime;
      perf.total += duration;
      perf.samples++;
      perf.avg = perf.total / perf.samples;
      perf.min = Math.min(perf.min, duration);
      perf.max = Math.max(perf.max, duration);
      
      // Registrar en log detallado
      logResponseTime(req.method, endpoint, duration, res.statusCode);
    });
    
    next();
  };
}

/**
 * Registra tiempo de respuesta en archivo de log
 * @param {string} method - Método HTTP
 * @param {string} endpoint - URL del endpoint
 * @param {number} duration - Duración en ms
 * @param {number} statusCode - Código de estado HTTP
 */
function logResponseTime(method, endpoint, duration, statusCode) {
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} | ${method} ${endpoint} | ${statusCode} | ${duration}ms\n`;
  
  fs.appendFile(
    path.join(LOGS_DIR, 'response-times.log'), 
    logLine, 
    (err) => {
      if (err) console.error('Error al escribir log de tiempos:', err);
    }
  );
}

/**
 * Registra inicio de consulta de datos
 * @returns {Function} Función para registrar fin de consulta
 */
function startDataQuery() {
  const start = Date.now();
  
  return (success = true) => {
    const duration = Date.now() - start;
    
    // Actualizar métricas de rendimiento
    const perf = metrics.performance.dataQueryTime;
    perf.total += duration;
    perf.samples++;
    perf.avg = perf.total / perf.samples;
    perf.min = Math.min(perf.min, duration);
    perf.max = Math.max(perf.max, duration);
    
    // Registrar en log detallado
    logDataQueryTime(duration, success);
    
    return duration;
  };
}

/**
 * Registra tiempo de consulta de datos en archivo de log
 * @param {number} duration - Duración en ms
 * @param {boolean} success - Si la consulta fue exitosa
 */
function logDataQueryTime(duration, success) {
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} | Data Query | ${success ? 'SUCCESS' : 'FAILURE'} | ${duration}ms\n`;
  
  fs.appendFile(
    path.join(LOGS_DIR, 'data-queries.log'), 
    logLine, 
    (err) => {
      if (err) console.error('Error al escribir log de consultas:', err);
    }
  );
}

/**
 * Registra evento de sesión
 * @param {string} eventType - Tipo de evento ('created', 'active', 'completed', 'expired')
 * @param {string} sessionId - ID de la sesión
 */
function trackSessionEvent(eventType, sessionId) {
  // Incrementar contador correspondiente
  if (metrics.sessions[eventType] !== undefined) {
    metrics.sessions[eventType]++;
  }
  
  // Registrar en log detallado
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} | Session | ${eventType} | ${sessionId}\n`;
  
  fs.appendFile(
    path.join(LOGS_DIR, 'sessions.log'), 
    logLine, 
    (err) => {
      if (err) console.error('Error al escribir log de sesiones:', err);
    }
  );
}

/**
 * Registra evento de error
 * @param {string} errorType - Tipo de error
 * @param {string} endpoint - URL del endpoint
 * @param {Object} details - Detalles adicionales
 */
function trackError(errorType, endpoint, details = {}) {
  // Incrementar contadores
  metrics.requests.errors.total++;
  metrics.requests.errors.byType[errorType] = (metrics.requests.errors.byType[errorType] || 0) + 1;
  
  // Registrar en log detallado
  const timestamp = new Date().toISOString();
  const detailsStr = JSON.stringify(details);
  const logLine = `${timestamp} | Error | ${errorType} | ${endpoint} | ${detailsStr}\n`;
  
  fs.appendFile(
    path.join(LOGS_DIR, 'errors.log'), 
    logLine, 
    (err) => {
      if (err) console.error('Error al escribir log de errores:', err);
    }
  );
}

/**
 * Registra evento de reconocimiento de voz
 * @param {string} eventType - Tipo de evento ('attempt', 'success', 'failure')
 * @param {string} input - Entrada reconocida
 * @param {string} result - Resultado del reconocimiento
 */
function trackSpeechRecognition(eventType, input, result) {
  // Incrementar contadores
  if (eventType === 'attempt') {
    metrics.features.speechRecognition.attempts++;
  } else if (eventType === 'success') {
    metrics.features.speechRecognition.successful++;
  } else if (eventType === 'failure') {
    metrics.features.speechRecognition.failed++;
  }
  
  // Registrar en log detallado
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} | Speech | ${eventType} | "${input}" | "${result}"\n`;
  
  fs.appendFile(
    path.join(LOGS_DIR, 'speech-recognition.log'), 
    logLine, 
    (err) => {
      if (err) console.error('Error al escribir log de reconocimiento de voz:', err);
    }
  );
}

/**
 * Registra evento de consulta de expediente
 * @param {string} eventType - Tipo de evento ('query', 'found', 'notFound', 'cached')
 * @param {string} expediente - Número de expediente
 */
function trackExpediente(eventType, expediente) {
  // Incrementar contadores
  if (eventType === 'query') {
    metrics.features.expedientes.total++;
  } else if (eventType === 'found') {
    metrics.features.expedientes.found++;
  } else if (eventType === 'notFound') {
    metrics.features.expedientes.notFound++;
  } else if (eventType === 'cached') {
    metrics.features.expedientes.cached++;
  }
  
  // Registrar en log detallado
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} | Expediente | ${eventType} | ${expediente}\n`;
  
  fs.appendFile(
    path.join(LOGS_DIR, 'expedientes.log'), 
    logLine, 
    (err) => {
      if (err) console.error('Error al escribir log de expedientes:', err);
    }
  );
}

/**
 * Obtiene resumen de métricas
 * @returns {Object} Resumen de métricas
 */
function getMetricsSummary() {
  // Calcular tiempo de actividad
  const uptimeMs = Date.now() - metrics.startTime;
  const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  
  // Calcular tasa de error
  const errorRate = metrics.requests.total > 0 
    ? (metrics.requests.errors.total / metrics.requests.total * 100).toFixed(2) 
    : 0;
  
  // Calcular tasa de reconocimiento de voz
  const speechSuccessRate = metrics.features.speechRecognition.attempts > 0
    ? (metrics.features.speechRecognition.successful / metrics.features.speechRecognition.attempts * 100).toFixed(2)
    : 0;
  
  return {
    uptime: `${uptimeHours}h ${uptimeMinutes}m`,
    requests: {
      total: metrics.requests.total,
      byEndpoint: metrics.requests.byEndpoint,
      errors: {
        total: metrics.requests.errors.total,
        rate: `${errorRate}%`,
        byType: metrics.requests.errors.byType
      }
    },
    sessions: {
      created: metrics.sessions.created,
      active: metrics.sessions.active,
      completed: metrics.sessions.completed,
      expired: metrics.sessions.expired
    },
    performance: {
      responseTime: {
        avg: `${metrics.performance.responseTime.avg.toFixed(2)}ms`,
        min: `${metrics.performance.responseTime.min}ms`,
        max: `${metrics.performance.responseTime.max}ms`
      },
      dataQueryTime: {
        avg: `${metrics.performance.dataQueryTime.avg.toFixed(2)}ms`,
        min: `${metrics.performance.dataQueryTime.min}ms`,
        max: `${metrics.performance.dataQueryTime.max}ms`
      }
    },
    features: {
      speechRecognition: {
        attempts: metrics.features.speechRecognition.attempts,
        successRate: `${speechSuccessRate}%`,
        successful: metrics.features.speechRecognition.successful,
        failed: metrics.features.speechRecognition.failed
      },
      expedientes: {
        total: metrics.features.expedientes.total,
        found: metrics.features.expedientes.found,
        notFound: metrics.features.expedientes.notFound,
        cached: metrics.features.expedientes.cached
      }
    }
  };
}

module.exports = {
  responseTimeMiddleware,
  startDataQuery,
  trackSessionEvent,
  trackError,
  trackSpeechRecognition,
  trackExpediente,
  getMetricsSummary
};