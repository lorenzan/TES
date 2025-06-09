// Algoritmo de optimización para asignación de órdenes a máquinas
class Optimizer {
  constructor(orders, machines, matrixData, balanceFactor = 0.5) {
    this.orders = JSON.parse(JSON.stringify(orders)); // Clonar órdenes para no modificar las originales
    this.machines = machines;
    this.matrixData = matrixData;
    this.balanceFactor = balanceFactor; // Factor de equilibrio entre minimizar lavados y equilibrar carga
    this.sectorizedCodes = window.dataManager ? window.dataManager.getAllSectorizedCodes() : [];
  }

  // Ejecutar optimización
  optimize() {
    // Paso 1: Filtrar órdenes por compatibilidad con máquinas
    var abc = 0;
    const possibleAssignments = {};
    
    for (const order of this.orders) {
      possibleAssignments[order.id] = [];
      
       // Verificar si el código de color está sectorizado
      const isSectorized = this.sectorizedCodes.includes(order.colorCode);
      
      if(order.number === 610597){
        abc = 1
      }

      for (const machine of this.machines) {
        // Verificar compatibilidad general
        if (machine.isCompatible(order)) {
          // Si el código está sectorizado, solo asignar a máquinas con ese código en sectorización
          if (isSectorized) {
            if (machine.restrictions.sectorization.includes(order.colorCode)) {
              possibleAssignments[order.id].push(machine);
            }
          } else {
            possibleAssignments[order.id].push(machine);
          }
        }
      }
    }
    
    // Paso 2: Ordenar las órdenes por número de máquinas compatibles (menos opciones primero)
    const sortedOrders = [...this.orders].sort((a, b) => 
      possibleAssignments[a.id].length - possibleAssignments[b.id].length
    );
    
    // Paso 3: Inicializar estructuras para la asignación
    const machineSequences = {};
    
    for (const machine of this.machines) {
      machineSequences[machine.name] = [];
      // Inicializar con la categoría previa de la máquina
      machineSequences[machine.name].prevCategory = machine.prevCategory;
    }
    
    // Paso 4: Asignar órdenes a máquinas minimizando lavados/enjuagues
    for (const order of sortedOrders) {
      let bestMachine = null;
      let bestPosition = 0;
      let lowestCost = Infinity;
      
      // Si no hay máquinas compatibles, continuar con la siguiente orden
      if (possibleAssignments[order.id].length === 0) {
        continue;
      }
      
      for (const machine of possibleAssignments[order.id]) {
        // Probar insertar la orden en cada posición posible
        for (let position = 0; position <= machineSequences[machine.name].length; position++) {
          const cost = this.calculateInsertionCost(
            order, 
            machine, 
            position, 
            machineSequences
          );
          
          // Considerar también el equilibrio de carga
          const factor = this.calculateBalanceFactor(machine, machineSequences);
          const adjustedCost = cost * (1 - this.balanceFactor) + factor * this.balanceFactor;
          
          if (adjustedCost < lowestCost) {
            lowestCost = adjustedCost;
            bestMachine = machine;
            bestPosition = position;
          }
        }
      }
      
      // Asignar la orden a la mejor posición encontrada
      if (bestMachine) {
        this.insertOrder(order, bestMachine, bestPosition, machineSequences);
        order.assignedMachine = bestMachine.name;
        order.position = bestPosition;
      }
    }
    
    // Paso 5: Calcular métricas de eficiencia
    const metrics = this.calculateMetrics(machineSequences);
    
    // Actualizar posiciones para que sean consecutivas por máquina
    for (const machineName in machineSequences) {
      machineSequences[machineName].forEach((order, index) => {
        order.position = index;
      });
    }
    
    // Crear resultado de optimización
    const result = new OptimizationResult();
    result.assignedOrders = this.orders.filter(order => order.assignedMachine);
    result.metrics = metrics;
    
    return result;
  }

