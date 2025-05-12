// src/services/speech/whisperSTTService.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const openaiConfig = require('../../config/openaiConfig');

/**
 * Servicio para transcripción de audio usando OpenAI Whisper API
 * NOTA: Este servicio es opcional y complementario al reconocimiento de voz de Telnyx
 * Se puede usar en caso de necesitar mayor precisión o control sobre la transcripción
 */
class WhisperSTTService {
  /**
   * Transcribe un archivo de audio usando la API de Whisper
   * @param {string|Buffer} audioFile - Ruta al archivo de audio o buffer con el contenido
   * @returns {Promise<string>} - Texto transcrito
   */
  async transcribeAudio(audioFile) {
    try {
      console.log(`🎤 Iniciando transcripción con Whisper`);
      
      const formData = new FormData();
      
      // Determinar si es un path o un buffer
      if (typeof audioFile === 'string') {
        formData.append('file', fs.createReadStream(audioFile));
      } else if (Buffer.isBuffer(audioFile)) {
        // Crear un archivo temporal para el buffer
        const tempFilePath = path.join(__dirname, '../../temp', `audio_${Date.now()}.mp3`);
        await this.ensureTempDir();
        fs.writeFileSync(tempFilePath, audioFile);
        formData.append('file', fs.createReadStream(tempFilePath));
        
        // Programar eliminación del archivo temporal
        setTimeout(() => {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (error) {
            console.error(`Error al eliminar archivo temporal:`, error);
          }
        }, 5000);
      } else {
        throw new Error('Formato de audio no soportado');
      }
      
      // Configurar parámetros de la API
      formData.append('model', 'whisper-1');
      formData.append('language', 'es');
      
      // Realizar la solicitud a la API
      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${openaiConfig.apiKey}`,
            ...formData.getHeaders()
          },
          timeout: openaiConfig.timeout
        }
      );
      
      if (!response.data || !response.data.text) {
        throw new Error('Respuesta vacía de la API de Whisper');
      }
      
      const transcription = response.data.text.trim();
      
      console.log(`✅ Transcripción completada: "${transcription}"`);
      return transcription;
      
    } catch (error) {
      return this.handleTranscriptionError(error);
    }
  }
  
  /**
   * Transcribe audio a partir de una URL
   * @param {string} audioUrl - URL del archivo de audio
   * @returns {Promise<string>} - Texto transcrito
   */
  async transcribeAudioFromUrl(audioUrl) {
    try {
      console.log(`🎤 Descargando audio desde URL: ${audioUrl}`);
      
      // Descargar el archivo
      const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(response.data);
      
      // Transcribir el buffer
      return await this.transcribeAudio(audioBuffer);
      
    } catch (error) {
      return this.handleTranscriptionError(error);
    }
  }
  
  /**
   * Asegura que el directorio temporal existe
   * @returns {Promise<void>}
   */
  async ensureTempDir() {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  }
  
  /**
   * Maneja errores de transcripción
   * @param {Error} error - Error capturado
   * @returns {Promise<string>} - Mensaje de error o texto vacío
   */
  handleTranscriptionError(error) {
    console.error(`❌ Error en transcripción:`, error);
    
    if (error.response) {
      console.error(`Detalles del error:`, error.response.data);
    }
    
    // Devolver mensaje vacío en caso de error
    return Promise.resolve('');
  }
}

module.exports = new WhisperSTTService();