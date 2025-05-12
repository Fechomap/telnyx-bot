// src/controllers/option2Controller.js
const XMLBuilder = require('../texml/helpers/xmlBuilder');
const whisperSTTService = require('../services/speech/whisperSTTService');
const openaiAssistantService = require('../services/ai/openaiAssistantService');
const quotationService = require('../services/ivr/quotationService');
const redisService = require('../services/redisService');
const monitoring = require('../utils/monitoring');

class Option2Controller {
  async initializeQuotation(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid;
      
      console.log(`🚗 Iniciando flujo de cotización para CallSid: ${callSid}`);
      
      // Inicializar sesión con OpenAI
      const threadId = await openaiAssistantService.createThread();
      
      // Guardar en Redis
      await redisService.set(`quotation_${callSid}`, {
        threadId: threadId,
        stage: 'initialized',
        createdAt: Date.now()
      }, 1800); // 30 minutos TTL
      
      // Mensaje inicial solicitando coordenadas de origen
      const say = XMLBuilder.addSay(
        "Bienvenido al servicio de cotización. Por favor, indique las coordenadas de origen en formato latitud coma longitud.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      );
      
      // Configurar captura de voz
      const voiceGather = XMLBuilder.addGather({
        action: "/procesar-audio",
        method: "GET", // MODIFICADO: Cambiar a GET para que coincida con la solicitud de Telnyx
        input: "speech",
        language: "es-MX",
        speechTimeout: "auto",
        timeout: "20",
        nested: say
      });
      
      const timeoutSay = XMLBuilder.addSay(
        "No se detectó ninguna respuesta. Volviendo al menú principal.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      );
      
      const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
      
      // Enviar respuesta
      const responseXML = XMLBuilder.buildResponse([
        voiceGather,
        timeoutSay,
        redirect
      ]);
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
      
    } catch (error) {
      console.error(`❌ Error en initializeQuotation:`, error);
      this.handleError(res, error, 'quotation-init');
    }
  }
  
  async processAudio(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid;
      // MODIFICADO: Obtener SpeechResult tanto de query como de body
      const speechResult = req.query.SpeechResult || req.body.SpeechResult || '';
      
      console.log(`🎤 Procesando audio para CallSid: ${callSid}`);
      console.log(`🔤 Texto reconocido por Telnyx: ${speechResult}`);
      
      // Recuperar sesión
      const sessionData = await redisService.get(`quotation_${callSid}`);
      
      if (!sessionData || !sessionData.threadId) {
        console.log(`⚠️ Sesión no encontrada para CallSid: ${callSid}`);
        return this.handleSessionExpired(res);
      }
      
      // AÑADIDO: Si no hay texto reconocido, solicitar repetición
      if (!speechResult || speechResult.trim() === '') {
        console.log(`⚠️ No se detectó texto en la respuesta`);
        
        const say = XMLBuilder.addSay(
          "No pude entender lo que dijo. Por favor, intente nuevamente pronunciando claramente las coordenadas.",
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        const voiceGather = XMLBuilder.addGather({
          action: "/procesar-audio",
          method: "GET",
          input: "speech",
          language: "es-MX",
          speechTimeout: "auto",
          timeout: "20",
          nested: say
        });
        
        const timeoutSay = XMLBuilder.addSay(
          "No se detectó ninguna respuesta. Volviendo al menú principal.",
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
        
        const responseXML = XMLBuilder.buildResponse([
          voiceGather,
          timeoutSay,
          redirect
        ]);
        
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
      // Enviar texto al asistente de OpenAI
      const threadId = sessionData.threadId;
      const runId = await openaiAssistantService.sendMessage(threadId, speechResult);
      
      // Esperar respuesta del asistente
      const assistantResponse = await openaiAssistantService.getResponse(threadId, runId);
      
      // Extraer JSON si existe
      const jsonData = openaiAssistantService.extractJsonData(assistantResponse);
      
      let nextElements = [];
      
      if (jsonData) {
        // Si hay JSON, significa que se completó la recolección de datos
        console.log(`✅ Datos completos recibidos para cotización`);
        
        // Actualizar la sesión con los datos
        await redisService.set(`quotation_${callSid}`, {
          ...sessionData,
          quotationData: jsonData,
          stage: 'completed'
        });
        
        // Crear mensaje de confirmación
        const confirmationMessage = this.createConfirmationMessage(jsonData);
        const say = XMLBuilder.addSay(
          confirmationMessage,
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        const redirect = XMLBuilder.addRedirect('/finalizar-cotizacion', 'GET');
        
        nextElements = [say, redirect];
      } else {
        // Continuar con el diálogo
        const say = XMLBuilder.addSay(
          assistantResponse,
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        // Configurar captura de voz para siguiente paso
        const voiceGather = XMLBuilder.addGather({
          action: "/procesar-audio",
          method: "GET", // MODIFICADO: Cambiar a GET para que coincida con la solicitud de Telnyx
          input: "speech",
          language: "es-MX",
          speechTimeout: "auto",
          timeout: "20",
          nested: say
        });
        
        const timeoutSay = XMLBuilder.addSay(
          "No se detectó ninguna respuesta. Volviendo al menú principal.",
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
        
        nextElements = [voiceGather, timeoutSay, redirect];
      }
      
      // Enviar respuesta
      const responseXML = XMLBuilder.buildResponse(nextElements);
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
      
    } catch (error) {
      console.error(`❌ Error en processAudio:`, error);
      this.handleError(res, error, 'quotation-process');
    }
  }
  
  async finalizeQuotation(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid;
      
      console.log(`🏁 Finalizando cotización para CallSid: ${callSid}`);
      
      // Recuperar sesión
      const sessionData = await redisService.get(`quotation_${callSid}`);
      
      if (!sessionData || !sessionData.quotationData) {
        console.log(`⚠️ Datos de cotización no encontrados para CallSid: ${callSid}`);
        return this.handleSessionExpired(res);
      }
      
      // Generar cotización
      const quotationData = sessionData.quotationData;
      const quotationResult = await quotationService.generateQuotation(quotationData);
      
      // Limpiar recursos
      await openaiAssistantService.closeThread(sessionData.threadId);
      
      // Construir mensaje de respuesta
      const say = XMLBuilder.addSay(
        `Su cotización ha sido procesada. El costo estimado es de ${quotationResult.cost} pesos. ` +
        `La distancia es de ${quotationResult.distance} kilómetros. ` +
        `¡Gracias por utilizar nuestro servicio! Volviendo al menú principal.`,
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      );
      
      const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
      
      // Enviar respuesta
      const responseXML = XMLBuilder.buildResponse([say, redirect]);
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
      
    } catch (error) {
      console.error(`❌ Error en finalizeQuotation:`, error);
      this.handleError(res, error, 'quotation-finalize');
    }
  }
  
  createConfirmationMessage(jsonData) {
    return `Confirmando los datos recibidos. Origen: ${jsonData.origen}. ` +
           `Destino: ${jsonData.destino}. ` +
           `Vehículo: ${jsonData.vehiculo.marca} ${jsonData.vehiculo.submarca} modelo ${jsonData.vehiculo.modelo}. ` +
           `Generando cotización, por favor espere.`;
  }
  
  handleSessionExpired(res) {
    const say = XMLBuilder.addSay(
      "La sesión ha expirado. Por favor, inicie nuevamente la cotización.",
      { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
    );
    
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    
    const responseXML = XMLBuilder.buildResponse([say, redirect]);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
  
  handleError(res, error, context) {
    console.error(`❌ Error en ${context}:`, error);
    monitoring.trackError(`option2_${context}_error`, context, { 
      error: error.message,
      stack: error.stack
    });
    
    const say = XMLBuilder.addSay(
      "Ha ocurrido un error. Por favor, intente nuevamente más tarde.",
      { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
    );
    
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    
    const responseXML = XMLBuilder.buildResponse([say, redirect]);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
}

module.exports = new Option2Controller();