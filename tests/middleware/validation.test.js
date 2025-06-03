const { validationResult } = require('express-validator');
const validators = require('../../src/middleware/validation');

// Mock de express-validator
jest.mock('express-validator');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validators.welcome', () => {
    it('debe validar CallSid correctamente', async () => {
      req.body = {
        CallSid: 'CA123456789',
        From: '+1234567890',
        To: '+0987654321'
      };

      // Simular que no hay errores de validación
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      // Ejecutar los validadores
      for (const validator of validators.welcome) {
        await validator(req, res, next);
      }

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe rechazar si falta CallSid', async () => {
      req.body = {
        From: '+1234567890'
      };

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'CallSid es requerido' }]
      });

      // Ejecutar el último middleware (handleValidationErrors)
      const handleValidationErrors = validators.welcome[validators.welcome.length - 1];
      await handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Datos de entrada inválidos',
        details: [{ msg: 'CallSid es requerido' }]
      });
    });
  });

  describe('validators.menuSelection', () => {
    it('debe sanitizar y validar dígitos DTMF', async () => {
      req.body = {
        CallSid: 'CA123456789',
        Digits: '1'
      };

      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      for (const validator of validators.menuSelection) {
        await validator(req, res, next);
      }

      expect(next).toHaveBeenCalled();
    });

    it('debe rechazar dígitos inválidos', async () => {
      req.body = {
        CallSid: 'CA123456789',
        Digits: '7' // Dígito no permitido
      };

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Opción inválida' }]
      });

      const handleValidationErrors = validators.menuSelection[validators.menuSelection.length - 1];
      await handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validators.expediente', () => {
    it('debe sanitizar expediente correctamente', async () => {
      req.body = {
        CallSid: 'CA123456789',
        Digits: 'abc-123'
      };

      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      for (const validator of validators.expediente) {
        await validator(req, res, next);
      }

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validators.processOption', () => {
    it('debe validar expediente y opción', async () => {
      req.body = {
        CallSid: 'CA123456789',
        expediente: 'TEST123',
        option: '1'
      };

      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      for (const validator of validators.processOption) {
        await validator(req, res, next);
      }

      expect(next).toHaveBeenCalled();
    });
  });
});