const XMLBuilder = require('../../../../src/texml/helpers/xmlBuilder');

describe('XMLBuilder', () => {
  describe('createDocument', () => {
    it('should create a basic XML document header', () => {
      const result = XMLBuilder.createDocument();
      
      expect(result).to.equal('<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n');
    });
  });
  
  describe('closeDocument', () => {
    it('should close an XML document', () => {
      const result = XMLBuilder.closeDocument();
      
      expect(result).to.equal('</Response>');
    });
  });
  
  describe('addSay', () => {
    it('should create a Say element with default options (Polly.Mia-Neural)', () => {
      const text = 'Hello, this is a test';
      const result = XMLBuilder.addSay(text);
      
      // Verificar que usa el formato correcto de Polly
      expect(result).to.include('voice="Polly.Mia-Neural"');
      expect(result).to.include('Hello, this is a test');
      expect(result).to.include('</Say>');
      
      // Verificar que NO incluye los atributos antiguos
      expect(result).to.not.include('provider="amazon"');
      expect(result).to.not.include('language="es-MX"');
      expect(result).to.not.include('engine="neural"');
    });
    
    it('should create a Say element with custom voice option', () => {
      const text = 'Hello, custom voice';
      const options = {
        voice: 'Mia'
      };
      
      const result = XMLBuilder.addSay(text, options);
      
      // Verificar que usa el formato correcto de Polly para Mia
      expect(result).to.include('voice="Polly.Mia-Neural"');
      expect(result).to.include('Hello, custom voice');
      
      // Verificar que NO incluye los atributos antiguos
      expect(result).to.not.include('provider="amazon"');
      expect(result).to.not.include('language="es-MX"');
      expect(result).to.not.include('engine="neural"');
    });
    
    it('should escape special characters in text', () => {
      const text = 'Test with <tags> & special "chars"';
      const result = XMLBuilder.addSay(text);
      
      expect(result).to.include('Test with &lt;tags&gt; &amp; special &quot;chars&quot;');
    });
  });
  
  describe('addGather', () => {
    it('should create a Gather element with default options', () => {
      const result = XMLBuilder.addGather();
      
      expect(result).to.include('<Gather action="/handle-input" method="POST"');
      expect(result).to.include('</Gather>');
    });
    
    it('should create a Gather element with custom options', () => {
      const options = {
        action: '/custom-action',
        method: 'GET',
        numDigits: '3',
        timeout: '10',
        finishOnKey: '*',
        input: 'dtmf',
        validDigits: '123',
        speechTimeout: 'auto'
      };
      
      const result = XMLBuilder.addGather(options);
      
      expect(result).to.include('action="/custom-action"');
      expect(result).to.include('method="GET"');
      expect(result).to.include('numDigits="3"');
      expect(result).to.include('timeout="10"');
      expect(result).to.include('finishOnKey="*"');
      expect(result).to.include('input="dtmf"');
      expect(result).to.include('validDigits="123"');
      expect(result).to.include('speechTimeout="auto"');
    });
    
    it('should create a Gather element with nested content', () => {
      const nestedContent = '    <Play>http://example.com/audio.mp3</Play>\n';
      const options = {
        action: '/nested-action',
        nested: nestedContent
      };
      
      const result = XMLBuilder.addGather(options);
      
      expect(result).to.include('action="/nested-action"');
      expect(result).to.include(nestedContent);
    });
  });
  
  describe('addDial', () => {
    it('should create a Dial element with a number', () => {
      const number = '+15551234567';
      const result = XMLBuilder.addDial(number);
      
      expect(result).to.include(`<Dial`);
      expect(result).to.include(`>${number}</Dial>`);
    });
    
    it('should create a Dial element with custom options', () => {
      const number = '+15551234567';
      const options = {
        callerId: '+15559876543',
        timeout: '45',
        timeLimit: '300'
      };
      
      const result = XMLBuilder.addDial(number, options);
      
      expect(result).to.include('callerId="+15559876543"');
      expect(result).to.include('timeout="45"');
      expect(result).to.include('timeLimit="300"');
      expect(result).to.include(`>${number}</Dial>`);
    });
  });
  
  describe('addHangup', () => {
    it('should create a Hangup element', () => {
      const result = XMLBuilder.addHangup();
      
      expect(result).to.equal('  <Hangup></Hangup>\n');
    });
  });
  
  describe('addPlay', () => {
    it('should create a Play element with a URL', () => {
      const url = 'https://example.com/audio.mp3';
      const result = XMLBuilder.addPlay(url);
      
      expect(result).to.equal(`  <Play>${url}</Play>\n`);
    });
  });
  
  describe('addRedirect', () => {
    it('should create a Redirect element with default method', () => {
      const url = '/welcome';
      const result = XMLBuilder.addRedirect(url);
      
      expect(result).to.include('method="POST"');
      expect(result).to.include(`>${url}</Redirect>`);
    });
    
    it('should create a Redirect element with custom method', () => {
      const url = '/welcome';
      const method = 'GET';
      const result = XMLBuilder.addRedirect(url, method);
      
      expect(result).to.include('method="GET"');
      expect(result).to.include(`>${url}</Redirect>`);
    });
  });
  
  describe('escapeXML', () => {
    it('should escape special XML characters', () => {
      const text = '< > & " \'';
      const result = XMLBuilder.escapeXML(text);
      
      expect(result).to.equal('&lt; &gt; &amp; &quot; &apos;');
    });
    
    it('should not alter regular text', () => {
      const text = 'Regular text with no special chars.';
      const result = XMLBuilder.escapeXML(text);
      
      expect(result).to.equal(text);
    });
  });
  
  describe('buildResponse', () => {
    it('should build a complete XML response with multiple elements', () => {
      // Crear elementos con el nuevo formato de voz
      const elements = [
        XMLBuilder.addSay('Welcome to the service.'),
        XMLBuilder.addGather({
          action: '/menu',
          numDigits: '1'
        }),
        XMLBuilder.addHangup()
      ];
      
      const result = XMLBuilder.buildResponse(elements);
      
      // Verificaciones generales
      expect(result).to.include('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).to.include('<Response>');
      
      // Verificar el nuevo formato de voz en el Say
      expect(result).to.include('<Say voice="Polly.Mia-Neural">');
      expect(result).to.include('Welcome to the service.');
      
      // Verificar otros elementos
      expect(result).to.include('action="/menu"');
      expect(result).to.include('method="POST"');
      expect(result).to.include('numDigits="1"');
      expect(result).to.include('<Hangup>');
      expect(result).to.include('</Response>');
      
      // Verificar que el elemento Say NO incluye los atributos antiguos
      const sayElementMatch = result.match(/<Say[^>]*>/);
      const sayElementStr = sayElementMatch ? sayElementMatch[0] : '';
      
      expect(sayElementStr).to.not.include('provider="amazon"');
      expect(sayElementStr).to.not.include('language="es-MX"');
      expect(sayElementStr).to.not.include('engine="neural"');
    });
  });
});