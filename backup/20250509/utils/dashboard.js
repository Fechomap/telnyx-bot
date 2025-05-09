/**
 * Módulo para dashboard de monitoreo en tiempo real
 * Genera una interfaz web para visualizar métricas del sistema
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const monitoring = require('./monitoring');
const sessionCache = require('../cache/sessionCache');
const { getCacheStats } = require('../services/optimizedDataService');

// Ruta para archivos estáticos del dashboard
const DASHBOARD_DIR = path.join(process.cwd(), 'public', 'dashboard');

// Asegurar que el directorio existe
if (!fs.existsSync(DASHBOARD_DIR)) {
  fs.mkdirSync(DASHBOARD_DIR, { recursive: true });
}

// Crear archivo HTML base para el dashboard
const createDashboardHtml = () => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TeXML Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { padding-top: 20px; background-color: #f8f9fa; }
    .card { margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .card-header { background-color: #6c757d; color: white; font-weight: bold; }
    .metric { font-size: 24px; font-weight: bold; }
    .metric-label { font-size: 14px; color: #6c757d; }
    .refresh-btn { position: fixed; bottom: 20px; right: 20px; z-index: 100; }
  </style>
</head>
<body>
  <div class="container">
    <header class="mb-4">
      <h1 class="text-center">TeXML Dashboard</h1>
      <p class="text-center text-muted">Sistema de monitoreo en tiempo real</p>
      <p class="text-center" id="lastUpdate"></p>
    </header>
    
    <div class="row">
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">Estado del Sistema</div>
          <div class="card-body">
            <div class="row">
              <div class="col-6 text-center">
                <div class="metric" id="statusValue">...</div>
                <div class="metric-label">Estado</div>
              </div>
              <div class="col-6 text-center">
                <div class="metric" id="uptimeValue">...</div>
                <div class="metric-label">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">Sesiones</div>
          <div class="card-body">
            <div class="row">
              <div class="col-6 text-center">
                <div class="metric" id="activeSessionsValue">...</div>
                <div class="metric-label">Activas</div>
              </div>
              <div class="col-6 text-center">
                <div class="metric" id="totalSessionsValue">...</div>
                <div class="metric-label">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">Solicitudes</div>
          <div class="card-body">
            <div class="row">
              <div class="col-6 text-center">
                <div class="metric" id="totalRequestsValue">...</div>
                <div class="metric-label">Total</div>
              </div>
              <div class="col-6 text-center">
                <div class="metric" id="errorRateValue">...</div>
                <div class="metric-label">Tasa Error</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">Rendimiento</div>
          <div class="card-body">
            <canvas id="performanceChart" height="200"></canvas>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">Recursos</div>
          <div class="card-body">
            <canvas id="resourcesChart" height="200"></canvas>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">Reconocimiento de Voz</div>
          <div class="card-body">
            <canvas id="speechChart" height="200"></canvas>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">Expedientes</div>
          <div class="card-body">
            <canvas id="expedientesChart" height="200"></canvas>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">Solicitudes por Endpoint</div>
          <div class="card-body">
            <canvas id="endpointsChart" height="200"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <button class="btn btn-primary refresh-btn" id="refreshBtn">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
    </svg>
    Actualizar
  </button>
  
  <script>
    // Función para cargar los datos del dashboard
    async function loadDashboardData() {
      try {
        const response = await fetch('/admin/metrics?token=${process.env.ADMIN_TOKEN || 'admin'}');
        if (!response.ok) {
          throw new Error('Error al cargar datos de métricas');
        }
        
        const data = await response.json();
        updateDashboard(data);
      } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar datos. Intente nuevamente.');
      }
    }
    
    // Función para actualizar el dashboard con los datos recibidos
    function updateDashboard(data) {
      // Actualizar fecha y hora
      document.getElementById('lastUpdate').textContent = 'Última actualización: ' + new Date().toLocaleString();
      
      // Actualizar métricas generales
      document.getElementById('statusValue').textContent = data.status || 'N/A';
      document.getElementById('uptimeValue').textContent = data.uptime || 'N/A';
      document.getElementById('activeSessionsValue').textContent = data.sessions?.active || 0;
      document.getElementById('totalSessionsValue').textContent = data.sessions?.created || 0;
      document.getElementById('totalRequestsValue').textContent = data.requests?.total || 0;
      document.getElementById('errorRateValue').textContent = data.requests?.errors?.rate || '0%';
      
      // Actualizar gráficos...
      updatePerformanceChart(data);
      updateResourcesChart(data);
      updateSpeechChart(data);
      updateExpedientesChart(data);
      updateEndpointsChart(data);
    }
    
    // Gráficos (se implementarán con Chart.js)
    let performanceChart, resourcesChart, speechChart, expedientesChart, endpointsChart;
    
    function initCharts() {
      // Gráfico de rendimiento
      const performanceCtx = document.getElementById('performanceChart').getContext('2d');
      performanceChart = new Chart(performanceCtx, {
        type: 'line',
        data: {
          labels: ['Actual'],
          datasets: [
            {
              label: 'Tiempo de Respuesta (ms)',
              data: [0],
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
            },
            {
              label: 'Tiempo de Consulta (ms)',
              data: [0],
              borderColor: 'rgba(153, 102, 255, 1)',
              backgroundColor: 'rgba(153, 102, 255, 0.2)',
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      
      // Gráfico de recursos
      const resourcesCtx = document.getElementById('resourcesChart').getContext('2d');
      resourcesChart = new Chart(resourcesCtx, {
        type: 'bar',
        data: {
          labels: ['Memoria', 'CPU'],
          datasets: [{
            label: 'Uso (%)',
            data: [0, 0],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
      
      // Gráfico de reconocimiento de voz
      const speechCtx = document.getElementById('speechChart').getContext('2d');
      speechChart = new Chart(speechCtx, {
        type: 'doughnut',
        data: {
          labels: ['Exitoso', 'Fallido'],
          datasets: [{
            data: [0, 0],
            backgroundColor: [
              'rgba(75, 192, 192, 0.2)',
              'rgba(255, 99, 132, 0.2)'
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true
        }
      });
      
      // Gráfico de expedientes
      const expedientesCtx = document.getElementById('expedientesChart').getContext('2d');
      expedientesChart = new Chart(expedientesCtx, {
        type: 'pie',
        data: {
          labels: ['Encontrados', 'No Encontrados', 'Desde Caché'],
          datasets: [{
            data: [0, 0, 0],
            backgroundColor: [
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 99, 132, 0.2)',
              'rgba(255, 206, 86, 0.2)'
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true
        }
      });
      
      // Gráfico de endpoints
      const endpointsCtx = document.getElementById('endpointsChart').getContext('2d');
      endpointsChart = new Chart(endpointsCtx, {
        type: 'bar',
        data: {
          labels: ['Endpoints'],
          datasets: [{
            label: 'Solicitudes',
            data: [0],
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
    
    function updatePerformanceChart(data) {
      if (!performanceChart) return;
      
      // Extraer valores de tiempos
      const responseTimeAvg = parseFloat(data.performance?.responseTime?.avg || '0');
      const dataQueryTimeAvg = parseFloat(data.performance?.dataQueryTime?.avg || '0');
      
      // Actualizar datos del gráfico
      performanceChart.data.datasets[0].data = [responseTimeAvg];
      performanceChart.data.datasets[1].data = [dataQueryTimeAvg];
      performanceChart.update();
    }
    
    function updateResourcesChart(data) {
      if (!resourcesChart) return;
      
      // En una implementación real, estos datos vendrían del servidor
      const memoryUsage = data.memory ? 
        (data.memory.heapUsed / data.memory.heapTotal * 100).toFixed(2) : 0;
      const cpuUsage = data.cpu || 0;
      
      resourcesChart.data.datasets[0].data = [memoryUsage, cpuUsage];
      resourcesChart.update();
    }
    
    function updateSpeechChart(data) {
      if (!speechChart) return;
      
      const successful = data.features?.speechRecognition?.successful || 0;
      const failed = data.features?.speechRecognition?.failed || 0;
      
      speechChart.data.datasets[0].data = [successful, failed];
      speechChart.update();
    }
    
    function updateExpedientesChart(data) {
      if (!expedientesChart) return;
      
      const found = data.features?.expedientes?.found || 0;
      const notFound = data.features?.expedientes?.notFound || 0;
      const cached = data.features?.expedientes?.cached || 0;
      
      expedientesChart.data.datasets[0].data = [found, notFound, cached];
      expedientesChart.update();
    }
    
    function updateEndpointsChart(data) {
      if (!endpointsChart) return;
      
      const endpoints = data.requests?.byEndpoint || {};
      const labels = Object.keys(endpoints);
      const values = Object.values(endpoints);
      
      endpointsChart.data.labels = labels;
      endpointsChart.data.datasets[0].data = values;
      endpointsChart.update();
    }
    
    // Inicializar gráficos y cargar datos
    document.addEventListener('DOMContentLoaded', function() {
      initCharts();
      loadDashboardData();
      
      // Configurar botón de actualización
      document.getElementById('refreshBtn').addEventListener('click', loadDashboardData);
      
      // Actualizar automáticamente cada 30 segundos
      setInterval(loadDashboardData, 30000);
    });
  </script>
</body>
</html>
  `;
  
  fs.writeFileSync(
    path.join(DASHBOARD_DIR, 'index.html'),
    htmlContent
  );
}

/**
 * Configurar rutas para el dashboard
 * @param {Object} app - Instancia de Express
 * @param {string} basePath - Ruta base para el dashboard
 */
function setupDashboard(app, basePath = '/admin/dashboard') {
  // Crear archivo HTML del dashboard
  createDashboardHtml();
  
  // Servir archivos estáticos del dashboard
  app.use(basePath, express.static(DASHBOARD_DIR));
  
  // Endpoint para métricas del dashboard
  app.get('/admin/metrics', (req, res) => {
    // Verificar token de autorización
    const authToken = req.query.token || '';
    if (authToken !== process.env.ADMIN_TOKEN && authToken !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Obtener métricas del sistema
    const metrics = monitoring.getMetricsSummary();
    
    // Agregar información adicional
    const memory = process.memoryUsage();
    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length; // Estimación simplificada
    
    // Obtener información de caché
    const cache = {
      sessions: sessionCache.getActiveSessionsCount(),
      expedientes: getCacheStats()
    };
    
    // Construir respuesta completa
    const response = {
      ...metrics,
      status: 'OK',
      memory,
      cpu: cpuUsage.toFixed(2),
      cache
    };
    
    res.json(response);
  });
  
  console.log(`📊 Dashboard configurado en ${basePath}`);
}

module.exports = { setupDashboard };