// Gestor de datos para cargar y procesar información desde Excel
class DataManager {
  constructor() {
    this.orders = [];
    this.machines = [];
    this.matrixData = new MatrixData();
    this.optimizationResult = null;
    this.sectorizedCodes = []; // Códigos que están sectorizados
  }

  // Cargar datos desde un archivo Excel
  async loadFromExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Procesar órdenes
          if (workbook.SheetNames.includes('ejemplo de ordenes')) {
            this.processOrdersSheet(workbook.Sheets['ejemplo de ordenes']);
          } else {
            reject('No se encontró la hoja "ejemplo de ordenes" en el archivo Excel.');
            return;
          }
          
          // Procesar máquinas
          if (workbook.SheetNames.includes('Maquinas')) {
            this.processMachinesSheet(workbook.Sheets['Maquinas']);
          } else {
            reject('No se encontró la hoja "Maquinas" en el archivo Excel.');
            return;
          }
          
          // Procesar matriz de transición
          if (workbook.SheetNames.includes('Matriz de prgresion')) {
            this.processMatrixSheet(workbook.Sheets['Matriz de prgresion']);
          } else {
            reject('No se encontró la hoja "Matriz de prgresion" en el archivo Excel.');
            return;
          }
          
          // Procesar restricciones si existe la hoja
          if (workbook.SheetNames.includes('Restricciones')) {
            this.processRestrictionsSheet(workbook.Sheets['Restricciones']);
          }
          
          resolve({
            orders: this.orders.length,
            machines: this.machines.length,
            categories: this.matrixData.categories.length
          });
        } catch (error) {
          reject(`Error al procesar el archivo Excel: ${error}`);
        }
      };
      
      reader.onerror = () => {
        reject('Error al leer el archivo.');
      };
      
      reader.readAsBinaryString(file);
    });
  }

  // Procesar la hoja de órdenes
  processOrdersSheet(sheet) {
    const ordersJson = XLSX.utils.sheet_to_json(sheet);
    
    this.orders = ordersJson.map((row, index) => new Order(
      index + 1,
      row['Numero de orden'] || '',
      row['Categoria'] || '',
      row['Estilo de tela'] || '',
      row['Peso'] || 0,
      row['Tipo de tela'] || '',
      row['Codigo de color'] || '',
      row['Familia'] || ''
    ));
  }

  // Procesar la hoja de máquinas
  processMachinesSheet(sheet) {
    const machinesJson = XLSX.utils.sheet_to_json(sheet);
    
    this.machines = machinesJson.map((row, index) => new Machine(
      index + 1,
      row['Maquina'] || '',
      row['Familia'] || '',
      row['Categoria'] || ''
    ));
  }

  // Procesar la hoja de matriz de transición
