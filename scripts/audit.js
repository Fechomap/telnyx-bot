// scripts/audit.js
const fs = require('fs');
const path = require('path');

// Configuración de la auditoría
const auditConfig = {
  aiPatterns: [
    /AIAssistant/gi,
    /aiController/g,
    /aiService/g,
    /speechRecognition/gi,
    /SpeechResult/g
  ],
  requiredPatterns: [
    /Polly\.Mia-Neural/g,
    /redis/gi,
    /cache/gi
  ],
  directories: ['src', 'routes', 'controllers', 'services']
};

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = {
    path: filePath,
    hasAI: false,
    aiMatches: [],
    hasRedis: false,
    hasMiaVoice: false,
    issues: []
  };

  // Buscar patrones AI
  auditConfig.aiPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      results.hasAI = true;
      results.aiMatches.push(...matches);
    }
  });

  // Buscar Redis
  if (content.match(/redis/gi)) {
    results.hasRedis = true;
  }

  // Buscar voz Mia
  if (content.match(/Polly\.Mia-Neural/g)) {
    results.hasMiaVoice = true;
  }

  // Identificar problemas
  if (results.hasAI) {
    results.issues.push('Contiene código AI que debe ser eliminado');
  }

  return results;
}

function runAudit() {
  const results = [];
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.includes('node_modules')) {
        scanDir(fullPath);
      } else if (file.endsWith('.js')) {
        results.push(auditFile(fullPath));
      }
    });
  }

  auditConfig.directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      scanDir(dir);
    }
  });

  // Generar reporte
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: results.length,
    filesWithAI: results.filter(r => r.hasAI).length,
    filesWithRedis: results.filter(r => r.hasRedis).length,
    filesWithMia: results.filter(r => r.hasMiaVoice).length,
    issues: results.filter(r => r.issues.length > 0)
  };

  // Guardar reporte
  fs.writeFileSync(
    'audit-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('Auditoría completada. Reporte guardado en audit-report.json');
  console.log(`Archivos con AI: ${report.filesWithAI}`);
  console.log(`Archivos con Redis: ${report.filesWithRedis}`);
  console.log(`Archivos con problemas: ${report.issues.length}`);
}

runAudit();