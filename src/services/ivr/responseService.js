// src/services/ivr/responseService.js
const XMLBuilder = require('../../texml/helpers/xmlBuilder');

class ResponseService {
  processMenuSelection(digit) {
    switch(digit) {
      case '1':
        return this.buildRedirect('/solicitar-expediente', 'GET');
      case '2':
        return this.buildComingSoonResponse();
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
      { voice: 'Polly.Mia-Neural' }
    );
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildInvalidOptionResponse() {
    const say = XMLBuilder.addSay(
      "Opción no válida.",
      { voice: 'Polly.Mia-Neural' }
    );
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildErrorResponse(errorType, expediente = '') {
    let message = '';
    
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
    
    const say = XMLBuilder.addSay(message, { voice: 'Polly.Mia-Neural' });
    const redirect = XMLBuilder.addRedirect('/solicitar-expediente', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildSessionExpiredResponse() {
    const say = XMLBuilder.addSay(
      "La sesión ha expirado. Por favor, inicie una nueva consulta.",
      { voice: 'Polly.Mia-Neural' }
    );
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildSystemErrorResponse() {
    const say = XMLBuilder.addSay(
      "Ha ocurrido un error en el sistema. Por favor, intente nuevamente.",
      { voice: 'Polly.Mia-Neural' }
    );
    const redirect = XMLBuilder.addRedirect('/welcome', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildNewQueryResponse() {
    const say = XMLBuilder.addSay(
      "Iniciando nueva consulta.",
      { voice: 'Polly.Mia-Neural' }
    );
    const redirect = XMLBuilder.addRedirect('/solicitar-expediente', 'GET');
    return XMLBuilder.buildResponse([say, redirect]);
  }
  
  buildTransferResponse() {
    const say = XMLBuilder.addSay(
      "Lo siento, en este momento no es posible transferirle con un asesor.",
      { voice: 'Polly.Mia-Neural' }
    );
    return XMLBuilder.buildResponse([say]);
  }
}

module.exports = new ResponseService();