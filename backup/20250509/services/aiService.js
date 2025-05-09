/**
 * Servicio para integración con AI
 * Permite procesar consultas mediante distintos proveedores de AI
 */
const axios = require('axios');
require('dotenv').config();

class AIService {
  constructor() {
    this.providers = {
      'openai': {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1'
      },
      'anthropic': {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1'
      }
    };
  }

  /**
   * Procesa una consulta de usuario con IA
   * @param {string} query - Consulta del usuario
   * @param {Object} context - Contexto del expediente (opcional)
   * @param {string} provider - Proveedor de IA ('openai', 'anthropic')
   * @returns {Promise<string>} - Respuesta del modelo de IA
   */
  async processQuery(query, context = {}, provider = 'anthropic') {
    try {
      if (provider === 'anthropic') {
        return await this.processWithAnthropic(query, context);
      } else if (provider === 'openai') {
        return await this.processWithOpenAI(query, context);
      } else {
        throw new Error(`Proveedor de IA no soportado: ${provider}`);
      }
    } catch (error) {
      console.error('Error al procesar consulta con IA:', error);
      return "Lo siento, no pude procesar su consulta en este momento. ¿Puedo ayudarle con algo más?";
    }
  }

  /**
   * Procesa una consulta utilizando Anthropic Claude
   * @param {string} query - Consulta del usuario
   * @param {Object} context - Contexto del expediente
   * @returns {Promise<string>} - Respuesta de Claude
   */
  async processWithAnthropic(query, context) {
    const system = `Eres un asistente especializado en consultas de expedientes. 
    Responde de forma concisa, clara y amigable. Usa lenguaje natural y humano.
    Siempre mantén las respuestas breves y directas, ideales para una conversación telefónica.
    
    Contexto del expediente: ${JSON.stringify(context, null, 2)}`;

    const response = await axios.post(
      `${this.providers.anthropic.baseUrl}/messages`,
      {
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        system: system,
        messages: [
          {
            role: "user",
            content: query
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.providers.anthropic.apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  }

  /**
   * Procesa una consulta utilizando OpenAI GPT
   * @param {string} query - Consulta del usuario
   * @param {Object} context - Contexto del expediente
   * @returns {Promise<string>} - Respuesta de GPT
   */
  async processWithOpenAI(query, context) {
    const system = `Eres un asistente especializado en consultas de expedientes.
    Responde de forma concisa, clara y amigable. Mantén las respuestas breves.
    
    Contexto del expediente: ${JSON.stringify(context, null, 2)}`;

    const response = await axios.post(
      `${this.providers.openai.baseUrl}/chat/completions`,
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: system
          },
          {
            role: "user",
            content: query
          }
        ],
        max_tokens: 300
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.providers.openai.apiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Formatea contexto de expediente para IA
   * @param {Object} expedienteData - Datos completos del expediente
   * @returns {Object} - Contexto formateado para IA
   */
  formatContextForAI(expedienteData) {
    if (!expedienteData) return {};

    return {
      expediente: expedienteData.expediente || '',
      cliente: expedienteData.datosGenerales?.nombre || 'Cliente',
      vehiculo: expedienteData.datosGenerales?.vehiculo || '',
      estatus: expedienteData.datosGenerales?.estatus || 'En proceso',
      servicio: expedienteData.datosGenerales?.servicio || '',
      destino: expedienteData.datosGenerales?.destino || '',
      costo: expedienteData.costos?.costo || '',
      operador: expedienteData.unidad?.operador || '',
      tiempoRestante: expedienteData.ubicacion?.tiempoRestante || '',
      tiempoContacto: expedienteData.tiempos?.tc || '',
      tiempoTermino: expedienteData.tiempos?.tt || ''
    };
  }
}

// Crear instancia para uso de la aplicación
const aiServiceInstance = new AIService();

module.exports = aiServiceInstance;