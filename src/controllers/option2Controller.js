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
        finishOnKey: '', // Evitar terminar con la tecla '#'
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
      
      // -------- CAMBIO IMPORTANTE: En lugar de redirigir, procesamos aquí mismo --------
      // Guardar en Redis que estamos procesando
      await redisService.set(`quotation_${callSid}`, {
        ...sessionData,
        processingRecording: true,
        processingComplete: false,
        recordingUrl,
        recordingSid
      });
      
      // Iniciar procesamiento de audio (pero no esperar a que termine)
      this.procesarAudioAsincrono(callSid, recordingUrl, sessionData);
      
      // Enviar directamente una respuesta con pausa y mensaje de espera
      const elements = [];
      
      // Mensaje de procesamiento
      elements.push(XMLBuilder.addSay(
        "Procesando su información, por favor espere un momento.",
        { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
      ));
      
      // Agregar una pausa para dar tiempo al procesamiento (8 segundos)
      for (let i = 0; i < 4; i++) {
        elements.push(XMLBuilder.addSay(
          "...",
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        ));
      }
      
      // Redirigir a verificar resultado (simple y sin parámetros en URL)
      elements.push(XMLBuilder.addRedirect(`/esperar-procesamiento?callSid=${callSid}`, 'GET'));
      
      const responseXML = XMLBuilder.buildResponse(elements);
      
      res.header('Content-Type', 'application/xml');
      console.log(`📤 Enviando respuesta TeXML a Telnyx:`);
      console.log(responseXML.substring(0, 500) + '...');
      res.send(responseXML);
      
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
        await this.guardarResultadoProcesamiento(callSid, sessionData, null, 'error_transcripcion_vacia', null);
        return;
      }
      
      // Construir mensaje con la etapa actual para el asistente
      const etapaActual = sessionData.stage || 'origen';
      const mensajeConEtapa = `
  Etapa actual: "${etapaActual}"
  Transcripción del usuario: "${transcripcion}"
      `;
      
      console.log(`📤 Enviando mensaje con etapa "${etapaActual}" al asistente`);
      
      // Enviar al asistente
      const threadId = sessionData.threadId;
      const runId = await openaiAssistantService.sendMessage(threadId, mensajeConEtapa);
      
      // Esperar respuesta
      const assistantResponse = await openaiAssistantService.getResponse(threadId, runId);
      
      // Extraer JSON si existe
      const jsonData = openaiAssistantService.extractJsonData(assistantResponse);
      
      // Guardar resultado en Redis (pasando la transcripción)
      await this.guardarResultadoProcesamiento(callSid, sessionData, jsonData, assistantResponse, transcripcion);
      
    } catch (error) {
      console.error(`❌ Error en procesarAudioAsincrono:`, error);
      await this.guardarResultadoProcesamiento(callSid, sessionData, null, 'error_procesamiento', null);
    }
  }
  
  async guardarResultadoProcesamiento(callSid, sessionData, jsonData, respuesta, transcripcion) {
    try {
      // Recuperar datos actualizados (por si cambiaron)
      const currentSessionData = await redisService.get(`quotation_${callSid}`);
      if (!currentSessionData) return;
      
      let nextStage = sessionData.stage;
      let nextPrompt = '';
      
      // Si no hay JSON pero hay transcripción, intentar extraer datos
      if (!jsonData && transcripcion) {
        jsonData = this.extraerDatosDeTranscripcion(transcripcion, sessionData.stage);
      }
      
      // Almacenar datos extraídos en la sesión actual 
      const datosActualizados = { ...currentSessionData.jsonData };
      
      if (jsonData) {
        // Agregar los datos nuevos a los existentes
        if (jsonData.origen) datosActualizados.origen = jsonData.origen;
        if (jsonData.destino) datosActualizados.destino = jsonData.destino;
        if (jsonData.vehiculo) datosActualizados.vehiculo = jsonData.vehiculo;
        
        console.log(`💾 Datos actualizados: ${JSON.stringify(datosActualizados)}`);
      }
      
      // Determinar siguiente paso según etapa y datos disponibles
      if (datosActualizados.origen && datosActualizados.destino && datosActualizados.vehiculo) {
        // Datos completos - listo para cotización
        nextStage = 'completed';
        nextPrompt = "Generando cotización con sus datos.";
      } else if (datosActualizados.origen && sessionData.stage === 'origen') {
        // Tenemos origen, pedir destino
        nextStage = 'destino';
        nextPrompt = "Indique las coordenadas de destino.";
      } else if (datosActualizados.origen && datosActualizados.destino && sessionData.stage === 'destino') {
        // Tenemos origen y destino, pedir vehículo
        nextStage = 'vehiculo';
        nextPrompt = "Indique marca, submarca y año del vehículo.";
      } else {
        // Repetir etapa actual si faltan datos
        nextPrompt = sessionData.stage === 'origen' 
          ? "No pude entender. Indique nuevamente las coordenadas de origen."
          : sessionData.stage === 'destino'
            ? "No pude entender. Indique nuevamente las coordenadas de destino."
            : "No pude entender. Indique marca, submarca y año del vehículo.";
      }
      
      // Guardar estado actualizado
      await redisService.set(`quotation_${callSid}`, {
        ...currentSessionData,
        processingRecording: false,
        processingComplete: true,
        jsonData: datosActualizados,
        lastResponse: respuesta,
        stage: nextStage,
        nextPrompt
      });
      
      console.log(`🔄 Estado de sesión actualizado: ${nextStage}, Prompt: "${nextPrompt}"`);
      
    } catch (error) {
      console.error(`❌ Error al guardar resultados:`, error);
    }
  }
  
  async esperarProcesamiento(req, res) {
    try {
      const callSid = req.query.callSid || req.body.callSid || req.query.CallSid || req.body.CallSid;
      console.log(`📥 Recibida petición en esperarProcesamiento:`);
      console.log(`CallSid: ${callSid}`);
      console.log(`Headers:`, req.headers);
      console.log(`⏳ Esperando procesamiento para CallSid: ${callSid}`);
      
      // Recuperar sesión
      const sessionData = await redisService.get(`quotation_${callSid}`);
      
      if (!sessionData) {
        console.log(`⚠️ Sesión no encontrada`);
        return this.handleSessionExpired(res);
      }
      
      // Si aún no ha terminado el procesamiento, esperar un poco más
      if (sessionData.processingRecording && !sessionData.processingComplete) {
        const wait = XMLBuilder.addSay(
          "Continuamos procesando, un momento por favor.",
          { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
        );
        
        // ---- CAMBIO AQUÍ: URL simplificada y sin parámetros en la query string ----
        const redirect = XMLBuilder.addRedirect(`/esperar-procesamiento?callSid=${callSid}`, 'GET');
        
        const responseXML = XMLBuilder.buildResponse([wait, redirect]);
        
        res.header('Content-Type', 'application/xml');
        return res.send(responseXML);
      }
    
    // El resto del código sigue igual...
      
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
          finishOnKey: '', // Evitar terminar con la tecla '#'
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
          finishOnKey: '', // Evitar terminar con la tecla '#'
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

  /**
   * Extrae coordenadas o datos de vehículo de la transcripción cuando no hay JSON.
   */
  extraerDatosDeTranscripcion(transcripcion, stage) {
    try {
      // Expresión regular para detectar coordenadas (latitud,longitud)
      const coordPattern = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/;
      
      // Expresión regular alternativa para "menos" en lugar de signo negativo
      const coordPatternText = /(\d+\.?\d*)\s*,?\s*menos\s*(\d+\.?\d*)/;
      
      // Expresión regular para detectar información de vehículo
      const vehiclePattern = /(\w+)\s+(\w+)(?:\s+(\d{4}))?/;
      
      let jsonData = {};
      
      if (stage === 'origen' || stage === 'destino') {
        // Intentar primero con el formato estándar
        let coordMatch = transcripcion.match(coordPattern);
        
        // Si no funciona, intentar con el formato de texto "menos"
        if (!coordMatch) {
          coordMatch = transcripcion.match(coordPatternText);
          // Si encuentra el patrón con "menos", ajustar para añadir signo negativo
          if (coordMatch) {
            coordMatch[2] = `-${coordMatch[2]}`; 
          }
        }
        
        if (coordMatch) {
          // Asegurarnos que la longitud sea negativa para México
          let lat = parseFloat(coordMatch[1]);
          let lng = parseFloat(coordMatch[2]);
          
          // Si la longitud es positiva y parece ser de México, hacerla negativa
          if (lng > 0 && lng > 85 && lng < 120) {
            lng = -lng;
          }
          
          const coords = `${lat},${lng}`;
          
          // Asignar al campo correcto según la etapa
          if (stage === 'origen') {
            jsonData.origen = coords;
          } else if (stage === 'destino') {
            jsonData.destino = coords;
          }
          
          console.log(`✅ Extraídas coordenadas para ${stage} desde transcripción: ${coords}`);
          return jsonData;
        }
      } else if (stage === 'vehiculo') {
        // Procesamiento de vehículo
        const vehicleMatch = transcripcion.match(vehiclePattern);
        if (vehicleMatch) {
          jsonData.vehiculo = {
            marca: vehicleMatch[1],
            submarca: vehicleMatch[2],
            modelo: vehicleMatch[3] || new Date().getFullYear().toString()
          };
          
          console.log(`✅ Extraída información del vehículo: ${JSON.stringify(jsonData.vehiculo)}`);
          return jsonData;
        }
      }
      
      console.log(`⚠️ No se pudo extraer datos para ${stage} de la transcripción: "${transcripcion}"`);
      return null;
    } catch (error) {
      console.error(`❌ Error al extraer datos desde la transcripción:`, error);
      return null;
    }
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