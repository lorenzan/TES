// Visualización tipo Gantt para la secuencia de órdenes
class GanttView {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.timeScale = 60; // Minutos por unidad de ancho (ajustable)
    this.rowHeight = 50; // Altura de cada fila en píxeles
    this.headerHeight = 40; // Altura del encabezado en píxeles
    this.colors = {
      // Colores para categorías (se pueden ampliar)
      default: '#6c757d',
      wash: '#dc3545',
      rinse: '#ffc107'
    };
  }

  // Renderizar la vista Gantt
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Verificar si hay resultados
    if (!this.dataManager.optimizationResult) {
      container.innerHTML = '<p>No hay resultados de optimización disponibles.</p>';
      return;
    }
    
    // Obtener máquinas únicas
    const uniqueMachines = this.dataManager.getUniqueMachinesFromResults();
    
    if (uniqueMachines.length === 0) {
      container.innerHTML = '<p>No hay máquinas con órdenes asignadas.</p>';
      return;
    }
    
    // Crear contenedor principal
    const ganttContainer = document.createElement('div');
    ganttContainer.className = 'gantt-container';
    ganttContainer.style.position = 'relative';
    ganttContainer.style.overflowX = 'auto';
    ganttContainer.style.width = '100%';
    ganttContainer.style.fontFamily = 'Arial, sans-serif';
    ganttContainer.style.fontSize = '12px';
    
    // Calcular dimensiones y escala de tiempo
    const timeData = this.calculateTimeScale(uniqueMachines);
    const totalWidth = timeData.totalWidth;
    
    // Crear encabezado de tiempo
    const timeHeader = this.createTimeHeader(timeData);
    ganttContainer.appendChild(timeHeader);
    
    // Crear filas para cada máquina
    uniqueMachines.forEach((machine, index) => {
      const row = this.createMachineRow(machine, index, timeData);
      ganttContainer.appendChild(row);
    });
    
    // Establecer altura total del contenedor
    ganttContainer.style.height = `${this.headerHeight + (uniqueMachines.length * this.rowHeight)}px`;
    
    // Añadir al contenedor principal
    container.appendChild(ganttContainer);
  }
  
  // Calcular escala de tiempo y dimensiones
  calculateTimeScale(machines) {
    let minTime = Infinity;
    let maxTime = 0;
    let totalOrders = 0;
    
    // Recopilar datos de órdenes por máquina
    const machineData = {};
    
    machines.forEach(machine => {
      const orders = this.dataManager.getOrdersByMachine(machine);
      machineData[machine] = orders;
      totalOrders += orders.length;
      
      // Asignar tiempos simulados (en minutos desde el inicio)
      let currentTime = 0;
      
      orders.forEach((order, index) => {
        // Simular duración basada en el peso (1 minuto por kg)
        const duration = 800 //order.weight || 60; // Mínimo 30 minutos
        
        // Añadir tiempo de preparación/limpieza si es necesario
        if (index > 0) {
          const prevOrder = orders[index - 1];
          const transitionType = this.getTransitionType(prevOrder.category, order.category);
          
          if (transitionType === 'wash') {
            currentTime += 500; // 60 minutos para lavado
          } else if (transitionType === 'rinse') {
            currentTime += 500; // 30 minutos para enjuague
          } else {
            currentTime += 10; // 10 minutos para progresión
          }
        }else{
          const machine_obj= this.dataManager.machines.find(m => m.name === machine);
          const prevOrder = machine_obj.prevCategory
          const transitionType = this.getTransitionType(prevOrder, order.category);
          
          if (transitionType === 'wash') {
            currentTime += 800; // 60 minutos para lavado
          } else if (transitionType === 'rinse') {
            currentTime += 800; // 30 minutos para enjuague
          } else {
            currentTime += 10; // 10 minutos para progresión
          }
        }
        
        // Asignar tiempos a la orden
        order.startTime = currentTime;
        order.endTime = currentTime + duration;
        order.duration = duration;
        
        // Actualizar tiempo actual
        currentTime += duration;
        
        // Actualizar min/max
        minTime = Math.min(minTime, order.startTime);
        maxTime = Math.max(maxTime, order.endTime);
      });
    });
    
    // Calcular ancho total y escala
    const timeRange = maxTime - minTime;
    const baseWidth = Math.max(800, document.getElementById('gantt-container').offsetWidth - 150);
    const timeScale = timeRange > 0 ? baseWidth / timeRange : 1;
    
    // Calcular marcas de tiempo
    const timeMarks = [];
    const timeStep = Math.ceil(timeRange / 8); // Dividir en aproximadamente 8 marcas
    
    for (let time = 0; time <= timeRange; time += timeStep) {
      timeMarks.push({
        time: time,
        position: time * timeScale,
        label: this.formatTime(time)
      });
    }
    
    return {
      minTime,
      maxTime,
      timeRange,
      timeScale,
      totalWidth: timeRange * timeScale + 150, // +150 para el nombre de la máquina
      machineData,
      timeMarks
    };
  }
  
  // Crear encabezado de tiempo
  createTimeHeader(timeData) {
    const header = document.createElement('div');
    header.className = 'gantt-header';
    header.style.position = 'sticky';
    header.style.top = '0';
    header.style.height = `${this.headerHeight}px`;
    header.style.width = `${timeData.totalWidth}px`;
    header.style.backgroundColor = '#f8f9fa';
    header.style.borderBottom = '1px solid #dee2e6';
    header.style.zIndex = '10';
    
    // Añadir espacio para nombres de máquinas
    const labelSpace = document.createElement('div');
    labelSpace.style.position = 'absolute';
    labelSpace.style.left = '0';
    labelSpace.style.top = '0';
    labelSpace.style.width = '150px';
    labelSpace.style.height = `${this.headerHeight}px`;
    labelSpace.style.borderRight = '1px solid #dee2e6';
    labelSpace.style.display = 'flex';
    labelSpace.style.alignItems = 'center';
    labelSpace.style.justifyContent = 'center';
    labelSpace.style.fontWeight = 'bold';
    labelSpace.textContent = 'Máquina';
    header.appendChild(labelSpace);
    
    // Añadir marcas de tiempo
    timeData.timeMarks.forEach(mark => {
      const timeMark = document.createElement('div');
      timeMark.style.position = 'absolute';
      timeMark.style.left = `${mark.position + 150}px`;
      timeMark.style.top = '0';
      timeMark.style.height = `${this.headerHeight}px`;
      timeMark.style.borderLeft = '1px dashed #dee2e6';
      timeMark.style.display = 'flex';
      timeMark.style.alignItems = 'center';
      timeMark.style.paddingLeft = '5px';
      timeMark.textContent = mark.label;
      header.appendChild(timeMark);
    });
    
    return header;
  }
  
