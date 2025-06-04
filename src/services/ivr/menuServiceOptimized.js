// src/services/ivr/menuServiceOptimized.js - VERSIÓN OPTIMIZADA PARA COLABORADORES
const XMLBuilder = require('../../texml/helpers/xmlBuilder');
const config = require('../../config/texml');
const SessionService = require('./sessionService');
const { hexToColorName } = require('../../utils/colorConverter');
const { formatearFechaParaIVR } = require('../../utils/dateFormatter');

class MenuServiceOptimized {
  // Función para formatear el expediente en grupos de dos dígitos
  formatearExpediente(expediente) {
    return expediente.match(/.{1,2}/g).join(' ');
  }

  // Función para generar mensaje descriptivo según el estatus (versión optimizada)
  getStatusMessage(estatus) {
    switch (estatus) {
      case 'A Contactar':
        return 'la unidad está en camino al punto de origen del servicio';
      case 'En Proceso':
        return 'la unidad está trasladando al usuario hacia su destino';
      case 'Concluido':
        return 'el servicio ha finalizado correctamente';
      case 'Cancelado':
        return 'el servicio ha sido cancelado';
      case 'Servicio Muerto':
        return 'la unidad está en un servicio no ejecutado (servicio muerto)';
      default:
        return `la unidad se encuentra actualmente en estado "${estatus}"`;
    }
  }

  buildWelcomeMenu() {
    const sayElement = XMLBuilder.addSay(
      "Seguimiento expedientes presione 1, Cotizaciones presione 2",
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
      "Opción no válida",
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
      "Digita el Número de expediente y la tecla gato",
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
      "No se detectó número",
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    
    const redirect = XMLBuilder.addRedirect('/solicitar-expediente', 'GET');
    
    return XMLBuilder.buildResponse([
      gatherElement,
      timeoutSay,
      redirect
    ]);
  }

  // Determinar qué menús mostrar según el estatus
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
    
    // Menú claro pero sin exceso de palabras
    if (datos.datosGenerales && Object.keys(datos.datosGenerales).length > 0) {
      menuOptions.push("digita uno para información general");
      validDigits += '1';
    }
    
    if (datos.costos && Object.keys(datos.costos).length > 0) {
      menuOptions.push("dos para costos");
      validDigits += '2';
    }
    
    if (displayOptions.showTimes && datos.tiempos && Object.keys(datos.tiempos).length > 0) {
      menuOptions.push("tres para tiempos");
      validDigits += '3';
    }
    
    if (displayOptions.showLocation && datos.ubicacion && Object.keys(datos.ubicacion).length > 0) {
      menuOptions.push("cuatro para ubicación");
      validDigits += '4';
    }

    if (datos.unidad && Object.keys(datos.unidad).length > 0) {
      menuOptions.push("cinco para datos de unidad");
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
      const nombre = datos.datosGenerales?.nombre?.trim() || 'Sin nombre';
      
      // Formatear el número de expediente para que se lea por pares
      const expedienteFormateado = expediente.match(/.{1,2}/g).join(' ');
      
      // Mensaje directo pero claro
      const statusMessage = this.getStatusMessage(estatus);
      const introSay = XMLBuilder.addSay(
        `Expediente ${expedienteFormateado}, ${statusMessage}`,
        { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
      );
      responseElements.push(introSay);
      await SessionService.markIntroMessageShown(callSid, expediente);
    }
    
    const menuSay = XMLBuilder.addSay(
      menuOptions.join(', '),
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    
    const gatherElement = XMLBuilder.addGather({
      action: `/procesar-opcion`,
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '8',
      validDigits: validDigits,
      nested: menuSay
    });

    responseElements.push(gatherElement);
    
    return XMLBuilder.buildResponse(responseElements);
  }

  // Función para acortar nombres de clientes
  getShortClientName(nombre) {
    if (!nombre || nombre === 'Sin nombre') return 'sin nombre';
    
    // Si el nombre es muy largo, tomar solo nombre y primer apellido
    const palabras = nombre.split(' ');
    if (palabras.length > 2) {
      return `${palabras[0]} ${palabras[1]}`;
    }
    return nombre;
  }

  // Función para acortar estatus
  getShortStatus(estatus) {
    const statusMap = {
      'A Contactar': 'por contactar',
      'En Proceso': 'en proceso',
      'Concluido': 'concluido',
      'Cancelado': 'cancelado',
      'Servicio Muerto': 'muerto'
    };
    
    return statusMap[estatus] || estatus.toLowerCase();
  }
  
  buildGeneralInfoMenu(datos, callSid, expediente) {
    const datosGenerales = datos.datosGenerales;
    
    // Información clara sin repetir "información general de..."
    let message = '';
    
    if (datosGenerales.nombre) {
      message += `El expediente se encuentra a nombre de ${this.getShortClientName(datosGenerales.nombre)}. `;
    }
    
    if (datosGenerales.vehiculo) {
      const vehiculo = this.formatVehicleInfo(datosGenerales.vehiculo);
      message += `Vehículo ${vehiculo}. `;
    }
    
    if (datosGenerales.estatus) {
      message += `Estado ${this.getShortStatus(datosGenerales.estatus)}. `;
    }
    
    if (datosGenerales.servicio) {
      message += `Servicio ${datosGenerales.servicio.toLowerCase()}. `;
    }
    
    // Destino omitido por solicitud del usuario
    
    const sayInfo = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayInfo, redirect]);
  }

