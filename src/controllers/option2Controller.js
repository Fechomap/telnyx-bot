// src/controllers/option2Controller.js
const XMLBuilder = require('../texml/helpers/xmlBuilder');
const openaiAssistantService = require('../services/ai/openaiAssistantService');
const quotationProcessingService = require('../services/ivr/quotationProcessingService');
const transferService = require('../services/ivr/transferService');
const redisService = require('../services/redisService');
const monitoring = require('../utils/monitoring');

class Option2Controller {
  /**
   * Punto de entrada principal para la opción 2
   */
  async initializeQuotation(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid;
      const callerNumber = req.query.From || req.body.From;
      
      console.log(`🚗 Opción 2 - CallSid: ${callSid}, From: ${callerNumber}`);
      
      // Verificar si el modo de transferencia temporal está activado
      const transferMode = process.env.OPTION2_TRANSFER_MODE === 'true';
      
      if (transferMode) {
        console.log('📞 Modo de transferencia temporal activado');
        return this.handleTransferMode(req, res);
      }
      
      // Modo de cotización normal
      console.log('💼 Modo de cotización normal activado');
      return this.startQuotationFlow(req, res);
      
    } catch (error) {
      console.error(`❌ Error en initializeQuotation:`, error);
      this.handleError(res, error, 'quotation-init');
    }
  }
  
  /**
   * Maneja el modo de transferencia temporal
   */
  async handleTransferMode(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid;
      const callerNumber = req.query.From || req.body.From;
      
      // Obtener información de transferencia
      const transferInfo = await transferService.handleConditionalTransfer(callerNumber, callSid);
      
      // Construir y enviar respuesta
      const responseXML = transferService.buildTransferResponse(
        transferInfo.targetNumber, 
        callerNumber
      );
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
      
    } catch (error) {
      console.error(`❌ Error en handleTransferMode:`, error);
      this.handleError(res, error, 'transfer-mode-handler');
    }
  }
  
  /**
   * Inicia el flujo de cotización normal
   */
  async startQuotationFlow(req, res) {
    const callSid = req.query.CallSid || req.body.CallSid;
    
    // Inicializar sesión con OpenAI
    const threadId = await openaiAssistantService.createThread();
    
    // Guardar en Redis
    await redisService.set(`quotation_${callSid}`, {
      threadId: threadId,
      stage: 'origen',
      createdAt: Date.now()
    }, 1800); // 30 minutos TTL
    
    // Construir respuesta inicial
    const responseXML = this.buildRecordingResponse(
      "Indique las coordenadas de origen.",
      "/procesar-grabacion"
    );
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
  
  /**
   * Procesa la grabación recibida
   */
  async procesarGrabacion(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid;
      const recordingUrl = req.body.RecordingUrl || req.query.RecordingUrl;
      const recordingSid = req.body.RecordingSid || req.query.RecordingSid;
      
      console.log(`🎙️ Grabación recibida: ${recordingSid}`);
      
      // Recuperar sesión
      const sessionData = await redisService.get(`quotation_${callSid}`);
      
      if (!sessionData || !sessionData.threadId) {
        console.log(`⚠️ Sesión no encontrada para CallSid: ${callSid}`);
        return this.handleSessionExpired(res);
      }
      
      // Actualizar estado de procesamiento
      await redisService.set(`quotation_${callSid}`, {
        ...sessionData,
        processingRecording: true,
        processingComplete: false,
        recordingUrl,
        recordingSid
      });
      
      // Iniciar procesamiento asíncrono
      quotationProcessingService.processAudioAsync(callSid, recordingUrl, sessionData);
      
      // Enviar respuesta de espera
      const responseXML = this.buildWaitingResponse(callSid);
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
      
    } catch (error) {
      console.error(`❌ Error en procesarGrabacion:`, error);
      this.handleError(res, error, 'quotation-process-recording');
    }
  }
  
  /**
   * Espera y verifica el procesamiento
   */
  async esperarProcesamiento(req, res) {
    try {
      const callSid = req.query.callSid || req.body.callSid || req.query.CallSid || req.body.CallSid;
      console.log(`⏳ Esperando procesamiento para CallSid: ${callSid}`);
      
      // Recuperar sesión
      const sessionData = await redisService.get(`quotation_${callSid}`);
      
      if (!sessionData) {
        console.log(`⚠️ Sesión no encontrada`);
        return this.handleSessionExpired(res);
      }
      
      // Si aún está procesando
      if (sessionData.processingRecording && !sessionData.processingComplete) {
        const responseXML = this.buildContinueWaitingResponse(callSid);
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
      // Procesamiento terminado
      return this.handleProcessingComplete(req, res, sessionData);
      
    } catch (error) {
      console.error(`❌ Error en esperarProcesamiento:`, error);
      this.handleError(res, error, 'quotation-wait-processing');
    }
  }
  
  /**
   * Maneja el procesamiento completado
   */
  async handleProcessingComplete(req, res, sessionData) {
    const callSid = req.query.callSid || req.body.callSid || req.query.CallSid || req.body.CallSid;
    
    // Si no hay datos válidos, repetir grabación
    if (!sessionData.jsonData && sessionData.stage !== 'completed') {
      const responseXML = this.buildRecordingResponse(
        sessionData.nextPrompt || "No pude entender. Intente nuevamente.",
        "/procesar-grabacion"
      );
      
      res.header('Content-Type', 'application/xml');
      return res.send(responseXML);
    }
    
    // Si todos los datos están completos
    if (sessionData.stage === 'completed') {
      return this.finalizeQuotation(req, res);
    }
    
    // Continuar con la siguiente etapa
    const responseXML = this.buildRecordingResponse(
      sessionData.nextPrompt,
      "/procesar-grabacion"
    );
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
  
  /**
   * Finaliza la cotización
   */
  async finalizeQuotation(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid || req.query.callSid || req.body.callSid;
      console.log(`🏁 Finalizando cotización para CallSid: ${callSid}`);
      
      // Recuperar sesión
      const sessionData = await redisService.get(`quotation_${callSid}`);
      
      if (!sessionData || !sessionData.jsonData) {
        console.log(`⚠️ Datos de cotización no encontrados`);
        return this.handleSessionExpired(res);
      }
      
      // Generar cotización
      const quotationResult = await quotationProcessingService.finalizeQuotation(sessionData);
      
      // Construir respuesta
      const elements = [
        XMLBuilder.addSay(
          `Costo: ${quotationResult.cost} pesos. Distancia: ${quotationResult.distance} kilómetros.`,
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        ),
        XMLBuilder.addRedirect('/welcome', 'GET')
      ];
      
      const responseXML = XMLBuilder.buildResponse(elements);
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
      
    } catch (error) {
      console.error(`❌ Error en finalizeQuotation:`, error);
      this.handleError(res, error, 'quotation-finalize');
    }
  }
  
  /**
   * Callback de status de grabación
   */
  async statusGrabacion(req, res) {
    try {
      const recordingSid = req.body.RecordingSid || req.query.RecordingSid;
      const recordingStatus = req.body.RecordingStatus || req.query.RecordingStatus;
      
      console.log(`📊 Status de grabación: ${recordingSid} - ${recordingStatus}`);
      res.status(200).send('OK');
      
    } catch (error) {
      console.error(`❌ Error en statusGrabacion:`, error);
      res.status(200).send('Error processed');
    }
  }
  
  // Métodos auxiliares para construir respuestas XML
  
  buildRecordingResponse(prompt, action) {
    const elements = [
      XMLBuilder.addSay(prompt, { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }),
      XMLBuilder.addRecord({
        action: action,
        method: "POST",
        maxLength: "15",
        timeout: "5",
        playBeep: "true",
        finishOnKey: '',
        recordingStatusCallback: "/recording-status"
      }),
      XMLBuilder.addSay(
        "No se detectó grabación. Volviendo al menú principal.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      ),
      XMLBuilder.addRedirect('/welcome', 'GET')
    ];
    
    return XMLBuilder.buildResponse(elements);
  }
  
  buildWaitingResponse(callSid) {
    const elements = [
      XMLBuilder.addSay(
        "Procesando su información, por favor espere un momento.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      )
    ];
    
    // Agregar pausas
    for (let i = 0; i < 4; i++) {
      elements.push(XMLBuilder.addSay("...", { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }));
    }
    
    elements.push(XMLBuilder.addRedirect(`/esperar-procesamiento?callSid=${callSid}`, 'GET'));
    
    return XMLBuilder.buildResponse(elements);
  }
  
  buildContinueWaitingResponse(callSid) {
    const elements = [
      XMLBuilder.addSay(
        "Continuamos procesando, un momento por favor.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      ),
      XMLBuilder.addRedirect(`/esperar-procesamiento?callSid=${callSid}`, 'GET')
    ];
    
    return XMLBuilder.buildResponse(elements);
  }
  
  // Manejo de errores y sesiones expiradas
  
  handleSessionExpired(res) {
    const elements = [
      XMLBuilder.addSay(
        "La sesión ha expirado. Volviendo al menú principal.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      ),
      XMLBuilder.addRedirect('/welcome', 'GET')
    ];
    
    const responseXML = XMLBuilder.buildResponse(elements);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
  
  handleError(res, error, context) {
    console.error(`❌ Error en ${context}:`, error);
    monitoring.trackError(`option2_${context}_error`, context, { 
      error: error.message,
      stack: error.stack
    });
    
    const elements = [
      XMLBuilder.addSay(
        "Error en el sistema. Volviendo al menú principal.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      ),
      XMLBuilder.addRedirect('/welcome', 'GET')
    ];
    
    const responseXML = XMLBuilder.buildResponse(elements);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
  
  // Método legacy para compatibilidad
  async processAudio(req, res) {
    console.log(`⚠️ Método processAudio legacy llamado`);
    return this.handleError(res, new Error('Método no soportado'), 'audio-process-legacy');
  }
}

module.exports = new Option2Controller();