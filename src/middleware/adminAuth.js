// src/middleware/adminAuth.js
const config = require('../config/texml');

/**
 * Middleware de autenticación para el panel de administración
 */
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  // También verificar en query params para desarrollo
  const queryToken = req.query.token;
  
  const providedToken = token || queryToken;
  
  if (!providedToken) {
    return res.status(401).json({
      error: 'Token de autenticación requerido',
      message: 'Proporcione el token en el header Authorization: Bearer <token> o como query param ?token=<token>'
    });
  }
  
  if (providedToken !== config.adminToken) {
    return res.status(403).json({
      error: 'Token de autenticación inválido',
      message: 'El token proporcionado no es válido'
    });
  }
  
  next();
}

/**
 * Middleware para servir páginas de admin con autenticación básica
 */
function authenticateAdminPage(req, res, next) {
  const token = req.query.token;
  
  if (!token || token !== config.adminToken) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Acceso Requerido</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .login-form { 
            background: white; 
            padding: 2rem; 
            border-radius: 10px; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 100%;
          }
          .form-group { margin-bottom: 1rem; }
          label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
          input { 
            width: 100%; 
            padding: 0.75rem; 
            border: 2px solid #e2e8f0; 
            border-radius: 8px; 
            font-size: 1rem;
            box-sizing: border-box;
          }
          input:focus { 
            outline: none; 
            border-color: #4f46e5; 
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); 
          }
          button { 
            width: 100%; 
            padding: 0.75rem; 
            background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 1rem; 
            cursor: pointer; 
            font-weight: 600;
          }
          button:hover { 
            transform: translateY(-1px); 
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); 
          }
          h2 { text-align: center; color: #1f2937; margin-bottom: 1.5rem; }
          .error { color: #ef4444; font-size: 0.875rem; margin-top: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="login-form">
          <h2>🔐 Acceso Administrativo</h2>
          <form method="GET">
            <div class="form-group">
              <label for="token">Token de Administrador:</label>
              <input type="password" id="token" name="token" required placeholder="Ingrese el token de acceso">
              ${req.query.token ? '<div class="error">Token inválido. Intente nuevamente.</div>' : ''}
            </div>
            <button type="submit">Acceder al Panel</button>
          </form>
        </div>
      </body>
      </html>
    `);
  }
  
  next();
}

module.exports = {
  authenticateAdmin,
  authenticateAdminPage
};