// voice-test-server.js - Servidor para pruebas de voz TeXML
const express = require('express');
const app = express();

// Parseo de solicitudes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] Petición recibida:`);
  console.log(`URL: ${req.url}`);
  console.log(`Método: ${req.method}`);
  console.log(`Query: ${JSON.stringify(req.query)}`);
  console.log('-----------------------------------');
  next();
});

// Página de inicio con enlaces a todas las pruebas
app.get('/', (req, res) => {
  res.send(`
    <h1>Pruebas de voz TeXML</h1>
    <ul>
      <li><a href="/welcome">Bienvenida estándar</a></li>
      <li><a href="/test1">Prueba 1: Configuración básica</a></li>
      <li><a href="/test2">Prueba 2: Orden de atributos alternativo</a></li>
      <li><a href="/test3">Prueba 3: Sin atributos</a></li>
      <li><a href="/test4">Prueba 4: Voz Lupe</a></li>
      <li><a href="/test5">Prueba 5: Voz Pedro (masculina)</a></li>
      <li><a href="/test6">Prueba 6: Atributos extras</a></li>
    </ul>
  `);
});

// Bienvenida estándar
app.get('/welcome', (req, res) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say provider="amazon" voice="Mia" language="es-MX" engine="neural">
    Bienvenido al sistema de prueba de voces. Esta debería ser la voz femenina Mia.
  </Say>
  <Pause length="1"/>
  <Say>Si escuchas un cambio de voz aquí, significa que hay una configuración por defecto diferente.</Say>
</Response>`;
  
  console.log("ENVIANDO XML DE BIENVENIDA:");
  console.log(xml);
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Test 1: Configuración básica
app.get('/test1', (req, res) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say provider="amazon" voice="Mia" language="es-MX" engine="neural">
    Prueba uno. Esta debería ser la voz femenina Mia con todos los atributos especificados.
  </Say>
</Response>`;
  
  console.log("ENVIANDO XML PRUEBA 1:");
  console.log(xml);
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Test 2: Orden de atributos alternativo
app.get('/test2', (req, res) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX" voice="Mia" provider="amazon" engine="neural">
    Prueba dos. Esta debería ser la voz femenina Mia con orden de atributos alternativo.
  </Say>
</Response>`;
  
  console.log("ENVIANDO XML PRUEBA 2:");
  console.log(xml);
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Test 3: Sin atributos (configuración por defecto)
app.get('/test3', (req, res) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>
    Prueba tres. Esta usa la configuración por defecto, sin atributos especificados.
  </Say>
</Response>`;
  
  console.log("ENVIANDO XML PRUEBA 3:");
  console.log(xml);
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Test 4: Voz alternativa femenina
app.get('/test4', (req, res) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say provider="amazon" voice="Lupe" language="es-US" engine="neural">
    Prueba cuatro. Esta debería ser la voz Lupe, otra voz femenina pero con acento latino distinto.
  </Say>
</Response>`;
  
  console.log("ENVIANDO XML PRUEBA 4:");
  console.log(xml);
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Test 5: Voz masculina explícita
app.get('/test5', (req, res) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say provider="amazon" voice="Pedro" language="es-US" engine="neural">
    Prueba cinco. Esta debería ser la voz Pedro, que es una voz masculina.
  </Say>
</Response>`;
  
  console.log("ENVIANDO XML PRUEBA 5:");
  console.log(xml);
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Test 6: Atributos adicionales
app.get('/test6', (req, res) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say provider="amazon" voice="Mia" language="es-MX" engine="neural" rate="0.9" pitch="1.1">
    Prueba seis. Esta debería ser la voz Mia con velocidad más lenta y tono ligeramente más alto.
  </Say>
</Response>`;
  
  console.log("ENVIANDO XML PRUEBA 6:");
  console.log(xml);
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 Servidor de prueba de voces iniciado en puerto ${PORT}
Prueba las diferentes configuraciones llamando a los endpoints:
- /welcome - Bienvenida estándar
- /test1 - Configuración básica
- /test2 - Orden de atributos alternativo
- /test3 - Sin atributos (configuración por defecto)
- /test4 - Voz Lupe
- /test5 - Voz Pedro (masculina)
- /test6 - Atributos extras
  `);
});

// ===== PRUEBAS AVANZADAS =====

// Test 7: TTS Expandido - Todos los atributos posibles
app.get('/test7', (req, res) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say provider="amazon" voice="Mia" language="es-MX" engine="neural" rate="1.0" pitch="1.0" textType="text">
      Prueba siete. Esta es una prueba con todos los atributos posibles para el elemento Say.
    </Say>
  </Response>`;
    
    console.log("ENVIANDO XML PRUEBA 7:");
    console.log(xml);
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
  
  // Test 8: Multilenguaje
  app.get('/test8', (req, res) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say provider="amazon" voice="Joanna" language="en-US" engine="neural">
      This is a test of the English voice Joanna.
    </Say>
    <Pause length="1"/>
    <Say provider="amazon" voice="Mia" language="es-MX" engine="neural">
      Esta es una prueba de la voz en español Mia.
    </Say>
  </Response>`;
    
    console.log("ENVIANDO XML PRUEBA 8:");
    console.log(xml);
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
  
  // Test 9: Proveedor explícito Microsoft
  app.get('/test9', (req, res) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say provider="microsoft" voice="es-MX-DaliaNeural" language="es-MX">
      Prueba nueve. Esta prueba utiliza Microsoft como proveedor con una voz femenina.
    </Say>
  </Response>`;
    
    console.log("ENVIANDO XML PRUEBA 9:");
    console.log(xml);
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
  
  // Test 10: Estructura alternativa (Say fuera de Response)
  app.get('/test10', (req, res) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
  <Say provider="amazon" voice="Mia" language="es-MX" engine="neural"/>
  Prueba diez. Este texto está fuera del elemento Say como alternativa. 
  </Response>`;
    
    console.log("ENVIANDO XML PRUEBA 10:");
    console.log(xml);
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
  
  // Test 11: Voz Google (alternativa)
  app.get('/test11', (req, res) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say provider="google" voice="es-ES-Standard-A" language="es-ES">
      Prueba once. Esta prueba utiliza Google como proveedor con una voz femenina.
    </Say>
  </Response>`;
    
    console.log("ENVIANDO XML PRUEBA 11:");
    console.log(xml);
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
  
  // Test 12: SSML embebido
  app.get('/test12', (req, res) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say>
      <speak>
        <voice name="Mia" language="es-MX">
          Prueba doce. Esta prueba utiliza SSML embebido para especificar la voz.
        </voice>
      </speak>
    </Say>
  </Response>`;
    
    console.log("ENVIANDO XML PRUEBA 12:");
    console.log(xml);
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
  
  // Test 13: Mayúsculas en nombres de atributos
  app.get('/test13', (req, res) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say PROVIDER="amazon" VOICE="Mia" LANGUAGE="es-MX" ENGINE="neural">
      Prueba trece. Esta prueba utiliza nombres de atributos en mayúsculas.
    </Say>
  </Response>`;
    
    console.log("ENVIANDO XML PRUEBA 13:");
    console.log(xml);
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
  
  // Añade estos endpoints a tu console.log inicial
  console.log(`
  - /test7 - Configuración expandida (todos los atributos)
  - /test8 - Multilenguaje
  - /test9 - Proveedor Microsoft
  - /test10 - Estructura alternativa
  - /test11 - Proveedor Google
  - /test12 - SSML embebido
  - /test13 - Atributos en mayúsculas
  `);