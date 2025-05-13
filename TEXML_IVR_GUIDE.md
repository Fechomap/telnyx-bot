# Guía de TeXML IVR

Esta guía explica cómo funciona el sistema IVR (Respuesta de Voz Interactiva) de TeXML Bot y cómo configurarlo para diferentes casos de uso.

## ¿Qué es TeXML?

TeXML es un lenguaje de marcado similar a TwiML (de Twilio) que permite crear aplicaciones de telefonía interactivas utilizando XML. Con TeXML, puedes:

- Reproducir mensajes de voz
- Recopilar dígitos DTMF (tonos)
- Grabar mensajes de voz
- Transferir llamadas
- Crear flujos interactivos complejos

## Flujo Principal del IVR

El TeXML Bot implementa un IVR con el siguiente flujo principal:

```
┌─────────────┐
│   Llamada   │
│   entrante  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Menú     │
│  Principal  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│           Opción            │
├───────────┬─────────────────┤
│           │                 │
▼           ▼                 ▼
┌─────────┐ ┌─────────────┐ ┌─────────────┐
│Consulta │ │ Cotización  │ │ Hablar con  │
│  Exp.   │ │  Servicio   │ │   agente    │
└────┬────┘ └──────┬──────┘ └──────┬──────┘
     │             │               │
     ▼             ▼               ▼
┌─────────┐ ┌─────────────┐ ┌─────────────┐
│ Detalle │ │ Grabación y │ │Transferencia│
│   Exp.  │ │ Procesado   │ │   llamada   │
└─────────┘ └─────────────┘ └─────────────┘
```

## Componentes Principales

### 1. Menú Principal

```xml
<Response>
  <Gather action="/menu-selection" method="GET" input="dtmf" numDigits="1" timeout="10">
    <Say voice="Azure.es-MX-DaliaNeural" language="es-MX">
      Hola! Seguimiento a expediente presione 1, Cotizar un servicio presione 2.
    </Say>
  </Gather>
  <Say voice="Azure.es-MX-DaliaNeural" language="es-MX">
    No se detectó una opción válida.
  </Say>
  <Redirect method="GET">/welcome</Redirect>
</Response>
```

### 2. Consulta de Expediente

```xml
<Response>
  <Gather action="/validar-expediente" method="GET" input="dtmf" finishOnKey="#" timeout="10">
    <Say voice="Azure.es-MX-DaliaNeural" language="es-MX">
      Proporciona el número de expediente y después la tecla GATO
    </Say>
  </Gather>
  <Say voice="Azure.es-MX-DaliaNeural" language="es-MX">
    No se detectó ningún número.
  </Say>
  <Redirect method="GET">/solicitar-expediente</Redirect>
</Response>
```

### 3. Menú de Expediente

El menú de expediente es dinámico y se adapta según el estatus del expediente consultado:

| Estatus | Opciones disponibles |
|---------|----------------------|
| A Contactar | Información general, Costos, Ubicación, Unidad |
| Cancelado | Información general, Costos, Unidad |
| Concluido | Información general, Costos, Tiempos, Unidad |
| En Proceso | Información general, Costos, Ubicación, Unidad |
| Servicio Muerto | Información general, Costos, Tiempos, Unidad |

### 4. Cotización por Voz

```xml
<Response>
  <Say voice="Azure.es-MX-DaliaNeural" language="es-MX">
    Indique las coordenadas de origen.
  </Say>
  <Record action="/procesar-grabacion" method="POST" maxLength="15" timeout="5" playBeep="true" recordingStatusCallback="/recording-status"></Record>
  <Say voice="Azure.es-MX-DaliaNeural" language="es-MX">
    No se detectó grabación. Volviendo al menú principal.
  </Say>
  <Redirect method="GET">/welcome</Redirect>
</Response>
```

## Configuración de Voces

El sistema utiliza diferentes motores TTS (text-to-speech):

- **Azure.es-MX-DaliaNeural**: Voz femenina en español mexicano (predeterminada)
- **Polly.Mia-Neural**: Voz femenina alternativa en español
- **Polly.Pedro-Neural**: Voz masculina en español

Para cambiar la voz predeterminada, modifica el archivo `src/config/texml.js`:

```javascript
tts: {
  provider: 'polly',
  voice: 'Polly.Mia-Neural',
  language: 'es-MX'
}
```

## Transferencia a Agentes

Para configurar la transferencia a agentes:

1. Configura la variable `TRANSFER_ENABLED=true`
2. Establece los números a transferir en `AGENT_NUMBER`
   - Puedes especificar múltiples números separados por comas

El sistema intentará llamar a los agentes en secuencia hasta que uno responda.

## Personalización de Mensajes

Los mensajes de voz pueden personalizarse en los siguientes archivos:

- `src/services/ivr/menuService.js`: Mensajes de menús
- `src/services/ivr/responseService.js`: Mensajes de respuesta y errores
- `src/texml/handlers/errorHandler.js`: Mensajes de error

## Monitoreo y Métricas

El sistema incluye un completo sistema de monitoreo con las siguientes métricas:

- Tiempo de respuesta
- Tiempos de consulta de datos
- Estadísticas de reconocimiento de voz
- Estadísticas de expedientes
- Registro de errores

Estas métricas son accesibles a través del endpoint `/health`.

## Consejos para el Testing

Para probar el sistema:

1. Utiliza el script `test-endpoints.js` para probar consultas de expedientes:
   ```bash
   node test-endpoints.js 20829290
   ```

2. Para simular una llamada completa:
   ```bash
   npm run simulate
   ```

3. Para pruebas de carga, utiliza herramientas como Artillery:
   ```bash
   npm install -g artillery
   artillery run tests/load-tests.yml
   ```

## Mejores Prácticas

- **Mensajes concisos**: Mantén los mensajes de voz claros y breves
- **Timeouts adecuados**: Configura tiempos de espera razonables (5-10 segundos)
- **Manejo de errores**: Siempre proporciona una ruta alternativa en caso de error
- **Confirmación**: Confirma las acciones importantes con el usuario
- **Opciones de salida**: Permite al usuario volver al menú principal o hablar con un agente