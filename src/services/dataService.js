/**
 * Servicio unificado de datos
 * Combina las mejores partes de optimizedDataService con mejoras
 */
const TelnyxService = require('./telnyxService');
const telnyxService = new TelnyxService();
const monitoring = require('../utils/monitoring');

// Caché en memoria para expedientes
const expedienteCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

/**
 * Verifica si el dato está en caché y es válido
 * @param {string} expediente - Número de expediente
 * @returns {Object|null} Datos en caché o null
 */
function checkCache(expediente) {
  const cached = expedienteCache.get(expediente);
  
  if (!cached) return null;
  
  // Verificar expiración
  const now = Date.now();
  if (now > cached.expires) {
    expedienteCache.delete(expediente);
    return null;
  }
  
  console.log(`✅ Datos obtenidos de caché para expediente: ${expediente}`);
  monitoring.trackExpediente('cached', expediente);
  return cached.data;
}

/**
 * Almacena datos en caché
 * @param {string} expediente - Número de expediente
 * @param {Object} data - Datos a almacenar
 */
function storeInCache(expediente, data) {
  expedienteCache.set(expediente, {
    data,
    created: Date.now(),
    expires: Date.now() + CACHE_TTL
  });
  
  console.log(`✅ Datos almacenados en caché para expediente: ${expediente}`);
  
  // Programar limpieza automática
  setTimeout(() => {
    expedienteCache.delete(expediente);
    console.log(`🧹 Caché limpiado para expediente: ${expediente}`);
  }, CACHE_TTL);
}

/**
 * Realiza todas las consultas necesarias para un expediente en paralelo
 * @param {string} expediente - Número de expediente
 * @returns {Promise<Object|null>} Datos unificados o null
 */
async function consultaUnificada(expediente) {
  try {
    console.log(`🔄 Iniciando consulta unificada para expediente: ${expediente}`);
    
    // Verificar caché primero
    const cachedData = checkCache(expediente);
    if (cachedData) return cachedData;
    
    // Obtener datos generales primero
    const datosGenerales = await telnyxService.obtenerExpediente(expediente);
    
    // Verificar si el expediente existe
    if (!datosGenerales) {
      console.log(`❌ Expediente no encontrado: ${expediente}`);
      return null;
    }
    
    // Establecer timeout para consultas secundarias
    const QUERY_TIMEOUT = 5000; // 5 segundos
    
    // Función para crear promesa con timeout
    const withTimeout = (promise, timeoutMs) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
      ]);
    };
    
    // Realizar consultas en paralelo con manejo de errores
    const [
      costos,
      unidad,
      ubicacion,
      tiempos
    ] = await Promise.all([
      withTimeout(telnyxService.obtenerExpedienteCosto(expediente), QUERY_TIMEOUT)
        .catch(error => {
          console.error(`⚠️ Error al obtener costos: ${error.message}`);
          return {};
        }),
      withTimeout(telnyxService.obtenerExpedienteUnidadOp(expediente), QUERY_TIMEOUT)
        .catch(error => {
          console.error(`⚠️ Error al obtener unidad: ${error.message}`);
          return {};
        }),
      withTimeout(telnyxService.obtenerExpedienteUbicacion(expediente), QUERY_TIMEOUT)
        .catch(error => {
          console.error(`⚠️ Error al obtener ubicación: ${error.message}`);
          return {};
        }),
      withTimeout(telnyxService.obtenerExpedienteTiempos(expediente), QUERY_TIMEOUT)
        .catch(error => {
          console.error(`⚠️ Error al obtener tiempos: ${error.message}`);
          return {};
        })
    ]);
    
    // Construir objeto unificado con todos los datos
    const datosUnificados = {
      expediente,
      datosGenerales,
      costos: costos || {},
      unidad: unidad || {},
      ubicacion: ubicacion || {},
      tiempos: tiempos || {},
      timestamp: Date.now(),
      estatus: datosGenerales.estatus || 'Desconocido'
    };
    
    // Almacenar en caché
    storeInCache(expediente, datosUnificados);
    
    console.log(`✅ Consulta unificada completada para expediente: ${expediente}`);
    return datosUnificados;
  } catch (error) {
    console.error('❌ Error en consulta unificada:', error);
    throw error;
  }
}

/**
 * Limpia el caché de expedientes
 */
function clearCache() {
  const count = expedienteCache.size;
  expedienteCache.clear();
  console.log(`🧹 Caché limpiado completamente. ${count} expedientes eliminados.`);
}

/**
 * Obtiene estadísticas del caché
 * @returns {Object} Estadísticas
 */
function getCacheStats() {
  return {
    count: expedienteCache.size,
    items: Array.from(expedienteCache.keys()),
    timestamp: Date.now()
  };
}

module.exports = {
  consultaUnificada,
  clearCache,
  getCacheStats
};