const axios = require('axios');
const https = require('https');

class AxiosService {
  constructor(baseURL) {
    const config = {
      baseURL,
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Solo deshabilitar verificación TLS en desarrollo si está explícitamente configurado
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_INSECURE_TLS === 'true') {
      console.warn('⚠️  ADVERTENCIA: Verificación TLS deshabilitada. Solo usar en desarrollo.');
      config.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    this.api = axios.create(config);
  }

  /**
   * Realiza una solicitud HTTP usando Axios.
   *
   * @param {string} method - Método HTTP (GET, POST, etc.).
   * @param {string} url - URL relativa al baseURL.
   * @param {Object|null} data - Datos a enviar (para POST, PUT, etc.).
   * @param {Object} customHeaders - Headers adicionales.
   * @param {Object} options - Otras opciones de configuración.
   * @returns {Promise<Object>} - La propiedad data de la respuesta.
   */
  async request(method, url, data = null, customHeaders = {}, options = {}) {
    const headers = { ...customHeaders };
    const source = axios.CancelToken.source();

    const config = {
      method,
      url,
      headers,
      cancelToken: source.token,
      ...options,
    };

    if (data) {
      config.data = data;
    }

    try {
      // Cambiar de this.api(config) a this.api.request(config)
      const response = await this.api.request(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Maneja los errores de la solicitud.
   *
   * @param {Error} error - El error capturado.
   * @throws {Error} - Vuelve a lanzar el error después de registrar la información.
   */
  handleError(error) {
    if (error.response) {
      console.error('Error en la respuesta:', error.response.data);
    } else if (error.request) {
      console.error('Error en la solicitud:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

module.exports = AxiosService;