  // Simplificar información del vehículo
  formatVehicleInfo(vehiculo) {
    if (!vehiculo) return '';
    
    // Si viene en formato "Fiat 500-2011 Blanco", separar año
    const parts = vehiculo.split('-');
    if (parts.length === 2) {
      const [marca_modelo, resto] = parts;
      const year = resto.split(' ')[0];
      return `${marca_modelo} ${year}`;
    }
    
    return vehiculo;
  }

  // Acortar destino para que sea más legible
  getShortDestination(destino) {
    if (!destino) return '';
    
    // Tomar solo la calle y colonia si es muy largo
    const parts = destino.split(',');
    if (parts.length > 3) {
      return `${parts[0].trim()}, ${parts[1].trim()}`;
    }
    
    return destino;
  }
  
  buildCostsMenu(datos, callSid, expediente) {
    const costos = datos.costos;
    let message = '';
    
    if (costos.costo) {
      message += `Costo total ${costos.costo} pesos más IVA. `;
    }
    
    if (costos.km) {
      message += `Distancia ${costos.km} kilómetros. `;
    }
    
    if (costos.banderazo) {
      message += `Banderazo ${costos.banderazo}. `;
    }
    
    if (costos.costoKm) {
      message += `Costo por kilómetro ${costos.costoKm}. `;
    }
    
    if (costos.casetaCubierta > 0) {
      message += `Casetas que cubre la asistencia ${costos.casetaCubierta} pesos. `;
    }
    
    if (costos.casetaCobro > 0) {
      message += `Casetas que tiene que pagar el usuario ${costos.casetaCobro} pesos. `;
    }
    
    if (costos.maniobras > 0) {
      message += `Maniobras ${costos.maniobras} pesos. `;
    }
    
    const sayCosts = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayCosts, redirect]);
  }
  
  buildTimesMenu(datos, callSid, expediente) {
    const tiempos = datos.tiempos;
    let message = '';
    
    if (tiempos.tc && tiempos.tc !== null) {
      const tiempoContactoFormateado = formatearFechaParaIVR(tiempos.tc);
      message += `Contacto ${tiempoContactoFormateado}. `;
    }
    
    if (tiempos.tt && tiempos.tt !== null) {
      const tiempoTerminoFormateado = formatearFechaParaIVR(tiempos.tt);
      message += `Término ${tiempoTerminoFormateado}. `;
    }
    
    if (!message) {
      message = 'No hay información de tiempos disponible.';
    }
    
    const sayTimes = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayTimes, redirect]);
  }

  // Formatear tiempo más corto
  formatTimeShort(timestamp) {
    try {
      const date = new Date(timestamp);
      const hora = date.getHours();
      const minutos = date.getMinutes().toString().padStart(2, '0');
      return `${hora}:${minutos}`;
    } catch {
      return 'hora no disponible';
    }
  }
  
  buildLocationMenu(datos, callSid, expediente) {
    const ubicacion = datos.ubicacion;
    let message = '';
    
    if (ubicacion.tiempoRestante && ubicacion.tiempoRestante !== null) {
      message += `Tiempo estimado de llegada ${ubicacion.tiempoRestante}. `;
    }
    
    if (ubicacion.ubicacionGrua && ubicacion.ubicacionGrua !== null) {
      message += 'La unidad está en camino. ';
    }
    
    if (!message) {
      message = 'No hay información de ubicación disponible.';
    }
    
    const sayLocation = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayLocation, redirect]);
  }

  buildUnidadOperativaMenu(datos, callSid, expediente) {
    const unidad = datos.unidad;
    let message = '';

    if (unidad) {
      if (unidad.operador) {
        message += `Operador ${unidad.operador}. `;
      }
      if (unidad.tipoGrua) {
        message += `Tipo de grúa ${unidad.tipoGrua}. `;
      }
      if (unidad.color) {
        const colorNombre = hexToColorName(unidad.color);
        message += `Color ${colorNombre}. `;
      }
      if (unidad.unidadOperativa) {
        const numeroEconomico = unidad.unidadOperativa.match(/^\d+/) ? 
          unidad.unidadOperativa.match(/^\d+/)[0] : unidad.unidadOperativa;
        message += `Número económico ${numeroEconomico}. `;
      }
      // Placas omitidas por solicitud del usuario
      
      if (!message) {
        message = 'No hay información de la unidad operativa disponible.';
      }
    } else {
      message = 'No hay información de la unidad operativa disponible.';
    }
    
    const sayUnidad = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect(`/menu-expediente`, 'POST');
    
    return XMLBuilder.buildResponse([sayUnidad, redirect]);
  }
}

module.exports = new MenuServiceOptimized();