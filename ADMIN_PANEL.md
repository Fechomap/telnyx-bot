# 🎛️ Panel de Administración - Sistema IVR Telnyx

## 📋 Descripción

Panel de administración web moderno y seguro para gestionar todas las configuraciones del sistema IVR sin necesidad de editar código o hacer deploys.

## 🚀 Características

### ✨ **Interfaz Moderna**
- Diseño responsivo con Bootstrap 5
- Gradientes y animaciones suaves
- Icons de Font Awesome
- Tema profesional con colores corporativos

### 🔧 **Configuración Completa**
- **IVR Settings**: Modo optimizado, transferencias, caller ID
- **Números Telefónicos**: Agentes, transferencias, números permitidos/bloqueados
- **APIs**: URLs base, connection IDs, webhooks
- **OpenAI**: Assistant ID, timeouts
- **Sistema**: Monitoreo en tiempo real

### 🔒 **Seguridad**
- Autenticación con token admin
- Validación de datos en frontend y backend
- Backup automático de configuraciones
- Logs de acciones administrativas

### 📊 **Monitoreo**
- Estado del sistema en tiempo real
- Métricas de llamadas y rendimiento
- Conectividad de servicios (Redis, API externa, OpenAI)
- Tiempo de actividad y uso de memoria

## 🎯 Acceso al Panel

### URL de Acceso
```
https://tu-dominio.railway.app/admin?token=TU_ADMIN_TOKEN
```

### Variables de Entorno Requeridas
```bash
ADMIN_TOKEN=tu-token-super-secreto-2024
```

## 📱 Uso del Panel

### 1. **Configuración IVR**
- ✅ Alternar modo optimizado (mensajes cortos vs largos)
- ✅ Habilitar/deshabilitar transferencias
- ✅ Configurar Caller ID principal

### 2. **Gestión de Números**
- ✅ Agregar/quitar números de agentes
- ✅ Configurar números de transferencia
- ✅ Gestionar números permitidos/bloqueados

### 3. **Configuración APIs**
- ✅ URLs de API y webhooks
- ✅ Connection IDs de Telnyx
- ✅ Configuración de OpenAI

### 4. **Monitoreo Sistema**
- 📈 Tiempo de actividad
- 📞 Llamadas procesadas
- 🔗 Estado de servicios conectados
- 💾 Uso de memoria

## 🛠️ Funciones Administrativas

### **Acciones Rápidas**
```javascript
// Recargar configuración
loadConfig()

// Guardar todos los cambios
saveAllConfig()

// Probar conectividad del sistema
testSystem()

// Reiniciar sistema (solo desarrollo)
restartSystem()
```

### **Gestión de Números**
- **Agregar números**: Click en "Agregar Número"
- **Validación automática**: Formato de teléfono
- **Eliminación**: Click en ❌ junto al número

## 🔐 Seguridad y Autenticación

### **Niveles de Protección**
1. **Token de acceso**: Requerido para todas las operaciones
2. **Validación de entrada**: Sanitización de datos
3. **Backup automático**: Antes de cambios importantes
4. **Logging**: Todas las acciones quedan registradas

### **Formato del Token**
```bash
# En .env
ADMIN_TOKEN=admin-ivr-railway-2024-prod

# En URL
https://tu-app.railway.app/admin?token=admin-ivr-railway-2024-prod
```

## 📋 Variables Configurables

### **🔧 Configuración IVR**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `IVR_OPTIMIZED_MODE` | Mensajes cortos/largos | `true` |
| `TRANSFER_ENABLED` | Habilitar transferencias | `true` |
| `TELNYX_CALLER_ID` | Número principal | `+525588974515` |

### **📞 Números Telefónicos**
| Variable | Descripción | Formato |
|----------|-------------|---------|
| `AGENT_NUMBER` | Números de agentes | `+525534698379,+525578351564` |
| `OPTION2_TRANSFER_NUMBER` | Transferencia opción 2 | `+525534698379` |
| `OPTION2_BLOCKED_TRANSFER_NUMBER` | Número bloqueado | `+525578352757` |
| `OPTION2_ALLOWED_NUMBERS` | Números permitidos | `5558,+525615521342` |

### **🌐 APIs y Conexiones**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `API_BASE_URL` | URL del servidor de expedientes | `https://crkdeti.com/api` |
| `WEBHOOK_BASE_URL` | URL pública para webhooks | `https://tu-app.railway.app` |
| `TELNYX_CONNECTION_ID` | ID de conexión Telnyx | `2689719469088965785` |

### **🤖 OpenAI**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `OPENAI_ASSISTANT_ID` | ID del asistente | `asst_HtM3MeGseQeI9kTwhDiP1Lh1` |
| `OPENAI_TIMEOUT` | Timeout en ms | `30000` |

## 🚀 Deployment en Railway

### **1. Variables de Entorno**
```bash
# Copiar desde .env local
ADMIN_TOKEN=tu-token-secreto
IVR_OPTIMIZED_MODE=true
TRANSFER_ENABLED=true
# ... resto de variables
```

### **2. Configuración Automática**
- El panel se auto-configura al deployar
- No requiere configuración adicional
- Funciona con cualquier dominio de Railway

### **3. Acceso Post-Deploy**
```bash
# URL automática
https://tu-app-name.up.railway.app/admin?token=tu-token

# Con dominio personalizado
https://tu-dominio.com/admin?token=tu-token
```

## 🔄 Flujo de Trabajo

### **Cambio de Configuración**
1. 🔐 Acceder al panel con token
2. ⚙️ Modificar configuraciones necesarias
3. ✅ Validación automática en tiempo real
4. 💾 Guardar cambios (actualiza .env automáticamente)
5. 🔄 Reinicio automático de servicios afectados

### **Monitoreo Continuo**
- 📊 Dashboard actualizado cada 30 segundos
- 🚨 Alertas automáticas de problemas
- 📝 Logs de todas las acciones

## 🎨 Personalización

### **Colores y Temas**
```css
:root {
  --primary-color: #4f46e5;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
}
```

### **Shortcuts de Teclado**
- `Ctrl/Cmd + S`: Guardar configuración
- `Ctrl/Cmd + R`: Recargar configuración

## 🆘 Troubleshooting

### **Problemas Comunes**

#### ❌ "Token inválido"
```bash
# Verificar token en .env
echo $ADMIN_TOKEN

# O en Railway dashboard -> Variables
```

#### ❌ "Error al guardar configuración"
- Verificar permisos de escritura
- Verificar formato de números de teléfono
- Revisar URLs válidas

#### ❌ "Servicios no disponibles"
- Verificar conectividad Redis
- Verificar API externa
- Revisar claves OpenAI

### **Logs de Debug**
```bash
# En Railway
railway logs

# Buscar errores admin
railway logs | grep "admin"
```

## 📞 Soporte

Para soporte técnico:
1. Revisar logs del sistema
2. Verificar estado de servicios en el dashboard
3. Usar función "Probar Sistema" del panel

---

## 🏆 Beneficios

✅ **Sin Código**: Configuración 100% visual
✅ **Sin Deploys**: Cambios instantáneos
✅ **Seguro**: Autenticación y validación
✅ **Moderno**: Interfaz profesional
✅ **Monitoreado**: Estado en tiempo real
✅ **Respaldado**: Backup automático
✅ **Responsive**: Funciona en móvil/desktop

**¡Configurar el IVR nunca fue tan fácil! 🎉**