// Crear fila para una máquina
createMachineRow(machine, index, timeData) {
  const row = document.createElement('div');
  const machine_obj = this.dataManager.machines.find(m => m.name === machine);
  row.className = 'gantt-row';
  row.style.position = 'absolute';
  row.style.left = '0';
  row.style.top = `${this.headerHeight + (index * this.rowHeight)}px`;
  row.style.width = `${timeData.totalWidth}px`;
  row.style.height = `${this.rowHeight}px`;
  row.style.borderBottom = '1px solid #dee2e6';

  // Nombre de la máquina
// Contenedor combinado de familia y nombre de máquina
const machineInfo = document.createElement('div');
machineInfo.style.cssText = `
  position: absolute;
  left: 0;
  top: 0;
  width: 150px;
  height: ${this.rowHeight}px;
  border-right: 1px solid #dee2e6;
  background-color: #f8f9fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  padding: 2px;
  text-align: center;
`;

const familyDiv = document.createElement('div');
familyDiv.textContent = machine_obj.family;
familyDiv.style.cssText = 'color: #6c757d; font-size: 11px;';

const nameDiv = document.createElement('div');
nameDiv.textContent = machine;
nameDiv.style.cssText = 'font-size: 13px; font-weight: bold;';

machineInfo.appendChild(familyDiv);
machineInfo.appendChild(nameDiv);

row.appendChild(machineInfo);

  
  // Líneas de tiempo
  timeData.timeMarks.forEach(mark => {
    const timeLine = document.createElement('div');
    timeLine.style.position = 'absolute';
    timeLine.style.left = `${mark.position + 150}px`;
    timeLine.style.top = '0';
    timeLine.style.height = `${this.rowHeight}px`;
    timeLine.style.borderLeft = '1px dashed #dee2e6';
    timeLine.style.zIndex = '1';
    row.appendChild(timeLine);
  });

  // Órdenes
  const orders = timeData.machineData[machine];
  if (orders?.length) {
    let prevOrder = null;

    orders.forEach(order => {
      // Bloque de la orden
      const orderBlock = document.createElement('div');
      orderBlock.className = 'gantt-order';
      orderBlock.style.cssText = `
        position: absolute;
        left: ${(order.startTime * timeData.timeScale) + 150}px;
        top: 5px;
        width: ${order.duration * timeData.timeScale}px;
        height: ${this.rowHeight - 10}px;
        background-color: ${this.getCategoryReal(order.category)};
        border: 1px solid #343a40;
        border-radius: 3px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 0 5px;
        overflow: hidden;
        z-index: 5;
        cursor: pointer;
      `;
      orderBlock.title = `Orden: ${order.number}\nCategoría: ${order.category}\nPeso: ${order.weight} Lbs\nDye Code: ${order.colorCode}`;

      const orderInfo = document.createElement('div');
      orderInfo.style.cssText = `
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: ${(order.category === '93' || order.category === '53' || order.category === '73' || order.category === '54') ? '#FFFFFF' : this.getContrastColor(this.getCategoryReal(order.category))};
        font-weight: bold;
      `;
      orderInfo.textContent = `${order.number}  Categoria: ${order.category}`;
      orderBlock.appendChild(orderInfo);

      if (order.duration * timeData.timeScale > 80) {
        const codeInfo = document.createElement('div');
        codeInfo.style.cssText = `
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 10px;
          color: ${(order.category === '93' || order.category === '53' || order.category === '73') ? '#FFFFFF' : this.getContrastColor(this.getCategoryReal(order.category))};
        `;
        codeInfo.textContent = order.colorCode || '';
        orderBlock.appendChild(codeInfo);
      }

      row.appendChild(orderBlock);

      // Determinar tipo de transición
      let transitionType;
      let transitionLeft = 0;
      let transitionWidth = 0;

      if (prevOrder) {
        transitionType = this.getTransitionType(prevOrder.category, order.category);
        transitionLeft = (prevOrder.endTime * timeData.timeScale) + 150;
        transitionWidth = (order.startTime - prevOrder.endTime) * timeData.timeScale;
      } else {
        const machine_obj = this.dataManager.machines.find(m => m.name === order.assignedMachine);
        const prevCategory = machine_obj?.prevCategory || '';
        transitionType = this.getTransitionType(prevCategory, order.category);
        transitionLeft = 160;  // Fijo para la primera orden
        transitionWidth = 160;
      }

      if (transitionType !== 'progression') {
        const transitionIndicator = document.createElement('div');
        transitionIndicator.style.cssText = `
          position: absolute;
          left: ${transitionLeft}px;
          top: ${this.rowHeight / 2 - 10}px;
          width: ${transitionWidth}px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 4;
        `;

        if (transitionType === 'wash') {
          transitionIndicator.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
          transitionIndicator.style.border = '2px dashed #dc3545';
          transitionIndicator.style.color = '#dc3545';
          transitionIndicator.innerHTML = `
            <div style="
              background-color: #dc3545;
              color: white;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 8px;
              font-weight: bold;
              box-shadow: 0 0 4px rgba(0,0,0,0.2);
            ">LAVADO</div>
          `;
        } else if (transitionType === 'rinse') {
          transitionIndicator.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
          transitionIndicator.style.border = '2px dashed #ffc107';
          transitionIndicator.style.color = '#856404';
          transitionIndicator.innerHTML = `
            <div style="
              background-color: #ffc107;
              color: black;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 8px;
              font-weight: bold;
              box-shadow: 0 0 4px rgba(0,0,0,0.2);
            ">ENJUAGUE</div>
          `;
        }

        row.appendChild(transitionIndicator);
      }

      prevOrder = order;
    });
  }

  return row;
}



  // Crear fila para una máquina
  createMachineRow22(machine, index, timeData) {
    const row = document.createElement('div');
    row.className = 'gantt-row';
    row.style.position = 'absolute';
    row.style.left = '0';
    row.style.top = `${this.headerHeight + (index * this.rowHeight)}px`;
    row.style.width = `${timeData.totalWidth}px`;
    row.style.height = `${this.rowHeight}px`;
    row.style.borderBottom = '1px solid #dee2e6';
    
    // Añadir nombre de la máquina
    const machineLabel = document.createElement('div');
    machineLabel.style.position = 'absolute';
    machineLabel.style.left = '0';
    machineLabel.style.top = '0';
    machineLabel.style.width = '150px';
    machineLabel.style.height = `${this.rowHeight}px`;
    machineLabel.style.borderRight = '1px solid #dee2e6';
    machineLabel.style.backgroundColor = '#f8f9fa';
    machineLabel.style.display = 'flex';
    machineLabel.style.alignItems = 'center';
    machineLabel.style.justifyContent = 'center';
    machineLabel.style.fontWeight = 'bold';
    machineLabel.textContent = machine;
    row.appendChild(machineLabel);
    
    // Añadir líneas de tiempo
    timeData.timeMarks.forEach(mark => {
      const timeLine = document.createElement('div');
      timeLine.style.position = 'absolute';
      timeLine.style.left = `${mark.position + 150}px`;
      timeLine.style.top = '0';
      timeLine.style.height = `${this.rowHeight}px`;
      timeLine.style.borderLeft = '1px dashed #dee2e6';
      timeLine.style.zIndex = '1';
      row.appendChild(timeLine);
    });
    
    // Añadir órdenes
    const orders = timeData.machineData[machine];
    
    if (orders && orders.length > 0) {
      let prevOrder = null;
      
      orders.forEach((order, orderIndex) => {
        // Crear bloque para la orden
        const orderBlock = document.createElement('div');
        orderBlock.className = 'gantt-order';
        orderBlock.style.position = 'absolute';
        orderBlock.style.left =`${(order.startTime * timeData.timeScale) + 150}px`;
        orderBlock.style.top = '5px';
        orderBlock.style.width = `${order.duration * timeData.timeScale}px`;
        orderBlock.style.height = `${this.rowHeight - 10}px`;
        orderBlock.style.backgroundColor = this.getCategoryReal(order.category) //this.getCategoryColor(order.category);
        orderBlock.style.border = '1px solid #343a40';
        orderBlock.style.borderRadius = '3px';
        orderBlock.style.display = 'flex';
        orderBlock.style.flexDirection = 'column';
        orderBlock.style.justifyContent = 'center';
        orderBlock.style.padding = '0 5px';
        orderBlock.style.overflow = 'hidden';
        orderBlock.style.zIndex = '5';
        orderBlock.style.cursor = 'pointer';
        
        // Añadir tooltip
        orderBlock.title = `Orden: ${order.number}\nCategoría: ${order.category}\nPeso: ${order.weight} Lbs\nDye Code: ${order.colorCode}`;
        
        // Añadir información de la orden
        const orderInfo = document.createElement('div');
        orderInfo.style.whiteSpace = 'nowrap';
        orderInfo.style.overflow = 'hidden';
        orderInfo.style.textOverflow = 'ellipsis';
        orderInfo.style.color = (order.category === '93' || order.category === '53' || order.category === '73' || order.category === '54') ? '#FFFFFF' : this.getContrastColor(this.getCategoryReal(order.category));
        orderInfo.style.fontWeight = 'bold';
        orderInfo.textContent = `${order.number}  Categoria: ${order.category}`;
        orderBlock.appendChild(orderInfo);
        
        // Añadir código de color si hay espacio
        if (order.duration * timeData.timeScale > 80) {
          const codeInfo = document.createElement('div');
          codeInfo.style.whiteSpace = 'nowrap';
          codeInfo.style.overflow = 'hidden';
          codeInfo.style.textOverflow = 'ellipsis';
          codeInfo.style.color = (order.category === '93' || order.category === '53' || order.category === '73') ? '#FFFFFF' : this.getContrastColor(this.getCategoryReal(order.category));
          codeInfo.style.fontSize = '10px';
          codeInfo.textContent = order.colorCode || '';
          orderBlock.appendChild(codeInfo);
        }
        
        row.appendChild(orderBlock);

        let transitionType;

        // Añadir indicador de transición si no es la primera orden
       if (prevOrder ) {

          transitionType = this.getTransitionType(prevOrder.category, order.category);
          
          if (transitionType !== 'progression') {
            const transitionIndicator = document.createElement('div');
            transitionIndicator.style.position = 'absolute';
            //transitionIndicator.style.left = `${(prevOrder.endTime * timeData.timeScale) + 150}px`;
            transitionIndicator.style.left = prevOrder === null ? '500px' : `${(prevOrder.endTime * timeData.timeScale) + 150}px`;

            transitionIndicator.style.top = `${this.rowHeight / 2 - 10}px`;
            transitionIndicator.style.width = prevOrder === null ? '500px': `${(order.startTime - prevOrder.endTime) * timeData.timeScale}px`;
            transitionIndicator.style.height = '25px';
            transitionIndicator.style.display = 'flex';
            transitionIndicator.style.alignItems = 'center';
            transitionIndicator.style.justifyContent = 'center';
            transitionIndicator.style.zIndex = '4';
            
            if (transitionType === 'wash') {
              transitionIndicator.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
              transitionIndicator.style.border = '2px dashed #dc3545';
              transitionIndicator.style.color = '#dc3545';
              transitionIndicator.innerHTML = `
                <div style="
                  background-color: #dc3545;
                  color: white;
                  font-size: 10px;
                  padding: 2px 6px;
                  border-radius: 8px;
                  font-weight: bold;
                  box-shadow: 0 0 4px rgba(0,0,0,0.2);
                ">LAVADO</div>
              `;
            } else if (transitionType === 'rinse') {
              transitionIndicator.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
              transitionIndicator.style.border = '2px dashed #ffc107';
              transitionIndicator.style.color = '#856404';
              transitionIndicator.innerHTML = `
                <div style="
                  background-color: #ffc107;
                  color: black;
                  font-size: 10px;
                  padding: 2px 6px;
                  border-radius: 8px;
                  font-weight: bold;
                  box-shadow: 0 0 4px rgba(0,0,0,0.2);
                ">ENJUAGUE</div>
              `;
            }

            
            row.appendChild(transitionIndicator);
          }
        }else{

          const machine_obj= this.dataManager.machines.find(m => m.name === order.assignedMachine);
          const prevCategory = machine_obj.prevCategory

          transitionType = this.getTransitionType(prevCategory, order.category); 

          if (transitionType !== 'progression') {
            const transitionIndicator = document.createElement('div');
            transitionIndicator.style.position = 'absolute';
            //transitionIndicator.style.left = `${(prevOrder.endTime * timeData.timeScale) + 150}px`;
            transitionIndicator.style.left = prevOrder === null ? '500px' : `${(prevOrder.endTime * timeData.timeScale) + 150}px`;

            transitionIndicator.style.top = `${this.rowHeight / 2 - 10}px`;
            transitionIndicator.style.width = prevOrder === null ? '500px': `${(order.startTime - prevOrder.endTime) * timeData.timeScale}px`;
            transitionIndicator.style.height = '25px';
            transitionIndicator.style.display = 'flex';
            transitionIndicator.style.alignItems = 'center';
            transitionIndicator.style.justifyContent = 'center';
            transitionIndicator.style.zIndex = '4';
            
            if (transitionType === 'wash') {
              transitionIndicator.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
              transitionIndicator.style.border = '2px dashed #dc3545';
              transitionIndicator.style.color = '#dc3545';
              transitionIndicator.innerHTML = `
                <div style="
                  background-color: #dc3545;
                  color: white;
                  font-size: 10px;
                  padding: 2px 6px;
                  border-radius: 8px;
                  font-weight: bold;
                  box-shadow: 0 0 4px rgba(0,0,0,0.2);
                ">LAVADO</div>
              `;
            } else if (transitionType === 'rinse') {
              transitionIndicator.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
              transitionIndicator.style.border = '2px dashed #ffc107';
              transitionIndicator.style.color = '#856404';
              transitionIndicator.innerHTML = `
                <div style="
                  background-color: #ffc107;
                  color: black;
                  font-size: 10px;
                  padding: 2px 6px;
                  border-radius: 8px;
                  font-weight: bold;
                  box-shadow: 0 0 4px rgba(0,0,0,0.2);
                ">ENJUAGUE</div>
              `;
            }

            
            row.appendChild(transitionIndicator);
        }
      }
        
        prevOrder = order;
      });
    }
    
    return row;
  }
  
  // Obtener tipo de transición entre categorías
  getTransitionType(categoryOrigin, categoryDest) {
    if (!categoryOrigin || !categoryDest) return 'progression';
    
    const MapCategory = {
      10:1,101:2,11:3,12:4,121:5,13:6,131:7,14:8,20:9,201:10,21:11,211:12,22:13,221:14,23:15,
      231:16,24:17,300:18,30:19,301:20,31:21,311:22,32:23,321:24,33:25,331:26,34:27,41:28,411:29,
      42:30,421:31,43:32,431:33,44:34,51:35,511:36,52:37,521:38,53:39,531:40,54:41,61:42,611:43,62:44,
      621:45,63:46,631:47,64:48,70:49,701:50,71:51,711:52,72:53,721:54,73:55,731:56,74:57,81:58,811:59,
      82:60,821:61,83:62,831:63,84:64,91:65,911:66,92:67,921:68,93:69,931:70, 1:71, 2:72, 0:73,
    };
  const originIndex = MapCategory[categoryOrigin];
  const destIndex = MapCategory[categoryDest];


    const value = this.dataManager.matrixData.getValue(destIndex, originIndex);
    
    if (value === '1') {
      return 'progression';
    } else if (value === '5') {
      return 'rinse';
    } else { // 2, 3, K u otros valores de lavado
      return 'wash';
    }
  }
  
  // Obtener color para una categoría
  getCategoryColor(category) {
    if (!category) return this.colors.default;
    
    // Generar color basado en el hash de la categoría si no está definido
    if (!this.colors[category]) {
      this.colors[category] = this.generateColorFromString(category);
    }
    
    return this.colors[category];
  }

