// Definición de clases para el modelo de datos
class Order {
  constructor(id, number, category, fabricStyle, weight, fabricType, colorCode, family) {
    this.id = id;
    this.number = number;
    this.category = category;
    this.fabricStyle = fabricStyle;
    this.weight = weight;
    this.fabricType = fabricType;
    this.colorCode = colorCode;
    this.family = family;
    this.assignedMachine = null;
    this.position = null;
    
  }
}

class Machine {
  constructor(id, name, family, prevCategory) {
    this.id = id;
    this.name = name;
    this.family = family;
    this.prevCategory = prevCategory
    
    // Nuevo formato de restricciones por categoría
    this.restrictions = {
      colorCode: [],      // Códigos de color permitidos
      style: [],          // Estilos permitidos
      maxWeight: null,    // Peso máximo permitido
      sectorization: [],  // Códigos exclusivos (sectorización)
      fabricType: [],     // Tipos de tejido permitidos
      tone: []            // Tonos permitidos
    };
  }

  // Verificar compatibilidad con una orden
  isCompatible(order) {
    console.log(`Verificando compatibilidad: Orden ${order.number} (Familia: ${order.family}) con Máquina ${this.name} (Familia: ${this.family})`);
    
    // Verificar compatibilidad de familia
    if (order.family && order.family !== '' && this.family && this.family !== '') {
        const orderFamily = order.family.trim().toLowerCase();
        const machineFamily = this.family.trim().toLowerCase();
        
        if (orderFamily !== machineFamily) {
            console.log(`  - Incompatible por familia: ${order.family} != ${this.family}`);
            return false;
        }
    }
    
    // Verificar restricciones por código de color
//    if (this.restrictions.colorCode.length > 0 && 
//        !this.restrictions.colorCode.includes(order.colorCode)) {
//      return false;
//    }
    
    // Verificar restricciones por código de color
    if (this.restrictions.colorCode.length > 0) {
      for (let i = 0; i < this.restrictions.colorCode.length; i++) {
        if (this.restrictions.colorCode[i] === order.colorCode) {
          return false; // Retorna false si encuentra coincidencia
        }
      }
    }


    // Verificar restricciones por estilo
    //if (this.restrictions.style.length > 0 && 
    //    !this.restrictions.style.includes(order.fabricStyle)) {
     // return false;
    //}
    
    if (this.restrictions.style.length > 0) {
      for (let i = 0; i < this.restrictions.style.length; i++) {
        if (this.restrictions.style[i] === order.fabricStyle) {
          return false; // Retorna false si encuentra coincidencia
        }
      }
    }

    // Verificar restricciones por peso máximo
    if (this.restrictions.maxWeight !== null && 
        order.weight > this.restrictions.maxWeight) {
      return false;
    }

    // Verificar restricciones por tipo de tejido
    //if (this.restrictions.fabricType.length > 0 && 
    //    !this.restrictions.fabricType.includes(order.fabricType)) {
    //  return false;
    //}
    
    if (this.restrictions.fabricType.length > 0) {
      for (let i = 0; i < this.restrictions.fabricType.length; i++) {
        if (this.restrictions.fabricType[i] === order.fabricType) {
          return false; // Retorna false si encuentra coincidencia
        }
      }
    }


    // Verificar restricciones por tono
    //if (this.restrictions.tone.length > 0 && 
    //    !this.restrictions.tone.includes(order.category)) {
    //  return false;
    //}
    
    if (this.restrictions.tone.length > 0) {
      for (let i = 0; i < this.restrictions.tone.length; i++) {
        if (this.restrictions.tone[i] === order.tone) {
          return false; // Retorna false si encuentra coincidencia
        }
      }
    }


    // Verificar sectorización (lógica inversa - exclusividad)
    // Si la orden tiene un código que está en alguna sectorización,
    // solo puede ser procesada por máquinas que tengan ese código en su sectorización
    const allSectorizedCodes = window.dataManager ? 
      window.dataManager.getAllSectorizedCodes() : [];
    
    if (allSectorizedCodes.includes(order.colorCode)) {
      // Este código está sectorizado, verificar si esta máquina puede procesarlo
      return this.restrictions.sectorization.includes(order.colorCode);
    }
    
    return true;
  }

