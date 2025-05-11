// src/services/ivr/menuService.js - VERSIÓN CORREGIDA CON FLUJO CONTINUO
const XMLBuilder = require('../../texml/helpers/xmlBuilder');
const config = require('../../config/texml');
const SessionService = require('./sessionService'); // Import SessionService

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
  
  async buildExpedienteMenu(datos, callSid, expediente) { // Mark function as async
    let menuOptions = [];
    let validDigits = '';
    
    // Reorganizar opciones según lo solicitado
    // Opción 1: Información general del expediente
    if (datos.datosGenerales && Object.keys(datos.datosGenerales).length > 0) {
      menuOptions.push("Presione 1 para información general del expediente");
      validDigits += '1';
    }
    
    // Opción 2: Costos
    if (datos.costos && Object.keys(datos.costos).length > 0) {
      menuOptions.push("Presione 2 para consultar costos");
      validDigits += '2';
    }
    
    // Opción 3: Tiempos del servicio
    if (datos.tiempos && Object.keys(datos.tiempos).length > 0) {
      menuOptions.push("Presione 3 para tiempos del servicio");
      validDigits += '3';
    }
    
    // Opción 4: Ubicación
    if (datos.ubicacion && Object.keys(datos.ubicacion).length > 0) {
      menuOptions.push("Presione 4 para ubicación y tiempo de llegada");
      validDigits += '4';
    }
    
    menuOptions.push("Presione 9 para consultar otro expediente");
    menuOptions.push("Presione 0 para hablar con un asesor");
    validDigits += '90';

    const responseElements = [];
    
    // Check if the intro message has been shown
    const introShown = await SessionService.hasIntroMessageBeenShown(callSid, expediente);

    if (!introShown) {
      const introSay = XMLBuilder.addSay(
        `Expediente ${expediente} encontrado. Seleccione una opción:`,
        { voice: 'Polly.Mia-Neural' }
      );
      responseElements.push(introSay);
      // Mark that the intro message has now been shown
      await SessionService.markIntroMessageShown(callSid, expediente);
    }
    
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
      nested: menuSay // menuSay should be nested directly in Gather
    });

    responseElements.push(gatherElement);
    
    return XMLBuilder.buildResponse(responseElements);
  }
  
  // CAMBIO CRÍTICO: Eliminar gather y redirigir directamente al menú después de mostrar información
  
  buildGeneralInfoMenu(datos, callSid, expediente) {
    const datosGenerales = datos.datosGenerales;
    let message = `Información general del expediente ${expediente}. `;
    
    if (datosGenerales.nombre) {
      message += `Cliente: ${datosGenerales.nombre}. `;
    }
    
    if (datosGenerales.vehiculo) {
      message += `Vehículo: ${datosGenerales.vehiculo}. `;
    }
    
    if (datosGenerales.estatus) {
      message += `Estado: ${datosGenerales.estatus}. `;
    }
    
    if (datosGenerales.servicio) {
      message += `Servicio: ${datosGenerales.servicio}. `;
    }
    
    if (datosGenerales.destino) {
      message += `Destino: ${datosGenerales.destino}. `;
    }
    
    const sayInfo = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    // Pequeña pausa natural
    const pause = XMLBuilder.addSay(". ", { voice: 'Polly.Mia-Neural' });
    
    // Redirigir directamente al menú sin esperar input
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayInfo, pause, redirect]);
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
    
    const sayCosts = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    // Pequeña pausa natural
    const pause = XMLBuilder.addSay(". ", { voice: 'Polly.Mia-Neural' });
    
    // Redirigir directamente al menú sin esperar input
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayCosts, pause, redirect]);
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
    
    if (!tiempos.tc && !tiempos.tt) {
      message += `No hay información de tiempos disponible en este momento. `;
    }
    
    const sayTimes = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    // Pequeña pausa natural
    const pause = XMLBuilder.addSay(". ", { voice: 'Polly.Mia-Neural' });
    
    // Redirigir directamente al menú sin esperar input
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayTimes, pause, redirect]);
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
    
    if (!ubicacion.tiempoRestante && !ubicacion.ubicacionGrua) {
      message += `No hay información de ubicación disponible en este momento. `;
    }
    
    const sayLocation = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    // Pequeña pausa natural
    const pause = XMLBuilder.addSay(". ", { voice: 'Polly.Mia-Neural' });
    
    // Redirigir directamente al menú sin esperar input
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayLocation, pause, redirect]);
  }
}

module.exports = new MenuService();
