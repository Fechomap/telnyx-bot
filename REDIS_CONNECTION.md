# Guía de Conexión a Redis en Railway

Esta guía contiene instrucciones detalladas para configurar y solucionar problemas de conexión entre tu aplicación TeXML Bot y el servicio Redis en Railway.

## Configuración Correcta

### URL de Conexión

La URL de conexión a Redis debe tener la siguiente estructura:

```
redis://[usuario]:[contraseña]@[host]:[puerto]
```

Por ejemplo:
```
redis://default:SkWtfdmbcAWMubckxXhIyvWecSNKnLOq@switchyard.proxy.rlwy.net:22253
```

### Variables de Entorno en Railway

Para configurar correctamente la conexión:

1. Ve a la sección "Variables" de tu proyecto en Railway
2. Crea o edita la variable `REDIS_URL`
3. Establece el valor completo de la URL (como se muestra arriba)
4. **No uses referencias como `${{Redis.REDIS_URL}}`** - estas pueden causar problemas de resolución en Railway

## Obtener la URL Correcta

Para obtener la URL correcta de conexión a Redis:

1. Ve al servicio Redis en Railway
2. Haz clic en "Connect" o "Conectar"
3. Selecciona la pestaña "Public Network" (Red Pública)
4. Copia la "Connection URL" completa

![Obtener URL Redis](/docs/redis-connection.png)

## Diferencia entre Red Pública y Privada

Railway ofrece dos tipos de conexión:

- **Red Privada**: Solo funciona entre servicios del mismo proyecto Railway
  - URL: `redis://default:password@containers-us-west-XXX.railway.internal:6379`
  - No tiene costo adicional

- **Red Pública**: Accesible desde cualquier lugar, incluyendo tu máquina local
  - URL: `redis://default:password@switchyard.proxy.rlwy.net:22253`
  - Genera costos de Egress

Para desarrollo local, usa la Red Pública. Para producción entre servicios del mismo proyecto, la Red Privada es más eficiente.

## Solución de Problemas

### Error: ECONNREFUSED

Si ves errores como:
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

Esto indica que estás intentando conectar a Redis localmente, pero:
1. No tienes Redis instalado localmente, o
2. El servicio Redis local no está en ejecución, o
3. La variable `REDIS_URL` está mal configurada

**Solución**: Usa la URL pública completa de Redis de Railway.

### Error: ERR invalid password

Si ves errores como:
```
ReplyError: ERR invalid password
```

Esto indica que la contraseña en la URL de Redis es incorrecta.

**Solución**: Verifica la contraseña en la URL de conexión proporcionada por Railway.

### Error: Error parsing URL

Si ves errores como:
```
Error parsing URL
```

Esto indica que el formato de la URL es incorrecto.

**Solución**: Asegúrate de que la URL tiene el formato correcto: `redis://usuario:contraseña@host:puerto`

## Verificar Conexión Exitosa

Una conexión exitosa mostrará mensajes como:

```
✅ Conectado a Redis: redis://***:***@switchyard.proxy.rlwy.net:22253
```

Puedes verificar que Redis está funcionando correctamente accediendo a:
```
https://tu-app.railway.app/health
```

Este endpoint mostrará el estado de la conexión a Redis y otras métricas del sistema.

## Modo de Fallback

Si por alguna razón no puedes conectar a Redis, el sistema TeXML Bot está diseñado para funcionar en modo degradado:

- Las consultas funcionarán pero serán más lentas (sin caché)
- Las sesiones no se mantendrán entre solicitudes
- Las métricas seguirán registrándose en logs locales

Para forzar este modo, puedes configurar:
```
REDIS_REQUIRED=false
```

Sin embargo, para producción, se recomienda siempre mantener Redis conectado para un rendimiento óptimo.