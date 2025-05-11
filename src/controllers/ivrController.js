// src/controllers/ivrController.js
const XMLBuilder = require('../texml/helpers/xmlBuilder');
const redisService = require('../services/redisService');
const { consultaUnificada } = require('../services/optimizedDataService');
const monitoring = require('../utils/monitoring');
const config = require('../config/texml');

class IVRController {
  // 1. Menú Principal
  async handleWelcome(req, res) {
    try {
      monitoring.trackSessionEvent('created', 'main-menu');
      
      const sayElement = XMLBuilder.addSay(
        "Bienvenido. Para seguimiento de expediente, presione 1. Para cotizar un servicio, presione 2.",
        { voice: 'Polly.Mia-Neural' }
      );
      
      const gatherElement = XMLBuilder.addGather({
        action: '/menu-selection',
        method: 'POST',
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
      
      const redirect = XMLBuilder.addRedirect('/welcome');
      
      const responseXML = XMLBuilder.buildResponse([
        gatherElement,
        timeoutSay,
        redirect
      ]);
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'welcome');
    }
  }

  // 2. Procesar Selección del Menú
  async handleMenuSelection(req, res) {
    try {
      const digit = req.body.Digits || req.query.Digits;
      
      switch(digit) {
        case '1':
          res.redirect('/solicitar-expediente');
          break;
        case '2':
          // Opción para futuro desarrollo
          const unavailableSay = XMLBuilder.addSay(
            "Esta opción estará disponible próximamente.",
            { voice: 'Polly.Mia-Neural' }
          );
          const redirect = XMLBuilder.addRedirect('/welcome');
          
          const responseXML = XMLBuilder.buildResponse([
            unavailableSay,
            redirect
          ]);
          
          res.header('Content-Type', 'application/xml');
          res.send(responseXML);
          break;
        default:
          res.redirect('/welcome');
      }
    } catch (error) {
      this.handleError(res, error, 'menu-selection');
    }
  }

  // 3. Solicitar Número de Expediente
  async requestExpediente(req, res) {
    try {
      const sayElement = XMLBuilder.addSay(
        "Por favor, proporcione el número de expediente a revisar, seguido de la tecla numeral.",
        { voice: 'Polly.Mia-Neural' }
      );
      
      const gatherElement = XMLBuilder.addGather({
        action: '/validar-expediente',
        method: 'POST',
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
      
      const redirect = XMLBuilder.addRedirect('/solicitar-expediente');
      
      const responseXML = XMLBuilder.buildResponse([
        gatherElement,
        timeoutSay,
        redirect
      ]);
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'request-expediente');
    }
  }

  // 4. Validar y Buscar Expediente
  async validateExpediente(req, res) {
    try {
      const digits = req.body.Digits || req.query.Digits || '';
      const expediente = digits.replace('#', '').trim();
      
      if (!expediente || expediente.length < 3) {
        const invalidSay = XMLBuilder.addSay(
          "El número de expediente no es válido. Debe tener al menos 3 dígitos.",
          { voice: 'Polly.Mia-Neural' }
        );
        const redirect = XMLBuilder.addRedirect('/solicitar-expediente');
        
        const responseXML = XMLBuilder.buildResponse([invalidSay, redirect]);
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
      monitoring.trackExpediente('query', expediente);
      
      // Buscar expediente
      const startTime = monitoring.startDataQuery();
      const datosExpediente = await consultaUnificada(expediente);
      const queryTime = startTime(!!datosExpediente);
      
      if (datosExpediente) {
        monitoring.trackExpediente('found', expediente);
        
        // Crear sesión única
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Guardar en Redis
        await redisService.set(sessionId, {
          expediente,
          datos: datosExpediente,
          createdAt: Date.now()
        });
        
        // Redirigir al menú del expediente
        res.redirect(`/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`);
      } else {
        monitoring.trackExpediente('notFound', expediente);
        
        const notFoundSay = XMLBuilder.addSay(
          `El número de expediente ${expediente} no fue localizado. Por favor, verifíquelo e intente nuevamente.`,
          { voice: 'Polly.Mia-Neural' }
        );
        const redirect = XMLBuilder.addRedirect('/solicitar-expediente');
        
        const responseXML = XMLBuilder.buildResponse([notFoundSay, redirect]);
        res.header('Content-Type', 'application/xml');
        res.send(responseXML);
      }
    } catch (error) {
      this.handleError(res, error, 'validate-expediente');
    }
  }

  // 5. Mostrar Menú del Expediente
  async showExpedienteMenu(req, res) {
    try {
      const sessionId = req.query.sessionId;
      const expediente = req.query.expediente;
      
      if (!sessionId) {
        return res.redirect('/welcome');
      }
      
      // Obtener datos de Redis
      const sessionData = await redisService.get(sessionId);
      
      if (!sessionData || !sessionData.datos) {
        const expiredSay = XMLBuilder.addSay(
          "La sesión ha expirado. Por favor, inicie una nueva consulta.",
          { voice: 'Polly.Mia-Neural' }
        );
        const redirect = XMLBuilder.addRedirect('/welcome');
        
        const responseXML = XMLBuilder.buildResponse([expiredSay, redirect]);
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
      const datos = sessionData.datos;
      
      // Construir menú dinámico
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
        method: 'POST',
        input: 'dtmf',
        numDigits: '1',
        timeout: '10',
        validDigits: validDigits,
        nested: menuSay
      });
      
      const redirect = XMLBuilder.addRedirect(`/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`);
      
      const responseXML = XMLBuilder.buildResponse([
        introSay,
        gatherElement,
        redirect
      ]);
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'expediente-menu');
    }
  }

  // 6. Procesar Opción Seleccionada
  async processOption(req, res) {
    try {
      const sessionId = req.query.sessionId;
      const expediente = req.query.expediente;
      const option = req.body.Digits || req.query.Digits;
      
      if (!sessionId) {
        return res.redirect('/welcome');
      }
      
      // Obtener datos de Redis
      const sessionData = await redisService.get(sessionId);
      
      if (!sessionData || !sessionData.datos) {
        return res.redirect('/welcome');
      }
      
      switch(option) {
        case '1':
          await this.showCosts(res, sessionData.datos, sessionId, expediente);
          break;
        case '2':
          await this.showUnitInfo(res, sessionData.datos, sessionId, expediente);
          break;
        case '3':
          await this.showLocation(res, sessionData.datos, sessionId, expediente);
          break;
        case '4':
          await this.showTimes(res, sessionData.datos, sessionId, expediente);
          break;
        case '9':
          await this.newQuery(res, sessionId);
          break;
        case '0':
          await this.transferToAgent(res, sessionId);
          break;
        default:
          res.redirect(`/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`);
      }
    } catch (error) {
      this.handleError(res, error, 'process-option');
    }
  }

  // Métodos auxiliares para cada opción
  async showCosts(res, datos, sessionId, expediente) {
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
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10'
    });
    
