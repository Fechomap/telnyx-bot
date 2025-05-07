# Configuración de Voz para Telnyx Bot

## Cambios Realizados

Se ha modificado la configuración de voz del bot para utilizar Amazon Polly con una voz femenina en español mexicano. Los cambios incluyen:

1. **Configuración de Text-to-Speech (TTS)**
   - Se ha configurado Amazon Polly como proveedor de voz
   - Se ha seleccionado la voz "Mia" (voz femenina neural para español mexicano)
   - Se ha configurado el motor neural para mejor calidad de voz

2. **Actualización de Servidores**
   - Se ha modificado el script de inicio para usar el servidor TeXML por defecto
   - Se ha actualizado el servidor legacy para usar Amazon Polly también

3. **Desactivación de AI Assistant**
   - Se ha añadido una opción de configuración para deshabilitar el AI Assistant
   - Esto evita conflictos entre el flujo normal y el flujo de AI

## Archivos Modificados

- `src/config/texml.js`: Configuración de Amazon Polly y opción para deshabilitar AI
- `src/texml/helpers/xmlBuilder.js`: Actualización de métodos para usar Amazon Polly
- `src/texml/templates/welcome.js`: Actualización de plantillas para usar Amazon Polly
- `src/controllers/texmlController.js`: Actualización del controlador AI para usar Amazon Polly
- `src/newServer.js`: Actualización del servidor de desarrollo para usar Amazon Polly
- `server.js`: Actualización del servidor legacy para usar Amazon Polly
- `package.json`: Cambio del script de inicio para usar el servidor TeXML

## Cómo Ejecutar

Para ejecutar el bot con la nueva configuración de voz:

```bash
# Iniciar el servidor TeXML (recomendado)
npm start

# O si necesita usar el servidor legacy
npm run legacy
```

## Solución de Problemas

Si experimenta problemas con la voz del bot:

1. **Voces superpuestas**: Asegúrese de que solo está ejecutando un servidor a la vez. 

   Para verificar si hay múltiples servidores ejecutándose:
   ```bash
   # Ver todos los procesos de Node.js en ejecución
   ps aux | grep node
   
   # O en Windows
   tasklist | findstr node
   ```
   
   Si encuentra múltiples procesos, deténgalos:
   ```bash
   # En Linux/Mac, reemplace XXXX con el ID del proceso
   kill XXXX
   
   # O en Windows
   taskkill /PID XXXX /F
   ```
   
   Luego inicie solo un servidor:
   ```bash
   # Servidor TeXML recomendado
   npm start
   ```

2. **Voz masculina en lugar de femenina**: Si sigue escuchando una voz masculina a pesar de la configuración, verifique que la variable `TELNYX_OUTBOUND_VOICE_PROFILE_ID` esté comentada en el archivo `.env`. Esta variable puede anular la configuración de voz de Amazon Polly.

   ```
   # TELNYX_OUTBOUND_VOICE_PROFILE_ID=2620965425415980335 # Comentado para evitar que anule la configuración de voz
   ```

   Si la variable está presente y no comentada, coméntela y reinicie el servidor.

2. **Voz incorrecta**: Verifique que la configuración en `src/config/texml.js` tenga:
   ```javascript
   tts: {
     provider: 'amazon',
     voice: 'Mia',
     language: 'es-MX',
     engine: 'neural'
   }
   ```

3. **Conflictos con AI Assistant**: Si experimenta respuestas superpuestas, asegúrese de que AI Assistant esté deshabilitado en la configuración:
   ```javascript
   ai: {
     enabled: false
   }
   ```

## Voces Disponibles de Amazon Polly

Si desea cambiar la voz, estas son algunas opciones disponibles para español mexicano:

- **Mia** (Neural, femenina) - Configuración actual
- **Andrés** (Neural, masculina)
- **Lupe** (Standard, femenina)

Para cambiar la voz, modifique el valor de `voice` en la configuración TTS.