getColorCat(category) {
  const MapColors = {
    1: 'hsl(60, 100%, 50%)', 2: 'hsl(60, 100%, 70%)', 3: 'hsl(60, 100%, 70%)', 4: 'hsl(60, 100%, 50%)',
    5: 'hsl(60, 100%, 70%)', 6: 'hsl(42, 100%, 47.6%)', 7: 'hsl(60, 100%, 50%)', 8: 'hsl(42, 100%, 47.6%)',
    9: 'hsl(42, 100%, 50%)', 10: 'hsl(40, 100%, 70%)', 11: 'hsl(40, 100%, 70%)', 12: 'hsl(40, 100%, 70%)',
    13: 'hsl(30, 100%, 50%)', 14: 'hsl(40, 100%, 70%)', 15: 'hsl(11, 100%, 50.2%)', 16: 'hsl(30, 100%, 50%)',
    17: 'hsl(11, 100%, 50.2%)', 18: 'hsl(300, 95.1%, 93.1%)', 19: 'hsl(0, 75.5%, 76.5%)',
    20: 'hsl(300, 96.3%, 84.3%)', 21: 'hsl(300, 96.3%, 84.3%)', 22: 'hsl(300, 96.3%, 84.3%)',
    23: 'hsl(317, 96.4%, 58%)', 24: 'hsl(317, 96.4%, 58%)', 25: 'hsl(3, 98.6%, 36.5%)',
    26: 'hsl(3, 98.6%, 36.5%)', 27: 'hsl(3, 98.6%, 36.5%)', 28: 'hsl(285, 100%, 70%)',
    29: 'hsl(285, 100%, 70%)', 30: 'hsl(273, 89.4%, 46.1%)', 31: 'hsl(285, 100%, 70%)',
    32: 'hsl(300, 100%, 20%)', 33: 'hsl(273, 89.4%, 46.1%)', 34: 'hsl(300, 100%, 20%)',
    35: 'hsl(210, 100%, 80%)', 36: 'hsl(210, 100%, 80%)', 37: 'hsl(240, 100%, 50%)',
    38: 'hsl(240, 100%, 50%)', 39: 'hsl(240, 100%, 15.7%)', 40: 'hsl(240, 100%, 15.7%)',
    41: 'hsl(240, 100%, 15.7%)', 42: 'hsl(154, 100%, 85.3%)', 43: 'hsl(154, 100%, 85.3%)',
    44: 'hsl(172, 100%, 48.2%)', 45: 'hsl(154, 100%, 85.3%)', 46: 'hsl(180, 100%, 25.1%)',
    47: 'hsl(172, 100%, 48.2%)', 48: 'hsl(180, 100%, 25.1%)', 49: 'hsl(90, 60.3%, 58.4%)',
    50: 'hsl(90, 36.4%, 70%)', 51: 'hsl(90, 36.4%, 70%)', 52: 'hsl(90, 36.4%, 70%)',
    53: 'hsl(90, 40.5%, 29.4%)', 54: 'hsl(90, 36.4%, 70%)', 55: 'hsl(90, 37.3%, 15.3%)',
    56: 'hsl(90, 40.5%, 29.4%)', 57: 'hsl(90, 37.3%, 15.3%)', 58: 'hsl(43, 18.1%, 68%)',
    59: 'hsl(43, 18.1%, 68%)', 60: 'hsl(30, 50%, 40%)', 61: 'hsl(43, 18.1%, 68%)',
    62: 'hsl(30, 100%, 14.1%)', 63: 'hsl(30, 50%, 40%)', 64: 'hsl(30, 100%, 14.1%)',
    65: 'hsl(0, 0%, 75%)', 66: 'hsl(0, 0%, 75%)', 67: 'hsl(0, 0%, 30%)', 68: 'hsl(0, 0%, 30%)',
    69: 'hsl(0, 0%, 8.6%)', 70: 'hsl(0, 0%, 8.6%)', 71: 'hsl(0, 0%, 100%)', 72: 'hsl(0, 0%, 100%)',
    73: 'hsl(0, 0%, 15%)',
  };

  return MapColors[category];
}


  getCategoryReal(category){
    const MapCategory = {
      10:1,101:2,11:3,12:4,121:5,13:6,131:7,14:8,20:9,201:10,21:11,211:12,22:13,221:14,23:15,
      231:16,24:17,300:18,30:19,301:20,31:21,311:22,32:23,321:24,33:25,331:26,34:27,41:28,411:29,
      42:30,421:31,43:32,431:33,44:34,51:35,511:36,52:37,521:38,53:39,531:40,54:41,61:42,611:43,62:44,
      621:45,63:46,631:47,64:48,70:49,701:50,71:51,711:52,72:53,721:54,73:55,731:56,74:57,81:58,811:59,
      82:60,821:61,83:62,831:63,84:64,91:65,911:66,92:67,921:68,93:69,931:70, 1:71, 2:72, 0:73,
    };

    const Index_cat = MapCategory[category];
    const color =  this.getColorCat(Index_cat);
    return color
  }
  
  // Generar color basado en una cadena
  generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`;
  }
  
  // Obtener color de contraste (blanco o negro) según el fondo
  getContrastColor(hexColor) {
    // Convertir a RGB si es HSL
    let r, g, b;
    
    if (hexColor.startsWith('hsl')) {
      const hslMatch = hexColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (hslMatch) {
        const h = parseInt(hslMatch[1]) / 360;
        const s = parseInt(hslMatch[2]) / 100;
        const l = parseInt(hslMatch[3]) / 100;
        
        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        
        r = Math.round(r * 255);
        g = Math.round(g * 255);
        b = Math.round(b * 255);
      } else {
        r = g = b = 128; // Valor por defecto
      }
    } else if (hexColor.startsWith('#')) {
      const hex = hexColor.substring(1);
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else {
      // Color por defecto
      r = g = b = 128;
    }
    
    // Calcular luminosidad
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Usar texto blanco para fondos oscuros y negro para fondos claros
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  // Formatear tiempo en horas:minutos
  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }
}
