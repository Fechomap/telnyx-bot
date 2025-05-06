/**
 * Mock para respuestas de la API de Telnyx
 */

// Mock para respuestas de obtenerExpediente
const mockExpedienteData = {
    nombre: 'Juan Pérez',
    vehiculo: 'Honda Civic 2020',
    estatus: 'En proceso',
    servicio: 'Carretero',
    destino: 'CDMX'
  };
  
  const mockExpedienteConcluido = {
    nombre: 'María López',
    vehiculo: 'Nissan Versa 2019',
    estatus: 'Concluido',
    servicio: 'Local',
    destino: 'Guadalajara'
  };
  
  // Mock para respuestas de obtenerExpedienteCosto
  const mockCostoData = {
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
  };
  
  // Mock para respuestas de obtenerExpedienteUnidadOp
  const mockUnidadData = {
    operador: 'Carlos Martínez',
    tipoGrua: 'Plataforma',
    color: 'Blanco',
    unidadOperativa: '123',
    placas: 'ABC-123'
  };
  
  // Mock para respuestas de obtenerExpedienteUbicacion
  const mockUbicacionData = {
    tiempoRestante: '30 minutos',
    ubicacionGrua: '19.432608,-99.133209'
  };
  
  // Mock para respuestas de obtenerExpedienteTiempos
  const mockTiemposData = {
    tc: '10:15 AM',
    tt: '11:45 AM'
  };
  
  // Función para generar respuestas según el número de expediente
  function getMockResponse(expediente, tipo) {
    // El expediente 99999 siempre devuelve null (no encontrado)
    if (expediente === '99999') {
      return null;
    }
  
    // El expediente 12345 está concluido
    const isConcluido = expediente === '12345';
  
    switch (tipo) {
      case 'expediente':
        return isConcluido ? mockExpedienteConcluido : mockExpedienteData;
      case 'costo':
        return mockCostoData;
      case 'unidad':
        return mockUnidadData;
      case 'ubicacion':
        return mockUbicacionData;
      case 'tiempos':
        return mockTiemposData;
      default:
        return null;
    }
  }
  
  module.exports = {
    getMockResponse,
    mockExpedienteData,
    mockExpedienteConcluido,
    mockCostoData,
    mockUnidadData,
    mockUbicacionData,
    mockTiemposData
  };