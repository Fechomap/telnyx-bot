// src/services/redisService.js
const redis = require('redis');
require('dotenv').config();

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 1800; // 30 minutos
    this.inProduction = this.detectProductionEnvironment();
  }

  /**
   * Detecta si estamos en un entorno de producción (Railway)
   * @returns {boolean} true si estamos en producción, false si estamos en desarrollo
   */
  detectProductionEnvironment() {
    // Railway establece NODE_ENV y otras variables específicas
    const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                      process.env.RAILWAY_SERVICE_ID || 
                      process.env.PORT === '8080' ||
                      process.env.BASE_URL?.includes('railway.app');
    
    if (isRailway) {
      console.log('🚂 Detectado entorno Railway');
      return true;
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.log('🏭 Detectado entorno de producción');
      return true;
    }
    
    console.log('🧪 Detectado entorno de desarrollo');
    return false;
  }

  /**
   * Determina si una URL es un placeholder de Railway
   * @param {string} url La URL a comprobar
   * @returns {boolean} true si es un placeholder de Railway
   */
  isRailwayPlaceholder(url) {
    if (!url) return false;
    
    // Detecta varios formatos de placeholder de Railway
    return url.includes('${{') || 
           url.includes('${Redis') || 
           url.includes('$REDIS') ||
           url.match(/\$\{\{.*\}\}/) !== null ||
           url.match(/\$\{.*\}/) !== null;
  }

  /**
   * Determina la URL de Redis a utilizar
   * @returns {string} URL válida para conectar a Redis
   */
  determineRedisUrl() {
    // Obtener REDIS_URL del entorno
    const configuredUrl = process.env.REDIS_URL || '';
    
    console.log(`🔍 REDIS_URL configurada: ${this.maskUrl(configuredUrl)}`);
    
    // CASO 1: Comprobar si es un placeholder de Railway
    if (this.isRailwayPlaceholder(configuredUrl)) {
      console.log('⚠️ Detectado placeholder de Railway: ' + configuredUrl);
      
      // En Railway, esto no debería ocurrir (debería haberse sustituido)
      if (this.inProduction) {
        console.error('❌ ERROR: Placeholder de Railway no sustituido en producción');
        console.log('⚙️ Buscando URL alternativa en otras variables...');
        
        // Intentar buscar otras variables que Railway podría haber configurado
        const possibleUrls = [
          process.env.REDIS_PRIVATE_URL,
          process.env.RAILWAY_REDIS_URL,
          process.env.REDIS_CONNECTION_URL,
          // Formato especial: buscar sin usar placeholder
          process.env['Redis.REDIS_URL']  // Intenta acceder directamente sin placeholder
        ];
        
        for (const url of possibleUrls) {
          if (url && !this.isRailwayPlaceholder(url)) {
            console.log('✅ Encontrada URL alternativa válida');
            return url;
          }
        }
        
        console.warn('⚠️ No se encontró URL alternativa, usando fallback a localhost (probablemente fallará)');
      }
      
      // En local, usar Redis local
      if (!this.inProduction) {
        console.log('✅ Desarrollo local con placeholder de Railway, usando Redis local');
      }
      
      return 'redis://localhost:6379';
    }
    
    // CASO 2: URL explícita y válida, usarla
    if (configuredUrl && (
      configuredUrl.startsWith('redis://') || 
      configuredUrl.startsWith('rediss://') ||
      configuredUrl.includes('@')
    )) {
      console.log(`✅ Usando URL de Redis configurada: ${this.maskUrl(configuredUrl)}`);
      return configuredUrl;
    }
    
    // CASO 3: Fallback a local según el entorno
    if (this.inProduction) {
      console.warn('⚠️ No se encontró URL válida de Redis en Railway');
      return 'redis://localhost:6379'; // Fallback, aunque probablemente fallará en Railway
    } else {
      console.log('🖥️ Usando Redis local por defecto');
      return 'redis://localhost:6379';
    }
  }

  /**
   * Enmascara credenciales en URL para mostrarla en logs
   * @param {string} url La URL a enmascarar
   * @returns {string} URL con credenciales enmascaradas
   */
  maskUrl(url) {
    if (!url) return 'undefined';
    if (this.isRailwayPlaceholder(url)) return url; // No enmascarar placeholders
    
    return url.includes('@') 
      ? url.replace(/\/\/([^:]+):[^@]+@/, '//***:***@') 
      : url;
  }

  async connect() {
    try {
      // Determinar la URL apropiada
      const redisUrl = this.determineRedisUrl();
      
      console.log(`🔄 Intentando conectar a Redis: ${this.maskUrl(redisUrl)}`);
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.log(`❌ No se pudo conectar a Redis después de ${retries} intentos`);
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          console.error('Redis Client Error:', err);
        }
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log(`✅ Conectado a Redis: ${this.maskUrl(redisUrl)}`);
        this.isConnected = true;
      });

      try {
        await this.client.connect();
        return true;
      } catch (error) {
        console.warn(`⚠️ Error al conectar a Redis: ${error.message}`);
        
        // En producción, esto es crítico si Redis es requerido
        if (this.inProduction && process.env.REDIS_REQUIRED === 'true') {
          console.error('❌ ERROR CRÍTICO: Redis es requerido pero no disponible');
          if (process.env.NODE_ENV === 'production') {
            // Solo terminamos el proceso si estamos realmente en producción
            process.exit(1);
          }
        }
        
        console.log('📝 Continuando con funcionalidad limitada (sin caché)');
        return false;
      }
    } catch (error) {
      console.error('Error general conectando a Redis:', error);
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error al obtener de Redis:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) return false;
    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Error al guardar en Redis:', error);
      return false;
    }
  }

  async delete(key) {
    if (!this.isConnected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error al eliminar de Redis:', error);
      return false;
    }
  }

  async deletePattern(pattern) {
    if (!this.isConnected) return false;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Error al eliminar patrón de Redis:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        console.log('👋 Desconectado de Redis');
      } catch (error) {
        console.error('Error al desconectar de Redis:', error);
      }
      this.isConnected = false;
    }
  }
}

// Singleton
const redisService = new RedisService();
module.exports = redisService;