/**
 * Nuevo servidor basado en arquitectura TeXML
 * Implementa endpoints para IVR con menor latencia
 */
require('dotenv').config();
const express = require('express');
const sessionCache = require('./cache/sessionCache');
const { consultaUnificada, formatearDatosParaIVR } = require('./services/dataService');
const { generateWelcomeXML, generateRequestExpedienteXML } = require('./texml/templates/welcome');
const XMLBuilder = require('./texml/helpers/xmlBuilder');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
  console.log('🔍 Nueva petición TeXML recibida:');
  console.log('URL:', req.url);
  console.log('Método:', req.method);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    texml_status: 'Ready',
    active_sessions: sessionCache.getActiveSessionsCount()
  });
});

/**
 * Punto de entrada inicial para la llamada
 * Presenta mensaje de bienvenida y opciones principales
 */
app.post('/welcome', (req, res) => {
  console.log('📞 Nueva llamada recibida, enviando bienvenida');
  
  // Generar y enviar documento TeXML con mensaje de bienvenida
  const welcomeXML = generateWelcomeXML();
  
  res.header('Content-Type', 'application/xml');
  res.send(welcomeXML);
});

/**
 * Maneja la solicitud de número de expediente
 */
app.post('/expediente', (req, res) => {
  console.log('🔢 Usuario seleccionó opción para consultar expediente');
  
  // Generar y enviar documento TeXML con solicitud de expediente
  const expedienteXML = generateRequestExpedienteXML();
  
  res.header('Content-Type', 'application/xml');
  res.send(expedienteXML);
});

/**
 * Valida el expediente y prepara todos los datos necesarios
 * Este es el endpoint clave que implementa la consulta unificada
 */
