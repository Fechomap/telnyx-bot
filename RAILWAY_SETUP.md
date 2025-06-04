# 🚂 Configuración Railway - Sistema IVR Telnyx

## 🔧 **CONFIGURACIÓN REDIS EN RAILWAY**

### **Paso 1: Verificar Servicios**
1. Ve a tu **Railway Dashboard**
2. Asegúrate de tener estos servicios:
   - ✅ **`telnyx-bot`** (tu aplicación)
   - ✅ **`Redis`** (base de datos)

### **Paso 2: Conectar Redis**
1. En tu servicio **`telnyx-bot`**
2. Ve a la pestaña **"Variables"**
3. Agrega esta variable:

```bash
Variable: REDIS_URL
Valor: ${{ Redis.REDIS_URL }}
```

> **Nota:** Si tu servicio Redis tiene otro nombre, usa: `${{ NOMBRE_SERVICIO_REDIS.REDIS_URL }}`

### **Paso 3: Variables de Entorno Mínimas**
En **Railway → tu-servicio → Variables**, configura solo estas:

```bash
# Sistema
NODE_ENV=production
PORT=8080

# Redis (obligatorio)
REDIS_URL=${{ Redis.REDIS_URL }}

# Claves sensibles (OBLIGATORIAS)
TELNYX_API_KEY=tu-clave-telnyx-aqui
TELNYX_PUBLIC_KEY=tu-clave-publica-telnyx-aqui
OPENAI_API_KEY=tu-clave-openai-aqui

# Panel admin
ADMIN_TOKEN=admin-ivr-railway-2024-prod
```

---

## 🌐 **URLS DE ACCESO**

### **🚀 Railway (Producción)**
```bash
# Sistema principal
https://telnyx-bot-production.up.railway.app

# Health check
https://telnyx-bot-production.up.railway.app/health

# Panel de administración
https://telnyx-bot-production.up.railway.app/admin?token=admin-ivr-railway-2024-prod

# API admin (ejemplo)
https://telnyx-bot-production.up.railway.app/admin/config?token=admin-ivr-railway-2024-prod
```

### **💻 Local (Desarrollo)**
```bash
# Arrancar servidor
npm run dev

# URLs locales
http://localhost:3000                                    # Sistema principal
http://localhost:3000/health                            # Health check  
http://localhost:3000/admin?token=admin-ivr-railway-2024-prod  # Panel admin
```

---

## 🔍 **VERIFICACIÓN DE REDIS**

### **Verificar en Railway:**
1. Ve a: `https://tu-app.railway.app/health`
2. Deberías ver:
```json
{
  "status": "OK",
  "redis_status": "Connected",
  "config_status": "✅"
}
```

### **Verificar en Local:**
1. Ve a: `http://localhost:3000/health`
2. Deberías ver el mismo JSON con `redis_status: "Connected"`

---

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### **❌ "REDIS_URL: no definido"**
```bash
# Problema: Variable no configurada
# Solución: Agregar en Railway Variables:
REDIS_URL=${{ Redis.REDIS_URL }}
```

### **❌ "No se pudo conectar a Redis"**
```bash
# Problema: Servicio Redis no conectado
# Solución: 
1. Verificar que el servicio Redis esté running
2. Verificar que el nombre del servicio sea correcto
3. Reiniciar el deployment
```

### **❌ "Panel admin no carga"**
```bash
# Problema: Token incorrecto o ruta mal configurada
# Solución: Verificar que ADMIN_TOKEN esté configurado
# URL correcta: /admin?token=TU_TOKEN_REAL
```

---

## 📋 **CHECKLIST DE CONFIGURACIÓN**

### **✅ Antes del Deploy:**
- [ ] Servicio Redis creado en Railway
- [ ] Variable REDIS_URL configurada
- [ ] Todas las claves sensibles agregadas
- [ ] ADMIN_TOKEN configurado

### **✅ Después del Deploy:**
- [ ] `/health` muestra Redis conectado
- [ ] Panel admin accesible
- [ ] Webhooks Telnyx funcionando
- [ ] Transferencias funcionando

---

## 🎯 **CONFIGURACIÓN FINAL RECOMENDADA**

### **Variables Railway (Mínimas):**
```bash
NODE_ENV=production
REDIS_URL=${{ Redis.REDIS_URL }}
TELNYX_API_KEY=tu-clave-real
TELNYX_PUBLIC_KEY=tu-clave-publica-real
OPENAI_API_KEY=tu-clave-openai-real
ADMIN_TOKEN=tu-token-super-secreto
```

### **Todo lo demás se configura desde:**
```bash
https://tu-app.railway.app/admin?token=tu-token-super-secreto
```

---

## 🔄 **DESPUÉS DE CONFIGURAR:**

1. **Restart** el servicio en Railway
2. Verificar logs para confirmar conexión Redis
3. Acceder al panel admin
4. Configurar todas las variables desde la interfaz web
5. ¡Listo! 🎉

---

**¡Con esto Railway debería funcionar perfectamente! 🚀**