    const redirect = XMLBuilder.addRedirect(`/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`);
    
    const responseXML = XMLBuilder.buildResponse([sayCosts, gatherElement, redirect]);
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }

  async showUnitInfo(res, datos, sessionId, expediente) {
    const unidad = datos.unidad;
    let message = `Información de la unidad del expediente ${expediente}. `;
    
    if (unidad.operador) {
      message += `Operador: ${unidad.operador}. `;
    }
    
    if (unidad.tipoGrua) {
      message += `Tipo de grúa: ${unidad.tipoGrua}. `;
    }
    
    if (unidad.placas || unidad.placa) {
      message += `Placas: ${unidad.placas || unidad.placa}. `;
    }
    
    if (unidad.color) {
      message += `Color: ${unidad.color}. `;
    }
    
    message += "Presione cualquier tecla para volver al menú.";
    
    const sayUnit = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    const gatherElement = XMLBuilder.addGather({
      action: `/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`,
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10'
    });
    
    const redirect = XMLBuilder.addRedirect(`/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`);
    
    const responseXML = XMLBuilder.buildResponse([sayUnit, gatherElement, redirect]);
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }

  async showLocation(res, datos, sessionId, expediente) {
    const ubicacion = datos.ubicacion;
    let message = `Información de ubicación del expediente ${expediente}. `;
    
    if (ubicacion.tiempoRestante) {
      message += `Tiempo estimado de llegada: ${ubicacion.tiempoRestante}. `;
    }
    
    message += "Presione cualquier tecla para volver al menú.";
    
    const sayLocation = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    
    const gatherElement = XMLBuilder.addGather({
      action: `/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`,
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10'
    });
    
    const redirect = XMLBuilder.addRedirect(`/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`);
    
    const responseXML = XMLBuilder.buildResponse([sayLocation, gatherElement, redirect]);
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }

  async showTimes(res, datos, sessionId, expediente) {
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
      action: `/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`,
      method: 'POST',
      input: 'dtmf',
      numDigits: '1',
      timeout: '10'
    });
    
    const redirect = XMLBuilder.addRedirect(`/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`);
    
    const responseXML = XMLBuilder.buildResponse([sayTimes, gatherElement, redirect]);
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }

  async newQuery(res, sessionId) {
    // Limpiar datos de la sesión anterior
    await redisService.delete(sessionId);
    
    const newQuerySay = XMLBuilder.addSay(
      "Iniciando nueva consulta.",
      { voice: 'Polly.Mia-Neural' }
    );
    
    const redirect = XMLBuilder.addRedirect('/solicitar-expediente');
    
    const responseXML = XMLBuilder.buildResponse([newQuerySay, redirect]);
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }

  async transferToAgent(res, sessionId) {
    if (!config.transfer.enabled || !config.transfer.agentNumber) {
      const unavailableSay = XMLBuilder.addSay(
        "Lo siento, en este momento no es posible transferirle con un asesor.",
        { voice: 'Polly.Mia-Neural' }
      );
      const redirect = XMLBuilder.addRedirect(`/menu-expediente?sessionId=${sessionId}`);
      
      const responseXML = XMLBuilder.buildResponse([unavailableSay, redirect]);
      res.header('Content-Type', 'application/xml');
      return res.send(responseXML);
    }
    
    const transferSay = XMLBuilder.addSay(
      config.transfer.transferMessage,
      { voice: 'Polly.Mia-Neural' }
    );
    
    const dialElement = XMLBuilder.addDial(config.transfer.agentNumber, {
      callerId: config.service.callerId,
      timeout: '30'
    });
    
    const responseXML = XMLBuilder.buildResponse([transferSay, dialElement]);
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }

  handleError(res, error, context) {
    console.error(`Error en ${context}:`, error);
    monitoring.trackError(`ivr_${context}_error`, context, { 
      error: error.message 
    });
    
    const errorSay = XMLBuilder.addSay(
      "Ha ocurrido un error en el sistema. Por favor, intente nuevamente.",
      { voice: 'Polly.Mia-Neural' }
    );
    
    const redirect = XMLBuilder.addRedirect('/welcome');
    
    const responseXML = XMLBuilder.buildResponse([errorSay, redirect]);
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
}

module.exports = new IVRController();