#!/bin/bash
# Script completo de limpieza - guardar como cleanup-final.sh

echo "🧹 Iniciando limpieza final del proyecto..."

# 1. Crear backup antes de eliminar
BACKUP_DIR="backup_final_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creando backup en $BACKUP_DIR"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
cp -r test $BACKUP_DIR/
cp package.json $BACKUP_DIR/
cp .env $BACKUP_DIR/

# 2. Eliminar archivos identificados
echo "🗑️  Eliminando archivos obsoletos..."
rm -f src/controllers/aiController.js
rm -f src/services/aiService.js
rm -f src/routes/aiRoutes.js
rm -f src/routes/texmlRoutes.js
rm -f src/utils/speechUtils.js
rm -f src/texml/templates/welcome.js
rm -f src/texml/handlers/templateHandler.js
rm -f src/cache/sessionCache.js

# 3. Eliminar tests obsoletos
rm -f test/unit/services/aiService.test.js
rm -f test/unit/controllers/aiController.test.js
rm -f test/unit/utils/speechUtils.test.js

# 4. Limpiar dependencias no utilizadas
echo "📦 Limpiando dependencias..."
npm uninstall openai anthropic @google-cloud/speech

# 5. Limpiar node_modules y reinstalar
echo "🔄 Reinstalando dependencias limpias..."
rm -rf node_modules
rm package-lock.json
npm install

# 6. Ejecutar auditoría de seguridad
echo "🔒 Ejecutando auditoría de seguridad..."
npm audit fix

# 7. Verificar estructura final
echo "📁 Estructura final del proyecto:"
tree src -I 'node_modules'

echo "✅ Limpieza completada!"
echo "📁 Backup guardado en: $BACKUP_DIR"