// src/services/ivr/transferService.js
const XMLBuilder = require('../../texml/helpers/xmlBuilder');
const config = require('../../config/texml');
const monitoring = require('../../utils/monitoring');

class TransferService {
  /**
   * Maneja la transferencia condicional basada en el número del llamante
   */
  async handleConditionalTransfer(callerNumber, callSid) {
    const allowedNumbers = process.env.OPTION2_ALLOWED_NUMBERS ? 
      process.env.OPTION2_ALLOWED_NUMBERS.split(',').map(n => n.trim()) : [];
    
    const transferNumber = process.env.OPTION2_TRANSFER_NUMBER;
    const blockedTransferNumber = process.env.OPTION2_BLOCKED_TRANSFER_NUMBER || transferNumber;
    
    // DEBUG: Mostrar configuración cargada
    console.log(`🔧 DEBUG Transfer Config:`);
    console.log(`   OPTION2_ALLOWED_NUMBERS: "${process.env.OPTION2_ALLOWED_NUMBERS}"`);
    console.log(`   Parsed allowed numbers:`, allowedNumbers);
    console.log(`   Caller number: "${callerNumber}"`);
    console.log(`   Transfer number: "${transferNumber}"`);
    console.log(`   Blocked transfer number: "${blockedTransferNumber}"`);
    
    if (!transferNumber) {
      throw new Error('OPTION2_TRANSFER_NUMBER no configurado');
    }
    
    // Determinar si el número está permitido
    const isAllowedNumber = this.checkIfNumberIsAllowed(callerNumber, allowedNumbers);
    
    // Elegir el número de transferencia según si está permitido o no
    const targetNumber = isAllowedNumber ? transferNumber : blockedTransferNumber;
    
    console.log(`${isAllowedNumber ? '✅' : '❌'} Número ${isAllowedNumber ? 'permitido' : 'bloqueado'}, transfiriendo a: ${targetNumber}`);
    
    // Registrar métricas (usar método específico de logging)
    console.log(`📊 Transfer metrics - CallSid: ${callSid}, Caller: ${callerNumber}, Allowed: ${isAllowedNumber}, Target: ${targetNumber}`);
    
    return {
      isAllowed: isAllowedNumber,
      targetNumber
    };
  }
  
  /**
   * Verifica si el número está en la lista permitida
   */
  checkIfNumberIsAllowed(callerNumber, allowedNumbers) {
    console.log(`🔍 DEBUG checkIfNumberIsAllowed:`);
    console.log(`   callerNumber: "${callerNumber}"`);
    console.log(`   allowedNumbers:`, allowedNumbers);
    
    if (!callerNumber || !allowedNumbers || allowedNumbers.length === 0) {
      console.log(`   ❌ Validación inicial falló - caller: ${!!callerNumber}, allowed: ${!!allowedNumbers}, length: ${allowedNumbers?.length}`);
      return false;
    }
    
    // Normalizar el número del llamante
    const normalizedCaller = callerNumber.replace(/\D/g, '');
    console.log(`   Normalized caller: "${normalizedCaller}"`);
    
    // Verificar si el número está en la lista permitida
    const result = allowedNumbers.some(allowed => {
      const normalizedAllowed = allowed.replace(/\D/g, '');
      console.log(`   Checking "${allowed}" -> normalized: "${normalizedAllowed}"`);
      
      // Coincidencia exacta
      if (normalizedCaller === normalizedAllowed) {
        console.log(`   ✅ Exact match found: "${normalizedCaller}" === "${normalizedAllowed}"`);
        return true;
      }
      
      // Coincidencia por terminación (últimos 4 dígitos)
      if (normalizedAllowed.length <= 4 && normalizedCaller.endsWith(normalizedAllowed)) {
        console.log(`   ✅ Suffix match found: "${normalizedCaller}" ends with "${normalizedAllowed}"`);
        return true;
      }
      
      console.log(`   ❌ No match: "${normalizedCaller}" vs "${normalizedAllowed}"`);
      return false;
    });
    
    console.log(`   Final result: ${result}`);
    return result;
  }
  
  /**
   * Construye el XML de respuesta para transferencia
   */
  buildTransferResponse(targetNumber, callerNumber) {
    const elements = [];
    
    // Mensaje antes de transferir
    elements.push(XMLBuilder.addSay(
      "Transfiriéndole con un asesor para su cotización.",
      { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
    ));
    
    // Configurar transferencia
    const dialElement = XMLBuilder.addDial(targetNumber, {
      callerId: config.transfer.callerId || callerNumber,
      timeout: config.transfer.timeout || "30",
      timeLimit: config.transfer.timeLimit || "3600"
    });
    
    elements.push(dialElement);
    
    // Mensaje si la transferencia falla
    elements.push(XMLBuilder.addSay(
      "Lo sentimos, todos nuestros ejecutivos están ocupados en este momento. Por favor intente más tarde.",
      { voice: "Azure.es-MX-DaliaNeural", language: "es-MX" }
    ));
    
    // Volver al menú principal
    elements.push(XMLBuilder.addRedirect('/welcome', 'GET'));
    
    return XMLBuilder.buildResponse(elements);
  }
}

module.exports = new TransferService();