// src/services/ivr/menuService.js - AGREGANDO MÉTODO FALTANTE
const XMLBuilder = require('../../texml/helpers/xmlBuilder');
const config = require('../../config/texml');

class MenuService {
  buildWelcomeMenu() {
    const sayElement = XMLBuilder.addSay(
      "Bienvenido. Para seguimiento de expediente, presione 1. Para cotizar un servicio, presione 2.",
      { voice: 'Polly.Mia-Neural' }
    );
    
    const gatherElement = XMLBuilder.addGather({
      action: '/menu-selection',
      method: 'GET',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10',
      validDigits: '12',
      nested: sayElement
    });
    
    const timeoutSay = XMLBuilder.addSay(
      "No se detectó una opción válida.",
      { voice: 'Polly.Mia-Neural' }
    );
    
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    
    return XMLBuilder.buildResponse([
      gatherElement,
      timeoutSay,
      redirect
    ]);
  }
  
  // ESTE MÉTODO FALTABA
  buildExpedienteRequestMenu() {
    const sayElement = XMLBuilder.addSay(
      "Por favor, proporcione el número de expediente a revisar, seguido de la tecla numeral.",
      { voice: 'Polly.Mia-Neural' }
    );
    
    const gatherElement = XMLBuilder.addGather({
      action: '/validar-expediente',
      method: 'GET',
      input: 'dtmf',
      finishOnKey: '#',
      timeout: '10',
      validDigits: '0123456789',
      nested: sayElement
    });
    
    const timeoutSay = XMLBuilder.addSay(
      "No se detectó ningún número.",
      { voice: 'Polly.Mia-Neural' }
    );
    
    const redirect = XMLBuilder.addRedirect('/solicitar-expediente', 'GET');
    
    return XMLBuilder.buildResponse([
      gatherElement,
      timeoutSay,
      redirect
    ]);
  }
  
  buildExpedienteMenu(datos, sessionId, expediente) {
    let menuOptions = [];
    let validDigits = '';
    
    if (datos.costos && Object.keys(datos.costos).length > 0) {
      menuOptions.push("Presione 1 para consultar costos");
      validDigits += '1';
    }
    
    if (datos.unidad && Object.keys(datos.unidad).length > 0) {
      menuOptions.push("Presione 2 para información de la unidad");
      validDigits += '2';
    }
    
    if (datos.ubicacion && Object.keys(datos.ubicacion).length > 0) {
      menuOptions.push("Presione 3 para ubicación y tiempos");
      validDigits += '3';
    }
    
    if (datos.tiempos && Object.keys(datos.tiempos).length > 0) {
      menuOptions.push("Presione 4 para tiempos del servicio");
      validDigits += '4';
    }
    
    menuOptions.push("Presione 9 para consultar otro expediente");
    menuOptions.push("Presione 0 para hablar con un asesor");
    validDigits += '90';
    
    const introSay = XMLBuilder.addSay(
      `Expediente ${expediente} encontrado. Seleccione una opción:`,
      { voice: 'Polly.Mia-Neural' }
    );
    
    const menuSay = XMLBuilder.addSay(
      menuOptions.join('. '),
      { voice: 'Polly.Mia-Neural' }
    );
    
    const gatherElement = XMLBuilder.addGather({
      action: `/procesar-opcion?sessionId=${sessionId}&expediente=${expediente}`,
      method: 'GET',
      input: 'dtmf',
      numDigits: '1',
      timeout: '15',
      validDigits: validDigits,
      nested: menuSay
    });
    
    const redirect = XMLBuilder.addRedirect(
      `/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`,
      'GET'
    );
    
    return XMLBuilder.buildResponse([
      introSay,
      gatherElement,
      redirect
    ]);
  }
  
  buildCostsMenu(datos, sessionId, expediente) {
    const costos = datos.costos;
    let message = `Información de costos del expediente ${expediente}. `;
    
    if (costos.costo) {
      message += `El costo total es ${costos.costo}. `;
    }
    
    if (costos.km) {
      message += `Distancia: ${costos.km} kilómetros. `;
    }
    
    if (costos.banderazo) {
      message += `Banderazo: ${costos.banderazo}. `;
    }
    
    if (costos.costoKm) {
      message += `Costo por kilómetro: ${costos.costoKm}. `;
    }
    
    message += "Presione cualquier tecla para volver al menú.";
    
    const sayCosts = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    const gatherElement = XMLBuilder.addGather({
      action: `/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`,
      method: 'GET',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10'
    });
    
    const redirect = XMLBuilder.addRedirect(
      `/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`,
      'GET'
    );
    
    return XMLBuilder.buildResponse([sayCosts, gatherElement, redirect]);
  }
  
  // Agregar métodos similares para unit, location y times...
  buildUnitMenu(datos, sessionId, expediente) {
    // Implementación
  }
  
  buildLocationMenu(datos, sessionId, expediente) {
    // Implementación
  }
  
  buildTimesMenu(datos, sessionId, expediente) {
    // Implementación
  }
}

module.exports = new MenuService();