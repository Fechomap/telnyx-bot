// src/services/ivr/quotationProcessingService.js
const whisperSTTService = require('../speech/whisperSTTService');
const openaiAssistantService = require('../ai/openaiAssistantService');
const quotationService = require('./quotationService');
const redisService = require('../redisService');

class QuotationProcessingService {
  /**
   * Procesa el audio de forma asíncrona
   */
  async processAudioAsync(callSid, recordingUrl, sessionData) {
    try {
      console.log(`🔄 Procesando audio asíncronamente: ${recordingUrl}`);
      
      // Transcribir con Whisper
      const transcripcion = await whisperSTTService.transcribeAudioFromUrl(recordingUrl);
      console.log(`📝 Transcripción: "${transcripcion}"`);
      
      if (!transcripcion || transcripcion.trim() === '') {
        console.log(`⚠️ Transcripción vacía`);
        await this.saveProcessingResult(callSid, sessionData, null, 'error_transcripcion_vacia', null);
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
      
      // Guardar resultado en Redis
      await this.saveProcessingResult(callSid, sessionData, jsonData, assistantResponse, transcripcion);
      
    } catch (error) {
      console.error(`❌ Error en processAudioAsync:`, error);
      await this.saveProcessingResult(callSid, sessionData, null, 'error_procesamiento', null);
    }
  }
  
  /**
   * Guarda el resultado del procesamiento
   */
  async saveProcessingResult(callSid, sessionData, jsonData, respuesta, transcripcion) {
    try {
      // Recuperar datos actualizados
      const currentSessionData = await redisService.get(`quotation_${callSid}`);
      if (!currentSessionData) return;
      
      let nextStage = sessionData.stage;
      let nextPrompt = '';
      
      // Si no hay JSON pero hay transcripción, intentar extraer datos
      if (!jsonData && transcripcion) {
        jsonData = this.extractDataFromTranscription(transcripcion, sessionData.stage);
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
  
  /**
   * Extrae coordenadas o datos de vehículo de la transcripción
   */
  extractDataFromTranscription(transcripcion, stage) {
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
  
  /**
   * Finaliza la cotización
   */
  async finalizeQuotation(sessionData) {
    const quotationData = sessionData.jsonData;
    const quotationResult = await quotationService.generateQuotation(quotationData);
    
    // Limpiar recursos
    if (sessionData.threadId) {
      await openaiAssistantService.closeThread(sessionData.threadId);
    }
    
    return quotationResult;
  }
}

module.exports = new QuotationProcessingService();