processMatrixSheet(sheet) {
  try {
    // Convertir a array para procesamiento
    const matrixArray = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Crear nueva instancia de MatrixData
    this.matrixData = new MatrixData();
    
    // Buscar la fila que contiene las categorías (encabezados de columna)
    let headerRow = -1;
    let firstCol = -1;
    
    // Encontrar la fila de encabezados y la primera columna con datos
    for (let i = 0; i < matrixArray.length; i++) {
      if (!matrixArray[i] || matrixArray[i].length === 0) continue;
      
      for (let j = 0; j < matrixArray[i].length; j++) {
        if (matrixArray[i][j] === 'CAT' || matrixArray[i][j] === 'TONO') {
          headerRow = i;
          firstCol = j;
          break;
        }
      }
      if (headerRow !== -1) break;
    }
    
    if (headerRow === -1 || firstCol === -1) {
      console.error('No se encontró la estructura de la matriz en el Excel');
      return;
    }
    
    // La fila siguiente contiene las categorías
    const categoriesRow = headerRow + 1;
    
    // Extraer categorías de las columnas (empezando desde la columna después de 'CAT' o 'TONO')
    for (let col = firstCol + 1; col < matrixArray[categoriesRow].length; col++) {
      const category = String(matrixArray[categoriesRow][col]);
      if (category && category !== 'undefined' && category !== 'null') {
        this.matrixData.addCategory(category);
      }
    }
    
    // Extraer categorías de las filas y valores de la matriz
    for (let row = categoriesRow + 1; row < matrixArray.length; row++) {
      if (!matrixArray[row] || !matrixArray[row][firstCol]) continue;
      
      // La primera columna contiene la categoría de origen
      const categoryOrigin = String(matrixArray[row][firstCol+1]);
      if (!categoryOrigin || categoryOrigin === 'undefined' || categoryOrigin === 'null') {
        continue;
      }
      
      // Añadir la categoría si no existe
      if (!this.matrixData.categories.includes(categoryOrigin)) {
        this.matrixData.addCategory(categoryOrigin);
      }
      
      // Leer los valores de la matriz para esta categoría
      for (let col = firstCol+1 ; col < matrixArray[row].length; col++) {
        const colIndex = col - (firstCol );
        
        if (colIndex >= this.matrixData.categories.length) continue;
        
        const categoryDest = this.matrixData.categories[colIndex];
        
        // Leer el valor y convertirlo a cadena
        let value = matrixArray[row][col+1];
        if (value !== undefined && value !== null) {
          // Asegurarse de que el valor sea una cadena
          value = String(value);
          this.matrixData.setValue(categoryOrigin, categoryDest, value);
        }
      }
    }
    
    console.log('Matriz cargada:', this.matrixData);
  } catch (error) {
    console.error('Error al procesar la matriz:', error);
    throw new Error(`Error al procesar la matriz: ${error.message}`);
  }
}


  // Procesar la hoja de restricciones
  processRestrictionsSheet(sheet) {
    const restrictionsJson = XLSX.utils.sheet_to_json(sheet);
    
    // Limpiar la lista de códigos sectorizados
    this.sectorizedCodes = [];
    
    // Procesar cada fila (máquina) con sus restricciones
    restrictionsJson.forEach(row => {
      const machineName = row['ID Maquina'];
      if (!machineName) return;
      
      // Buscar la máquina correspondiente
      const machine = this.machines.find(m => m.name === machineName);
      if (!machine) return;
      
      // Procesar cada columna de restricción
      Object.keys(row).forEach(column => {
        if (column === 'ID Maquina') return;
        
        const value = row[column];
        if (value === undefined || value === null || value === '') return;
        
        // Convertir valor a string para asegurar compatibilidad
        const strValue = String(value);
        
        // Procesar valores separados por punto y coma
        const values = strValue.split(';').filter(v => v.trim() !== '');
        
        // Mapear columnas a tipos de restricción
        let restrictionType;
        switch (column) {
          case 'Codigo de color':
            restrictionType = 'colorCode';
            break;
          case 'Estilo':
            restrictionType = 'style';
            break;
          case 'Peso':
            restrictionType = 'maxWeight';
            break;
          case 'Sectorizacion ':
          case 'Sectorizacion':
            restrictionType = 'sectorization';
            // Guardar códigos sectorizados para validación posterior
            values.forEach(code => {
              if (!this.sectorizedCodes.includes(code)) {
                this.sectorizedCodes.push(code);
              }
            });
            break;
          case 'Tejido':
            restrictionType = 'fabricType';
            break;
          case 'Tono':
            restrictionType = 'tone';
            break;
          default:
            return; // Columna desconocida
        }
        
        // Agregar restricciones a la máquina
        if (restrictionType === 'maxWeight' && values.length > 0) {
          // Para peso, extraer el valor numérico (eliminar el "<" si existe)
          const weightStr = values[0].replace('<', '');
          const weight = parseFloat(weightStr);
          if (!isNaN(weight)) {
            machine.restrictions.maxWeight = weight;
          }
        } else {
          // Para otras restricciones, agregar cada valor
          values.forEach(val => {
            if (val.trim() !== '') {
              machine.addRestriction(restrictionType, val.trim());
            }
          });
        }
      });
    });
  }

  // Obtener todos los códigos sectorizados
  getAllSectorizedCodes() {
    return this.sectorizedCodes;
  }

  // Exportar resultados a Excel
  exportResultsToExcel() {
    if (!this.optimizationResult) {
      throw new Error('No hay resultados para exportar.');
    }

    
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const yyyy = today.getFullYear();

  const Date_text = `${mm}-${dd}-${yyyy}`;
  const Date_ID = `${mm}${dd}${yyyy}`;

    
    // Crear hoja de trabajo para resultados
    const ws = XLSX.utils.json_to_sheet(
      this.optimizationResult.assignedOrders.map(order => ({
        'Familia': order.family,
        'Máquina Asignada': order.assignedMachine,
        'Categoría': order.category,
        'Número de Orden': order.number,
        'Peso': order.weight,
        'Posición': order.position !== null ? order.position + 1 : '',
        'Secuencia': order.secuence,
        'Dye Code': order.colorCode,
        'Estilo': order.fabricStyle,
        'Tono':"",
        'Status':"",
        'Coments': "",
        'ID': Date_ID,
        'Tipo': "Secuenciada"
        
      }))
    );

    // Crear hoja de trabajo para métricas
    const wsMetrics = XLSX.utils.json_to_sheet([
      {
        'Lavados Totales': this.optimizationResult.metrics.totalWashes,
        'Enjuagues Totales': this.optimizationResult.metrics.totalRinses,
        'Progresiones Totales': this.optimizationResult.metrics.totalProgressions,
        'Lavados Evitados': this.optimizationResult.metrics.avoidedWashes.toFixed(1),
        'Equilibrio de Carga': this.optimizationResult.metrics.loadBalance.toFixed(2)
      }
    ]);

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.utils.book_append_sheet(wb, wsMetrics, 'Métricas');

    // Guardar archivo
    XLSX.writeFile(wb, 'TES_' +  Date_text + '.xlsx');
  }

  // Exportar resultados por máquina a Excel
  exportResultsByMachineToExcel() {
    if (!this.optimizationResult) {
      throw new Error('No hay resultados para exportar.');
    }
    
    // Agrupar órdenes por máquina
    const ordersByMachine = {};
    
    for (const order of this.optimizationResult.assignedOrders) {
      if (order.assignedMachine) {
        if (!ordersByMachine[order.assignedMachine]) {
          ordersByMachine[order.assignedMachine] = [];
        }
        ordersByMachine[order.assignedMachine].push(order);
      }
    }
    
    // Ordenar órdenes por posición
    for (const machine in ordersByMachine) {
      ordersByMachine[machine].sort((a, b) => (a.position || 0) - (b.position || 0));
    }
    
    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    
    // Crear una hoja por máquina
    for (const machine in ordersByMachine) {
      const ws = XLSX.utils.json_to_sheet(
        ordersByMachine[machine].map(order => ({
          'Número de Orden': order.number,
          'Categoría': order.category,
          'Familia': order.family,
          'Máquina Asignada': order.assignedMachine,
          'Posición': order.position !== null ? order.position + 1 : '',
          'Peso': order.weight,
          'Tejido': order.fabricType,
          'Estilo': order.fabricStyle,
          'Dye Code': order.colorCode,
          'Secuencia': order.secuence
        }))
      );
      
      XLSX.utils.book_append_sheet(wb, ws, `Máquina ${machine}`);
    }
    
    // Guardar archivo
    XLSX.writeFile(wb, 'resultados_por_maquina.xlsx');
  }

  // Obtener máquinas únicas de los resultados
  getUniqueMachinesFromResults() {
    if (!this.optimizationResult) {
      return [];
    }
    
    return [...new Set(
      this.optimizationResult.assignedOrders
        .filter(order => order.assignedMachine)
        .map(order => order.assignedMachine)
    )];
  }

  // Obtener órdenes filtradas por máquina
  getOrdersFilteredByMachine(machineName) {
    if (!this.optimizationResult) {
      return [];
    }
    
    let filteredOrders = [...this.optimizationResult.assignedOrders];
    
    if (machineName !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.assignedMachine === machineName);
    }
    
    // Ordenar por máquina y posición
    return filteredOrders.sort((a, b) => {
      if (a.assignedMachine !== b.assignedMachine) {
        return (a.assignedMachine || '').localeCompare(b.assignedMachine || '');
      }
      return (a.position || 0) - (b.position || 0);
    });
  }

  // Obtener órdenes por máquina
  getOrdersByMachine(machineName) {
    if (!this.optimizationResult) {
      return [];
    }
    
    return this.optimizationResult.assignedOrders
      .filter(order => order.assignedMachine === machineName)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }
}
