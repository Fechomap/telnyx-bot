/**
 * Sistema de caché para sesiones de llamadas
 * Almacena datos de expedientes durante la duración de una llamada
 */

class SessionCache {
    constructor() {
      this.sessions = new Map();
      this.TTL = 30 * 60 * 1000; // 30 minutos en milisegundos
    }
  
    /**
     * Crea una nueva sesión con datos del expediente
     * @param {string} sessionId - ID único de la sesión (puede ser call_control_id)
     * @param {Object} data - Datos completos del expediente
     * @returns {string} El ID de la sesión creada
     */
    createSession(sessionId, data) {
      const session = {
        data,
        created: Date.now(),
        expires: Date.now() + this.TTL
      };
      
      this.sessions.set(sessionId, session);
      
      // Programar eliminación automática
      setTimeout(() => {
        this.removeSession(sessionId);
      }, this.TTL);
      
      return sessionId;
    }
  
    /**
     * Obtiene los datos de una sesión existente
     * @param {string} sessionId - ID de la sesión
     * @returns {Object|null} Datos de la sesión o null si no existe
     */
    getSession(sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) return null;
      
      // Verificar si la sesión ha expirado
      if (Date.now() > session.expires) {
        this.removeSession(sessionId);
        return null;
      }
      
      return session.data;
    }
  
    /**
     * Actualiza datos de una sesión existente
     * @param {string} sessionId - ID de la sesión
     * @param {Object} data - Nuevos datos o datos parciales para actualizar
     * @returns {boolean} Verdadero si la actualización fue exitosa
     */
    updateSession(sessionId, data) {
      const session = this.sessions.get(sessionId);
      if (!session) return false;
      
      // Actualizar datos
      session.data = { ...session.data, ...data };
      // Extender tiempo de expiración
      session.expires = Date.now() + this.TTL;
      
      this.sessions.set(sessionId, session);
      return true;
    }
  
    /**
     * Elimina una sesión del caché
     * @param {string} sessionId - ID de la sesión a eliminar
     */
    removeSession(sessionId) {
      this.sessions.delete(sessionId);
    }
  
    /**
     * Obtiene el número total de sesiones activas
     * @returns {number} Cantidad de sesiones activas
     */
    getActiveSessionsCount() {
      return this.sessions.size;
    }
  
    /**
     * Limpia sesiones expiradas
     */
    cleanExpiredSessions() {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now > session.expires) {
          this.sessions.delete(sessionId);
        }
      }
    }
  }
  
  // Exportar una instancia única para toda la aplicación
  module.exports = new SessionCache();