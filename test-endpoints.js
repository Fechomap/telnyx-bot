// test-endpoints.js
// node test-endpoints.js 20829290          //manera de consulta de expedientes en la terminal
require('dotenv').config();
const TelnyxService = require('./src/services/telnyxService');
const telnyxService = new TelnyxService();

async function testExpediente(numeroExp) {
  console.log(`\n🔍 Probando expediente: ${numeroExp}\n`);
  
  try {
    // Obtener todos los datos
    const datosGenerales = await telnyxService.obtenerExpediente(numeroExp);
    const costos = await telnyxService.obtenerExpedienteCosto(numeroExp);
    const unidad = await telnyxService.obtenerExpedienteUnidadOp(numeroExp);
    const ubicacion = await telnyxService.obtenerExpedienteUbicacion(numeroExp);
    const tiempos = await telnyxService.obtenerExpedienteTiempos(numeroExp);
    
    // Mostrar JSONs completos
    console.log('📋 DATOS GENERALES:', JSON.stringify(datosGenerales, null, 2));
    console.log('\n💰 COSTOS:', JSON.stringify(costos, null, 2));
    console.log('\n🚚 UNIDAD:', JSON.stringify(unidad, null, 2));
    console.log('\n📍 UBICACIÓN:', JSON.stringify(ubicacion, null, 2));
    console.log('\n⏰ TIEMPOS:', JSON.stringify(tiempos, null, 2));
    
    // Mostrar el estatus específicamente
    console.log('\n✅ ESTATUS DETECTADO:', datosGenerales?.estatus);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar con un número de expediente de prueba
const expedientePrueba = process.argv[2] || '12345';
testExpediente(expedientePrueba);