app.post('/validar-expediente', async (req, res) => {
  try {
    // Obtener número de expediente
    const digits = req.body.Digits || '';
    console.log(`🔍 Validando expediente: ${digits}`);
    
    // Realizar consulta unificada
    const datosExpediente = await consultaUnificada(digits);
    
    if (!datosExpediente) {
      // Expediente no encontrado
      console.log(`❌ Expediente no encontrado: ${digits}`);
      
      // Crear respuesta XML para expediente no encontrado
      const notFoundMessage = "Expediente no encontrado. Intente nuevamente.";
      const sayElement = XMLBuilder.addSay(notFoundMessage, {
        provider: 'amazon',
        voice: 'Mia',
        language: 'es-MX',
        engine: 'neural'
      });
      const redirectElement = XMLBuilder.addRedirect("/expediente");
      const responseXML = XMLBuilder.buildResponse([sayElement, redirectElement]);
      
      res.header('Content-Type', 'application/xml');
      return res.send(responseXML);
    }
    
    // Crear ID de sesión único (podemos usar un UUID en producción)
    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Almacenar datos en caché
    sessionCache.createSession(sessionId, datosExpediente);
    console.log(`✅ Sesión creada con ID: ${sessionId}`);
    
    // Formatear datos para IVR
    const datosFormateados = formatearDatosParaIVR(datosExpediente);
    
    // Construir menú según el estado del expediente
    let menuOptions = '';
    let validDigits = '';
    
    if (datosExpediente.estatus === 'Concluido') {
      menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para tiempos";
      validDigits = "123";
    } else {
      menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para ubicación, 4 para tiempos";
      validDigits = "1234";
    }
    
    // Crear mensaje completo
    const fullMessage = `${datosFormateados.mensajeGeneral} ${menuOptions}`;
    
    // Crear respuesta XML
    const sayElement = XMLBuilder.addSay(fullMessage, {
      provider: 'amazon',
      voice: 'Mia',
      language: 'es-MX',
      engine: 'neural'
    });
    const gatherOptions = {
      action: `/respuesta?sessionId=${sessionId}`,
      method: 'POST',
      numDigits: '1',
      validDigits: validDigits,
      timeout: '7'
    };
    const gatherElement = XMLBuilder.addGather(gatherOptions);
    const responseXML = XMLBuilder.buildResponse([sayElement, gatherElement]);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  } catch (error) {
    console.error('❌ Error al validar expediente:', error);
    
    // Crear respuesta XML de error
    const errorMessage = "Ocurrió un error al procesar su solicitud. Intente nuevamente.";
    const sayElement = XMLBuilder.addSay(errorMessage, {
      provider: 'amazon',
      voice: 'Mia',
      language: 'es-MX',
      engine: 'neural'
    });
    const redirectElement = XMLBuilder.addRedirect("/expediente");
    const responseXML = XMLBuilder.buildResponse([sayElement, redirectElement]);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
});

/**
 * Proporciona la respuesta específica según la opción seleccionada
 */
app.post('/respuesta', (req, res) => {
  try {
    // Obtener ID de sesión y opción seleccionada
    const sessionId = req.query.sessionId;
    const opcion = req.body.Digits || '';
    
    console.log(`🔢 Usuario seleccionó opción ${opcion} para sesión ${sessionId}`);
    
    // Recuperar datos de la sesión
    const datosExpediente = sessionCache.getSession(sessionId);
    
    if (!datosExpediente) {
      // Sesión no encontrada o expirada
      console.log(`❌ Sesión no encontrada: ${sessionId}`);
      
      // Crear respuesta XML para sesión no encontrada
      const notFoundMessage = "Su sesión ha expirado. Por favor, inicie nuevamente.";
      const sayElement = XMLBuilder.addSay(notFoundMessage, {
        provider: 'amazon',
        voice: 'Mia',
        language: 'es-MX',
        engine: 'neural'
      });
      const redirectElement = XMLBuilder.addRedirect("/welcome");
      const responseXML = XMLBuilder.buildResponse([sayElement, redirectElement]);
      
      res.header('Content-Type', 'application/xml');
      return res.send(responseXML);
    }
    
    // Formatear datos para IVR
    const datosFormateados = formatearDatosParaIVR(datosExpediente);
    
    // Determinar qué información mostrar según la opción
    let mensajeRespuesta = '';
    
    switch (opcion) {
      case '1': // Costos
        mensajeRespuesta = datosFormateados.mensajeCostos;
        break;
      case '2': // Datos de unidad
        mensajeRespuesta = datosFormateados.mensajeUnidad;
        break;
      case '3': // Ubicación o Tiempos según estado
        if (datosExpediente.estatus === 'Concluido') {
          mensajeRespuesta = datosFormateados.mensajeTiempos;
        } else {
          mensajeRespuesta = datosFormateados.mensajeUbicacion;
        }
        break;
      case '4': // Tiempos (solo si no está concluido)
        if (datosExpediente.estatus !== 'Concluido') {
          mensajeRespuesta = datosFormateados.mensajeTiempos;
        } else {
          mensajeRespuesta = "Opción no válida";
        }
        break;
      default:
        mensajeRespuesta = "Opción no válida";
    }
    
    // Construir menú según el estado del expediente
    let menuOptions = '';
    let validDigits = '';
    
    if (datosExpediente.estatus === 'Concluido') {
      menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para tiempos";
      validDigits = "123";
    } else {
      menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para ubicación, 4 para tiempos";
      validDigits = "1234";
    }
    
    // Crear elementos XML para la respuesta
    const sayResponseElement = XMLBuilder.addSay(mensajeRespuesta, {
      provider: 'amazon',
      voice: 'Mia',
      language: 'es-MX',
      engine: 'neural'
    });
    const sayMenuElement = XMLBuilder.addSay(menuOptions, {
      provider: 'amazon',
      voice: 'Mia',
      language: 'es-MX',
      engine: 'neural'
    });
    
    const gatherOptions = {
      action: `/respuesta?sessionId=${sessionId}`,
      method: 'POST',
      numDigits: '1',
      validDigits: validDigits,
      timeout: '7'
    };
    
    const gatherElement = XMLBuilder.addGather(gatherOptions);
    
    // Construir respuesta completa
    const responseXML = XMLBuilder.buildResponse([
      sayResponseElement,
      sayMenuElement,
      gatherElement
    ]);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  } catch (error) {
    console.error('❌ Error al procesar respuesta:', error);
    
    // Crear respuesta XML de error
    const errorMessage = "Ocurrió un error al procesar su solicitud. Intente nuevamente.";
    const sayElement = XMLBuilder.addSay(errorMessage, {
      provider: 'amazon',
      voice: 'Mia',
      language: 'es-MX',
      engine: 'neural'
    });
    const redirectElement = XMLBuilder.addRedirect("/welcome");
    const responseXML = XMLBuilder.buildResponse([sayElement, redirectElement]);
    
    res.header('Content-Type', 'application/xml');
    res.send(responseXML);
  }
});

/**
 * Compatibilidad con webhooks existentes
 */
app.post('/webhook', (req, res) => {
  // Responder de forma compatible con los webhooks existentes
  // pero redirigir al flujo TeXML cuando sea posible
  res.send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 Servidor TeXML iniciado:
- Puerto: ${PORT}
- Caché de sesiones: ${sessionCache ? '✅' : '❌'}
- Servicio de datos: ${consultaUnificada ? '✅' : '❌'}
- XMLBuilder: ${XMLBuilder ? '✅' : '❌'}
  `);
});

module.exports = app;