  // Calcular costo de inserción
  calculateInsertionCost(order, machine, position, machineSequences) {
    const currentSequence = machineSequences[machine.name];
    let cost = 0;
    
    // Si es la primera orden en la máquina, calcular con la categoría previa de la máquina
    if (currentSequence.length === 0) {
      // Usar la categoría previa de la máquina para el cálculo
      const prevCategory = machineSequences[machine.name].prevCategory || machine.prevCategory;
      
      if (prevCategory && prevCategory !== '') {
        // Si hay categoría previa, calcular el costo de transición
        cost = this.getTransitionCost(prevCategory, order.category);
      } else {
        // Si no hay categoría previa, asumir un costo neutral
        cost = 1; // Costo medio (ni el mejor ni el peor)
      }
      
      return cost;
    }
    
    // Si se inserta al principio, calcular transición con la primera orden actual
    // y con la categoría previa de la máquina
    if (position === 0) {
      const nextOrder = currentSequence[0];
      const prevCategory = machineSequences[machine.name].prevCategory || machine.prevCategory;
      
      if (prevCategory && prevCategory !== '') {
        // Costo actual entre categoría previa y primera orden
        const currentCost = this.getTransitionCost(prevCategory, nextOrder.category);
        
        // Nuevo costo con la orden insertada
        const newCost = 
          this.getTransitionCost(prevCategory, order.category) +
          this.getTransitionCost(order.category, nextOrder.category);
        
        // El costo de inserción es la diferencia
        cost = newCost - currentCost;
      } else {
        // Si no hay categoría previa, solo considerar la transición a la siguiente orden
        cost = this.getTransitionCost(order.category, nextOrder.category);
      }
    }
    
    // Si se inserta al final, calcular transición con la última orden actual
    else if (position === currentSequence.length) {
      const previousOrder = currentSequence[position - 1];
      cost = this.getTransitionCost(previousOrder.category, order.category);
    }
    
    // Si se inserta en medio, calcular transición con órdenes anterior y siguiente
    else {
      const previousOrder = currentSequence[position - 1];
      const nextOrder = currentSequence[position];

      // Costo actual entre anterior y siguiente
      const currentCost = this.getTransitionCost(previousOrder.category, nextOrder.category);
      
      // Nuevo costo con la orden insertada
      const newCost = 
        this.getTransitionCost(previousOrder.category, order.category) +
        this.getTransitionCost(order.category, nextOrder.category);
      
      // El costo de inserción es la diferencia
      cost = newCost - currentCost;
    }
    
    return cost;
  }

  // Obtener costo de transición entre categorías
  getTransitionCost(categoryOrigin, categoryDest) {
    const MapCategory = {
      10:1,101:2,11:3,12:4,121:5,13:6,131:7,14:8,20:9,201:10,21:11,211:12,22:13,221:14,23:15,
      231:16,24:17,300:18,30:19,301:20,31:21,311:22,32:23,321:24,33:25,331:26,34:27,41:28,411:29,
      42:30,421:31,43:32,431:33,44:34,51:35,511:36,52:37,521:38,53:39,531:40,54:41,61:42,611:43,62:44,
      621:45,63:46,631:47,64:48,70:49,701:50,71:51,711:52,72:53,721:54,73:55,731:56,74:57,81:58,811:59,
      82:60,821:61,83:62,831:63,84:64,91:65,911:66,92:67,921:68,93:69,931:70, 1:71, 2:72, 0:73,
    };
    
    // Convertir categorías a números si son strings
    const originCat = isNaN(categoryOrigin) ? categoryOrigin : Number(categoryOrigin);
    const destCat = isNaN(categoryDest) ? categoryDest : Number(categoryDest);
    
    const originIndex = MapCategory[originCat];
    const destIndex = MapCategory[destCat];

    // Validar que los índices existan
    if (originIndex == null || destIndex == null) {
      console.warn(`Categoría no encontrada en el mapeo: origen=${categoryOrigin}, destino=${categoryDest}`);
      return 2; // Por defecto, lavado
    }

    const value = this.matrixData.getValue(destIndex, originIndex);

    if (value === null || value === undefined) {
      return 2; // Si no hay valor definido, asumir el peor caso (lavado)
    }

    if (value === '1') {
      return 0; // Progresión natural, sin costo
    } else if (value === '5') {
      return 1; // Enjuague, costo medio
    } else {
      return 2; // Lavado completo u otros valores
    }
  }

