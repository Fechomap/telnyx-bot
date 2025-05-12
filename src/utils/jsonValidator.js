// src/utils/jsonValidator.js
const coordinatesValidator = require('./coordinatesValidator');

class JsonValidator {
  /**
   * Valida la estructura y contenido del JSON de cotización
   * @param {Object} jsonData - Datos JSON a validar
   * @returns {Object} - Resultado de la validación {valid: boolean, errors: string[], data: Object}
   */
  validateQuotationData(jsonData) {
    try {
      console.log(`🔍 Validando datos de cotización:`, jsonData);
      
      const errors = [];
      
      // Verificar estructura básica
      if (!jsonData) {
        errors.push('No se recibieron datos JSON');
        return { valid: false, errors, data: null };
      }
      
      // Validar coordenadas de origen
      if (!jsonData.origen) {
        errors.push('Falta el campo origen');
      } else {
        const origen = coordinatesValidator.parseCoordinates(jsonData.origen);
        if (!origen) {
          errors.push('El formato de las coordenadas de origen es inválido');
        } else {
          // Normalizar formato
          jsonData.origen = coordinatesValidator.formatCoordinates(origen.latitud, origen.longitud);
        }
      }
      
      // Validar coordenadas de destino
      if (!jsonData.destino) {
        errors.push('Falta el campo destino');
      } else {
        const destino = coordinatesValidator.parseCoordinates(jsonData.destino);
        if (!destino) {
          errors.push('El formato de las coordenadas de destino es inválido');
        } else {
          // Normalizar formato
          jsonData.destino = coordinatesValidator.formatCoordinates(destino.latitud, destino.longitud);
        }
      }
      
      // Validar datos del vehículo
      if (!jsonData.vehiculo) {
        errors.push('Falta información del vehículo');
      } else {
        if (!jsonData.vehiculo.marca || jsonData.vehiculo.marca.trim() === '') {
          errors.push('Falta la marca del vehículo');
        }
        
        if (!jsonData.vehiculo.submarca || jsonData.vehiculo.submarca.trim() === '') {
          errors.push('Falta la submarca del vehículo');
        }
        
        if (!jsonData.vehiculo.modelo) {
          errors.push('Falta el modelo/año del vehículo');
        } else {
          // Intentar normalizar el año
          const modelo = parseInt(jsonData.vehiculo.modelo, 10);
          if (isNaN(modelo) || modelo < 1950 || modelo > new Date().getFullYear() + 1) {
            errors.push('El año del vehículo es inválido');
          } else {
            // Normalizar formato
            jsonData.vehiculo.modelo = modelo.toString();
          }
        }
        
        // Normalizar textos
        if (jsonData.vehiculo.marca) {
          jsonData.vehiculo.marca = this.capitalizeFirstLetter(jsonData.vehiculo.marca.trim());
        }
        
        if (jsonData.vehiculo.submarca) {
          jsonData.vehiculo.submarca = this.capitalizeFirstLetter(jsonData.vehiculo.submarca.trim());
        }
      }
      
      // Verificar resultado final
      if (errors.length > 0) {
        return { 
          valid: false, 
          errors, 
          data: jsonData 
        };
      }
      
      console.log(`✅ Datos de cotización válidos`);
      return { 
        valid: true, 
        errors: [], 
        data: jsonData 
      };
      
    } catch (error) {
      console.error(`❌ Error al validar JSON:`, error);
      return {
        valid: false,
        errors: ['Error interno al validar datos'],
        data: null
      };
    }
  }
  
  /**
   * Capitaliza la primera letra de cada palabra
   * @param {string} text - Texto a capitalizar
   * @returns {string} - Texto capitalizado
   */
  capitalizeFirstLetter(text) {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

module.exports = new JsonValidator();