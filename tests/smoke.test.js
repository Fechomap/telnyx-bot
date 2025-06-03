describe('Smoke Tests', () => {
  it('debe pasar un test básico', () => {
    expect(1 + 1).toBe(2);
  });

  it('debe verificar que el entorno de test funciona', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('debe cargar módulos sin errores', () => {
    expect(() => {
      require('../src/utils/constants');
      require('../src/utils/dateFormatter');
      require('../src/utils/jsonValidator');
    }).not.toThrow();
  });
});