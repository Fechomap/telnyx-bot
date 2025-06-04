# 📞 GUÍA SIMPLE - OPCIÓN 2 (TRANSFERENCIA DE COTIZACIONES)

## 🎯 ¿QUÉ HACE LA OPCIÓN 2?
Cuando alguien presiona **2**, el sistema transfiere la llamada a diferentes números según quién llama.

## 🔧 CONFIGURACIÓN ACTUAL

```env
# ¿Activar transferencias? (true = SÍ, false = NO)
OPTION2_TRANSFER_MODE=true

# Números que pueden usar la opción 2
OPTION2_ALLOWED_NUMBERS=5558,5949069152,+525578351564,+525615521342,1342

# A dónde transferir si el número SÍ está permitido
OPTION2_TRANSFER_NUMBER=+525534564136

# A dónde transferir si el número NO está permitido  
OPTION2_BLOCKED_TRANSFER_NUMBER=+525578352757
```

## 📋 EXPLICACIÓN SIMPLE

### 1️⃣ **OPTION2_TRANSFER_MODE**
- `true` = Transfiere llamadas
- `false` = No transfiere (usa cotización por voz)

### 2️⃣ **OPTION2_ALLOWED_NUMBERS** 
**Lista de números permitidos.** Puedes poner:
- Números completos: `+525615521342`
- Solo los últimos 4 dígitos: `1342`
- Terminaciones cortas: `5558`

### 3️⃣ **OPTION2_TRANSFER_NUMBER**
**Número al que transfiere SI el que llama está permitido**
- Tu configuración: `+525534564136`

### 4️⃣ **OPTION2_BLOCKED_TRANSFER_NUMBER**
**Número al que transfiere SI el que llama NO está permitido**
- Tu configuración: `+525578352757`

## 🔄 CÓMO FUNCIONA

```
Usuario llama al +525588974515
           ↓
    Presiona "2"
           ↓
Sistema revisa quién llama
           ↓
¿Está en la lista permitida?
     ↓              ↓
    SÍ             NO
     ↓              ↓
Transfiere a    Transfiere a
+525534564136   +525578352757
```

## ✅ EJEMPLOS PRÁCTICOS

### Tu lista actual permite estos números:
- ✅ `+525615521342` → Transfiere a `+525534564136`
- ✅ `+525549069152` → Transfiere a `+525534564136`
- ✅ `+525578351564` → Transfiere a `+525534564136`
- ✅ Cualquier número que termine en `5558` → Transfiere a `+525534564136`
- ✅ Cualquier número que termine en `1342` → Transfiere a `+525534564136`
- ❌ Cualquier otro número → Transfiere a `+525578352757`

## 🚀 CÓMO CAMBIAR LA CONFIGURACIÓN

### Cambiar el número al que transfiere para permitidos:
```env
OPTION2_TRANSFER_NUMBER=+52XXXXXXXXXX
```

### Cambiar el número al que transfiere para bloqueados:
```env
OPTION2_BLOCKED_TRANSFER_NUMBER=+52XXXXXXXXXX
```

### Agregar más números permitidos:
```env
OPTION2_ALLOWED_NUMBERS=5558,5949069152,+525578351564,+525615521342,1342,NUEVO_NUMERO
```

### Desactivar transferencias (volver a cotización por voz):
```env
OPTION2_TRANSFER_MODE=false
```

## 🔴 IMPORTANTE
Después de cambiar el `.env`, **SIEMPRE reinicia el servidor**:
1. Detén el servidor (Ctrl+C)
2. Inicia de nuevo: `npm run dev`

## 🧪 PRUEBA RÁPIDA
1. Llama desde `+525615521342`
2. Presiona 2
3. Debería transferir a `+525534564136`

Si no funciona:
- Verifica que reiniciaste el servidor
- Revisa que no hay espacios extras en los números
- Asegúrate que el número está correcto en el .env