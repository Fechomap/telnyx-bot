// src/utils/colorConverter.js

/**
 * Convierte un código hexadecimal de color a un nombre de color legible en español
 * @param {string} hexColor - Código hexadecimal del color (con o sin #)
 * @returns {string} Nombre del color en español
 */
function hexToColorName(hexColor) {
  if (!hexColor) return 'color no especificado';
  
  // Normalizar el hex (remover # si existe y convertir a mayúsculas)
  hexColor = hexColor.toString().replace('#', '').toUpperCase();
  
  // Validar que sea un formato hex válido
  if (!/^[0-9A-F]{6}$/i.test(hexColor)) {
    return 'color desconocido'; // Retorna mensaje genérico si no es válido
  }
  
  // Convertir hex a RGB
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  
  // Diccionario de colores básicos con sus valores RGB
  const coloresBasicos = [
    { nombre: 'blanco', r: 255, g: 255, b: 255 },
    { nombre: 'negro', r: 0, g: 0, b: 0 },
    { nombre: 'rojo', r: 255, g: 0, b: 0 },
    { nombre: 'verde', r: 0, g: 255, b: 0 },
    { nombre: 'azul', r: 0, g: 0, b: 255 },
    { nombre: 'amarillo', r: 255, g: 255, b: 0 },
    { nombre: 'cian', r: 0, g: 255, b: 255 },
    { nombre: 'magenta', r: 255, g: 0, b: 255 },
    { nombre: 'gris', r: 128, g: 128, b: 128 },
    { nombre: 'gris claro', r: 192, g: 192, b: 192 },
    { nombre: 'gris oscuro', r: 64, g: 64, b: 64 },
    { nombre: 'marrón', r: 128, g: 64, b: 0 },
    { nombre: 'naranja', r: 255, g: 165, b: 0 },
    { nombre: 'rosa', r: 255, g: 192, b: 203 },
    { nombre: 'púrpura', r: 128, g: 0, b: 128 },
    { nombre: 'violeta', r: 238, g: 130, b: 238 },
    { nombre: 'dorado', r: 255, g: 215, b: 0 },
    { nombre: 'plateado', r: 192, g: 192, b: 192 },
    { nombre: 'beige', r: 245, g: 245, b: 220 },
    { nombre: 'turquesa', r: 64, g: 224, b: 208 }
  ];
  
  // Calcular la distancia euclidiana para encontrar el color más cercano
  let colorMasCercano = coloresBasicos[0];
  let distanciaMinima = calcularDistancia(r, g, b, colorMasCercano.r, colorMasCercano.g, colorMasCercano.b);
  
  for (let i = 1; i < coloresBasicos.length; i++) {
    const color = coloresBasicos[i];
    const distancia = calcularDistancia(r, g, b, color.r, color.g, color.b);
    
    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      colorMasCercano = color;
    }
  }
  
  console.log(`🎨 Convertido color HEX ${hexColor} a nombre: ${colorMasCercano.nombre}`);
  return colorMasCercano.nombre;
}

/**
 * Calcula la distancia euclidiana entre dos colores en el espacio RGB
 */
function calcularDistancia(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

module.exports = {
  hexToColorName
};