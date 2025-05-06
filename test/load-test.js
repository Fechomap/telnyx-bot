/**
 * Herramienta de pruebas de carga para TeXML
 * Simula múltiples llamadas simultáneas para evaluar rendimiento
 */
const axios = require('axios');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const ora = require('ora'); // Para indicadores visuales de progreso

// Configuración por defecto
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:3000',
  concurrentCalls: 10,
  callDuration: 60, // segundos
  rampUpTime: 5,    // segundos
  expediente: '12345',
  outputFile: 'load-test-results.json'
};

// Opciones de línea de comandos
const args = process.argv.slice(2);
const config = { ...DEFAULT_CONFIG };

// Procesar argumentos
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--url' && i + 1 < args.length) config.serverUrl = args[++i];
  else if (arg === '--calls' && i + 1 < args.length) config.concurrentCalls = parseInt(args[++i]);
  else if (arg === '--duration' && i + 1 < args.length) config.callDuration = parseInt(args[++i]);
  else if (arg === '--rampup' && i + 1 < args.length) config.rampUpTime = parseInt(args[++i]);
  else if (arg === '--expediente' && i + 1 < args.length) config.expediente = args[++i];
  else if (arg === '--output' && i + 1 < args.length) config.outputFile = args[++i];
  else if (arg === '--help') {
    console.log(`
Load Testing Tool for TeXML IVR

Usage: node load-test.js [options]

Options:
  --url URL            Server URL (default: http://localhost:3000)
  --calls N            Number of concurrent calls (default: 10)
  --duration N         Duration of test in seconds (default: 60)
  --rampup N           Time to ramp up all calls in seconds (default: 5)
  --expediente ID      Expediente number to use (default: 12345)
  --output FILE        Output file for results (default: load-test-results.json)
  --help               Show this help message

Example:
  node load-test.js --url https://your-server.herokuapp.com --calls 20 --duration 120
    `);
    process.exit(0);
  }
}

// Clase para simular una llamada
class CallSimulator {
  constructor(id, config) {
    this.id = id;
    this.config = config;
    this.sessionId = null;
    this.metrics = {
      startTime: 0,
      endTime: 0,
      duration: 0,
      steps: [],
      errors: [],
      completed: false
    };
  }

