// src/services/ivr/menuService.js - VERSIÓN CORREGIDA CON FILTRADO POR ESTATUS
const XMLBuilder = require('../../texml/helpers/xmlBuilder');
const config = require('../../config/texml');
const SessionService = require('./sessionService');
const { hexToColorName } = require('../../utils/colorConverter');
const { formatearFechaParaIVR } = require('../../utils/dateFormatter');

class MenuService {
  // Función para formatear el expediente en grupos de dos dígitos
  formatearExpediente(expediente) {
    return expediente.match(/.{1,2}/g).join(' ');
  }

  // Función para generar mensaje descriptivo según el estatus
  getStatusMessage(estatus) {
    switch(estatus) {
      case 'A Contactar':
        return 'la unidad se encuentra rumbo al origen de la asistencia con nuestro usuario';
      case 'En Proceso':
        return 'la unidad se encuentra rumbo al destino de nuestro usuario';
      case 'Concluido':
        return 'ha sido concluido exitosamente';
      case 'Cancelado':
        return 'ha sido cancelado';
      case 'Servicio Muerto':
        return 'se encuentra en estado de servicio muerto';
      default:
        return `se encuentra actualmente en estado ${estatus}`;
    }
  }
  buildWelcomeMenu() {
    const sayElement = XMLBuilder.addSay(
      "Hola! Seguimiento a expediente presione 1, Cotizar un servicio presione 2.",
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
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
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
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
      "Proporciona el número de expediente y despues la tecla GATO",
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
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
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    
    const redirect = XMLBuilder.addRedirect('/solicitar-expediente', 'GET');
    
    return XMLBuilder.buildResponse([
      gatherElement,
      timeoutSay,
      redirect
    ]);
  }

  // NUEVO: Función para determinar qué menús mostrar según el estatus
  determineMenuOptions(datos) {
    const estatus = datos.datosGenerales?.estatus;
    const options = {
      showTimes: false,
      showLocation: false
    };
    
    switch(estatus) {
      case 'A Contactar':
        options.showLocation = true;
        options.showTimes = false;
        break;
        
      case 'Cancelado':
        // No mostrar ningún menú
        options.showLocation = false;
        options.showTimes = false;
        break;
        
      case 'Concluido':
        options.showLocation = false;
        options.showTimes = true;
        break;
        
      case 'En Proceso':
        options.showLocation = false;
        options.showTimes = true;
        break;
        
      case 'Servicio Muerto':
        options.showLocation = false;
        options.showTimes = true;
        break;
        
      default:
        console.warn(`⚠️ Estatus desconocido: ${estatus}`);
        break;
    }
    
    console.log(`📊 Estatus: ${estatus}, Opciones: ${JSON.stringify(options)}`);
    return options;
  }
  
  async buildExpedienteMenu(datos, callSid, expediente) {
    let menuOptions = [];
    let validDigits = '';
    
    // Determinar qué mostrar según el estatus
    const displayOptions = this.determineMenuOptions(datos);
    
    // Opción 1: Información general del expediente (siempre se muestra)
    if (datos.datosGenerales && Object.keys(datos.datosGenerales).length > 0) {
      menuOptions.push("Presione uno para información general del expediente");
      validDigits += '1';
    }
    
    // Opción 2: Costos (siempre se muestra si hay datos)
    if (datos.costos && Object.keys(datos.costos).length > 0) {
      menuOptions.push("dos para costos");
      validDigits += '2';
    }
    
    // Opción 3: Tiempos (solo según estatus)
    if (displayOptions.showTimes && datos.tiempos && Object.keys(datos.tiempos).length > 0) {
      menuOptions.push("tres para tiempos");
      validDigits += '3';
    }
    
    // Opción 4: Ubicación y tiempo de llegada (solo según estatus)
    if (displayOptions.showLocation && datos.ubicacion && Object.keys(datos.ubicacion).length > 0) {
      menuOptions.push("cuatro para ubicación y tiempo de llegada");
      validDigits += '4';
    }

    // Opción 5: Datos de la unidad operativa (siempre se muestra si hay datos)
    if (datos.unidad && Object.keys(datos.unidad).length > 0) {
      menuOptions.push("cinco para datos de la unidad");
      validDigits += '5';
    }
    
    menuOptions.push("nueve para consultar otro expediente");
    menuOptions.push("cero para hablar con un asesor");
    validDigits += '90';

    const responseElements = [];
    
    // Check if the intro message has been shown
    const introShown = await SessionService.hasIntroMessageBeenShown(callSid, expediente);

    if (!introShown) {
      // Obtener el estatus del expediente
      const estatus = datos.datosGenerales?.estatus || 'Desconocido';
      
      // Obtener el nombre del cliente y limpiarlo de espacios extra
      const nombre = datos.datosGenerales?.nombre?.trim() || 'Cliente no especificado';
      
      // Formatear el número de expediente para que se lea por pares
      const expedienteFormateado = expediente.match(/.{1,2}/g).join(' ');
      
      const statusMessage = this.getStatusMessage(estatus);
      const introSay = XMLBuilder.addSay(
        `Perfecto, el expediente ${expedienteFormateado} ${statusMessage}`,
        { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
      );
      responseElements.push(introSay);
      await SessionService.markIntroMessageShown(callSid, expediente);
    }
    
    const menuSay = XMLBuilder.addSay(
      menuOptions.join('. '),
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
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

    responseElements.push(gatherElement);
    
    return XMLBuilder.buildResponse(responseElements);
  }
  
  buildGeneralInfoMenu(datos, callSid, expediente) {
    const datosGenerales = datos.datosGenerales;
    let message = `Información general de ${this.formatearExpediente(expediente)}. `;
    
    if (datosGenerales.nombre) {
      message += `El expediente se encuentra a nombre de ${datosGenerales.nombre}. `;
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
    
    // Destino omitido por solicitud del usuario
    
    const sayInfo = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const pause = XMLBuilder.addSay(". ", { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayInfo, pause, redirect]);
  }
  
  buildCostsMenu(datos, callSid, expediente) {
    const costos = datos.costos;
    let message = `el desglose de ${this.formatearExpediente(expediente)}, es. `;
    
    if (costos.costo) {
      message += `El costo total es ${costos.costo} pesos más IVA. `;
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
      message += `Casetas que cubre la asistencia: ${costos.casetaCubierta} pesos. `;
    }
    
    if (costos.casetaCobro > 0) {
      message += `Casetas que tiene que pagar el usuario: ${costos.casetaCobro} pesos. `;
    }
    
    if (costos.maniobras > 0) {
      message += `Maniobras: ${costos.maniobras} pesos. `;
    }
    
    const sayCosts = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const pause = XMLBuilder.addSay(". ", { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayCosts, pause, redirect]);
  }
  
  // MODIFICADO: Manejo mejorado para tiempos que podrían ser null
  buildTimesMenu(datos, callSid, expediente) {
    const tiempos = datos.tiempos;
    let message = `los tiempos de ${this.formatearExpediente(expediente)} son. `;
    
    if (tiempos.tc && tiempos.tc !== null) {
      // Formatear tiempo de contacto
      const tiempoContactoFormateado = formatearFechaParaIVR(tiempos.tc);
      message += `Contacto el ${tiempoContactoFormateado}. `;
    }
    
    if (tiempos.tt && tiempos.tt !== null) {
      // Formatear tiempo de término
      const tiempoTerminoFormateado = formatearFechaParaIVR(tiempos.tt);
      message += `Término el ${tiempoTerminoFormateado}. `;
    }
    
    if ((!tiempos.tc || tiempos.tc === null) && (!tiempos.tt || tiempos.tt === null)) {
      message += `No hay información de tiempos disponible en este momento. `;
    }
    
    const sayTimes = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const pause = XMLBuilder.addSay(". ", { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayTimes, pause, redirect]);
  }
  
  // MODIFICADO: Manejo mejorado para ubicación que podría ser null
  buildLocationMenu(datos, callSid, expediente) {
    const ubicacion = datos.ubicacion;
    let message = `los datos de ${this.formatearExpediente(expediente)} son. `;
    
    if (ubicacion.tiempoRestante && ubicacion.tiempoRestante !== null) {
      message += `Tiempo estimado de llegada: ${ubicacion.tiempoRestante}. `;
    }
    
    if (ubicacion.ubicacionGrua && ubicacion.ubicacionGrua !== null) {
      message += `La unidad está en camino. `;
    }
    
    if ((!ubicacion.tiempoRestante || ubicacion.tiempoRestante === null) && 
        (!ubicacion.ubicacionGrua || ubicacion.ubicacionGrua === null)) {
      message += `No hay información de ubicación disponible en este momento. `;
    }
    
    const sayLocation = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const pause = XMLBuilder.addSay(". ", { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayLocation, pause, redirect]);
  }

  buildUnidadOperativaMenu(datos, callSid, expediente) {
      const unidad = datos.unidad;
      let message = `Datos de la unidad operativa del expediente ${this.formatearExpediente(expediente)}. `;

      if (unidad) {
        if (unidad.operador) {
          message += `Operador: ${unidad.operador}. `;
        }
        if (unidad.tipoGrua) {
          message += `Tipo de Grúa: ${unidad.tipoGrua}. `;
        }
        if (unidad.color) {
          // Convertir el código hexadecimal a nombre de color legible
          const colorNombre = hexToColorName(unidad.color);
          message += `Color: ${colorNombre}. `;
        }
        if (unidad.unidadOperativa) {
          // Extraer solo el número al inicio de la cadena
          const numeroEconomico = unidad.unidadOperativa.match(/^\d+/) ? unidad.unidadOperativa.match(/^\d+/)[0] : unidad.unidadOperativa;
          message += `Número Económico: ${numeroEconomico},  `;
        }
        // Placas omitidas por solicitud del usuario
        if (Object.keys(unidad).length === 0 || 
            (!unidad.operador && !unidad.tipoGrua && !unidad.color && !unidad.unidadOperativa)) {
          message = `No hay información de la unidad operativa disponible para el expediente ${expediente}. `;
        }
      } else {
        message = `No hay información de la unidad operativa disponible para el expediente ${expediente}. `;
      }
      
      const sayUnidad = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
      const pause = XMLBuilder.addSay(". ", { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
      const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
      
      return XMLBuilder.buildResponse([sayUnidad, pause, redirect]);
  }
}

module.exports = new MenuService();