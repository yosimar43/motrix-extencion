// Script de limpieza para la extensión Motrix
// Ejecuta esto en la consola de la extensión para limpiar datos viejos

console.log('🧹 Iniciando limpieza de datos viejos...');

// Limpiar almacenamiento local
chrome.storage.local.clear(() => {
  console.log('✅ Almacenamiento local limpiado');
});

// Reconfigurar ajustes por defecto
chrome.storage.local.set({
  minSizeMB: 5,
  skipNext: false,
  motrixUrl: 'http://localhost:16800/jsonrpc',
  downloadHistory: []
}, () => {
  console.log('✅ Configuración por defecto restaurada');
});

console.log('🎉 Limpieza completada!');
console.log('💡 Recarga la extensión para aplicar cambios');