  // Agregar restricción
  addRestriction(type, value) {
    if (!value) return false;
    
    switch (type) {
      case 'colorCode':
        if (!this.restrictions.colorCode.includes(value)) {
          this.restrictions.colorCode.push(value);
          return true;
        }
        break;
      case 'style':
        if (!this.restrictions.style.includes(value)) {
          this.restrictions.style.push(value);
          return true;
        }
        break;
      case 'maxWeight':
        const weight = parseFloat(value);
        if (!isNaN(weight)) {
          this.restrictions.maxWeight = weight;
          return true;
        }
        break;
      case 'sectorization':
        if (!this.restrictions.sectorization.includes(value)) {
          this.restrictions.sectorization.push(value);
          return true;
        }
        break;
      case 'fabricType':
        if (!this.restrictions.fabricType.includes(value)) {
          this.restrictions.fabricType.push(value);
          return true;
        }
        break;
      case 'tone':
        if (!this.restrictions.tone.includes(value)) {
          this.restrictions.tone.push(value);
          return true;
        }
        break;
    }
    
    return false;
  }

  // Eliminar restricción
  removeRestriction(type, value) {
    switch (type) {
      case 'colorCode':
        this.restrictions.colorCode = this.restrictions.colorCode.filter(v => v !== value);
        return true;
      case 'style':
        this.restrictions.style = this.restrictions.style.filter(v => v !== value);
        return true;
      case 'maxWeight':
        this.restrictions.maxWeight = null;
        return true;
      case 'sectorization':
        this.restrictions.sectorization = this.restrictions.sectorization.filter(v => v !== value);
        return true;
      case 'fabricType':
        this.restrictions.fabricType = this.restrictions.fabricType.filter(v => v !== value);
        return true;
      case 'tone':
        this.restrictions.tone = this.restrictions.tone.filter(v => v !== value);
        return true;
    }
    
    return false;
  }
}

class MatrixData {
  constructor() {
    this.categories = [];
    this.matrix = {};
  }

// Obtener el valor de transición entre dos categorías
getValue(categoryOrigin, categoryDest) {

  if (this.matrix[categoryOrigin] && 
      this.matrix[categoryOrigin][categoryDest] !== undefined) {
    // Asegurar que el valor devuelto sea una cadena
    return String(this.matrix[categoryOrigin][categoryDest]);
  }
  return null;
}


  // Establecer el valor de transición entre dos categorías
  setValue(categoryOrigin, categoryDest, value) {
    if (!this.matrix[categoryOrigin]) {
      this.matrix[categoryOrigin] = {};
    }
    this.matrix[categoryOrigin][categoryDest] = value;
  }

  // Agregar una nueva categoría
  addCategory(category) {
    if (!this.categories.includes(category)) {
      this.categories.push(category);
      
      // Inicializar valores para la nueva categoría
      if (!this.matrix[category]) {
        this.matrix[category] = {};
      }
      
      // Establecer valores por defecto para todas las categorías
      this.categories.forEach(cat => {
        if (cat !== category && this.matrix[cat] && !this.matrix[cat][category]) {
          this.matrix[cat][category] = '2'; // Valor por defecto: lavado
        }
        
        if (!this.matrix[category][cat]) {
          this.matrix[category][cat] = '2'; // Valor por defecto: lavado
        }
      });
      
      return true;
    }
    return false;
  }

  // Eliminar una categoría
  removeCategory(category) {
    const index = this.categories.indexOf(category);
    if (index !== -1) {
      this.categories.splice(index, 1);
      
      // Eliminar la categoría como origen
      delete this.matrix[category];
      
      // Eliminar la categoría como destino en todas las demás categorías
      Object.keys(this.matrix).forEach(cat => {
        if (this.matrix[cat][category]) {
          delete this.matrix[cat][category];
        }
      });
      
      return true;
    }
    return false;
  }
}

// Clase para almacenar los resultados de la optimización
class OptimizationResult {
  constructor() {
    this.assignedOrders = [];
    this.metrics = {
      totalWashes: 0,
      totalRinses: 0,
      totalProgressions: 0,
      avoidedWashes: 0,
      loadBalance: 0
    };
  }
}
