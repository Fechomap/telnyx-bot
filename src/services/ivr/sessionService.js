// src/services/ivr/sessionService.js
const redisService = require('../redisService');

class SessionService {
  async createSession(expediente, datos) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await redisService.set(sessionId, {
        expediente,
        datos,
        createdAt: Date.now()
      });
      
      return sessionId;
    } catch (error) {
      console.error(`Error al crear sesión:`, error);
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
}

module.exports = new SessionService();