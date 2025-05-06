/**
 * Sistema de caché para sesiones de llamadas
 * Almacena datos de expedientes durante la duración de una llamada
 */

class SessionCache {
  constructor() {
    this.sessions = new Map();
    this.timers = new Map();  // Añadido para rastrear temporizadores
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
    this._setExpirationTimer(sessionId, this.TTL);
    
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
    
    // Actualizar el temporizador de expiración
    this._resetExpirationTimer(sessionId, this.TTL);
    
    return true;
  }

  /**
   * Elimina una sesión del caché
   * @param {string} sessionId - ID de la sesión a eliminar
   */
  removeSession(sessionId) {
    // Cancelar cualquier temporizador pendiente
    this._clearExpirationTimer(sessionId);
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
        this.removeSession(sessionId);
      }
    }
  }
  
  /**
   * Establece un temporizador para expiración de sesión
   * @private
   * @param {string} sessionId - ID de la sesión
   * @param {number} timeout - Tiempo en ms hasta la expiración
   */
  _setExpirationTimer(sessionId, timeout) {
    const timer = setTimeout(() => {
      this.removeSession(sessionId);
    }, timeout);
    
    this.timers.set(sessionId, timer);
  }
  
  /**
   * Reinicia el temporizador de expiración para una sesión
   * @private
   * @param {string} sessionId - ID de la sesión
   * @param {number} timeout - Nuevo tiempo en ms hasta la expiración
   */
  _resetExpirationTimer(sessionId, timeout) {
    this._clearExpirationTimer(sessionId);
    this._setExpirationTimer(sessionId, timeout);
  }
  
  /**
   * Limpia el temporizador de expiración para una sesión
   * @private
   * @param {string} sessionId - ID de la sesión
   */
  _clearExpirationTimer(sessionId) {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }
}

// Crear una instancia para uso de la aplicación
const sessionCacheInstance = new SessionCache();

// Exportar tanto la clase como la instancia para permitir las pruebas
module.exports = sessionCacheInstance;
module.exports.SessionCache = SessionCache;