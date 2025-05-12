// src/utils/coordinatesValidator.js
class CoordinatesValidator {
  parseCoordinates(coordinatesStr) {
    try {
      // Normalizar la entrada
      coordinatesStr = coordinatesStr.trim()
        .replace(/\s+/g, '') // Eliminar espacios en blanco
        .replace(/menos/gi, '-') // Reemplazar "menos" por signo negativo
        .replace(/guion/gi, '-') // Reemplazar "guion" por signo negativo
        .replace(/;/g, ','); // Reemplazar punto y coma por coma
      
      // Dividir por coma
      const parts = coordinatesStr.split(',');
      
      if (parts.length !== 2) {
        console.error(`❌ Formato incorrecto: ${coordinatesStr}`);
        return null;
      }
      
      // Parsear números
      const latitud = parseFloat(parts[0]);
      const longitud = parseFloat(parts[1]);
      
      // Validar rango para México
      if (isNaN(latitud) || isNaN(longitud) ||
          latitud < 14.5 || latitud > 32.5 ||
          longitud < -118.5 || longitud > -86.5) {
        console.error(`❌ Coordenadas fuera de rango: ${latitud}, ${longitud}`);
        return null;
      }
      
      return { latitud, longitud };
    } catch (error) {
      console.error(`❌ Error al parsear coordenadas:`, error);
      return null;
    }
  }

  formatCoordinates(lat, lon) {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
}

module.exports = new CoordinatesValidator();