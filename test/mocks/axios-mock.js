/**
 * Mock para axios
 */

// Respuestas predefinidas para diferentes URL
const mockResponses = {
    // Obtener expediente
    '/api/ConsultaExterna/ObtenerExpedienteBot': {
      dataResponse: {
        nombre: 'Juan Pérez',
        vehiculo: 'Honda Civic 2020',
        estatus: 'En proceso',
        servicio: 'Carretero',
        destino: 'CDMX'
      }
    },
    // Obtener costo
    '/api/ConsultaExterna/ObtenerExpedienteCostoBot': {
      dataResponse: {
        costo: '2500',
        km: '50',
        plano: '2000',
        banderazo: '500',
        costoKm: '40',
        casetaACobro: 500,
        casetaCubierta: 0,
        resguardo: 0,
        maniobras: 0,
        horaEspera: 0,
        Parking: 0,
        Otros: 0,
        excedente: 0
      }
    },
    // Obtener unidad operativa
    '/api/ConsultaExterna/ObtenerExpedienteUnidadOpBot': {
      dataResponse: {
        operador: 'Carlos Martínez',
        tipoGrua: 'Plataforma',
        color: 'Blanco',
        unidadOperativa: '123',
        placas: 'ABC-123'
      }
    },
    // Obtener ubicación
    '/api/ConsultaExterna/ObtenerExpedienteUbicacionBot': {
      dataResponse: {
        tiempoRestante: '30 minutos',
        ubicacionGrua: '19.432608,-99.133209'
      }
    },
    // Obtener tiempos
    '/api/ConsultaExterna/ObtenerExpedienteTiemposBot': {
      dataResponse: {
        tc: '10:15 AM',
        tt: '11:45 AM'
      }
    },
    // Respuesta para TeXML
    'https://api.telnyx.com/v2/calls/': {
      data: {
        success: true
      }
    }
  };
  
  // Crear un mock de axios
  const axiosMock = {
    create: () => axiosMock,
    CancelToken: {
      source: () => ({
        token: 'fake-token',
        cancel: () => {}
      })
    },
    async request(config) {
      // Simular delay para ser más realista
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Determinar qué respuesta devolver basado en la URL
      for (const [urlPattern, response] of Object.entries(mockResponses)) {
        if (config.url.includes(urlPattern)) {
          // Si es una URL de Telnyx, formatear la respuesta diferente
          if (config.url.includes('api.telnyx.com')) {
            return response;
          }
          return { data: response };
        }
      }
      
      // Si no hay respuesta predefinida, devolver error
      const error = new Error('Request failed');
      error.response = {
        status: 404,
        data: { error: 'Not found' }
      };
      throw error;
    }
  };
  
  module.exports = axiosMock;