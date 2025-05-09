/**
 * Servicio de datos unificado
 * Realiza consultas paralelas a todos los endpoints necesarios
 * y unifica los resultados en un solo objeto
 */

// Importar el servicio Telnyx existente
const TelnyxService = require('./telnyxService');
const telnyxService = new TelnyxService();

/**
 * Realiza todas las consultas necesarias para un expediente en paralelo
 * @param {string} expediente - Número de expediente
 * @returns {Promise<Object>} Objeto con todos los datos unificados
 */
async function consultaUnificada(expediente) {
  try {
    console.log(`🔄 Iniciando consulta unificada para expediente: ${expediente}`);
    
    // Obtener datos generales primero
    const datosGenerales = await telnyxService.obtenerExpediente(expediente);
    
    // Verificar si el expediente existe
    if (!datosGenerales) {
      console.log(`❌ Expediente no encontrado: ${expediente}`);
      return null;
    }
    
    // Si llegamos aquí, el expediente existe, obtener el resto de datos
    const [
      costos,
      unidad,
      ubicacion,
      tiempos
    ] = await Promise.all([
      telnyxService.obtenerExpedienteCosto(expediente),
      telnyxService.obtenerExpedienteUnidadOp(expediente),
      telnyxService.obtenerExpedienteUbicacion(expediente),
      telnyxService.obtenerExpedienteTiempos(expediente)
    ]);
    
    // Construir objeto unificado con todos los datos
    const datosUnificados = {
      expediente,
      datosGenerales,
      costos,
      unidad,
      ubicacion,
      tiempos,
      timestamp: Date.now(),
      estatus: datosGenerales.estatus || 'Desconocido'
    };
    
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
 * @param {Object} datosUnificados - Datos completos del expediente
 * @returns {Object} Datos formateados para IVR
 */
function formatearDatosParaIVR(datosUnificados) {
  if (!datosUnificados) return null;
  
  const { datosGenerales, costos, unidad, ubicacion, tiempos } = datosUnificados;
  
  // Formato para datos generales
  const mensajeGeneral = `Expediente encontrado. ${datosGenerales.nombre || 'Cliente'}. ` +
                        `Vehículo: ${datosGenerales.vehiculo || 'No especificado'}. ` +
                        `Estado: ${datosGenerales.estatus || 'En proceso'}. ` +
                        `Servicio: ${datosGenerales.servicio || 'No especificado'}. ` +
                        `Destino: ${datosGenerales.destino || 'No especificado'}.`;
  
  // Formato para costos
  let mensajeCostos = '';
  if (costos) {
    let desglose = '';
    if (datosGenerales.servicio === 'Local') {
      desglose = `${costos.km || 0} km plano ${costos.plano || 0}`;
    } else if (datosGenerales.servicio === 'Carretero') {
      const banderazoInfo = costos.banderazo ? `banderazo ${costos.banderazo}` : '';
      const costoKmInfo = costos.costoKm ? `costo Km ${costos.costoKm}` : '';
      desglose = `${costos.km || 0} km ${banderazoInfo} ${costoKmInfo}`;
    }

    let detalles = [];
    if (costos.casetaACobro > 0) detalles.push(`Caseta de cobro: ${costos.casetaACobro}`);
    if (costos.casetaCubierta > 0) detalles.push(`Caseta cubierta: ${costos.casetaCubierta}`);
    if (costos.resguardo > 0) detalles.push(`Resguardo: ${costos.resguardo}`);
    if (costos.maniobras > 0) detalles.push(`Maniobras: ${costos.maniobras}`);
    if (costos.horaEspera > 0) detalles.push(`Hora de espera: ${costos.horaEspera}`);
    if (costos.Parking > 0) detalles.push(`Parking: ${costos.Parking}`);
    if (costos.Otros > 0) detalles.push(`Otros: ${costos.Otros}`);
    if (costos.excedente > 0) detalles.push(`Excedente: ${costos.excedente}`);

    mensajeCostos = `El costo total es ${costos.costo || 0}. Desglose: ${desglose}. `;
    if (detalles.length > 0) {
      mensajeCostos += `Detalles adicionales: ${detalles.join(', ')}`;
    }
  }
  
  // Formato para unidad
  let mensajeUnidad = '';
  if (unidad) {
    mensajeUnidad = `Datos de la unidad: ` +
                   `Operador: ${unidad.operador || 'No asignado'}. ` +
                   `Tipo de Grúa: ${unidad.tipoGrua || 'No especificado'}. ` +
                   `Color: ${unidad.color || 'No especificado'}. ` +
                   `Número Económico: ${unidad.unidadOperativa || 'No especificado'}. ` +
                   `Placas: ${unidad.placas || unidad.placa || 'No especificado'}.`;
  }
  
  // Formato para ubicación
  let mensajeUbicacion = '';
  if (ubicacion) {
    mensajeUbicacion = `Ubicación y Tiempo Restante. ` +
                      `Tiempo estimado de llegada: ${ubicacion.tiempoRestante || 'No disponible'}.`;
    
    if (ubicacion.ubicacionGrua) {
      const coords = ubicacion.ubicacionGrua.trim().split(",");
      const urlUbicacion = `https://www.google.com/maps/search/?api=1&query=${coords[0]}%2C${coords[1]}`;
      mensajeUbicacion += ` Ubicación disponible en Google Maps.`;
    }
  }
  
  // Formato para tiempos
  let mensajeTiempos = '';
  if (tiempos) {
    mensajeTiempos = `Tiempos del Expediente. ` +
                    `Contacto: ${tiempos.tc || 'No registrado'}. ` +
                    `Término: ${tiempos.tt || 'No registrado'}.`;
  }
  
  return {
    mensajeGeneral,
    mensajeCostos,
    mensajeUnidad,
    mensajeUbicacion,
    mensajeTiempos,
    estatus: datosGenerales.estatus || 'En proceso'
  };
}

module.exports = {
  consultaUnificada,
  formatearDatosParaIVR
};