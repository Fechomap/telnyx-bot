// src/services/redisService.js
const redis = require('redis');
require('dotenv').config();

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 1800; // 30 minutos
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) return false;
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Conectado a Redis');
        this.isConnected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Error conectando a Redis:', error);
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
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Singleton
const redisService = new RedisService();
module.exports = redisService;