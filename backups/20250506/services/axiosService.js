const axios = require('axios');

// Deshabilita la validación de certificados TLS (solo para desarrollo)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

class AxiosService {
  constructor(baseURL) {
    this.api = axios.create({
      baseURL,
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json'
      }
    });
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