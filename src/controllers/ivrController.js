// src/controllers/ivrController.js - VERSION CORREGIDA Y ACTUALIZADA
const XMLBuilder = require('../texml/helpers/xmlBuilder');
const redisService = require('../services/redisService');
const menuService = require('../services/ivr/menuService');
const menuServiceOptimized = require('../services/ivr/menuServiceOptimized');
const expedienteService = require('../services/ivr/expedienteService');
const sessionService = require('../services/ivr/sessionService');
const responseService = require('../services/ivr/responseService');
const monitoring = require('../utils/monitoring');
const option2Controller = require('./option2Controller');

class IVRController {
  // Función helper para seleccionar el servicio de menú correcto
  getMenuService() {
    const isOptimized = process.env.IVR_OPTIMIZED_MODE === 'true';
    return isOptimized ? menuServiceOptimized : menuService;
  }

  async handleWelcome(req, res) {
    try {
      monitoring.trackSessionEvent('created', 'main-menu');
      const selectedMenuService = this.getMenuService();
      const responseXML = selectedMenuService.buildWelcomeMenu();
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'welcome');
    }
  }
  
  async handleMenuSelection(req, res) {
    try {
      const digit = req.query.Digits || req.body.Digits;
      console.log(`🔢 Dígito recibido: ${digit}`);
      
      // MODIFICADO: Manejar caso para opción 2
      if (digit === '2') {
        console.log('🚘 Redirigiendo a iniciar-cotizacion');
        return option2Controller.initializeQuotation(req, res);
      }
      
      const responseXML = await responseService.processMenuSelection(digit);
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'menu-selection');
    }
  }
  
  async requestExpediente(req, res) {
    try {
      console.log('📞 Solicitando número de expediente');
      const selectedMenuService = this.getMenuService();
      const responseXML = selectedMenuService.buildExpedienteRequestMenu();
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'request-expediente');
    }
  }
  
  async validateExpediente(req, res) {
    try {
      const digits = req.query.Digits || req.body.Digits || '';
      const expediente = digits.replace('#', '').trim();
      const callSid = req.query.CallSid || req.body.CallSid;
      
      console.log(`📦 Validando expediente: ${expediente}`);
      console.log(`📞 CallSid: ${callSid}`);
      
      const result = await expedienteService.validateAndSearch(expediente);
      
      if (result.valid && result.datos) {
        console.log(`✅ Expediente válido, guardando en Redis...`);
        
        // Guardar usando CallSid como clave
        await redisService.set(`call_${callSid}`, {
          expediente,
          datos: result.datos,
          createdAt: Date.now()
        });
        
        console.log(`✅ Datos guardados, llamando a buildExpedienteMenu...`);
        
        // Llamar al servicio de menú seleccionado para construir el menú
        // Esto asegura que la lógica de "mostrar una vez" se aplique desde el inicio.
        const selectedMenuService = this.getMenuService();
        const responseXML = await selectedMenuService.buildExpedienteMenu(
          result.datos,
          callSid,
          expediente
        );
        
        console.log(`📄 XML generado por el servicio de menú seleccionado`);
        // console.log(responseXML); // Puede ser muy verboso
        res.header('Content-Type', 'application/xml');
        res.send(responseXML);
        console.log(`✅ Respuesta enviada`);
        
      } else {
        console.log(`❌ Expediente inválido o no encontrado`);
        const responseXML = responseService.buildErrorResponse(result.error, expediente);
        res.header('Content-Type', 'application/xml');
        res.send(responseXML);
      }
    } catch (error) {
      console.error(`❌ Error crítico en validateExpediente:`, error);
      this.handleError(res, error, 'validate-expediente');
    }
  }
  
  async showExpedienteMenu(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid;
      
      console.log(`🎯 showExpedienteMenu - CallSid: ${callSid}`);
      
      if (!callSid) {
        console.log(`⚠️ CallSid faltante`);
        return this.handleWelcome(req, res);
      }
      
      const sessionData = await redisService.get(`call_${callSid}`);
      
      if (!sessionData || !sessionData.datos) {
        const responseXML = responseService.buildSessionExpiredResponse();
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
      const { expediente, datos } = sessionData;
      
      const selectedMenuService = this.getMenuService();
      const responseXML = await selectedMenuService.buildExpedienteMenu( // Added await
        datos, 
        callSid, 
        expediente
      );
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'expediente-menu');
    }
  }
  
  async processOption(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid;
      const option = req.body.Digits || req.query.Digits;
      
      console.log(`⚡ Procesando opción: ${option}`);
      console.log(`📞 CallSid: ${callSid}`);
      
      if (!callSid) {
        console.log(`⚠️ CallSid faltante en processOption`);
        return this.handleWelcome(req, res);
      }
      
      const sessionData = await redisService.get(`call_${callSid}`);
      
      if (!sessionData || !sessionData.datos) {
        console.log(`⚠️ Sesión no encontrada`);
        return this.handleWelcome(req, res);
      }
      
      const { expediente, datos } = sessionData;
      const selectedMenuService = this.getMenuService();
      
      let responseXML;
      
      // CAMBIO PRINCIPAL: Nueva organización de opciones
      switch(option) {
        case '1':
          // Opción 1: Información general del expediente (NUEVO)
          responseXML = selectedMenuService.buildGeneralInfoMenu(datos, callSid, expediente);
          break;
        case '2':
          // Opción 2: Costos (se mantiene)
          responseXML = selectedMenuService.buildCostsMenu(datos, callSid, expediente);
          break;
        case '3':
          // Opción 3: Tiempos del servicio (antes era opción 4)
          responseXML = selectedMenuService.buildTimesMenu(datos, callSid, expediente);
          break;
        case '4':
          // Opción 4: Ubicación (antes era opción 3)
          responseXML = selectedMenuService.buildLocationMenu(datos, callSid, expediente);
          break;
        case '5': // NUEVO: Datos de la unidad operativa
          responseXML = selectedMenuService.buildUnidadOperativaMenu(datos, callSid, expediente);
          break;
        case '9':
          // Nueva consulta
          await redisService.delete(`call_${callSid}`);
          responseXML = responseService.buildNewQueryResponse();
          break;
        case '0':
          // Transferir a asesor
          responseXML = responseService.buildTransferResponse();
          break;
        default:
          // Opción inválida - volver al menú
          responseXML = await selectedMenuService.buildExpedienteMenu( // Added await
            datos, 
            callSid, 
            expediente
          );
      }
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'process-option');
    }
  }
  
  // Método auxiliar para generar opciones del menú - ACTUALIZADO
  // Reemplazar SOLO el método generateMenuOptions en ivrController.js
  generateMenuOptions(datos) {
    const selectedMenuService = this.getMenuService();
    let menuOptions = [];
    let validDigits = '';
    
    // Usar la lógica del servicio de menú seleccionado para determinar qué mostrar
    const displayOptions = selectedMenuService.determineMenuOptions(datos);
    
    // Opción 1: Información general del expediente
    if (datos.datosGenerales && Object.keys(datos.datosGenerales).length > 0) {
      menuOptions.push("Presione uno para información general del expediente");
      validDigits += '1';
    }
    
    // Opción 2: Costos
    if (datos.costos && Object.keys(datos.costos).length > 0) {
      menuOptions.push("dos para consultar costos");
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

    // Opción 5: Datos de la unidad operativa
    if (datos.unidad && Object.keys(datos.unidad).length > 0) {
      menuOptions.push("cinco para datos de la unidad");
      validDigits += '5';
    }
    
    menuOptions.push("nueve para consultar otro expediente");
    menuOptions.push("cero para hablar con un asesor");
    validDigits += '90';
    
    return {
      text: menuOptions.join('. '),
      validDigits
    };
  }
  
  handleError(res, error, context) {
    console.error(`❌ Error en ${context}:`, error);
    monitoring.trackError(`ivr_${context}_error`, context, { 
      error: error.message,
      stack: error.stack
    });
    
    const responseXML = responseService.buildSystemErrorResponse();
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
}

module.exports = new IVRController();
