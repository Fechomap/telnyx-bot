// src/services/configManager.js
const fs = require('fs').promises;
const path = require('path');

class ConfigManager {
  constructor() {
    this.configPath = path.join(process.cwd(), '.env');
    this.currentConfig = {};
    this.loadConfig();
  }

  /**
   * Cargar configuración actual desde variables de entorno
   */
  async loadConfig() {
    this.currentConfig = {
      // Configuración del entorno
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '3000',

      // APIs
      API_BASE_URL: process.env.API_BASE_URL || '',
      WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || '',

      // Telnyx
      TELNYX_API_KEY: process.env.TELNYX_API_KEY || '',
      TELNYX_CALLER_ID: process.env.TELNYX_CALLER_ID || '',
      TELNYX_CONNECTION_ID: process.env.TELNYX_CONNECTION_ID || '',
      TELNYX_PUBLIC_KEY: process.env.TELNYX_PUBLIC_KEY || '',

      // Transferencias
      TRANSFER_ENABLED: process.env.TRANSFER_ENABLED || 'true',
      AGENT_NUMBER: process.env.AGENT_NUMBER || '',

      // IVR
      IVR_OPTIMIZED_MODE: process.env.IVR_OPTIMIZED_MODE || 'true',

      // Opción 2
      OPTION2_TRANSFER_MODE: process.env.OPTION2_TRANSFER_MODE || 'true',
      OPTION2_ALLOWED_NUMBERS: process.env.OPTION2_ALLOWED_NUMBERS || '',
      OPTION2_TRANSFER_NUMBER: process.env.OPTION2_TRANSFER_NUMBER || '',
      OPTION2_BLOCKED_TRANSFER_NUMBER: process.env.OPTION2_BLOCKED_TRANSFER_NUMBER || '',

      // OpenAI
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID || '',
      OPENAI_TIMEOUT: process.env.OPENAI_TIMEOUT || '30000',

      // Redis
      REDIS_URL: process.env.REDIS_URL || '',

      // Admin
      ADMIN_TOKEN: process.env.ADMIN_TOKEN || ''
    };
  }

  /**
   * Obtener configuración actual (sin claves sensibles para el frontend)
   */
  async getCurrentConfig() {
    await this.loadConfig();
    
    // Crear copia sin datos sensibles
    const safeConfig = { ...this.currentConfig };
    
    // Ocultar claves sensibles
    if (safeConfig.TELNYX_API_KEY) {
      safeConfig.TELNYX_API_KEY = '***' + safeConfig.TELNYX_API_KEY.slice(-4);
    }
    if (safeConfig.OPENAI_API_KEY) {
      safeConfig.OPENAI_API_KEY = '***' + safeConfig.OPENAI_API_KEY.slice(-4);
    }
    if (safeConfig.ADMIN_TOKEN) {
      safeConfig.ADMIN_TOKEN = '***' + safeConfig.ADMIN_TOKEN.slice(-4);
    }
    if (safeConfig.TELNYX_PUBLIC_KEY) {
      safeConfig.TELNYX_PUBLIC_KEY = '***' + safeConfig.TELNYX_PUBLIC_KEY.slice(-4);
    }
    
    return safeConfig;
  }

  /**
   * Validar configuración
   */
  validateConfig(config) {
    const errors = [];

    // Validaciones básicas
    if (config.TELNYX_CALLER_ID && !this.isValidPhoneNumber(config.TELNYX_CALLER_ID)) {
      errors.push('TELNYX_CALLER_ID debe ser un número de teléfono válido');
    }

    if (config.AGENT_NUMBER) {
      const agentNumbers = config.AGENT_NUMBER.split(',').map(n => n.trim());
      agentNumbers.forEach((number, index) => {
        if (!this.isValidPhoneNumber(number)) {
          errors.push(`Número de agente ${index + 1} inválido: ${number}`);
        }
      });
    }

    if (config.OPTION2_TRANSFER_NUMBER && !this.isValidPhoneNumber(config.OPTION2_TRANSFER_NUMBER)) {
      errors.push('OPTION2_TRANSFER_NUMBER debe ser un número de teléfono válido');
    }

    if (config.OPTION2_BLOCKED_TRANSFER_NUMBER && !this.isValidPhoneNumber(config.OPTION2_BLOCKED_TRANSFER_NUMBER)) {
      errors.push('OPTION2_BLOCKED_TRANSFER_NUMBER debe ser un número de teléfono válido');
    }

    if (config.API_BASE_URL && !this.isValidUrl(config.API_BASE_URL)) {
      errors.push('API_BASE_URL debe ser una URL válida');
    }

    if (config.WEBHOOK_BASE_URL && !this.isValidUrl(config.WEBHOOK_BASE_URL)) {
      errors.push('WEBHOOK_BASE_URL debe ser una URL válida');
    }

    if (config.OPENAI_TIMEOUT) {
      const timeout = parseInt(config.OPENAI_TIMEOUT);
      if (isNaN(timeout) || timeout < 5000 || timeout > 120000) {
        errors.push('OPENAI_TIMEOUT debe estar entre 5000 y 120000 milisegundos');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Actualizar configuración
   */
  async updateConfig(newConfig) {
    // Validar primero
    const validation = this.validateConfig(newConfig);
    if (!validation.valid) {
      throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
    }

    // Actualizar variables de entorno en memoria
    Object.keys(newConfig).forEach(key => {
      if (newConfig[key] !== undefined) {
        process.env[key] = newConfig[key];
      }
    });

    // Actualizar archivo .env
    await this.updateEnvFile(newConfig);
    
    // Recargar configuración
    await this.loadConfig();

    console.log('✅ Configuración actualizada exitosamente');
  }

  /**
   * Actualizar archivo .env
   */
  async updateEnvFile(newConfig) {
    try {
      // Leer archivo actual
      let envContent = '';
      try {
        envContent = await fs.readFile(this.configPath, 'utf8');
      } catch (error) {
        // Si no existe el archivo, lo creamos
        console.log('📝 Creando nuevo archivo .env');
      }

      // Parsear contenido actual
      const envLines = envContent.split('\n');
      const envMap = new Map();
      
      envLines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            envMap.set(key.trim(), valueParts.join('='));
          }
        }
      });

      // Actualizar valores
      Object.keys(newConfig).forEach(key => {
        if (newConfig[key] !== undefined) {
          envMap.set(key, newConfig[key]);
        }
      });

      // Generar nuevo contenido
      const newEnvContent = Array.from(envMap.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Escribir archivo
      await fs.writeFile(this.configPath, newEnvContent, 'utf8');
      
      console.log(`📝 Archivo .env actualizado en: ${this.configPath}`);

    } catch (error) {
      console.error('❌ Error actualizando archivo .env:', error);
      throw new Error(`No se pudo actualizar el archivo .env: ${error.message}`);
    }
  }

  /**
   * Validar número de teléfono
   */
  isValidPhoneNumber(phone) {
    if (!phone) return false;
    // Permitir números con + al inicio y dígitos, espacios, guiones y paréntesis
    const phoneRegex = /^(\+\d{1,3})?[\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Validar URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener valor de configuración específico
   */
  getConfigValue(key) {
    return this.currentConfig[key] || process.env[key];
  }

  /**
   * Backup de configuración
   */
  async backupConfig() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), `.env.backup.${timestamp}`);
    
    try {
      const currentContent = await fs.readFile(this.configPath, 'utf8');
      await fs.writeFile(backupPath, currentContent, 'utf8');
      console.log(`💾 Backup creado: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Error creando backup:', error);
      throw error;
    }
  }
}

module.exports = new ConfigManager();