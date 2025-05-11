// src/services/ivr/sessionService.js
const redisService = require('../redisService');

class SessionService {
  async createSession(expediente, datos) {
    console.log(`🔐 Intentando crear sesión para expediente: ${expediente}`);
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (!redisService.isConnected) {
        throw new Error('Redis no está conectado');
      }
      
      const success = await redisService.set(sessionId, {
        expediente,
        datos,
        createdAt: Date.now()
      });
      
      if (!success) {
        throw new Error('No se pudo guardar en Redis');
      }
      
      console.log(`✅ Sesión guardada en Redis: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error(`❌ Error al crear sesión:`, error);
      throw error;
    }
  }
  
  async getSession(sessionId) {
    if (!sessionId) return null;
    
    try {
      const sessionData = await redisService.get(sessionId);
      return sessionData;
    } catch (error) {
      console.error(`Error al obtener sesión:`, error);
      return null;
    }
  }
  
  async deleteSession(sessionId) {
    if (!sessionId) return;
    
    try {
      await redisService.delete(sessionId);
    } catch (error) {
      console.error(`Error al eliminar sesión:`, error);
    }
  }

  async markIntroMessageShown(callSid, expediente) {
    if (!callSid || !expediente) {
      console.error('❌ callSid y expediente son requeridos para marcar el mensaje de introducción como mostrado.');
      return false;
    }
    const key = `shown_intro_${callSid}_${expediente}`;
    try {
      if (!redisService.isConnected) {
        throw new Error('Redis no está conectado');
      }
      // Set with an expiration, e.g., 1 hour (3600 seconds), assuming a call won't last longer.
      // The redisService.set method already uses setEx, so we just pass the TTL value.
      const success = await redisService.set(key, 'true', 3600); 
      if (!success) {
        console.error(`❌ No se pudo guardar la bandera en Redis para ${key}`);
        return false;
      }
      console.log(`✅ Bandera de mensaje de introducción guardada en Redis para ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al marcar el mensaje de introducción como mostrado para ${key}:`, error);
      return false;
    }
  }

  async hasIntroMessageBeenShown(callSid, expediente) {
    if (!callSid || !expediente) {
      console.error('❌ callSid y expediente son requeridos para verificar si el mensaje de introducción ha sido mostrado.');
      return false; // Or handle as appropriate, e.g., assume not shown
    }
    const key = `shown_intro_${callSid}_${expediente}`;
    try {
      if (!redisService.isConnected) {
        // If Redis is not connected, we might default to showing the message to avoid breaking flow.
        // Or, if this is critical, throw an error. For now, let's assume it hasn't been shown.
        console.warn('Redis no está conectado, asumiendo que el mensaje de introducción no ha sido mostrado.');
        return false;
      }
      const value = await redisService.get(key);
      return value === 'true';
    } catch (error) {
      console.error(`❌ Error al verificar si el mensaje de introducción ha sido mostrado para ${key}:`, error);
      // In case of error, it might be safer to assume it hasn't been shown, to ensure user gets the message at least once.
      return false;
    }
  }
}

module.exports = new SessionService();
