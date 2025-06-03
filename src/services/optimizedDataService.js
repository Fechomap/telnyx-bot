/**
 * Servicio de datos optimizado con caché mejorado
 * Versión optimizada del servicio de datos unificado con mejor rendimiento
 */

// Importar servicios y módulos
const TelnyxService = require('./telnyxService');
const telnyxService = new TelnyxService();
const monitoring = require('../utils/monitoring');

// Caché simple en memoria para expedientes frecuentes
// En un entorno de producción, considerar Redis para caché distribuido
const expedienteCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos en milisegundos
const MAX_CACHE_SIZE = 100; // Límite máximo de items en caché

// Map para almacenar timeouts y poder cancelarlos si es necesario
const cacheTimers = new Map();

/**
 * Verifica si el dato está en caché y es válido
 * @param {string} expediente - Número de expediente
 * @returns {Object|null} Datos en caché o null si no existe o expiró
 */
function checkCache(expediente) {
  const cached = expedienteCache.get(expediente);
  
  if (!cached) return null;
  
  // Verificar si el caché expiró
  const now = Date.now();
  if (now > cached.expires) {
    // Limpiar caché expirado
    expedienteCache.delete(expediente);
    return null;
  }
  
  console.log(`✅ Datos obtenidos de caché para expediente: ${expediente}`);
  monitoring.trackExpediente('cached', expediente);
  return cached.data;
}

/**
 * Limpia los items más antiguos si el caché excede el tamaño máximo
 */
function evictOldestItems() {
  if (expedienteCache.size <= MAX_CACHE_SIZE) return;
  
  // Convertir a array y ordenar por fecha de creación
  const entries = Array.from(expedienteCache.entries())
    .sort((a, b) => a[1].created - b[1].created);
  
  // Eliminar el 20% más antiguo
  const toRemove = Math.floor(expedienteCache.size * 0.2);
  for (let i = 0; i < toRemove; i++) {
    const [key] = entries[i];
    expedienteCache.delete(key);
    
    // Cancelar timer si existe
    const timer = cacheTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      cacheTimers.delete(key);
    }
  }
  
  console.log(`🧹 Limpieza de caché: ${toRemove} items antiguos eliminados`);
}

/**
 * Almacena datos en el caché
 * @param {string} expediente - Número de expediente
 * @param {Object} data - Datos a almacenar
 */
function storeInCache(expediente, data) {
  // Limpiar timer anterior si existe
  const existingTimer = cacheTimers.get(expediente);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  
  // Verificar tamaño del caché antes de agregar
  evictOldestItems();
  
  expedienteCache.set(expediente, {
    data,
    created: Date.now(),
    expires: Date.now() + CACHE_TTL
  });
  
  console.log(`✅ Datos almacenados en caché para expediente: ${expediente}`);
  
  // Programar eliminación automática con referencia al timer
  const timer = setTimeout(() => {
    expedienteCache.delete(expediente);
    cacheTimers.delete(expediente);
    console.log(`🧹 Caché expirado y limpiado para expediente: ${expediente}`);
  }, CACHE_TTL);
  
  cacheTimers.set(expediente, timer);
}

/**
 * Realiza todas las consultas necesarias para un expediente en paralelo
 * Versión optimizada con manejo de caché y timeouts
 * @param {string} expediente - Número de expediente
 * @returns {Promise<Object>} Objeto con todos los datos unificados
 */
async function consultaUnificada(expediente) {
  try {
    console.log(`🔄 Iniciando consulta unificada para expediente: ${expediente}`);
    
    // Verificar si existe en caché
    const cachedData = checkCache(expediente);
    if (cachedData) return cachedData;
    
    // Obtener datos generales primero - esto puede fallar y propagará el error
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
    
    // Realizar el resto de consultas en paralelo con manejo de errores
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
    
    // Almacenar en caché para futuras consultas
    storeInCache(expediente, datosUnificados);
    
    console.log(`✅ Consulta unificada completada para expediente: ${expediente}`);
    return datosUnificados;
  } catch (error) {
    console.error('❌ Error en consulta unificada:', error);
    // Propagar el error para manejo adecuado en el controlador
    throw error;
  }
}

/**
 * Formatea la información del expediente para presentación en IVR
 * Versión optimizada con manejo de valores faltantes
 * @param {Object} datosUnificados - Datos completos del expediente
 * @returns {Object} Datos formateados para IVR
 */
