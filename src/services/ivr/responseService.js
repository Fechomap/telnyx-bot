// src/services/ivr/responseService.js
const XMLBuilder = require('../../texml/helpers/xmlBuilder');

class ResponseService {
  processMenuSelection(digit) {
    switch(digit) {
      case '1':
        return this.buildRedirect('/solicitar-expediente', 'GET');
      case '2':
        // Cambiar para redirigir a la Opción 2
        return this.buildRedirect('/iniciar-cotizacion', 'GET');
      default:
        return this.buildInvalidOptionResponse();
    }
  }
  
  // En src/services/ivr/responseService.js
  buildRedirect(url, method = 'GET') {
    try {
      const redirect = XMLBuilder.addRedirect(url, method);
      const response = XMLBuilder.buildResponse([redirect]);
      
      // Validar que el XML se generó correctamente
      if (!response || response.length === 0) {
        throw new Error('XML vacío generado');
      }
      
      console.log(`📄 XML de redirección generado: ${response}`);
      return response;
    } catch (error) {
      console.error(`❌ Error al construir redirección:`, error);
      throw error;
    }
  }
  
  buildComingSoonResponse() {
    const say = XMLBuilder.addSay(
      "Esta opción estará disponible próximamente.",
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildInvalidOptionResponse() {
    const say = XMLBuilder.addSay(
      "Opción no válida.",
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildErrorResponse(errorType, expediente = '') {
    let message = `El número de expediente ${this.formatearExpediente(expediente)} no fue localizado...`;
    
    switch(errorType) {
      case 'invalid_format':
        message = "El número de expediente no es válido. Debe tener al menos 3 dígitos numéricos.";
        break;
      case 'not_found':
        message = `El número de expediente ${expediente} no fue localizado. Por favor, verifíquelo e intente nuevamente.`;
        break;
      case 'system_error':
      default:
        message = "Ocurrió un error en el sistema. Por favor, intente nuevamente.";
        break;
    }
    
    const say = XMLBuilder.addSay(message, { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' });
    const redirect = XMLBuilder.addRedirect('/solicitar-expediente', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildSessionExpiredResponse() {
    const say = XMLBuilder.addSay(
      "La sesión ha expirado. Por favor, inicie una nueva consulta.",
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildSystemErrorResponse() {
    const say = XMLBuilder.addSay(
      "Ha ocurrido un error en el sistema. Por favor, intente nuevamente.",
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildNewQueryResponse() {
    // Determinar el mensaje según el modo IVR
    const isOptimized = process.env.IVR_OPTIMIZED_MODE === 'true';
    const message = isOptimized 
      ? "Digita el Número de expediente y la tecla gato"
      : "Proporciona el número de expediente y despues la tecla GATO";
    
    const sayElement = XMLBuilder.addSay(
      message,
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    
    const gatherElement = XMLBuilder.addGather({
      action: '/validar-expediente',
      method: 'GET',
      input: 'dtmf',
      finishOnKey: '#',
      timeout: '10',
      validDigits: '0123456789',
      nested: sayElement
    });
    
    const timeoutMessage = isOptimized 
      ? "No se detectó número"
      : "No se detectó ningún número.";
    
    const timeoutSay = XMLBuilder.addSay(
      timeoutMessage,
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    
    const redirect = XMLBuilder.addRedirect('/solicitar-expediente', 'GET');
    
    return XMLBuilder.buildResponse([
      gatherElement,
      timeoutSay,
      redirect
    ]);
  }
  
  buildTransferResponse() {
    // Obtener la configuración
    const config = require('../../config/texml');
    
    console.log('🔄 Iniciando transferencia a asesor');
    console.log(`✅ Transferencia habilitada: ${config.transfer.enabled}`);
    console.log(`✅ Números configurados: ${config.transfer.agentNumber}`);
    
    // Verificar si la transferencia está habilitada
    if (!config.transfer.enabled) {
      console.log('❌ Transferencia deshabilitada en configuración');
      const say = XMLBuilder.addSay(
        "Lo siento, en este momento no es posible transferirle con un asesor.",
        { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
      );
      return XMLBuilder.buildResponse([say]);
    }
    
    const elements = [];
    
    // Añadir mensaje antes de transferir
    const say = XMLBuilder.addSay(
      config.transfer.transferMessage || "Transfiriendo a un asesor. Por favor espere un momento.",
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    elements.push(say);
    
    // Procesar números de agentes
    let agentNumbers = [];
    if (config.transfer.agentNumber.includes(',')) {
      // Si hay múltiples números separados por comas
      agentNumbers = config.transfer.agentNumber.split(',').map(num => num.trim());
    } else {
      // Si solo hay un número
      agentNumbers = [config.transfer.agentNumber.trim()];
    }
    
    // En lugar de usar múltiples números en un solo Dial, 
    // creamos un elemento Dial separado para cada número
    // Esto puede ayudar si hay problemas con el formato multi-ring
    for (const number of agentNumbers) {
      console.log(`📞 Configurando marcación al número: ${number}`);
      
      // Asegurarse de que el número tiene el formato correcto para Telnyx
      // Algunos sistemas requieren formato E.164 estricto
      const formattedNumber = number.startsWith('+') ? number : `+${number}`;
      
      const dial = XMLBuilder.addDial(
        formattedNumber,
        { 
          callerId: config.service.callerId || "+525588974515", // Usar el caller ID configurado o uno por defecto
          timeout: '30',  // 30 segundos es suficiente para una prueba
          timeLimit: '3600' // 1 hora
        }
      );
      
      console.log(`✅ Configurado marcado a: ${formattedNumber}`);
      elements.push(dial);
    }
    
    // Mensaje si ninguno contesta
    const noAnswerSay = XMLBuilder.addSay(
      "Lo sentimos, ningún asesor está disponible en este momento. Volviendo al menú principal.",
      { voice: 'Azure.es-MX-DaliaNeural', language: 'es-MX' }
    );
    elements.push(noAnswerSay);
    
    // Redirigir al menú principal
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    elements.push(redirect);
    
    const responseXML = XMLBuilder.buildResponse(elements);
    console.log('📄 XML de transferencia generado:');
    // Mostrar solo las primeras 500 caracteres para no saturar los logs
    console.log(responseXML.substring(0, 500) + '...');
    
    return responseXML;
  }
}

module.exports = new ResponseService();
