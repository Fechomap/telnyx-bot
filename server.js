require('dotenv').config();
const express = require('express');
const axios = require('axios');
const TelnyxService = require('./src/services/telnyxService');

const app = express();
app.use(express.json());

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_CONNECTION_ID = process.env.TELNYX_CONNECTION_ID;

const telnyxService = new TelnyxService();

// Almacenamiento en memoria para el estado de las llamadas
const llamadasActivas = new Map();

// Middleware para logging
app.use((req, res, next) => {
  console.log('🔍 Nueva petición recibida:');
  console.log('URL:', req.url);
  console.log('Método:', req.method);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});

const handleWebhook = async (req, res) => {
  const event = req.body;
  console.log('📞 Evento Telnyx recibido:', JSON.stringify(event, null, 2));

  try {
    if (!event.data || !event.data.event_type) {
      console.log('❌ Evento no válido recibido');
      return res.sendStatus(400);
    }

    const eventType = event.data.event_type;
    const callControlId = event.data.payload.call_control_id;

    switch (eventType) {
      case 'call.initiated':
        await handleCallInitiated(callControlId);
        break;

      case 'call.gather.ended':
        await handleGatherEnded(callControlId, event.data.payload);
        break;

      case 'call.speak.ended':
        await handleSpeakEnded(callControlId);
        break;
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error general:', error);
    res.sendStatus(500);
  }
};

async function handleCallInitiated(callControlId) {
  try {
    // Contestar la llamada
    await answerCall(callControlId);
    
    // Inicializar el estado de la llamada
    llamadasActivas.set(callControlId, {
      etapa: 'esperando_expediente',
      expediente: null,
      datosExpediente: null
    });

    // Solicitar número de expediente
    await solicitarExpediente(callControlId);
  } catch (error) {
    console.error('Error en handleCallInitiated:', error);
  }
}

/* ---------------------------------------------------------------------
   Funciones incorporadas (basadas en la lógica del bot de Telegram)
   --------------------------------------------------------------------- */
async function handleGatherEnded(callControlId, payload) {
  const estadoLlamada = llamadasActivas.get(callControlId);
  if (!estadoLlamada) return;

  const digits = payload.digits;
  
  try {
    switch (estadoLlamada.etapa) {
      case 'esperando_expediente': {
        const expedienteData = await telnyxService.obtenerExpediente(digits);
        if (expedienteData) {
          estadoLlamada.expediente = digits;
          estadoLlamada.datosExpediente = expedienteData;
          estadoLlamada.etapa = 'menu_principal';
          
          // Armar el mensaje con los datos importantes
          const mensaje = `Expediente encontrado. ${expedienteData.nombre}. ` +
                          `Vehículo: ${expedienteData.vehiculo}. ` +
                          `Estado: ${expedienteData.estatus}. ` +
                          `Servicio: ${expedienteData.servicio}. ` +
                          `Destino: ${expedienteData.destino}. `;

          // Construir el menú según el estatus
          if (expedienteData.estatus === 'Concluido') {
            // Menú de 3 opciones: 1 = Costos, 2 = Datos de Unidad, 3 = Tiempos
            const menuOpciones = "Presione 1 para costos, 2 para datos de unidad, 3 para tiempos";
            await gatherDigits(callControlId, mensaje + menuOpciones, "123", 1);
          } else {
            // Menú de 4 opciones: 1 = Costos, 2 = Datos de Unidad, 3 = Ubicación, 4 = Tiempos
            const menuOpciones = "Presione 1 para costos, 2 para datos de unidad, 3 para ubicación, 4 para tiempos";
            await gatherDigits(callControlId, mensaje + menuOpciones, "1234", 1);
          }
        } else {
          await speakLongText(callControlId, "Expediente no encontrado. Intente nuevamente.");
          await solicitarExpediente(callControlId);
        }
        break;
      }
      case 'menu_principal':
        await procesarOpcionMenu(callControlId, digits, estadoLlamada);
        break;
    }
  } catch (error) {
    console.error('Error en handleGatherEnded:', error);
    await speakLongText(callControlId, "Ocurrió un error. Por favor, intente nuevamente.");
  }
}

async function procesarOpcionMenu(callControlId, opcion, estadoLlamada) {
  try {
    const expediente = estadoLlamada.expediente;
    let respuesta = '';

    switch (opcion) {
      case '1': { // Costo del Servicio
        const costos = await telnyxService.obtenerExpedienteCosto(expediente);
        
        let desglose = '';
        if (estadoLlamada.datosExpediente.servicio === 'Local') {
          desglose = `${costos.km} km plano ${costos.plano}`;
        } else if (estadoLlamada.datosExpediente.servicio === 'Carretero') {
          const banderazoInfo = costos.banderazo ? `banderazo ${costos.banderazo}` : '';
          const costoKmInfo = costos.costoKm ? `costo Km ${costos.costoKm}` : '';
          desglose = `${costos.km} km ${banderazoInfo} ${costoKmInfo}`;
        }

        let detalles = [];
        if (costos.casetaACobro > 0) detalles.push(`Caseta de cobro: ${costos.casetaACobro}`);
        if (costos.casetaCubierta > 0) detalles.push(`Caseta cubierta: ${costos.casetaCubierta}`);
        if (costos.resguardo > 0) detalles.push(`Resguardo: ${costos.resguardo}`);
        if (costos.maniobras > 0) detalles.push(`Maniobras: ${costos.maniobras}`);
        if (costos.horaEspera > 0) detalles.push(`Hora de espera: ${costos.horaEspera}`);
        if (costos.Parking > 0) detalles.push(`Parking: ${costos.Parking}`);
        if (costos.Otros > 0) detalles.push(`Otros: ${costos.Otros}`);
        if (costos.excedente > 0) detalles.push(`Excedente: ${costos.excedente}`);

        respuesta = `El costo total es ${costos.costo}. Desglose: ${desglose}. `;
        if (detalles.length > 0) {
          respuesta += `Detalles adicionales: ${detalles.join(', ')}`;
        }
        break;
      }
      case '2': { // Datos de la Unidad o Grúa
        const unidad = await telnyxService.obtenerExpedienteUnidadOp(expediente);
        // Separar los datos en chunks más pequeños
        const datos = [
          `Datos de la unidad:`,
          `Operador: ${unidad.operador || 'N/A'}`,
          `Tipo de Grúa: ${unidad.tipoGrua || 'N/A'}`,
          `Color: ${unidad.color || 'N/A'}`,
          `Número Económico: ${unidad.unidadOperativa || 'N/A'}`,
          `Placas: ${unidad.placas || unidad.placa || 'N/A'}`
        ];
        respuesta = datos.join('. ');
        break;
      }
      case '3': {
        // Si el expediente está "Concluido", la opción 3 es para Tiempos;
        // de lo contrario, es para Ubicación.
        if (estadoLlamada.datosExpediente.estatus === 'Concluido') {
          const tiempos = await telnyxService.obtenerExpedienteTiempos(expediente);
          respuesta = `⏰ Tiempos del Expediente\n- Contacto: ${tiempos.tc}\n- Término: ${tiempos.tt}`;
        } else {
          const ubicacion = await telnyxService.obtenerExpedienteUbicacion(expediente);
          let urlUbicacion = "";
          if (ubicacion && ubicacion.ubicacionGrua) {
            const coords = ubicacion.ubicacionGrua.trim().split(",");
            urlUbicacion = `https://www.google.com/maps/search/?api=1&query=${coords[0]}%2C${coords[1]}`;
          }
          respuesta = `📍 Ubicación y Tiempo Restante\n- Tiempo estimado de llegada: ${ubicacion.tiempoRestante || 'N/A'}\n- Ver ubicación: ${urlUbicacion}`;
        }
        break;
      }
      case '4': {
        // Solo aparece cuando el expediente NO está "Concluido"
        const tiempos = await telnyxService.obtenerExpedienteTiempos(expediente);
        respuesta = `⏰ Tiempos del Expediente\n- Contacto: ${tiempos.tc}\n- Término: ${tiempos.tt}`;
        break;
      }
      default:
        respuesta = "Opción no válida";
    }

    // Enviar el mensaje fragmentado para TTS
    await speakLongText(callControlId, respuesta);
    
    // Volver a presentar el menú según el estatus del expediente
    setTimeout(async () => {
        let menuOptions = "";
        let validDigits = "";
        if (estadoLlamada.datosExpediente.estatus === 'Concluido') {
          menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para tiempos";
          validDigits = "123";
        } else {
          menuOptions = "Presione 1 para costos, 2 para datos de unidad, 3 para ubicación, 4 para tiempos";
          validDigits = "1234";
        }
        await gatherDigits(callControlId, menuOptions, validDigits, 1);
    }, 5000); 
  } catch (error) {
    console.error('Error al procesar opción del menú:', error);
    await speakLongText(callControlId, "Ocurrió un error al procesar su solicitud");
  }
}

/* ---------------------------------------------------------------------
   Fin de las funciones incorporadas
   --------------------------------------------------------------------- */

async function handleSpeakEnded(callControlId) {
  console.log(`Finalizó la acción de speak para la llamada ${callControlId}`);
}

// Funciones auxiliares para Telnyx (se codifica el callControlId)
async function answerCall(callControlId) {
  const encodedId = encodeURIComponent(callControlId);
  await axios.post(
    `https://api.telnyx.com/v2/calls/${encodedId}/actions/answer`,
    {},
    { headers: getTelnyxHeaders() }
  );
}

async function speakText(callControlId, text) {
  const encodedId = encodeURIComponent(callControlId);
  await axios.post(
    `https://api.telnyx.com/v2/calls/${encodedId}/actions/speak`,
    {
      payload: text,
      voice: "female",
      language: "es-MX"
    },
    { headers: getTelnyxHeaders() }
  );
}

async function gatherDigits(callControlId, prompt, validDigits, maxDigits) {
    const encodedId = encodeURIComponent(callControlId);
    await axios.post(
      `https://api.telnyx.com/v2/calls/${encodedId}/actions/gather_using_speak`,
      {
        payload: prompt,
        voice: "female",
        language: "es-MX",
        valid_digits: validDigits,
        max_digits: maxDigits,
        inter_digit_timeout: 7 // Aumentado de 5 a 7 segundos
      },
      { headers: getTelnyxHeaders() }
    );
}

async function solicitarExpediente(callControlId) {
  await gatherDigits(
    callControlId,
    "Por favor, ingrese su número de expediente seguido de la tecla numeral",
    "0123456789#",
    10
  );
}

function getTelnyxHeaders() {
  return {
    'Authorization': `Bearer ${TELNYX_API_KEY}`,
    'Content-Type': 'application/json'
  };
}

// Funciones para fragmentar el texto y agregar delays

function splitText(text, maxLength = 150) {
  const words = text.split(" ");
  const chunks = [];
  let current = "";
  for (let word of words) {
    if ((current + word).length > maxLength) {
      chunks.push(current.trim());
      current = word + " ";
    } else {
      current += word + " ";
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function speakLongText(callControlId, text) {
    const chunks = splitText(text, 150);
    for (let i = 0; i < chunks.length; i++) {
      await speakText(callControlId, chunks[i]);
      // Esperar más tiempo después del último chunk
      if (i < chunks.length - 1) {
        await delay(3000); // 3 segundos entre chunks
      } else {
        await delay(4000); // 4 segundos después del último chunk
      }
    }
}

app.post('/', handleWebhook);
app.post('/webhook', handleWebhook);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 Servidor iniciado:
- Puerto: ${PORT}
- API Key configurada: ${TELNYX_API_KEY ? '✅' : '❌'}
- Connection ID configurado: ${TELNYX_CONNECTION_ID ? '✅' : '❌'}
  `);
});