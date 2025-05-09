/**
 * Herramienta de pruebas para AI Assistant
 * Simula conversaciones para evaluar respuestas
 */
const axios = require('axios');
const readline = require('readline');

// Configuración
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:3000',
  useVoice: false,
  expediente: '12345',
  delayBetweenRequests: 500,
  printXML: true
};

// Crear interfaz de línea de comandos
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Simulador de conversación
class AIFlowTester {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = null;
    this.steps = [];
  }
  
  async start() {
    console.log(`
🔊 ====== AI Assistant Tester ======
📞 URL: ${this.config.serverUrl}
🗣️ Voz: ${this.config.useVoice ? 'Activada' : 'Desactivada'}
🔢 Expediente de prueba: ${this.config.expediente}
⏱️ Retraso: ${this.config.delayBetweenRequests}ms
    `);
    
    try {
      // Paso 1: Iniciar con /welcome
      await this.stepWelcome();
      
      // Paso 2: Enviar expediente
      await this.stepSendExpediente();
      
      // Paso 3: Probar consultas
      await this.stepInteractiveQueries();
      
      console.log('\n✅ Prueba completada con éxito');
    } catch (error) {
      console.error('\n❌ Error en prueba:', error.message);
      if (error.response) {
        console.error('Detalles:', error.response.data);
      }
    } finally {
      rl.close();
    }
  }
  
  async stepWelcome() {
    console.log('\n🚀 Paso 1: Bienvenida');
    
    const response = await axios.get(`${this.config.serverUrl}/welcome`);
    
    if (this.config.printXML) {
      console.log('\nRespuesta XML:');
      console.log(response.data);
    }
    
    this.steps.push({
      step: 'welcome',
      status: 'completed',
      timestamp: Date.now()
    });
    
    console.log('✅ Bienvenida recibida. Debería solicitar número de expediente.');
    await this.delay();
  }
  
  async stepSendExpediente() {
    console.log('\n🚀 Paso 2: Enviar expediente');
    
    // Preparar consulta
    const query = this.config.useVoice 
      ? { SpeechResult: this.config.expediente }
      : { Digits: this.config.expediente };
    
    const response = await axios.post(
      `${this.config.serverUrl}/procesar-expediente`,
      query,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    if (this.config.printXML) {
      console.log('\nRespuesta XML:');
      console.log(response.data);
    }
    
    // Extraer sessionId del XML
    const sessionRegex = /sessionId=([^&"]+)/;
    const match = response.data.match(sessionRegex);
    
    if (match && match[1]) {
      this.sessionId = match[1];
      console.log(`✅ SessionId obtenido: ${this.sessionId}`);
    } else {
      console.warn('⚠️ No se pudo extraer sessionId. Verificar si el expediente fue encontrado.');
    }
    
    this.steps.push({
      step: 'send_expediente',
      status: this.sessionId ? 'completed' : 'warning',
      timestamp: Date.now(),
      sessionId: this.sessionId
    });
    
    await this.delay();
  }
  
  async stepInteractiveQueries() {
    console.log('\n🚀 Paso 3: Pruebas interactivas');
    
    if (!this.sessionId) {
      console.warn('⚠️ No hay sessionId válido. Omitiendo pruebas interactivas.');
      return;
    }
    
    const testQueries = [
      '¿Cuál es el costo del servicio?',
      '¿Cuáles son los datos de la unidad?',
      '¿Dónde está la grúa ahora?',
      '¿Cuáles son los tiempos del expediente?',
      'Quiero hablar con un agente'
    ];
    
    console.log('\nConsultas de prueba disponibles:');
    testQueries.forEach((query, index) => {
      console.log(`${index + 1}. ${query}`);
    });
    console.log('C. Consulta personalizada');
    console.log('Q. Salir');
    
    let continueInteraction = true;
    
    while (continueInteraction) {
      const choice = await this.prompt('\nSeleccione una opción (1-5, C, Q): ');
      
      if (choice.toLowerCase() === 'q') {
        continueInteraction = false;
        continue;
      }
      
      let query = '';
      
      if (choice.toLowerCase() === 'c') {
        query = await this.prompt('Ingrese su consulta: ');
      } else {
        const choiceNum = parseInt(choice);
        if (choiceNum >= 1 && choiceNum <= testQueries.length) {
          query = testQueries[choiceNum - 1];
        } else {
          console.log('❌ Opción inválida');
          continue;
        }
      }
      
      console.log(`🗣️ Enviando: "${query}"`);
      
      try {
        // Preparar consulta
        const queryData = this.config.useVoice 
          ? { SpeechResult: query }
          : { SpeechResult: query }; // Usar voz siempre para consultas
        
        const response = await axios.post(
          `${this.config.serverUrl}/interactuar?sessionId=${this.sessionId}`,
          queryData,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        if (this.config.printXML) {
          console.log('\nRespuesta XML:');
          console.log(response.data);
        }
        
        this.steps.push({
          step: 'query',
          query,
          status: 'completed',
          timestamp: Date.now()
        });
        
        console.log('✅ Respuesta recibida');
        await this.delay();
        
      } catch (error) {
        console.error('❌ Error en consulta:', error.message);
        this.steps.push({
          step: 'query',
          query,
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
  }
  
  prompt(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
  
  delay() {
    return new Promise(resolve => setTimeout(resolve, this.config.delayBetweenRequests));
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  // Procesar argumentos de línea de comandos
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--url' && i + 1 < args.length) config.serverUrl = args[++i];
    else if (arg === '--voice') config.useVoice = true;
    else if (arg === '--expediente' && i + 1 < args.length) config.expediente = args[++i];
    else if (arg === '--delay' && i + 1 < args.length) config.delayBetweenRequests = parseInt(args[++i]);
    else if (arg === '--no-xml') config.printXML = false;
    else if (arg === '--help') {
      console.log(`
Uso: node ai-flow-test.js [opciones]

Opciones:
  --url URL            URL del servidor (default: http://localhost:3000)
  --voice              Usar entrada de voz en lugar de DTMF
  --expediente ID      Número de expediente a probar (default: 12345)
  --delay MS           Retraso entre solicitudes en ms (default: 500)
  --no-xml             No mostrar respuestas XML
  --help               Mostrar este mensaje de ayuda
      `);
      process.exit(0);
    }
  }
  
  // Iniciar prueba
  const tester = new AIFlowTester(config);
  tester.start();
}

module.exports = AIFlowTester;