// src/controllers/adminController.js
const fs = require('fs').promises;
const path = require('path');
const configManager = require('../services/configManager');
const monitoring = require('../utils/monitoring');
const redisService = require('../services/redisService');

class AdminController {
  /**
   * Obtener configuración actual
   */
  async getConfig(req, res) {
    try {
      const config = await configManager.getCurrentConfig();
      res.json(config);
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({
        error: 'Error al obtener configuración',
        message: error.message
      });
    }
  }

  /**
   * Actualizar configuración
   */
  async updateConfig(req, res) {
    try {
      const newConfig = req.body;
      
      // Validar configuración
      const validation = configManager.validateConfig(newConfig);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Configuración inválida',
          details: validation.errors
        });
      }

      // Actualizar configuración
      await configManager.updateConfig(newConfig);
      
      // Log de la actualización
      console.log(`📝 Configuración actualizada por admin desde IP: ${req.ip}`);
      monitoring.trackAdminAction('config_updated', req.ip);

      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({
        error: 'Error al actualizar configuración',
        message: error.message
      });
    }
  }

  /**
   * Obtener estado del sistema
   */
  async getSystemStatus(req, res) {
    try {
      const status = {
        uptime: this.formatUptime(process.uptime()),
        memory: this.formatMemoryUsage(process.memoryUsage()),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
        services: await this.checkServices()
      };

      // Obtener métricas de Redis si está disponible
      try {
        const redisInfo = await redisService.info();
        status.redis = {
          connected: true,
          memory: redisInfo.used_memory_human || 'N/A',
          connections: redisInfo.connected_clients || '0'
        };
      } catch (error) {
        status.redis = { connected: false, error: error.message };
      }

      // Obtener métricas básicas
      const todaysCalls = await this.getTodaysCallCount();
      status.totalCalls = todaysCalls;

      res.json(status);

    } catch (error) {
      console.error('Error getting system status:', error);
      res.status(500).json({
        error: 'Error al obtener estado del sistema',
        message: error.message
      });
    }
  }

  /**
   * Probar conectividad del sistema
   */
  async testSystem(req, res) {
    try {
      const tests = [];
      
      // Test Redis
      try {
        await redisService.ping();
        tests.push({ name: 'Redis', status: 'success', message: 'Conectado' });
      } catch (error) {
        tests.push({ name: 'Redis', status: 'error', message: error.message });
      }

      // Test API Externa
      try {
        const axios = require('axios');
        const apiUrl = process.env.API_BASE_URL;
        if (apiUrl) {
          const response = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
          tests.push({ name: 'API Externa', status: 'success', message: 'Disponible' });
        } else {
          tests.push({ name: 'API Externa', status: 'warning', message: 'URL no configurada' });
        }
      } catch (error) {
        tests.push({ name: 'API Externa', status: 'error', message: 'No disponible' });
      }

      // Test OpenAI
      try {
        const openaiConfig = require('../config/openaiConfig');
        if (openaiConfig.apiKey && openaiConfig.assistantId) {
          tests.push({ name: 'OpenAI', status: 'success', message: 'Configurado' });
        } else {
          tests.push({ name: 'OpenAI', status: 'warning', message: 'Configuración incompleta' });
        }
      } catch (error) {
        tests.push({ name: 'OpenAI', status: 'error', message: error.message });
      }

      const allSuccess = tests.every(test => test.status === 'success');
      
      res.json({
        success: allSuccess,
        message: allSuccess ? 'Todos los sistemas funcionan correctamente' : 'Se encontraron algunos problemas',
        tests
      });

    } catch (error) {
      console.error('Error testing system:', error);
      res.status(500).json({
        error: 'Error al probar sistema',
        message: error.message
      });
    }
  }

  /**
   * Reiniciar sistema (solo en desarrollo)
   */
  async restartSystem(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          error: 'Operación no permitida',
          message: 'El reinicio manual no está permitido en producción'
        });
      }

      console.log(`🔄 Sistema reiniciado por admin desde IP: ${req.ip}`);
      monitoring.trackAdminAction('system_restarted', req.ip);

      res.json({
        success: true,
        message: 'Sistema reiniciando...'
      });

      // Esperar un momento para que la respuesta llegue al cliente
      setTimeout(() => {
        process.exit(0);
      }, 1000);

    } catch (error) {
      console.error('Error restarting system:', error);
      res.status(500).json({
        error: 'Error al reiniciar sistema',
        message: error.message
      });
    }
  }

  /**
   * Obtener logs recientes
   */
  async getLogs(req, res) {
    try {
      const lines = parseInt(req.query.lines) || 100;
      const level = req.query.level || 'all';
      
      // Aquí implementarías la lógica para obtener logs
      // Por simplicidad, retornamos logs básicos
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Sistema funcionando normalmente',
          source: 'system'
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'info',
          message: 'Llamada procesada exitosamente',
          source: 'ivr'
        }
      ];

      res.json({ logs });

    } catch (error) {
      console.error('Error getting logs:', error);
      res.status(500).json({
        error: 'Error al obtener logs',
        message: error.message
      });
    }
  }

  /**
   * Obtener métricas del sistema
   */
  async getMetrics(req, res) {
    try {
      const metrics = {
        calls: {
          total: await this.getTotalCallCount(),
          today: await this.getTodaysCallCount(),
          thisWeek: await this.getWeekCallCount(),
          thisMonth: await this.getMonthCallCount()
        },
        errors: {
          total: await this.getTotalErrorCount(),
          today: await this.getTodaysErrorCount()
        },
        performance: {
          avgResponseTime: await this.getAverageResponseTime(),
          uptime: process.uptime()
        }
      };

      res.json(metrics);

    } catch (error) {
      console.error('Error getting metrics:', error);
      res.status(500).json({
        error: 'Error al obtener métricas',
        message: error.message
      });
    }
  }

  // Métodos auxiliares
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  formatMemoryUsage(memUsage) {
    return {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
    };
  }

  async checkServices() {
    const services = {};
    
    // Check Redis
    try {
      await redisService.ping();
      services.redis = 'healthy';
    } catch (error) {
      services.redis = 'unhealthy';
    }

    return services;
  }

  async getTodaysCallCount() {
    try {
      // Implementar lógica para contar llamadas de hoy
      return Math.floor(Math.random() * 100); // Placeholder
    } catch (error) {
      return 0;
    }
  }

  async getTotalCallCount() {
    try {
      // Implementar lógica para contar todas las llamadas
      return Math.floor(Math.random() * 1000); // Placeholder
    } catch (error) {
      return 0;
    }
  }

  async getWeekCallCount() {
    try {
      return Math.floor(Math.random() * 500); // Placeholder
    } catch (error) {
      return 0;
    }
  }

  async getMonthCallCount() {
    try {
      return Math.floor(Math.random() * 2000); // Placeholder
    } catch (error) {
      return 0;
    }
  }

  async getTotalErrorCount() {
    try {
      return Math.floor(Math.random() * 10); // Placeholder
    } catch (error) {
      return 0;
    }
  }

  async getTodaysErrorCount() {
    try {
      return Math.floor(Math.random() * 3); // Placeholder
    } catch (error) {
      return 0;
    }
  }

  async getAverageResponseTime() {
    try {
      return Math.floor(Math.random() * 200) + 50; // Placeholder: 50-250ms
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new AdminController();