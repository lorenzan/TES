// Archivo principal para inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
  // Crear instancia del gestor de datos
  const dataManager = new DataManager();
  
  // Crear instancia del controlador de UI
  const uiController = new UIController(dataManager);
  
  // Inicializar la aplicación
  console.log('Aplicación de Optimización de Tintorería inicializada');
});