  async start() {
    this.metrics.startTime = Date.now();
    
    try {
      // Paso 1: Bienvenida
      await this.step('welcome', async () => {
        const response = await axios.post(`${this.config.serverUrl}/welcome`, {}, {
          headers: { 'Content-Type': 'application/json' }
        });
        return this.validateXmlResponse(response.data);
      });
      
      // Paso 2: Seleccionar opción de expediente
      await this.step('select_expediente', async () => {
        const response = await axios.post(`${this.config.serverUrl}/expediente`, {
          Digits: '1'
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return this.validateXmlResponse(response.data);
      });
      
      // Paso 3: Ingresar número de expediente
      await this.step('enter_expediente', async () => {
        const response = await axios.post(`${this.config.serverUrl}/validar-expediente`, {
          Digits: this.config.expediente + '#'
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        // Extraer sessionId de la respuesta
        const xmlResponse = response.data;
        const sessionIdMatch = xmlResponse.match(/sessionId=([^"&]+)/);
        if (sessionIdMatch && sessionIdMatch[1]) {
          this.sessionId = sessionIdMatch[1];
        }
        
        return this.validateXmlResponse(xmlResponse);
      });
      
      // Verificar si se obtuvo un sessionId
      if (!this.sessionId) {
        throw new Error('No se pudo obtener sessionId de la respuesta');
      }
      
      // Paso 4: Seleccionar opción de costos
      await this.step('select_costos', async () => {
        const response = await axios.post(`${this.config.serverUrl}/respuesta?sessionId=${this.sessionId}`, {
          Digits: '1'
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return this.validateXmlResponse(response.data);
      });
      
      // Paso 5: Seleccionar opción de unidad
      await this.step('select_unidad', async () => {
        const response = await axios.post(`${this.config.serverUrl}/respuesta?sessionId=${this.sessionId}`, {
          Digits: '2'
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return this.validateXmlResponse(response.data);
      });
      
      // Paso 6: Seleccionar opción de ubicación/tiempos
      await this.step('select_ubicacion', async () => {
        const response = await axios.post(`${this.config.serverUrl}/respuesta?sessionId=${this.sessionId}`, {
          Digits: '3'
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return this.validateXmlResponse(response.data);
      });
      
      // Paso 7: Finalizar llamada
      await this.step('hangup', async () => {
        // Simulación de colgar
        return true;
      });
      
      this.metrics.completed = true;
    } catch (error) {
      this.metrics.errors.push({
        time: Date.now(),
        message: error.message,
        stack: error.stack
      });
    } finally {
      this.metrics.endTime = Date.now();
      this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    }
    
    return this.metrics;
  }
  
  async step(name, fn) {
    const stepMetric = {
      name,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      success: false
    };
    
    try {
      const result = await fn();
      stepMetric.success = result === true;
    } catch (error) {
      stepMetric.error = {
        message: error.message,
        stack: error.stack
      };
      throw error;
    } finally {
      stepMetric.endTime = Date.now();
      stepMetric.duration = stepMetric.endTime - stepMetric.startTime;
      this.metrics.steps.push(stepMetric);
    }
    
    return stepMetric.success;
  }
  
  validateXmlResponse(xml) {
    // Verificación básica de que sea un XML válido
    return xml.includes('<?xml') && xml.includes('<Response>');
  }
}

// Función para ejecutar prueba en un worker thread
async function runWorker() {
  const { id, config } = workerData;
  const simulator = new CallSimulator(id, config);
  const result = await simulator.start();
  parentPort.postMessage(result);
}

// Función principal para ejecutar la prueba de carga
async function runLoadTest() {
  if (!isMainThread) {
    return runWorker();
  }
  
  console.log('🚀 Iniciando prueba de carga TeXML');
  console.log(`Configuración:
- Servidor: ${config.serverUrl}
- Llamadas simultáneas: ${config.concurrentCalls}
- Duración: ${config.callDuration} segundos
- Expediente: ${config.expediente}
- Archivo de resultados: ${config.outputFile}
`);
  
  const spinner = ora('Preparando prueba...').start();
  
  // Resultados globales
  const results = {
    config,
    startTime: Date.now(),
    endTime: 0,
    duration: 0,
    totalCalls: config.concurrentCalls,
    completedCalls: 0,
    failedCalls: 0,
    callDetails: []
  };
  
  // Crear los workers para simular llamadas
  const workers = [];
  const rampUpDelay = (config.rampUpTime * 1000) / config.concurrentCalls;
  
  for (let i = 0; i < config.concurrentCalls; i++) {
    // Esperar para simular rampa de carga
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, rampUpDelay));
      spinner.text = `Iniciando llamada ${i + 1}/${config.concurrentCalls}...`;
    }
    
    const worker = new Worker(__filename, {
      workerData: { 
        id: i + 1,
        config
      }
    });
    
    worker.on('message', (message) => {
      results.callDetails.push({
        callId: i + 1,
        ...message
      });
      
      if (message.completed) {
        results.completedCalls++;
      } else {
        results.failedCalls++;
      }
      
      spinner.text = `Progreso: ${results.callDetails.length}/${config.concurrentCalls} llamadas procesadas`;
    });
    
    workers.push(worker);
  }
  
  // Esperar a que todas las llamadas terminen
  await Promise.all(workers.map(worker => {
    return new Promise((resolve) => {
      worker.on('exit', resolve);
    });
  }));
  
  // Completar resultados
  results.endTime = Date.now();
  results.duration = results.endTime - results.startTime;
  
  // Calcular métricas agregadas
  results.metrics = {
    avgCallDuration: 0,
    minCallDuration: Number.MAX_SAFE_INTEGER,
    maxCallDuration: 0,
    successRate: 0,
    avgStepDuration: {},
    stepSuccessRate: {}
  };
  
  // Procesar resultados
  if (results.callDetails.length > 0) {
    // Duración de llamadas
    let totalDuration = 0;
    results.callDetails.forEach(call => {
      totalDuration += call.duration;
      results.metrics.minCallDuration = Math.min(results.metrics.minCallDuration, call.duration);
      results.metrics.maxCallDuration = Math.max(results.metrics.maxCallDuration, call.duration);
    });
    results.metrics.avgCallDuration = totalDuration / results.callDetails.length;
    
    // Tasa de éxito
    results.metrics.successRate = (results.completedCalls / results.totalCalls) * 100;
    
    // Métricas por paso
    const stepTotals = {};
    const stepCounts = {};
    const stepSuccess = {};
    
    results.callDetails.forEach(call => {
      call.steps.forEach(step => {
        if (!stepTotals[step.name]) {
          stepTotals[step.name] = 0;
          stepCounts[step.name] = 0;
          stepSuccess[step.name] = { success: 0, total: 0 };
        }
        
        stepTotals[step.name] += step.duration;
        stepCounts[step.name]++;
        stepSuccess[step.name].total++;
        if (step.success) stepSuccess[step.name].success++;
      });
    });
    
    // Calcular promedios y tasas de éxito por paso
    Object.keys(stepTotals).forEach(step => {
      results.metrics.avgStepDuration[step] = stepTotals[step] / stepCounts[step];
      results.metrics.stepSuccessRate[step] = (stepSuccess[step].success / stepSuccess[step].total) * 100;
    });
  }
  
  // Guardar resultados
  fs.writeFileSync(
    path.join(process.cwd(), config.outputFile),
    JSON.stringify(results, null, 2)
  );
  
  spinner.succeed(`Prueba completada. Resultados guardados en ${config.outputFile}`);
  
  // Mostrar resumen
  console.log('\n📊 Resumen de la prueba:');
  console.log(`- Llamadas totales: ${results.totalCalls}`);
  console.log(`- Llamadas completadas: ${results.completedCalls}`);
  console.log(`- Llamadas fallidas: ${results.failedCalls}`);
  console.log(`- Tasa de éxito: ${results.metrics.successRate.toFixed(2)}%`);
  console.log(`- Tiempo promedio por llamada: ${(results.metrics.avgCallDuration / 1000).toFixed(2)} segundos`);
  console.log(`- Tiempo mínimo: ${(results.metrics.minCallDuration / 1000).toFixed(2)} segundos`);
  console.log(`- Tiempo máximo: ${(results.metrics.maxCallDuration / 1000).toFixed(2)} segundos`);
  
  console.log('\n⏱️ Tiempos por paso:');
  Object.keys(results.metrics.avgStepDuration).forEach(step => {
    console.log(`- ${step}: ${(results.metrics.avgStepDuration[step] / 1000).toFixed(2)} segundos (${results.metrics.stepSuccessRate[step].toFixed(2)}% éxito)`);
  });
  
  return results;
}

// Ejecutar si es el hilo principal
if (isMainThread) {
  runLoadTest().catch(error => {
    console.error('Error en prueba de carga:', error);
    process.exit(1);
  });
}

module.exports = { runLoadTest };