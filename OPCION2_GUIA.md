# Guía de Configuración - Opción 2: Transferencia Condicional

## 📋 Resumen
La opción 2 del IVR tiene dos modos:
1. **Modo transferencia temporal** (activo): Transfiere directamente según el número del llamante
2. **Modo cotización normal** (pausado): Solicita coordenadas y calcula cotización

## 🔧 Variables de Configuración

### Control Principal
```env
OPTION2_TRANSFER_MODE=true    # true = transferencia, false = cotización
```

### Números Permitidos
```env
OPTION2_ALLOWED_NUMBERS=5558,5949069152,+525578351564,+525615521342,1342
```
**Formato soportado:**
- Números completos: `+525615521342`
- Terminaciones: `1342` (últimos 4 dígitos)
- Terminaciones cortas: `5558`

### Números de Transferencia
```env
OPTION2_TRANSFER_NUMBER=+525534698379           # Para números PERMITIDOS
OPTION2_BLOCKED_TRANSFER_NUMBER=+525578352757   # Para números BLOQUEADOS
```

## 🔄 Flujo de Funcionamiento

```
📞 Usuario llama y presiona "2"
    ↓
🔍 Sistema detecta número del llamante
    ↓
❓ ¿Está en OPTION2_ALLOWED_NUMBERS?
    ↓                    ↓
✅ SÍ permitido      ❌ NO permitido
    ↓                    ↓
📞 Transfiere a:      📞 Transfiere a:
OPTION2_TRANSFER_     OPTION2_BLOCKED_
NUMBER               TRANSFER_NUMBER
```

## 📊 Ejemplos de Configuración

### Ejemplo 1: Cliente IKEA vs Clientes Restringidos
```env
OPTION2_ALLOWED_NUMBERS=5558,+525549069152
OPTION2_TRANSFER_NUMBER=+525534698379      # Agente que atiende IKEA
OPTION2_BLOCKED_TRANSFER_NUMBER=+525578352757  # Buzón de voz o agente sin atención
```

### Ejemplo 2: Solo Terminaciones
```env
OPTION2_ALLOWED_NUMBERS=5558,1234,9876
# Números como +525551235558, +525561231234, +525569876543 serán permitidos
```

### Ejemplo 3: Mix de Formatos
```env
OPTION2_ALLOWED_NUMBERS=5558,+525549069152,1342,+525615521342
```

## 🧪 Pruebas

### Tu Configuración Actual
```env
OPTION2_TRANSFER_MODE=true
OPTION2_ALLOWED_NUMBERS=5558,5949069152,+525578351564,+525615521342,1342
OPTION2_TRANSFER_NUMBER=+525534698379
OPTION2_BLOCKED_TRANSFER_NUMBER=+525578352757
```

### Tu Número de Prueba: `+525615521342`
- ✅ **Debería estar permitido** (está en la lista)
- ✅ **Debería ir a**: `+525534698379`

## 🔍 Diagnóstico de tu Problema

En el log veo:
```
From: +525615521342
❌ Número bloqueado, transfiriendo a: +525578352757
```

**Posibles causas:**
1. El servidor no ha reiniciado después del cambio en `.env`
2. Hay un problema con la lógica de comparación de números

## 🛠️ Solución

### Paso 1: Verificar Variables
Reinicia el servidor para que cargue las nuevas variables:
```bash
# Detener servidor actual
# Reiniciar: npm start
```

### Paso 2: Verificar Logs
El log debería mostrar:
```
✅ Número permitido, transfiriendo a: +525534698379
```

### Paso 3: Debug Manual
Prueba con diferentes formatos en la lista:
```env
OPTION2_ALLOWED_NUMBERS=+525615521342,525615521342,5615521342,1342
```

## 📝 Cambio de Modo

### Para activar Cotización Normal (pausar transferencias)
```env
OPTION2_TRANSFER_MODE=false
```

### Para activar Transferencia Temporal
```env
OPTION2_TRANSFER_MODE=true
```

## 📞 Números de Contacto Configurados

| Tipo | Número | Propósito |
|------|--------|-----------|
| Permitido | `+525534698379` | Agente que atiende cotizaciones |
| Bloqueado | `+525578352757` | Agente secundario o buzón |

## 🚨 Troubleshooting

### Si tu número sigue bloqueado:
1. Verifica que el servidor se reinició
2. Revisa que no hay espacios en la configuración
3. Prueba agregando solo tu número: `OPTION2_ALLOWED_NUMBERS=+525615521342`

### Si necesitas cambiar destinos:
```env
OPTION2_TRANSFER_NUMBER=+52XXXXXXXXXX     # Cambiar por número deseado
OPTION2_BLOCKED_TRANSFER_NUMBER=+52XXXXXX # Cambiar por número deseado
```