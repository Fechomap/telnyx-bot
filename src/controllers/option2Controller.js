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
        stage: 'origen', // Etapa inicial para seguimiento
        createdAt: Date.now()
      }, 1800); // 30 minutos TTL
      
      // Mensaje inicial conciso para pruebas
      const promptOrigen = "Indique las coordenadas de origen.";
      
      const say = XMLBuilder.addSay(promptOrigen, 
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      );
      
      // Configurar grabación
      const record = XMLBuilder.addRecord({
        action: "/procesar-grabacion",
        method: "POST",
        maxLength: "15", // 15 segundos máximo
        timeout: "5",    // 5 segundos de silencio para terminar
        playBeep: "true",
        recordingStatusCallback: "/recording-status"
      });
      
      const timeoutSay = XMLBuilder.addSay(
        "No se detectó grabación. Volviendo al menú principal.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      );
      
      const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
      
      // Enviar respuesta
      const responseXML = XMLBuilder.buildResponse([
        say,
        record,
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
  
  async procesarGrabacion(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid;
      const recordingUrl = req.body.RecordingUrl || req.query.RecordingUrl;
      const recordingSid = req.body.RecordingSid || req.query.RecordingSid;
      
      console.log(`🎙️ Grabación recibida: ${recordingSid}`);
      console.log(`🔗 URL de grabación: ${recordingUrl}`);
      
      // Recuperar sesión
      const sessionData = await redisService.get(`quotation_${callSid}`);
      
      if (!sessionData || !sessionData.threadId) {
        console.log(`⚠️ Sesión no encontrada para CallSid: ${callSid}`);
        return this.handleSessionExpired(res);
      }
      
      // Mensaje mientras procesamos
      const sayProcessing = XMLBuilder.addSay(
        "Procesando información.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      );
      
      // Redirigir a ruta de espera
      const redirect = XMLBuilder.addRedirect(`/esperar-procesamiento?callSid=${callSid}&recordingUrl=${encodeURIComponent(recordingUrl)}`, 'GET');
      
      const responseXML = XMLBuilder.buildResponse([
        sayProcessing,
        redirect
      ]);
      
      // Guardar en Redis que estamos procesando
      await redisService.set(`quotation_${callSid}`, {
        ...sessionData,
        processingRecording: true,
        processingComplete: false,
        recordingUrl,
        recordingSid
      });
      
      res.header('Content-Type', 'application/xml');
      res.send(responseXML);
      
      // Iniciar procesamiento asíncrono
      this.procesarAudioAsincrono(callSid, recordingUrl, sessionData);
      
    } catch (error) {
      console.error(`❌ Error en procesarGrabacion:`, error);
      this.handleError(res, error, 'quotation-process-recording');
    }
  }
  
  async procesarAudioAsincrono(callSid, recordingUrl, sessionData) {
    try {
      console.log(`🔄 Procesando audio asíncronamente: ${recordingUrl}`);
      
      // Transcribir con Whisper
      const transcripcion = await whisperSTTService.transcribeAudioFromUrl(recordingUrl);
      console.log(`📝 Transcripción: "${transcripcion}"`);
      
      if (!transcripcion || transcripcion.trim() === '') {
        console.log(`⚠️ Transcripción vacía`);
        await this.guardarResultadoProcesamiento(callSid, sessionData, null, 'error_transcripcion_vacia');
        return;
      }
      
      // Enviar al asistente
      const threadId = sessionData.threadId;
      const runId = await openaiAssistantService.sendMessage(threadId, transcripcion);
      
      // Esperar respuesta
      const assistantResponse = await openaiAssistantService.getResponse(threadId, runId);
      
      // Extraer JSON si existe
      const jsonData = openaiAssistantService.extractJsonData(assistantResponse);
      
      // Guardar resultado en Redis
      await this.guardarResultadoProcesamiento(callSid, sessionData, jsonData, assistantResponse);
      
    } catch (error) {
      console.error(`❌ Error en procesarAudioAsincrono:`, error);
      await this.guardarResultadoProcesamiento(callSid, sessionData, null, 'error_procesamiento');
    }
  }
  
  async guardarResultadoProcesamiento(callSid, sessionData, jsonData, respuesta) {
    try {
      // Recuperar datos actualizados (por si cambiaron)
      const currentSessionData = await redisService.get(`quotation_${callSid}`);
      if (!currentSessionData) return;
      
      let nextStage = sessionData.stage;
      let nextPrompt = '';
      
      // Determinar siguiente paso según etapa y si hay JSON
      if (jsonData && jsonData.origen && jsonData.destino && jsonData.vehiculo) {
        // JSON completo - listo para cotización
        nextStage = 'completed';
      } else if (jsonData && jsonData.origen && sessionData.stage === 'origen') {
        // Tenemos origen, pedir destino
        nextStage = 'destino';
        nextPrompt = "Indique las coordenadas de destino.";
      } else if (jsonData && jsonData.origen && jsonData.destino && sessionData.stage === 'destino') {
        // Tenemos origen y destino, pedir vehículo
        nextStage = 'vehiculo';
        nextPrompt = "Indique marca, submarca y año del vehículo.";
      } else {
        // No tenemos datos válidos, repetir etapa actual
        nextPrompt = sessionData.stage === 'origen' 
          ? "Indique nuevamente las coordenadas de origen."
          : sessionData.stage === 'destino'
            ? "Indique nuevamente las coordenadas de destino."
            : "Indique nuevamente marca, submarca y año del vehículo.";
      }
      
      // Guardar estado actualizado
      await redisService.set(`quotation_${callSid}`, {
        ...currentSessionData,
        processingRecording: false,
        processingComplete: true,
        jsonData: jsonData || currentSessionData.jsonData,
        lastResponse: respuesta,
        stage: nextStage,
        nextPrompt
      });
      
    } catch (error) {
      console.error(`❌ Error al guardar resultados:`, error);
    }
  }
  
  async esperarProcesamiento(req, res) {
    try {
      const callSid = req.query.callSid || req.body.callSid;
      
      console.log(`⏳ Esperando procesamiento para CallSid: ${callSid}`);
      
      // Recuperar sesión
      const sessionData = await redisService.get(`quotation_${callSid}`);
      
      if (!sessionData) {
        console.log(`⚠️ Sesión no encontrada`);
        return this.handleSessionExpired(res);
      }
      
      // Si aún no ha terminado el procesamiento, redirigir a esta misma ruta con un retraso
      if (sessionData.processingRecording && !sessionData.processingComplete) {
        const wait = XMLBuilder.addSay(
          "Procesando información.",
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        // Redirigir a la misma ruta después de 2 segundos
        const redirect = XMLBuilder.addRedirect(`/esperar-procesamiento?callSid=${callSid}`, 'GET');
        
        const responseXML = XMLBuilder.buildResponse([wait, redirect]);
        
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
      // Procesamiento terminado, verificar resultado
      if (!sessionData.jsonData && sessionData.stage !== 'completed') {
        // No hay datos válidos, repetir grabación
        const sayError = XMLBuilder.addSay(
          sessionData.nextPrompt || "No pude entender. Intente nuevamente.",
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        // Configurar grabación nuevamente
        const record = XMLBuilder.addRecord({
          action: "/procesar-grabacion",
          method: "POST",
          maxLength: "15",
          timeout: "5",
          playBeep: "true",
          recordingStatusCallback: "/recording-status"
        });
        
        const timeoutSay = XMLBuilder.addSay(
          "No se detectó grabación. Volviendo al menú principal.",
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
        
        const responseXML = XMLBuilder.buildResponse([
          sayError,
          record,
          timeoutSay,
          redirect
        ]);
        
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
      // Verificar etapa actual y dirigir al siguiente paso
      if (sessionData.stage === 'completed') {
        // Todos los datos recopilados, generar cotización
        return this.finalizeQuotation(req, res);
      } else if (sessionData.stage === 'destino' || sessionData.stage === 'vehiculo') {
        // Confirmar avance y continuar con la siguiente etapa
        const sayConfirm = XMLBuilder.addSay(
          sessionData.nextPrompt,
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        // Configurar grabación para siguiente etapa
        const record = XMLBuilder.addRecord({
          action: "/procesar-grabacion",
          method: "POST",
          maxLength: "15",
          timeout: "5",
          playBeep: "true",
          recordingStatusCallback: "/recording-status"
        });
        
        const responseXML = XMLBuilder.buildResponse([sayConfirm, record]);
        
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
      
    } catch (error) {
      console.error(`❌ Error en esperarProcesamiento:`, error);
      this.handleError(res, error, 'quotation-wait-processing');
    }
  }
  
  async statusGrabacion(req, res) {
    try {
      const recordingSid = req.body.RecordingSid || req.query.RecordingSid;
      const recordingStatus = req.body.RecordingStatus || req.query.RecordingStatus;
      const recordingUrl = req.body.RecordingUrl || req.query.RecordingUrl;
      
      console.log(`📊 Status de grabación: ${recordingSid} - ${recordingStatus}`);
      console.log(`🔗 URL final de grabación: ${recordingUrl}`);
      
      // Simplemente respondemos 200 OK ya que esto es solo una notificación
      res.status(200).send('OK');
      
    } catch (error) {
      console.error(`❌ Error en statusGrabacion:`, error);
      res.status(200).send('Error processed');
    }
  }
  
  async processAudio(req, res) {
    // Mantenemos este método para compatibilidad con código existente 
    // Este método ya no se usará con el nuevo flujo de grabación
    console.log(`⚠️ Método processAudio llamado pero no utilizado en el nuevo flujo`);
    return this.handleError(res, new Error('Método no soportado'), 'audio-process-legacy');
  }
  
  async finalizeQuotation(req, res) {
    try {
      const callSid = req.query.CallSid || req.body.CallSid || req.query.callSid || req.body.callSid;
      
      console.log(`🏁 Finalizando cotización para CallSid: ${callSid}`);
      
      // Recuperar sesión
      const sessionData = await redisService.get(`quotation_${callSid}`);
      
      if (!sessionData || !sessionData.jsonData) {
        console.log(`⚠️ Datos de cotización no encontrados para CallSid: ${callSid}`);
        return this.handleSessionExpired(res);
      }
      
      // Generar cotización
      const quotationData = sessionData.jsonData;
      const quotationResult = await quotationService.generateQuotation(quotationData);
      
      // Limpiar recursos
      if (sessionData.threadId) {
        await openaiAssistantService.closeThread(sessionData.threadId);
      }
      
      // Construir mensaje de respuesta (conciso para pruebas)
      const say = XMLBuilder.addSay(
        `Costo: ${quotationResult.cost} pesos. Distancia: ${quotationResult.distance} kilómetros.`,
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
    // Mensaje conciso para pruebas
    return `Datos confirmados. Generando cotización.`;
  }
  
  handleSessionExpired(res) {
    const say = XMLBuilder.addSay(
      "La sesión ha expirado. Volviendo al menú principal.",
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
      "Error en el sistema. Volviendo al menú principal.",
      { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
    );
    
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    
    const responseXML = XMLBuilder.buildResponse([say, redirect]);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
}

module.exports = new Option2Controller();