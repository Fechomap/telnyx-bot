// src/controllers/ivrController.js - VERSION REFACTORIZADA
const menuService = require('../services/ivr/menuService');
const expedienteService = require('../services/ivr/expedienteService');
const sessionService = require('../services/ivr/sessionService');
const responseService = require('../services/ivr/responseService');
const monitoring = require('../utils/monitoring');

class IVRController {
  async handleWelcome(req, res) {
    try {
      monitoring.trackSessionEvent('created', 'main-menu');
      const responseXML = menuService.buildWelcomeMenu();
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
      
      const responseXML = await responseService.processMenuSelection(digit);
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'menu-selection');
    }
  }
  
  // ESTE MÉTODO FALTABA EN LA VERSIÓN REFACTORIZADA
  async requestExpediente(req, res) {
    try {
      console.log('📞 Solicitando número de expediente');
      const responseXML = menuService.buildExpedienteRequestMenu();
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
      
      console.log(`📦 Validando expediente: ${expediente}`);
      
      const result = await expedienteService.validateAndSearch(expediente);
      
      if (result.valid && result.datos) {
        const sessionId = await sessionService.createSession(expediente, result.datos);
        const responseXML = responseService.buildRedirect(
          `/menu-expediente?sessionId=${sessionId}&expediente=${expediente}`,
          'GET'
        );
        res.header('Content-Type', 'application/xml');
        res.send(responseXML);
      } else {
        const responseXML = responseService.buildErrorResponse(result.error, expediente);
        res.header('Content-Type', 'application/xml');
        res.send(responseXML);
      }
    } catch (error) {
      this.handleError(res, error, 'validate-expediente');
    }
  }
  
  async showExpedienteMenu(req, res) {
    try {
      const { sessionId, expediente } = req.query;
      
      console.log(`🎯 showExpedienteMenu - SessionId: ${sessionId}, Expediente: ${expediente}`);
      
      if (!sessionId || !expediente) {
        console.log(`⚠️ Parámetros faltantes`);
        return this.handleWelcome(req, res);
      }
      
      const sessionData = await sessionService.getSession(sessionId);
      
      if (!sessionData || !sessionData.datos) {
        const responseXML = responseService.buildSessionExpiredResponse();
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
      const responseXML = menuService.buildExpedienteMenu(
        sessionData.datos, 
        sessionId, 
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
      const sessionId = req.query.sessionId;
      const expediente = req.query.expediente;
      const option = req.body.Digits || req.query.Digits;
      
      console.log(`⚡ Procesando opción: ${option} para expediente: ${expediente}`);
      
      if (!sessionId) {
        return this.handleWelcome(req, res);
      }
      
      const sessionData = await sessionService.getSession(sessionId);
      
      if (!sessionData || !sessionData.datos) {
        return this.handleWelcome(req, res);
      }
      
      let responseXML;
      
      switch(option) {
        case '1':
          responseXML = menuService.buildCostsMenu(sessionData.datos, sessionId, expediente);
          break;
        case '2':
          responseXML = menuService.buildUnitMenu(sessionData.datos, sessionId, expediente);
          break;
        case '3':
          responseXML = menuService.buildLocationMenu(sessionData.datos, sessionId, expediente);
          break;
        case '4':
          responseXML = menuService.buildTimesMenu(sessionData.datos, sessionId, expediente);
          break;
        case '9':
          await sessionService.deleteSession(sessionId);
          responseXML = responseService.buildNewQueryResponse();
          break;
        case '0':
          responseXML = responseService.buildTransferResponse();
          break;
        default:
          responseXML = menuService.buildExpedienteMenu(
            sessionData.datos, 
            sessionId, 
            expediente
          );
      }
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
    } catch (error) {
      this.handleError(res, error, 'process-option');
    }
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