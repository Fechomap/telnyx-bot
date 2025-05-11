// src/services/ivr/expedienteService.js
const { consultaUnificada } = require('../optimizedDataService');
const monitoring = require('../../utils/monitoring');

class ExpedienteService {
  async validateAndSearch(expediente) {
    // Validar formato
    if (!expediente || expediente.length < 3 || isNaN(expediente)) {
      return { valid: false, error: 'invalid_format' };
    }
    
    monitoring.trackExpediente('query', expediente);
    
    try {
      const startTime = monitoring.startDataQuery();
      const datosExpediente = await consultaUnificada(expediente);
      const queryTime = startTime(!!datosExpediente);
      
      if (datosExpediente) {
        monitoring.trackExpediente('found', expediente);
        return { valid: true, datos: datosExpediente };
      } else {
        monitoring.trackExpediente('notFound', expediente);
        return { valid: false, error: 'not_found' };
      }
    } catch (error) {
      console.error(`Error al consultar expediente:`, error);
      return { valid: false, error: 'system_error' };
    }
  }
}

module.exports = new ExpedienteService();