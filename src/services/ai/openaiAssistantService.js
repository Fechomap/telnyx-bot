// src/services/ai/openaiAssistantService.js
const { OpenAI } = require('openai');
const config = require('../../config/openaiConfig');

class OpenAIAssistantService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.apiKey
    });
    this.assistantId = config.assistantId;
  }
  
  async createThread() {
    try {
      console.log(`🤖 Creando nuevo hilo de conversación con el asistente`);
      const thread = await this.client.beta.threads.create();
      console.log(`✅ Hilo creado: ${thread.id}`);
      return thread.id;
    } catch (error) {
      console.error(`❌ Error al crear hilo:`, error);
      throw error;
    }
  }
  
  async sendMessage(threadId, message) {
    try {
      console.log(`📤 Enviando mensaje al hilo ${threadId}: "${message}"`);
      
      // Agregar mensaje al hilo
      await this.client.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message
      });
      
      // Ejecutar el asistente
      console.log(`🏃 Ejecutando asistente ${this.assistantId} en hilo ${threadId}`);
      const run = await this.client.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId
      });
      
      console.log(`✅ Run iniciado: ${run.id}`);
      return run.id;
    } catch (error) {
      console.error(`❌ Error al enviar mensaje:`, error);
      throw error;
    }
  }
  
  async getResponse(threadId, runId) {
    try {
      console.log(`🔄 Esperando respuesta del asistente (run: ${runId})`);
      
      // Esperar a que finalice el run
      let runStatus = await this.client.beta.threads.runs.retrieve(threadId, runId);
      
      // Verificar estado cada 1 segundo (máximo 30 segundos)
      let attempts = 0;
      while (runStatus.status !== 'completed' && attempts < 30) {
        console.log(`⏳ Run status: ${runStatus.status} (attempt: ${attempts + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.client.beta.threads.runs.retrieve(threadId, runId);
        attempts++;
      }
      
      if (runStatus.status !== 'completed') {
        throw new Error(`Timeout esperando respuesta del asistente`);
      }
      
      // Obtener mensajes (ordenados por más reciente primero)
      const messages = await this.client.beta.threads.messages.list(threadId);
      
      // Obtener el mensaje más reciente del asistente
      const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
      
      if (assistantMessages.length === 0) {
        throw new Error(`No se encontraron mensajes del asistente`);
      }
      
      const latestMessage = assistantMessages[0];
      
      // Extraer el contenido del mensaje
      let responseText = '';
      if (latestMessage.content && latestMessage.content.length > 0) {
        latestMessage.content.forEach(content => {
          if (content.type === 'text') {
            responseText += content.text.value;
          }
        });
      }
      
      console.log(`✅ Respuesta recibida: "${responseText.substring(0, 100)}..."`);
      return responseText;
    } catch (error) {
      console.error(`❌ Error al obtener respuesta:`, error);
      throw error;
    }
  }
  
  extractJsonData(response) {
    try {
      // Buscar patrón de JSON en la respuesta
      const jsonPattern = /{[\s\S]*}/;
      const match = response.match(jsonPattern);
      
      if (!match) {
        console.log(`⚠️ No se encontró JSON en la respuesta`);
        return null;
      }
      
      const jsonStr = match[0];
      console.log(`🔍 JSON encontrado en la respuesta: ${jsonStr}`);
      
      // Parsear el JSON
      const jsonData = JSON.parse(jsonStr);
      
      return jsonData;
    } catch (error) {
      console.error(`❌ Error al extraer JSON:`, error);
      return null;
    }
  }
  
  async closeThread(threadId) {
    try {
      console.log(`🧹 Cerrando hilo ${threadId}`);
      // OpenAI no tiene un endpoint específico para cerrar hilos, 
      // pero podemos eliminarlo para liberar recursos
      await this.client.beta.threads.del(threadId);
      console.log(`✅ Hilo cerrado: ${threadId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al cerrar hilo:`, error);
      return false;
    }
  }
}

module.exports = new OpenAIAssistantService();