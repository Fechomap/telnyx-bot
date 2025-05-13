// src/utils/dateFormatter.js
/**
 * Utilidad para formatear fechas en formato amigable para IVR
 * Convierte fechas UTC a zona horaria de México y las formatea
 */

/**
 * Formatea una fecha ISO a formato amigable para IVR en zona horaria de México
 * @param {string} isoDate - Fecha en formato ISO (ej: "2025-05-13T01:08:48.302Z")
 * @returns {string} - Fecha formateada (ej: "12 de mayo a las 20:08")
 */
function formatearFechaParaIVR(isoDate) {
  if (!isoDate) return 'fecha no disponible';
  
  try {
    // Crear objeto Date a partir de la cadena ISO
    const fecha = new Date(isoDate);
    
    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) {
      console.error(`❌ Fecha inválida: ${isoDate}`);
      return 'fecha no disponible';
    }
    
    // Formatear la fecha en la zona horaria de México (America/Mexico_City)
    const opciones = {
      timeZone: 'America/Mexico_City',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Formato 24 horas
    };
    
    // Formatear la fecha con Intl.DateTimeFormat
    const fechaFormateada = new Intl.DateTimeFormat('es-MX', opciones).format(fecha);
    
    // Ajustar el formato final: "12 de mayo a las 20:08"
    // Separamos la cadena por comas y espacios
    const partes = fechaFormateada.split(', ');
    
    if (partes.length >= 2) {
      const [fechaParte, horaParte] = partes;
      return `${fechaParte} a las ${horaParte}`;
    }
    
    return fechaFormateada;
  } catch (error) {
    console.error(`❌ Error al formatear fecha: ${error.message}`);
    return 'fecha no disponible';
  }
}

module.exports = {
  formatearFechaParaIVR
};