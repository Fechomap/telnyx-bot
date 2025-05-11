// src/services/ivr/menuService.js - VERSIÓN COMPLETA
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
  
  buildExpedienteMenu(datos, callSid, expediente) {
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
      action: `/procesar-opcion`,
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '15',
      validDigits: validDigits,
      nested: menuSay
    });
    
    return XMLBuilder.buildResponse([
      introSay,
      gatherElement
    ]);
  }
  
  buildCostsMenu(datos, callSid, expediente) {
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
    
    if (costos.casetaCubierta > 0) {
      message += `Caseta cubierta: ${costos.casetaCubierta} pesos. `;
    }
    
    if (costos.maniobras > 0) {
      message += `Maniobras: ${costos.maniobras} pesos. `;
    }
    
    message += "Presione cualquier tecla para volver al menú.";
    
    const sayCosts = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    const gatherElement = XMLBuilder.addGather({
      action: `/menu-expediente`,
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10'
    });
    
    const redirect = XMLBuilder.addRedirect(
      `/menu-expediente`,
      'POST'
    );
    
    return XMLBuilder.buildResponse([sayCosts, gatherElement, redirect]);
  }
  
  buildUnitMenu(datos, callSid, expediente) {
    const unidad = datos.unidad;
    let message = `Información de la unidad del expediente ${expediente}. `;
    
    if (unidad.operador) {
      message += `Operador: ${unidad.operador}. `;
    }
    
    if (unidad.tipoGrua) {
      message += `Tipo de grúa: ${unidad.tipoGrua}. `;
    }
    
    if (unidad.color) {
      message += `Color: ${unidad.color}. `;
    }
    
    if (unidad.unidadOperativa) {
      message += `Número económico: ${unidad.unidadOperativa}. `;
    }
    
    if (unidad.placas) {
      message += `Placas: ${unidad.placas}. `;
    }
    
    message += "Presione cualquier tecla para volver al menú.";
    
    const sayUnit = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    const gatherElement = XMLBuilder.addGather({
      action: `/menu-expediente`,
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10'
    });
    
    const redirect = XMLBuilder.addRedirect(
      `/menu-expediente`,
      'POST'
    );
    
    return XMLBuilder.buildResponse([sayUnit, gatherElement, redirect]);
  }
  
  buildLocationMenu(datos, callSid, expediente) {
    const ubicacion = datos.ubicacion;
    let message = `Información de ubicación del expediente ${expediente}. `;
    
    if (ubicacion.tiempoRestante) {
      message += `Tiempo estimado de llegada: ${ubicacion.tiempoRestante}. `;
    }
    
    if (ubicacion.ubicacionGrua) {
      message += `La unidad está en camino. `;
    }
    
    message += "Presione cualquier tecla para volver al menú.";
    
    const sayLocation = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    const gatherElement = XMLBuilder.addGather({
      action: `/menu-expediente`,
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10'
    });
    
    const redirect = XMLBuilder.addRedirect(
      `/menu-expediente`,
      'POST'
    );
    
    return XMLBuilder.buildResponse([sayLocation, gatherElement, redirect]);
  }
  
  buildTimesMenu(datos, callSid, expediente) {
    const tiempos = datos.tiempos;
    let message = `Información de tiempos del expediente ${expediente}. `;
    
    if (tiempos.tc) {
      message += `Tiempo de contacto: ${tiempos.tc}. `;
    }
    
    if (tiempos.tt) {
      message += `Tiempo de término: ${tiempos.tt}. `;
    }
    
    message += "Presione cualquier tecla para volver al menú.";
    
    const sayTimes = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    const gatherElement = XMLBuilder.addGather({
      action: `/menu-expediente`,
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10'
    });
    
    const redirect = XMLBuilder.addRedirect(
      `/menu-expediente`,
      'POST'
    );
    
    return XMLBuilder.buildResponse([sayTimes, gatherElement, redirect]);
  }
}

module.exports = new MenuService();