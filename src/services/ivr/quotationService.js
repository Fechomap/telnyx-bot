// src/services/ivr/quotationService.js
const coordinatesValidator = require('../../utils/coordinatesValidator');

class QuotationService {
  async generateQuotation(data) {
    try {
      console.log(`💰 Generando cotización con datos:`, data);
      
      // Validar formato de coordenadas
      const origen = coordinatesValidator.parseCoordinates(data.origen);
      const destino = coordinatesValidator.parseCoordinates(data.destino);
      
      if (!origen || !destino) {
        throw new Error('Coordenadas inválidas');
      }
      
      // Calcular distancia (fórmula de Haversine)
      const distance = this.calculateDistance(
        origen.latitud, 
        origen.longitud, 
        destino.latitud, 
        destino.longitud
      );
      
      // Calcular costo base según distancia
      let costoBase = this.calculateBaseCost(distance);
      
      // Ajustar según tipo de vehículo
      const factorVehiculo = this.getVehicleFactor(data.vehiculo);
      
      // Calcular costo final
      const costoFinal = Math.round(costoBase * factorVehiculo);
      
      const result = {
        distance: Math.round(distance * 10) / 10, // Redondear a 1 decimal
        cost: costoFinal,
        vehicleType: this.getVehicleType(data.vehiculo),
        timestamp: Date.now()
      };
      
      console.log(`✅ Cotización generada:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error al generar cotización:`, error);
      // Devolver cotización predeterminada en caso de error
      return {
        distance: 10,
        cost: 1000,
        vehicleType: 'Estándar',
        timestamp: Date.now(),
        isDefault: true
      };
    }
  }
  
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Radio de la Tierra en kilómetros
    const R = 6371;
    
    // Convertir a radianes
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }
  
  toRad(degree) {
    return degree * Math.PI / 180;
  }
  
  calculateBaseCost(distance) {
    // Fórmula simple para costo base
    const tarifa = 45; // Pesos por km
    const banderazo = 100; // Cargo fijo inicial
    
    return banderazo + (distance * tarifa);
  }
  
  getVehicleFactor(vehicleData) {
    const marca = vehicleData.marca.toLowerCase();
    const submarca = vehicleData.submarca.toLowerCase();
    const modelo = parseInt(vehicleData.modelo, 10);
    
    // Factores por tamaño/tipo de vehículo (simplificado)
    let factor = 1.0;
    
    // Ajuste por marca/submarca
    if (['mercedes', 'bmw', 'audi', 'lexus'].includes(marca)) {
      factor *= 1.3; // Aumento para vehículos de lujo
    } else if (['toyota', 'honda', 'volkswagen'].includes(marca)) {
      factor *= 1.1; // Ligero aumento para marcas premium
    }
    
    // Ajuste por tamaño inferido de submarca
    if (['pickup', 'suv', 'camioneta'].some(term => submarca.includes(term))) {
      factor *= 1.2; // Aumento para vehículos grandes
    }
    
    // Ajuste por antigüedad
    const currentYear = new Date().getFullYear();
    if (modelo && !isNaN(modelo)) {
      if (currentYear - modelo > 15) {
        factor *= 1.15; // Aumento para vehículos muy antiguos
      } else if (currentYear - modelo > 10) {
        factor *= 1.1; // Aumento para vehículos antiguos
      }
    }
    
    return factor;
  }
  
  getVehicleType(vehicleData) {
    const marca = vehicleData.marca.toLowerCase();
    const submarca = vehicleData.submarca.toLowerCase();
    
    if (['mercedes', 'bmw', 'audi', 'lexus'].includes(marca)) {
      return 'Lujo';
    } else if (['pickup', 'suv', 'camioneta'].some(term => submarca.includes(term))) {
      return 'SUV/Camioneta';
    } else {
      return 'Estándar';
    }
  }
}

module.exports = new QuotationService();