function formatearDatosParaIVR(datosUnificados) {
  if (!datosUnificados) return null;
  
  const { datosGenerales, costos, unidad, ubicacion, tiempos } = datosUnificados;
  
  // Función auxiliar para acceder de forma segura a propiedades anidadas
  const safeGet = (obj, path, defaultValue = 'No disponible') => {
    if (!obj) return defaultValue;
    
    const keys = path.split('.');
    return keys.reduce((o, key) => 
      (o && o[key] !== undefined && o[key] !== null) ? o[key] : defaultValue, 
      obj
    );
  };
  
  // Formato para datos generales
  const mensajeGeneral = `Expediente encontrado. ${safeGet(datosGenerales, 'nombre', 'Cliente')}. ` +
                        `Vehículo: ${safeGet(datosGenerales, 'vehiculo')}. ` +
                        `Estado: ${safeGet(datosGenerales, 'estatus', 'En proceso')}. ` +
                        `Servicio: ${safeGet(datosGenerales, 'servicio')}. ` +
                        `Destino: ${safeGet(datosGenerales, 'destino')}.`;
  
  // Formato para costos
  let mensajeCostos = '';
  if (costos) {
    let desglose = '';
    if (safeGet(datosGenerales, 'servicio') === 'Local') {
      desglose = `${safeGet(costos, 'km', 0)} km plano ${safeGet(costos, 'plano', 0)}`;
    } else if (safeGet(datosGenerales, 'servicio') === 'Carretero') {
      const banderazoInfo = safeGet(costos, 'banderazo') !== 'No disponible' ? 
                            `banderazo ${costos.banderazo}` : '';
      const costoKmInfo = safeGet(costos, 'costoKm') !== 'No disponible' ? 
                         `costo Km ${costos.costoKm}` : '';
      desglose = `${safeGet(costos, 'km', 0)} km ${banderazoInfo} ${costoKmInfo}`;
    }

    // Detalles de costos
    const detalles = [];
    if (safeGet(costos, 'casetaACobro', 0) > 0) 
      detalles.push(`Caseta de cobro: ${costos.casetaACobro}`);
    if (safeGet(costos, 'casetaCubierta', 0) > 0) 
      detalles.push(`Caseta cubierta: ${costos.casetaCubierta}`);
    if (safeGet(costos, 'resguardo', 0) > 0) 
      detalles.push(`Resguardo: ${costos.resguardo}`);
    if (safeGet(costos, 'maniobras', 0) > 0) 
      detalles.push(`Maniobras: ${costos.maniobras}`);
    if (safeGet(costos, 'horaEspera', 0) > 0) 
      detalles.push(`Hora de espera: ${costos.horaEspera}`);
    if (safeGet(costos, 'Parking', 0) > 0) 
      detalles.push(`Parking: ${costos.Parking}`);
    if (safeGet(costos, 'Otros', 0) > 0) 
      detalles.push(`Otros: ${costos.Otros}`);
    if (safeGet(costos, 'excedente', 0) > 0) 
      detalles.push(`Excedente: ${costos.excedente}`);

    mensajeCostos = `El costo total es ${safeGet(costos, 'costo', '$0.00')}. Desglose: ${desglose}. `;
    if (detalles.length > 0) {
      mensajeCostos += `Detalles adicionales: ${detalles.join(', ')}`;
    }
  } else {
    mensajeCostos = "No hay información disponible sobre los costos de este expediente.";
  }
  
  // Formato para unidad
  let mensajeUnidad = '';
  if (unidad) {
    mensajeUnidad = `Datos de la unidad: ` +
                   `Operador: ${safeGet(unidad, 'operador')}. ` +
                   `Tipo de Grúa: ${safeGet(unidad, 'tipoGrua')}. ` +
                   `Color: ${safeGet(unidad, 'color')}. ` +
                   `Número Económico: ${safeGet(unidad, 'unidadOperativa')}. ` +
                   `Placas: ${safeGet(unidad, 'placas') || safeGet(unidad, 'placa')}.`;
  } else {
    mensajeUnidad = "No hay información disponible sobre la unidad de este expediente.";
  }
  
  // Formato para ubicación
  let mensajeUbicacion = '';
  if (ubicacion) {
    mensajeUbicacion = `Ubicación y Tiempo Restante. ` +
                      `Tiempo estimado de llegada: ${safeGet(ubicacion, 'tiempoRestante')}.`;
    
    const coordsRaw = safeGet(ubicacion, 'ubicacionGrua', '');
    if (coordsRaw && coordsRaw !== 'No disponible') {
      const coords = coordsRaw.trim().split(",");
      if (coords.length === 2) {
        const urlUbicacion = `https://www.google.com/maps/search/?api=1&query=${coords[0]}%2C${coords[1]}`;
        mensajeUbicacion += ` Ubicación disponible en Google Maps.`;
      }
    }
  } else {
    mensajeUbicacion = "No hay información disponible sobre la ubicación de este expediente.";
  }
  
  // Formato para tiempos
  let mensajeTiempos = '';
  if (tiempos) {
    mensajeTiempos = `Tiempos del Expediente. ` +
                    `Contacto: ${safeGet(tiempos, 'tc')}. ` +
                    `Término: ${safeGet(tiempos, 'tt')}.`;
  } else {
    mensajeTiempos = "No hay información disponible sobre los tiempos de este expediente.";
  }
  
  return {
    mensajeGeneral,
    mensajeCostos,
    mensajeUnidad,
    mensajeUbicacion,
    mensajeTiempos,
    estatus: safeGet(datosGenerales, 'estatus', 'En proceso')
  };
}

/**
 * Limpia el caché de expedientes
 * Útil para mantenimiento o reinicio de servidor
 */
function clearCache() {
  const count = expedienteCache.size;
  expedienteCache.clear();
  console.log(`🧹 Caché limpiado completamente. ${count} expedientes eliminados.`);
}

/**
 * Obtiene información sobre el estado del caché
 * @returns {Object} Estadísticas del caché
 */
function getCacheStats() {
  return {
    count: expedienteCache.size,
    items: Array.from(expedienteCache.keys()),
    timestamp: Date.now()
  };
}

/**
 * Limpia todos los timers al cerrar la aplicación
 */
function cleanupTimers() {
  console.log('🧹 Limpiando todos los timers del caché...');
  for (const [key, timer] of cacheTimers.entries()) {
    clearTimeout(timer);
  }
  cacheTimers.clear();
  expedienteCache.clear();
}

// Limpiar timers cuando el proceso se cierre
process.on('SIGINT', cleanupTimers);
process.on('SIGTERM', cleanupTimers);

module.exports = {
  consultaUnificada,
  formatearDatosParaIVR,
  clearCache,
  getCacheStats,
  cleanupTimers
};