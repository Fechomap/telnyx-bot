const SessionCache = require('../../../src/cache/sessionCache');

describe('SessionCache', () => {
  let sessionCache;
  
  beforeEach(() => {
    // Crear una nueva instancia para cada prueba
    sessionCache = new SessionCache();
    
    // Sobrescribir TTL para que las pruebas sean más rápidas
    sessionCache.TTL = 500; // 500ms
  });
  
  describe('createSession', () => {
    it('should create a new session with the provided data', () => {
      const sessionId = 'test-session-123';
      const testData = { test: 'data' };
      
      const result = sessionCache.createSession(sessionId, testData);
      
      expect(result).to.equal(sessionId);
      expect(sessionCache.sessions.has(sessionId)).to.be.true;
      
      const session = sessionCache.sessions.get(sessionId);
      expect(session.data).to.deep.equal(testData);
      expect(session).to.have.property('created');
      expect(session).to.have.property('expires');
    });
    
    it('should schedule automatic removal after TTL', async () => {
      const sessionId = 'expiring-session';
      const testData = { test: 'data' };
      
      sessionCache.createSession(sessionId, testData);
      
      // Verificar que la sesión existe
      expect(sessionCache.sessions.has(sessionId)).to.be.true;
      
      // Esperar a que expire la sesión
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Verificar que la sesión fue eliminada
      expect(sessionCache.sessions.has(sessionId)).to.be.false;
    });
  });
  
  describe('getSession', () => {
    it('should return session data for valid session', () => {
      const sessionId = 'test-session-get';
      const testData = { test: 'get-data' };
      
      sessionCache.createSession(sessionId, testData);
      
      const result = sessionCache.getSession(sessionId);
      
      expect(result).to.deep.equal(testData);
    });
    
    it('should return null for non-existent session', () => {
      const result = sessionCache.getSession('non-existent');
      
      expect(result).to.be.null;
    });
    
    it('should return null and remove expired session', async () => {
      const sessionId = 'expiring-session-get';
      const testData = { test: 'data' };
      
      // Crear sesión con expiración forzada
      sessionCache.sessions.set(sessionId, {
        data: testData,
        created: Date.now() - 1000,
        expires: Date.now() - 100  // Ya expirado
      });
      
      const result = sessionCache.getSession(sessionId);
      
      expect(result).to.be.null;
      expect(sessionCache.sessions.has(sessionId)).to.be.false;
    });
  });
  
  describe('updateSession', () => {
    it('should update existing session data', () => {
      const sessionId = 'test-session-update';
      const initialData = { name: 'Initial', value: 1 };
      const updateData = { value: 2, newProp: 'added' };
      
      sessionCache.createSession(sessionId, initialData);
      
      const result = sessionCache.updateSession(sessionId, updateData);
      
      expect(result).to.be.true;
      
      const updatedSession = sessionCache.getSession(sessionId);
      expect(updatedSession).to.deep.equal({ 
        name: 'Initial', // Mantiene propiedad original
        value: 2,        // Actualiza valor existente
        newProp: 'added' // Agrega nueva propiedad
      });
    });
    
    it('should return false for non-existent session', () => {
      const result = sessionCache.updateSession('non-existent', { test: 'data' });
      
      expect(result).to.be.false;
    });
    
    it('should extend expiration time when updating', async () => {
      const sessionId = 'expiring-session-update';
      const initialData = { test: 'initial' };
      
      // Crear sesión con expiración cercana
      sessionCache.sessions.set(sessionId, {
        data: initialData,
        created: Date.now(),
        expires: Date.now() + 300  // Expira en 300ms
      });
      
      // Esperar un poco
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Actualizar la sesión
      const updateData = { test: 'updated' };
      sessionCache.updateSession(sessionId, updateData);
      
      // Esperar más tiempo (pasaría la expiración original)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // La sesión debería seguir existiendo
      expect(sessionCache.sessions.has(sessionId)).to.be.true;
      
      // Pero debería expirar eventualmente
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(sessionCache.sessions.has(sessionId)).to.be.false;
    });
  });
  
  describe('removeSession', () => {
    it('should remove a session', () => {
      const sessionId = 'test-session-remove';
      const testData = { test: 'remove-data' };
      
      sessionCache.createSession(sessionId, testData);
      expect(sessionCache.sessions.has(sessionId)).to.be.true;
      
      sessionCache.removeSession(sessionId);
      expect(sessionCache.sessions.has(sessionId)).to.be.false;
    });
    
    it('should not error when removing non-existent session', () => {
      expect(() => {
        sessionCache.removeSession('non-existent');
      }).to.not.throw();
    });
  });
  
  describe('getActiveSessionsCount', () => {
    it('should return the correct count of active sessions', () => {
      // Inicialmente no hay sesiones
      expect(sessionCache.getActiveSessionsCount()).to.equal(0);
      
      // Crear algunas sesiones
      sessionCache.createSession('session1', { test: 'data1' });
      sessionCache.createSession('session2', { test: 'data2' });
      sessionCache.createSession('session3', { test: 'data3' });
      
      expect(sessionCache.getActiveSessionsCount()).to.equal(3);
      
      // Eliminar una sesión
      sessionCache.removeSession('session2');
      
      expect(sessionCache.getActiveSessionsCount()).to.equal(2);
    });
  });
  
  describe('cleanExpiredSessions', () => {
    it('should remove all expired sessions', () => {
      // Crear algunas sesiones con diferentes tiempos de expiración
      sessionCache.sessions.set('expired1', {
        data: { test: 'expired1' },
        created: Date.now() - 1000,
        expires: Date.now() - 500  // Ya expirada
      });
      
      sessionCache.sessions.set('expired2', {
        data: { test: 'expired2' },
        created: Date.now() - 1000,
        expires: Date.now() - 100  // Ya expirada
      });
      
      sessionCache.sessions.set('active', {
        data: { test: 'active' },
        created: Date.now(),
        expires: Date.now() + 60000  // Aún activa
      });
      
      // Verificar estado inicial
      expect(sessionCache.sessions.size).to.equal(3);
      
      // Limpiar sesiones expiradas
      sessionCache.cleanExpiredSessions();
      
      // Verificar que solo quedó la sesión activa
      expect(sessionCache.sessions.size).to.equal(1);
      expect(sessionCache.sessions.has('active')).to.be.true;
      expect(sessionCache.sessions.has('expired1')).to.be.false;
      expect(sessionCache.sessions.has('expired2')).to.be.false;
    });
  });
});