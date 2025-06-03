const { body, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({ 
      error: 'Datos de entrada inválidos', 
      details: errors.array() 
    });
  }
  next();
};

const sanitizeDTMF = (value) => {
  if (!value) return '';
  return value.replace(/[^0-9*#]/g, '');
};

const sanitizeExpediente = (value) => {
  if (!value) return '';
  return value.replace(/[^0-9A-Za-z-]/g, '').toUpperCase();
};

const validators = {
  welcome: [
    query('CallSid').notEmpty().trim().escape(),
    query('From').optional().isMobilePhone(),
    query('To').optional().isMobilePhone(),
    handleValidationErrors
  ],

  menuSelection: [
    query('CallSid').notEmpty().trim().escape(),
    query('Digits').optional().customSanitizer(sanitizeDTMF).isIn(['1', '2', '3', '9', '*']),
    handleValidationErrors
  ],

  expediente: [
    query('CallSid').notEmpty().trim().escape(),
    query('Digits').optional().customSanitizer(sanitizeExpediente).isLength({ min: 1, max: 20 }),
    query('SpeechResult').optional().trim().escape(),
    handleValidationErrors
  ],

  processOption: [
    query('CallSid').notEmpty().trim().escape(),
    query('Digits').optional().customSanitizer(sanitizeDTMF).isIn(['0', '1', '2', '3', '4', '5', '9']),
    handleValidationErrors
  ],

  transferAgent: [
    query('CallSid').notEmpty().trim().escape(),
    query('From').optional().isMobilePhone(),
    handleValidationErrors
  ],

  webhook: [
    query('CallSid').notEmpty().trim().escape(),
    query('CallStatus').optional().isIn(['initiated', 'ringing', 'answered', 'completed']),
    handleValidationErrors
  ],

  // Validadores para rutas de cotización
  cotizacion: [
    query('CallSid').notEmpty().trim().escape(),
    handleValidationErrors
  ],

  grabacion: [
    body('CallSid').optional().trim().escape(),
    query('CallSid').optional().trim().escape(),
    body('RecordingUrl').optional().isURL(),
    query('RecordingUrl').optional().isURL(),
    body('RecordingSid').optional().trim().escape(),
    query('RecordingSid').optional().trim().escape(),
    // Al menos uno de los CallSid debe estar presente
    (req, res, next) => {
      if (!req.body.CallSid && !req.query.CallSid) {
        return res.status(400).json({ 
          error: 'CallSid is required',
          details: [{ msg: 'CallSid must be provided in body or query' }]
        });
      }
      next();
    },
    handleValidationErrors
  ],

  statusGrabacion: [
    body('RecordingSid').optional().trim().escape(),
    query('RecordingSid').optional().trim().escape(),
    body('RecordingStatus').optional().isIn(['in-progress', 'completed', 'failed']),
    query('RecordingStatus').optional().isIn(['in-progress', 'completed', 'failed']),
    body('RecordingUrl').optional().isURL(),
    query('RecordingUrl').optional().isURL(),
    // Al menos uno de los RecordingSid debe estar presente
    (req, res, next) => {
      if (!req.body.RecordingSid && !req.query.RecordingSid) {
        return res.status(400).json({ 
          error: 'RecordingSid is required',
          details: [{ msg: 'RecordingSid must be provided in body or query' }]
        });
      }
      next();
    },
    handleValidationErrors
  ],

  procesamiento: [
    query('CallSid').notEmpty().trim().escape(),
    handleValidationErrors
  ]
};

module.exports = validators;