  // Calcular factor de equilibrio
  calculateBalanceFactor(machine, machineSequences) {
    // Calcular la carga actual de la máquina (número de órdenes)
    const machineLoad = machineSequences[machine.name].length;
    
    // Calcular la carga promedio de todas las máquinas
    let totalLoad = 0;
    for (const m of this.machines) {
      totalLoad += machineSequences[m.name].length;
    }
    
    const averageLoad = totalLoad / this.machines.length;
    
    // Si la máquina tiene menos carga que el promedio, favorecerla (factor bajo)
    // Si tiene más carga, penalizarla (factor alto)
    if (averageLoad === 0) {
      return 0.5;
    }
    
    // Normalizar el factor entre 0 y 1
    const factor = machineLoad / (2 * averageLoad);
    
    // Limitar el factor para que esté entre 0 y 1
    return Math.max(0, Math.min(factor, 1));
  }

  // Insertar orden en una posición
  insertOrder(order, machine, position, machineSequences) {
    machineSequences[machine.name].splice(position, 0, order);
    
    // Actualizar posiciones de las órdenes siguientes
    for (let i = position + 1; i < machineSequences[machine.name].length; i++) {
      if (machineSequences[machine.name][i].position !== null) {
        machineSequences[machine.name][i].position = i;
      }
    }
  }

  // Calcular métricas
  calculateMetrics(machineSequences) {
    let totalWashes = 0;
    let totalRinses = 0;
    let totalProgressions = 0;
    
    // Contar transiciones por tipo
    for (const machineName in machineSequences) {
      const sequence = machineSequences[machineName];
      
      // Si hay categoría previa y al menos una orden, contar la primera transición
      if (sequence.prevCategory && sequence.length > 0) {
        const firstOrder = sequence[0];
        const cost = this.getTransitionCost(sequence.prevCategory, firstOrder.category);
        
        if (cost === 0) {
          totalProgressions++;
        } else if (cost === 1) {
          totalRinses++;
        } else {
          totalWashes++;
        }
      }
      
      // Contar transiciones entre órdenes
      for (let i = 0; i < sequence.length - 1; i++) {
        const currentOrder = sequence[i];
        const nextOrder = sequence[i + 1];
        
        const cost = this.getTransitionCost(currentOrder.category, nextOrder.category);
        
        if (cost === 0) {
          totalProgressions++;
        } else if (cost === 1) {
          totalRinses++;
        } else {
          totalWashes++;
        }
      }
    }
    
    // Calcular equilibrio de carga
    const loads = this.machines.map(m => machineSequences[m.name].length);
    
    // Evitar división por cero
    if (loads.length === 0 || loads.reduce((a, b) => a + b, 0) === 0) {
      return {
        totalWashes,
        totalRinses,
        totalProgressions,
        avoidedWashes: 0,
        loadBalance: 0
      };
    }
    
    // Calcular desviación estándar
    const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / loads.length;
    const loadBalance = Math.sqrt(variance);
    
    // Calcular lavados evitados (estimación)
    // Asumimos que sin optimización, cada cambio de categoría requeriría un lavado
    const totalTransitions = totalWashes + totalRinses + totalProgressions;
    const potentialWashes = totalTransitions; // Sin optimización
    const avoidedWashes = potentialWashes - totalWashes - (totalRinses * 0.5); // Enjuague cuenta como medio lavado
    
    return {
      totalWashes,
      totalRinses,
      totalProgressions,
      avoidedWashes,
      loadBalance
    };
  }
}
