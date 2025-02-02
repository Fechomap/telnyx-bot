const AxiosService = require('./axiosService');

class TelnyxService {
  constructor() {
    // Asegúrate de que process.env.API_BASE_URL esté correctamente definido.
    this.apiService = new AxiosService(process.env.API_BASE_URL);
  }

  async obtenerExpediente(numeroExp) {
    try {
      const response = await this.apiService.request(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteBot?numero=${numeroExp}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('Error al obtener expediente:', error);
      return null;
    }
  }

  async obtenerExpedienteCosto(numeroExp) {
    try {
      const response = await this.apiService.request(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteCostoBot?numero=${numeroExp}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('Error al obtener costo:', error);
      return null;
    }
  }

  async obtenerExpedienteUnidadOp(numeroExp) {
    try {
      const response = await this.apiService.request(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteUnidadOpBot?numero=${numeroExp}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('Error al obtener unidad:', error);
      return null;
    }
  }

  async obtenerExpedienteUbicacion(numeroExp) {
    try {
      const response = await this.apiService.request(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteUbicacionBot?numero=${numeroExp}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
      return null;
    }
  }

  async obtenerExpedienteTiempos(numeroExp) {
    try {
      const response = await this.apiService.request(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteTiemposBot?numero=${numeroExp}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('Error al obtener tiempos:', error);
      return null;
    }
  }
}

module.exports = TelnyxService;