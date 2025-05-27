// Controlador de la interfaz de usuario
class UIController {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.selectedMachine = null;
    this.tempRestrictions = {
      colorCode: [],
      style: [],
      maxWeight: null,
      sectorization: [],
      fabricType: [],
      tone: []
    };
    
    // Hacer disponible el dataManager globalmente para la validación de sectorización
    window.dataManager = dataManager;
    
    // Inicializar eventos de la interfaz
    this.initTabNavigation();
    this.initFileUpload();
    this.initMachineManagement();
    this.initMatrixManagement();
    this.initOptimizer();
    this.initResults();
  }

  // Inicializar navegación por pestañas
  initTabNavigation() {
    const tabs = [
      'upload', 'machines', 'matrix', 'optimizer', 'results'
    ];
    
    tabs.forEach(tab => {
      const button = document.getElementById(`tab-${tab}`);
      if (button) {
        button.addEventListener('click', () => this.changeTab(tab));
      }
    });
  }

  // Cambiar de pestaña
  changeTab(tabId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.tab-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Desactivar todos los botones
    document.querySelectorAll('.app-nav button').forEach(button => {
      button.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    const section = document.getElementById(`${tabId}-section`);
    if (section) {
      section.classList.add('active');
    }
    
    // Activar el botón seleccionado
    const button = document.getElementById(`tab-${tabId}`);
    if (button) {
      button.classList.add('active');
    }
  }

  // Inicializar carga de archivos
  initFileUpload() {
    const fileUpload = document.getElementById('file-upload');
    const fileInput = document.getElementById('excel-file');
    const uploadButton = document.getElementById('upload-button');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadInfo = document.getElementById('upload-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    
    // Evento de clic en la zona de carga
    fileUpload.addEventListener('click', () => {
      fileInput.click();
    });
    
    // Evento de cambio en el input de archivo
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        this.handleFileSelected(file, uploadPlaceholder, uploadInfo, fileName, fileSize, uploadButton);
      }
    });
    
    // Eventos de arrastrar y soltar
    fileUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUpload.style.borderColor = 'var(--primary-color)';
    });
    
    fileUpload.addEventListener('dragleave', () => {
      fileUpload.style.borderColor = 'var(--border-color)';
    });
    
    fileUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUpload.style.borderColor = 'var(--border-color)';
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        this.handleFileSelected(file, uploadPlaceholder, uploadInfo, fileName, fileSize, uploadButton);
      }
    });
    
    // Evento de clic en el botón de carga
    uploadButton.addEventListener('click', () => {
      this.handleFileUpload(fileInput, uploadButton);
    });
  }

  // Manejar archivo seleccionado
  handleFileSelected(file, uploadPlaceholder, uploadInfo, fileName, fileSize, uploadButton) {
    // Verificar extensión
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      this.showMessage('upload-message', 'warning', 'El archivo debe ser de tipo Excel (.xlsx, .xls).');
      return;
    }
    
    // Mostrar información del archivo
    uploadPlaceholder.style.display = 'none';
    uploadInfo.style.display = 'block';
    fileName.textContent = file.name;
    fileSize.textContent = (file.size / 1024).toFixed(2);
    
    // Habilitar botón de carga
    uploadButton.disabled = false;
  }

  // Manejar carga de archivo
  async handleFileUpload(fileInput, uploadButton) {
    if (!fileInput.files || fileInput.files.length === 0) {
      this.showMessage('upload-message', 'warning', 'Por favor seleccione un archivo Excel.');
      return;
    }
    
    const file = fileInput.files[0];
    
    // Mostrar mensaje de carga
    this.showMessage('upload-message', 'info', 'Cargando datos...');
    uploadButton.disabled = true;
    uploadButton.textContent = 'Cargando...';
    
    try {
      // Cargar datos desde Excel
      const result = await this.dataManager.loadFromExcel(file);
      
      // Actualizar contadores
      document.getElementById('orders-count').textContent = result.orders;
      document.getElementById('machines-count').textContent = result.machines;
      document.getElementById('categories-count').textContent = result.categories;
      
      // Habilitar pestañas
      document.getElementById('tab-machines').disabled = false;
      document.getElementById('tab-matrix').disabled = false;
      document.getElementById('tab-optimizer').disabled = false;
      
      // Habilitar botón de optimización si hay datos suficientes
      document.getElementById('optimize-btn').disabled = 
        result.orders === 0 || result.machines === 0 || result.categories === 0;
      
      // Actualizar interfaz de máquinas
      this.updateMachinesList();
      
      // Actualizar matriz de transición
      this.updateMatrixTable();
      
      // Mostrar mensaje de éxito
      this.showMessage('upload-message', 'success', 'Datos cargados correctamente.');
      
      // Limpiar formulario
      fileInput.value = '';
      document.getElementById('upload-placeholder').style.display = 'block';
      document.getElementById('upload-info').style.display = 'none';
      uploadButton.textContent = 'Cargar Datos';
      uploadButton.disabled = true;
    } catch (error) {
      this.showMessage('upload-message', 'danger', `Error al cargar el archivo: ${error}`);
      uploadButton.textContent = 'Cargar Datos';
      uploadButton.disabled = false;
    }
  }

  // Inicializar gestión de máquinas
  initMachineManagement() {
    const saveButton = document.getElementById('save-machine-btn');
    const cancelButton = document.getElementById('cancel-machine-btn');
    const addRestrictionButton = document.getElementById('add-restriction-btn');
    
    // Actualizar opciones de tipo de restricción
    const restrictionTypeSelect = document.getElementById('restriction-type');
    restrictionTypeSelect.innerHTML = `
      <option value="colorCode">Código de Color</option>
      <option value="style">Estilo</option>
      <option value="maxWeight">Peso Máximo</option>
      <option value="sectorization">Sectorización</option>
      <option value="fabricType">Tipo de Tejido</option>
      <option value="tone">Tono</option>
    `;
    
    // Evento de clic en el botón de guardar
    saveButton.addEventListener('click', () => {
      this.handleSaveMachine();
    });
    
    // Evento de clic en el botón de cancelar
    cancelButton.addEventListener('click', () => {
      this.handleCancelMachine();
    });
    
    // Evento de clic en el botón de agregar restricción
    addRestrictionButton.addEventListener('click', () => {
      this.handleAddRestriction();
    });
  }

  // Manejar guardar máquina
  handleSaveMachine() {
    const nameInput = document.getElementById('machine-name');
    const familyInput = document.getElementById('machine-family');
    
    const name = nameInput.value.trim();
    const family = familyInput.value.trim();
    
    if (!name || !family) {
      this.showMessage('machine-message', 'warning', 'El nombre y la familia son obligatorios.');
      return;
    }
    
    // Crear objeto de restricciones
    const restrictions = {
      colorCode: [...this.tempRestrictions.colorCode],
      style: [...this.tempRestrictions.style],
      maxWeight: this.tempRestrictions.maxWeight,
      sectorization: [...this.tempRestrictions.sectorization],
      fabricType: [...this.tempRestrictions.fabricType],
      tone: [...this.tempRestrictions.tone]
    };
    
    if (this.selectedMachine) {
      // Actualizar máquina existente
      this.selectedMachine.name = name;
      this.selectedMachine.family = family;
      this.selectedMachine.restrictions = restrictions;
      
      this.showMessage('machine-message', 'success', 'Máquina actualizada correctamente.');
    } else {
      // Crear nueva máquina
      const newId = this.dataManager.machines.length > 0 
        ? Math.max(...this.dataManager.machines.map(m => m.id)) + 1 
        : 1;
      
      const machine = new Machine(newId, name, family);
      machine.restrictions = restrictions;
      
      this.dataManager.machines.push(machine);
      
      this.showMessage('machine-message', 'success', 'Máquina agregada correctamente.');
    }
    
    // Actualizar contador de máquinas
    document.getElementById('machines-count').textContent = this.dataManager.machines.length;
    
    // Habilitar botón de optimización si hay datos suficientes
    document.getElementById('optimize-btn').disabled = 
      this.dataManager.orders.length === 0 || 
      this.dataManager.machines.length === 0 || 
      this.dataManager.matrixData.categories.length === 0;
    
    // Limpiar formulario
    this.handleCancelMachine();
    
    // Actualizar lista de máquinas
    this.updateMachinesList();
  }

  // Manejar cancelar máquina
  handleCancelMachine() {
    document.getElementById('machine-name').value = '';
    document.getElementById('machine-family').value = '';
    document.getElementById('restriction-value').value = '';
    document.getElementById('machine-form-title').textContent = 'Agregar Máquina';
    document.getElementById('save-machine-btn').textContent = 'Agregar';
    
    this.selectedMachine = null;
    this.tempRestrictions = {
      colorCode: [],
      style: [],
      maxWeight: null,
      sectorization: [],
      fabricType: [],
      tone: []
    };
    
    document.getElementById('restrictions-container').innerHTML = '';
    this.showMessage('machine-message', null, '');
  }

  // Manejar agregar restricción
  handleAddRestriction() {
    const typeSelect = document.getElementById('restriction-type');
    const valueInput = document.getElementById('restriction-value');
    
    const type = typeSelect.value;
    const value = valueInput.value.trim();
    
    if (!value) {
      this.showMessage('machine-message', 'warning', 'El valor de la restricción no puede estar vacío.');
      return;
    }
    
    // Para restricciones múltiples, permitir valores separados por punto y coma
    const values = value.split(';').filter(v => v.trim() !== '');
    
    if (values.length === 0) {
      this.showMessage('machine-message', 'warning', 'El valor de la restricción no puede estar vacío.');
      return;
    }
    
    if (type === 'maxWeight') {
      // Para peso, solo permitir un valor numérico
      const weightStr = values[0].replace('<', '');
      const weight = parseFloat(weightStr);
      if (isNaN(weight)) {
        this.showMessage('machine-message', 'warning', 'El peso máximo debe ser un número válido.');
        return;
      }
      this.tempRestrictions.maxWeight = weight;
    } else {
      // Para otras restricciones, agregar cada valor
      values.forEach(val => {
        if (val.trim() !== '') {
          if (!this.tempRestrictions[type].includes(val.trim())) {
            this.tempRestrictions[type].push(val.trim());
          }
        }
      });
    }
    
    // Limpiar input
    valueInput.value = '';
    
    // Actualizar visualización de restricciones
    this.updateRestrictionsDisplay();
    
    this.showMessage('machine-message', null, '');
  }

  // Actualizar visualización de restricciones
  updateRestrictionsDisplay() {
    const container = document.getElementById('restrictions-container');
    container.innerHTML = '';
    
    // Códigos de color
    if (this.tempRestrictions.colorCode.length > 0) {
      const div = document.createElement('div');
      div.innerHTML = '<strong>Códigos de Color:</strong>';
      
      const tagsDiv = document.createElement('div');
      this.tempRestrictions.colorCode.forEach(value => {
        const tag = this.createRestrictionTag(value, 'colorCode');
        tagsDiv.appendChild(tag);
      });
      
      div.appendChild(tagsDiv);
      container.appendChild(div);
    }
    
    // Estilos
    if (this.tempRestrictions.style.length > 0) {
      const div = document.createElement('div');
      div.innerHTML = '<strong>Estilos:</strong>';
      
      const tagsDiv = document.createElement('div');
      this.tempRestrictions.style.forEach(value => {
        const tag = this.createRestrictionTag(value, 'style');
        tagsDiv.appendChild(tag);
      });
      
      div.appendChild(tagsDiv);
      container.appendChild(div);
    }
    
    // Peso máximo
    if (this.tempRestrictions.maxWeight !== null) {
      const div = document.createElement('div');
      div.innerHTML = '<strong>Peso Máximo:</strong>';
      
      const tag = this.createRestrictionTag(`${this.tempRestrictions.maxWeight} kg`, 'maxWeight');
      div.appendChild(tag);
      container.appendChild(div);
    }
    
    // Sectorización
    if (this.tempRestrictions.sectorization.length > 0) {
      const div = document.createElement('div');
      div.innerHTML = '<strong>Sectorización (Códigos Exclusivos):</strong>';
      
      const tagsDiv = document.createElement('div');
      this.tempRestrictions.sectorization.forEach(value => {
        const tag = this.createRestrictionTag(value, 'sectorization');
        tagsDiv.appendChild(tag);
      });
      
      div.appendChild(tagsDiv);
      container.appendChild(div);
    }
    
    // Tipos de tejido
    if (this.tempRestrictions.fabricType.length > 0) {
      const div = document.createElement('div');
      div.innerHTML = '<strong>Tipos de Tejido:</strong>';
      
      const tagsDiv = document.createElement('div');
      this.tempRestrictions.fabricType.forEach(value => {
        const tag = this.createRestrictionTag(value, 'fabricType');
        tagsDiv.appendChild(tag);
      });
      
      div.appendChild(tagsDiv);
      container.appendChild(div);
    }
    
    // Tonos
    if (this.tempRestrictions.tone.length > 0) {
      const div = document.createElement('div');
      div.innerHTML = '<strong>Tonos:</strong>';
      
      const tagsDiv = document.createElement('div');
      this.tempRestrictions.tone.forEach(value => {
        const tag = this.createRestrictionTag(value, 'tone');
        tagsDiv.appendChild(tag);
      });
      
      div.appendChild(tagsDiv);
      container.appendChild(div);
    }
  }

  // Crear etiqueta de restricción
  createRestrictionTag(value, type) {
    const tag = document.createElement('span');
    tag.className = 'restriction-tag';
    tag.textContent = value;
    
    const removeButton = document.createElement('button');
    removeButton.innerHTML = '×';
    removeButton.addEventListener('click', () => {
      this.handleRemoveRestriction(type, value);
    });
    
    tag.appendChild(removeButton);
    return tag;
  }

  // Manejar eliminar restricción
  handleRemoveRestriction(type, value) {
    if (type === 'maxWeight') {
      this.tempRestrictions.maxWeight = null;
    } else {
      // Para otras restricciones, filtrar el valor
      const cleanValue = value.replace(' kg', ''); // Para peso máximo
      this.tempRestrictions[type] = this.tempRestrictions[type].filter(v => v !== cleanValue);
    }
    
    // Actualizar visualización de restricciones
    this.updateRestrictionsDisplay();
  }

  // Actualizar lista de máquinas
  updateMachinesList() {
    const container = document.getElementById('machines-list');
    const noMachinesMessage = document.getElementById('no-machines-message');
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    if (this.dataManager.machines.length === 0) {
      noMachinesMessage.style.display = 'block';
      return;
    }
    
    noMachinesMessage.style.display = 'none';
    
    // Crear tarjeta para cada máquina
    this.dataManager.machines.forEach(machine => {
      const card = document.createElement('div');
      card.className = 'machine-card';
      
      // Título
      const title = document.createElement('h3');
      title.textContent = machine.name;
      card.appendChild(title);
      
      // Familia
      const family = document.createElement('p');
      family.innerHTML = `<strong>Familia:</strong> ${machine.family}`;
      card.appendChild(family);
      
      // Restricciones
      this.addRestrictionSection(card, 'Códigos de Color', machine.restrictions.colorCode);
      this.addRestrictionSection(card, 'Estilos', machine.restrictions.style);
      
      if (machine.restrictions.maxWeight !== null) {
        const div = document.createElement('div');
        div.innerHTML = `<strong>Peso Máximo:</strong> ${machine.restrictions.maxWeight} kg`;
        card.appendChild(div);
      }
      
      this.addRestrictionSection(card, 'Sectorización (Códigos Exclusivos)', machine.restrictions.sectorization);
      this.addRestrictionSection(card, 'Tipos de Tejido', machine.restrictions.fabricType);
      this.addRestrictionSection(card, 'Tonos', machine.restrictions.tone);
      
      // Botones
      const buttonsDiv = document.createElement('div');
      buttonsDiv.style.display = 'flex';
      buttonsDiv.style.gap = '0.5rem';
      buttonsDiv.style.marginTop = '1rem';
      
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-secondary';
      editButton.textContent = 'Editar';
      editButton.addEventListener('click', () => {
        this.handleEditMachine(machine);
      });
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-danger';
      deleteButton.textContent = 'Eliminar';
      deleteButton.addEventListener('click', () => {
        this.handleDeleteMachine(machine.id);
      });
      
      buttonsDiv.appendChild(editButton);
      buttonsDiv.appendChild(deleteButton);
      
      card.appendChild(buttonsDiv);
      
      container.appendChild(card);
    });
  }

  // Agregar sección de restricciones a la tarjeta de máquina
  addRestrictionSection(card, title, values) {
    if (values && values.length > 0) {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${title}:</strong>`;
      
      const tagsDiv = document.createElement('div');
      values.forEach(value => {
        const tag = document.createElement('span');
        tag.className = 'restriction-tag';
        tag.textContent = value;
        tagsDiv.appendChild(tag);
      });
      
      div.appendChild(tagsDiv);
      card.appendChild(div);
    }
  }

  // Manejar editar máquina
  handleEditMachine(machine) {
    this.selectedMachine = machine;
    
    document.getElementById('machine-name').value = machine.name;
    document.getElementById('machine-family').value = machine.family;
    document.getElementById('machine-form-title').textContent = 'Editar Máquina';
    document.getElementById('save-machine-btn').textContent = 'Actualizar';
    
    // Copiar restricciones
    this.tempRestrictions = {
      colorCode: machine.restrictions.colorCode ? [...machine.restrictions.colorCode] : [],
      style: machine.restrictions.style ? [...machine.restrictions.style] : [],
      maxWeight: machine.restrictions.maxWeight || null,
      sectorization: machine.restrictions.sectorization ? [...machine.restrictions.sectorization] : [],
      fabricType: machine.restrictions.fabricType ? [...machine.restrictions.fabricType] : [],
      tone: machine.restrictions.tone ? [...machine.restrictions.tone] : []
    };
    
    // Actualizar visualización de restricciones
    this.updateRestrictionsDisplay();
    
    // Desplazar hacia arriba
    document.getElementById('machines-section').scrollTop = 0;
  }

  // Manejar eliminar máquina
  handleDeleteMachine(id) {
    if (confirm('¿Está seguro de eliminar esta máquina?')) {
      // Eliminar máquina
      this.dataManager.machines = this.dataManager.machines.filter(machine => machine.id !== id);
      
      // Actualizar contador de máquinas
      document.getElementById('machines-count').textContent = this.dataManager.machines.length;
      
      // Actualizar lista de máquinas
      this.updateMachinesList();
      
      // Habilitar botón de optimización si hay datos suficientes
      document.getElementById('optimize-btn').disabled = 
        this.dataManager.orders.length === 0 || 
        this.dataManager.machines.length === 0 || 
        this.dataManager.matrixData.categories.length === 0;
      
      // Si la máquina seleccionada es la que se eliminó, limpiar formulario
      if (this.selectedMachine && this.selectedMachine.id === id) {
        this.handleCancelMachine();
      }
      
      this.showMessage('machine-message', 'success', 'Máquina eliminada correctamente.');
    }
  }

  // Inicializar gestión de matriz
  initMatrixManagement() {
    const addCategoryButton = document.getElementById('add-category-btn');
    
    // Evento de clic en el botón de agregar categoría
    addCategoryButton.addEventListener('click', () => {
      this.handleAddCategory();
    });
  }

  // Manejar agregar categoría
  handleAddCategory() {
    const categoryInput = document.getElementById('new-category');
    const category = categoryInput.value.trim();
    
    if (!category) {
      this.showMessage('matrix-message', 'warning', 'El nombre de la categoría no puede estar vacío.');
      return;
    }
    
    if (this.dataManager.matrixData.categories.includes(category)) {
      this.showMessage('matrix-message', 'warning', 'Esta categoría ya existe.');
      return;
    }
    
    // Agregar categoría
    this.dataManager.matrixData.addCategory(category);
    
    // Actualizar contador de categorías
    document.getElementById('categories-count').textContent = this.dataManager.matrixData.categories.length;
    
    // Actualizar tabla de matriz
    this.updateMatrixTable();
    
    // Habilitar botón de optimización si hay datos suficientes
    document.getElementById('optimize-btn').disabled = 
      this.dataManager.orders.length === 0 || 
      this.dataManager.machines.length === 0 || 
      this.dataManager.matrixData.categories.length === 0;
    
    // Limpiar input
    categoryInput.value = '';
    
    this.showMessage('matrix-message', 'success', 'Categoría agregada correctamente.');
  }

  // Actualizar tabla de matriz
  updateMatrixTable() {
    const noMatrixMessage = document.getElementById('no-matrix-message');
    const matrixTable = document.getElementById('matrix-table');
    const matrixHeader = document.getElementById('matrix-header');
    const matrixBody = document.getElementById('matrix-body');
    
    // Limpiar tabla
    matrixHeader.innerHTML = '<tr><th>Color en Máquina ↓ / Próximo Color →</th></tr>';
    matrixBody.innerHTML = '';
    
    if (this.dataManager.matrixData.categories.length === 0) {
      noMatrixMessage.style.display = 'block';
      matrixTable.style.display = 'none';
      return;
    }
    
    noMatrixMessage.style.display = 'none';
    matrixTable.style.display = 'table';
    
    // Crear encabezados de columna
    const headerRow = matrixHeader.querySelector('tr');
    
    this.dataManager.matrixData.categories.forEach(category => {
      const th = document.createElement('th');
      
      const categoryText = document.createTextNode(category);
      th.appendChild(categoryText);
      
      const deleteButton = document.createElement('button');
      deleteButton.innerHTML = '×';
      deleteButton.style.marginLeft = '0.5rem';
      deleteButton.style.border = 'none';
      deleteButton.style.background = 'none';
      deleteButton.style.cursor = 'pointer';
      deleteButton.style.color = '#e74c3c';
      deleteButton.title = 'Eliminar categoría';
      deleteButton.addEventListener('click', () => {
        this.handleDeleteCategory(category);
      });
      
      th.appendChild(deleteButton);
      headerRow.appendChild(th);
    });
    
    // Crear filas de datos
    this.dataManager.matrixData.categories.forEach(categoryOrigin => {
      const row = document.createElement('tr');
      
      // Encabezado de fila
      const th = document.createElement('td');
      th.innerHTML = `<strong>${categoryOrigin}</strong>`;
      row.appendChild(th);
      
      // Celdas de datos
      this.dataManager.matrixData.categories.forEach(categoryDest => {
        const td = document.createElement('td');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.dataManager.matrixData.getValue(categoryOrigin, categoryDest) || '';
        input.style.width = '40px';
        input.style.textAlign = 'center';
        
        if (categoryOrigin === categoryDest) {
          input.style.backgroundColor = '#f8f9fa';
        }
        
        input.title = `De ${categoryOrigin} a ${categoryDest}`;
        
        input.addEventListener('change', (e) => {
          this.handleMatrixValueChange(categoryOrigin, categoryDest, e.target.value);
        });
        
        td.appendChild(input);
        row.appendChild(td);
      });
      
      matrixBody.appendChild(row);
    });
  }

  // Manejar cambio de valor en la matriz
  handleMatrixValueChange(categoryOrigin, categoryDest, value) {
    // Validar que el valor sea válido (1, 2, 3, 5, K)
    const validValues = ['1', '2', '3', '5', 'K', ''];
    if (value && !validValues.includes(value)) {
      this.showMessage('matrix-message', 'warning', 'Valor no válido. Use 1 (progresión), 2/3/K (lavado) o 5 (enjuague).');
      this.updateMatrixTable(); // Recargar tabla para deshacer cambio
      return;
    }
    
    // Actualizar valor en la matriz
    this.dataManager.matrixData.setValue(categoryOrigin, categoryDest, value);
    
    this.showMessage('matrix-message', null, '');
  }

  // Manejar eliminar categoría
  handleDeleteCategory(category) {
    if (confirm(`¿Está seguro de eliminar la categoría "${category}"?`)) {
      // Eliminar categoría
      this.dataManager.matrixData.removeCategory(category);
      
      // Actualizar contador de categorías
      document.getElementById('categories-count').textContent = this.dataManager.matrixData.categories.length;
      
      // Actualizar tabla de matriz
      this.updateMatrixTable();
      
      // Habilitar botón de optimización si hay datos suficientes
      document.getElementById('optimize-btn').disabled = 
        this.dataManager.orders.length === 0 || 
        this.dataManager.machines.length === 0 || 
        this.dataManager.matrixData.categories.length === 0;
      
      this.showMessage('matrix-message', 'success', 'Categoría eliminada correctamente.');
    }
  }

  // Inicializar optimizador
  initOptimizer() {
    const optimizeButton = document.getElementById('optimize-btn');
    const balanceFactorInput = document.getElementById('balance-factor');
    const balanceFactorValue = document.getElementById('balance-factor-value');
    
    // Evento de cambio en el factor de equilibrio
    balanceFactorInput.addEventListener('input', () => {
      balanceFactorValue.textContent = balanceFactorInput.value;
    });
    
    // Evento de clic en el botón de optimización
    optimizeButton.addEventListener('click', () => {
      this.handleOptimize();
    });
  }

  // Manejar optimización
  handleOptimize() {
    // Validar que hay datos suficientes
    if (this.dataManager.orders.length === 0) {
      this.showMessage('optimizer-message', 'warning', 'No hay órdenes para optimizar.');
      return;
    }
    
    if (this.dataManager.machines.length === 0) {
      this.showMessage('optimizer-message', 'warning', 'No hay máquinas disponibles.');
      return;
    }
    
    if (this.dataManager.matrixData.categories.length === 0) {
      this.showMessage('optimizer-message', 'warning', 'La matriz de transición está vacía.');
      return;
    }
    
    // Mostrar mensaje de optimización
    this.showMessage('optimizer-message', 'info', 'Optimizando asignación de órdenes...');
    
    // Deshabilitar botón de optimización
    const optimizeButton = document.getElementById('optimize-btn');
    optimizeButton.disabled = true;
    optimizeButton.textContent = 'Optimizando...';
    
    // Obtener factor de equilibrio
    const balanceFactor = parseInt(document.getElementById('balance-factor').value) / 100;
    
    // Usar setTimeout para no bloquear la interfaz
    setTimeout(() => {
      try {
        // Ejecutar optimización
        const optimizer = new Optimizer(
          this.dataManager.orders,
          this.dataManager.machines,
          this.dataManager.matrixData,
          balanceFactor
        );
        
        const result = optimizer.optimize();
        
        // Guardar resultado
        this.dataManager.optimizationResult = result;
        
        // Actualizar interfaz de resultados
        this.updateResultsView();
        
        // Habilitar pestaña de resultados
        document.getElementById('tab-results').disabled = false;
        
        // Mostrar mensaje de éxito
        this.showMessage('optimizer-message', 'success', 'Optimización completada correctamente.');
        
        // Cambiar a pestaña de resultados
        this.changeTab('results');
      } catch (error) {
        this.showMessage('optimizer-message', 'danger', `Error durante la optimización: ${error}`);
      } finally {
        // Restaurar botón de optimización
        optimizeButton.disabled = false;
        optimizeButton.textContent = 'Ejecutar Optimización';
      }
    }, 100);
  }

  // Inicializar resultados
  initResults() {
    const exportResultsButton = document.getElementById('export-results-btn');
    const exportByMachineButton = document.getElementById('export-by-machine-btn');
    const machineFilter = document.getElementById('machine-filter');
    
    // Evento de clic en el botón de exportar resultados
    exportResultsButton.addEventListener('click', () => {
      this.handleExportResults();
    });
    
    // Evento de clic en el botón de exportar por máquina
    exportByMachineButton.addEventListener('click', () => {
      this.handleExportByMachine();
    });
    
    // Evento de cambio en el filtro de máquina
    machineFilter.addEventListener('change', () => {
      this.updateResultsTable();
    });
  }

  // Manejar exportar resultados
  handleExportResults() {
    try {
      this.dataManager.exportResultsToExcel();
      this.showMessage('results-message', 'success', 'Resultados exportados correctamente.');
    } catch (error) {
      this.showMessage('results-message', 'danger', `Error al exportar resultados: ${error}`);
    }
  }

  // Manejar exportar por máquina
  handleExportByMachine() {
    try {
      this.dataManager.exportResultsByMachineToExcel();
      this.showMessage('results-message', 'success', 'Resultados exportados por máquina correctamente.');
    } catch (error) {
      this.showMessage('results-message', 'danger', `Error al exportar resultados por máquina: ${error}`);
    }
  }

  // Actualizar vista de resultados
  updateResultsView() {
    if (!this.dataManager.optimizationResult) {
      return;
    }
    
    const result = this.dataManager.optimizationResult;
    
    // Actualizar métricas
    document.getElementById('total-washes').textContent = result.metrics.totalWashes;
    document.getElementById('total-rinses').textContent = result.metrics.totalRinses;
    document.getElementById('total-progressions').textContent = result.metrics.totalProgressions;
    document.getElementById('avoided-washes').textContent = result.metrics.avoidedWashes.toFixed(1);
    document.getElementById('load-balance').textContent = result.metrics.loadBalance.toFixed(2);
    
    // Actualizar filtro de máquinas
    this.updateMachineFilter();
    
    // Actualizar tabla de resultados
    this.updateResultsTable();
    
    // Actualizar secuencia de procesamiento
    this.updateSequenceView();
  }

  // Actualizar filtro de máquinas
  updateMachineFilter() {
    const machineFilter = document.getElementById('machine-filter');
    machineFilter.innerHTML = '<option value="all">Todas las máquinas</option>';
    
    const uniqueMachines = this.dataManager.getUniqueMachinesFromResults();
    
    uniqueMachines.forEach(machine => {
      const option = document.createElement('option');
      option.value = machine;
      option.textContent = machine;
      machineFilter.appendChild(option);
    });
  }

  // Actualizar tabla de resultados
  updateResultsTable() {
    const resultsBody = document.getElementById('results-body');
    resultsBody.innerHTML = '';
    
    const machineFilter = document.getElementById('machine-filter');
    const selectedMachine = machineFilter.value;
    
    const filteredOrders = this.dataManager.getOrdersFilteredByMachine(selectedMachine);
    
    filteredOrders.forEach(order => {
      const row = document.createElement('tr');
      
      const familyCell = document.createElement('td');
      familyCell.textContent = order.family || '-';
      row.appendChild(familyCell);
      
      const machineCell = document.createElement('td');
      machineCell.textContent = order.assignedMachine || '-';
      row.appendChild(machineCell);
      
      const positionCell = document.createElement('td');
      positionCell.textContent = order.position !== null ? order.position + 1 : '-';
      row.appendChild(positionCell);
      
      const numberCell = document.createElement('td');
      numberCell.textContent = order.number;
      row.appendChild(numberCell);
      
      const categoryCell = document.createElement('td');
      categoryCell.textContent = order.category;
      row.appendChild(categoryCell);
      
      const fabricTypeCell = document.createElement('td');
      fabricTypeCell.textContent = order.fabricType;
      row.appendChild(fabricTypeCell);
      
      const StyleCell = document.createElement('td');
      StyleCell.textContent = order.fabricStyle
      row.appendChild(StyleCell);

      const weightCell = document.createElement('td');
      weightCell.textContent = order.weight;
      row.appendChild(weightCell);
      
      resultsBody.appendChild(row);
    });
  }

  // Actualizar vista de secuencia
  updateSequenceView() {
    const sequenceContainer = document.getElementById('sequence-container');
    sequenceContainer.innerHTML = '';
    
    const uniqueMachines = this.dataManager.getUniqueMachinesFromResults();
    
    if (uniqueMachines.length === 0) {
      sequenceContainer.innerHTML = '<p>No hay máquinas con órdenes asignadas.</p>';
      return;
    }
    
    uniqueMachines.forEach(machine => {
      const machineOrders = this.dataManager.getOrdersByMachine(machine);
      
      const machineDiv = document.createElement('div');
      machineDiv.style.marginBottom = '1.5rem'; 
      
      const machineTitle = document.createElement('h3');
      machineTitle.textContent = machine;
      machineDiv.appendChild(machineTitle);
      
      const sequenceDiv = document.createElement('div');
      sequenceDiv.className = 'sequence-item';
      
      machineOrders.forEach((order, index) => {
        // Crear elemento de orden
        const orderDiv = document.createElement('div');
        orderDiv.className = 'sequence-order';
        orderDiv.innerHTML = `<div><strong>${order.number}</strong></div><div>Cat: ${order.category}</div><div>Familia: ${order.family}</div><div>DyeCode: ${order.colorCode}</div>`;
        sequenceDiv.appendChild(orderDiv);
        
        // Si no es la última orden, agregar flecha
        if (index < machineOrders.length - 1) {
          const nextOrder = machineOrders[index + 1];
          
          // Determinar tipo de transición
          let transitionType = 'unknown';
          const currentCategory = order.category;
          const nextCategory = nextOrder.category;
          const MapCategory = {
            10:1,101:2,11:3,12:4,121:5,13:6,131:7,14:8,20:9,201:10,21:11,211:12,22:13,221:14,23:15,
            231:16,24:17,300:18,30:19,301:20,31:21,311:22,32:23,321:24,33:25,331:26,34:27,41:28,411:29,
            42:30,421:31,43:32,431:33,44:34,51:35,511:36,52:37,521:38,53:39,531:40,54:41,61:42,611:43,62:44,
            621:45,63:46,631:47,64:48,70:49,701:50,71:51,711:52,72:53,721:54,73:55,731:56,74:57,81:58,811:59,
            82:60,821:61,83:62,831:63,84:64,91:65,911:66,92:67,921:68,93:69,931:70, 1:71, 2:72, 0:73,

          };
        
        if(currentCategory === 34){
          const originCat = MapCategory[currentCategory];
        }

        const originCat = MapCategory[currentCategory];
        const destCat = MapCategory[nextCategory];



          const matrixValue = this.dataManager.matrixData.getValue(destCat, originCat);
          
          if (matrixValue === '1') {
            transitionType = 'progression';
          } else if (matrixValue === '5') {
            transitionType = 'rinse';
          } else if (matrixValue === '2' || matrixValue === '3' || matrixValue === 'K') {
            transitionType = 'wash';
          }
          
          const arrowDiv = document.createElement('div');
          arrowDiv.className = `sequence-arrow ${transitionType}`;
          
          if (transitionType === 'progression') {
            arrowDiv.textContent = '🟢';
          } else if (transitionType === 'rinse') {
            arrowDiv.textContent = '⚪';
          } else if (transitionType === 'wash') {
            arrowDiv.textContent = '🔴';
          } else {
            arrowDiv.textContent = '🔴';
          }
          
          sequenceDiv.appendChild(arrowDiv);
        }
      });
      
      machineDiv.appendChild(sequenceDiv);
      sequenceContainer.appendChild(machineDiv);
    });
  }

  // Mostrar mensaje
  showMessage(elementId, type, text) {
    const element = document.getElementById(elementId);
    
    if (!text) {
      element.style.display = 'none';
      return;
    }
    
    element.textContent = text;
    element.className = type ? `alert alert-${type}` : 'alert';
    element.style.display = 'block';
  }
}
