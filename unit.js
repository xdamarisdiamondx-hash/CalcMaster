/* CalcMaster - Unit Converter Module
   Supports Length, Weight/Mass, Temperature, Volume, Area, Speed, and Digital Storage conversions
*/

class UnitEngine {
  constructor() {
    this.categories = {
      length: {
        name: 'Length',
        icon: '📏',
        baseUnit: 'm',
        units: {
          m:  { name: 'Meters (m)',           ratio: 1 },
          km: { name: 'Kilometers (km)',     ratio: 1000 },
          cm: { name: 'Centimeters (cm)',     ratio: 0.01 },
          mm: { name: 'Millimeters (mm)',     ratio: 0.001 },
          mi: { name: 'Miles (mi)',           ratio: 1609.344 },
          yd: { name: 'Yards (yd)',           ratio: 0.9144 },
          ft: { name: 'Feet (ft)',            ratio: 0.3048 },
          in: { name: 'Inches (in)',          ratio: 0.0254 }
        }
      },
      mass: {
        name: 'Mass / Weight',
        icon: '⚖️',
        baseUnit: 'kg',
        units: {
          kg:  { name: 'Kilograms (kg)',      ratio: 1 },
          g:   { name: 'Grams (g)',           ratio: 0.001 },
          mg:  { name: 'Milligrams (mg)',     ratio: 0.000001 },
          lb:  { name: 'Pounds (lb)',         ratio: 0.45359237 },
          oz:  { name: 'Ounces (oz)',         ratio: 0.028349523125 },
          ton: { name: 'Metric Tons (t)',     ratio: 1000 }
        }
      },
      temperature: {
        name: 'Temperature',
        icon: '🌡️',
        custom: true, // Needs special formula
        units: {
          c: { name: 'Celsius (°C)',       symbol: '°C' },
          f: { name: 'Fahrenheit (°F)',   symbol: '°F' },
          k: { name: 'Kelvin (K)',          symbol: 'K' }
        }
      },
      volume: {
        name: 'Volume',
        icon: '🧪',
        baseUnit: 'l',
        units: {
          l:   { name: 'Liters (L)',          ratio: 1 },
          ml:  { name: 'Milliliters (mL)',    ratio: 0.001 },
          m3:  { name: 'Cubic Meters (m³)',   ratio: 1000 },
          gal: { name: 'US Gallons (gal)',    ratio: 3.785411784 },
          qt:  { name: 'US Quarts (qt)',      ratio: 0.946352946 },
          pt:  { name: 'US Pints (pt)',       ratio: 0.473176473 },
          cup: { name: 'US Cups (cup)',       ratio: 0.24 },
          fl_oz: { name: 'US Fl Ounces (fl oz)', ratio: 0.0295735295625 }
        }
      },
      area: {
        name: 'Area',
        icon: '📐',
        baseUnit: 'sq_m',
        units: {
          sq_m:  { name: 'Square Meters (m²)',      ratio: 1 },
          sq_km: { name: 'Square Kilometers (km²)', ratio: 1000000 },
          sq_ft: { name: 'Square Feet (ft²)',       ratio: 0.09290304 },
          sq_mi: { name: 'Square Miles (mi²)',      ratio: 2589988.110336 },
          acre:  { name: 'Acres (ac)',              ratio: 4046.8564224 },
          ha:    { name: 'Hectares (ha)',           ratio: 10000 }
        }
      },
      speed: {
        name: 'Speed',
        icon: '🚀',
        baseUnit: 'mps',
        units: {
          mps:  { name: 'Meters / sec (m/s)',     ratio: 1 },
          kph:  { name: 'Km / hour (km/h)',       ratio: 1 / 3.6 },
          mph:  { name: 'Miles / hour (mph)',     ratio: 0.44704 },
          knot: { name: 'Knots (kn)',             ratio: 0.514444 }
        }
      },
      storage: {
        name: 'Digital Data',
        icon: '💾',
        baseUnit: 'b',
        units: {
          b:  { name: 'Bytes (B)',                ratio: 1 },
          kb: { name: 'Kilobytes (KB)',           ratio: 1024 },
          mb: { name: 'Megabytes (MB)',           ratio: 1024 * 1024 },
          gb: { name: 'Gigabytes (GB)',           ratio: 1024 * 1024 * 1024 },
          tb: { name: 'Terabytes (TB)',           ratio: 1024 * 1024 * 1024 * 1024 }
        }
      }
    };

    this.currentCategory = 'length';
    this.fromUnit = 'm';
    this.toUnit = 'km';
    this.fromAmount = 1;
    this.toAmount = 0.001;

    this.recalculate();
  }

  setCategory(catKey) {
    if (this.categories[catKey]) {
      this.currentCategory = catKey;
      const unitKeys = Object.keys(this.categories[catKey].units);
      this.fromUnit = unitKeys[0];
      this.toUnit = unitKeys[1] || unitKeys[0];
      this.recalculate();
    }
  }

  setFromUnit(unitKey) {
    if (this.categories[this.currentCategory].units[unitKey]) {
      this.fromUnit = unitKey;
      this.recalculate();
    }
  }

  setToUnit(unitKey) {
    if (this.categories[this.currentCategory].units[unitKey]) {
      this.toUnit = unitKey;
      this.recalculate();
    }
  }

  swapUnits() {
    const tmp = this.fromUnit;
    this.fromUnit = this.toUnit;
    this.toUnit = tmp;
    this.recalculate();
  }

  setFromAmount(val) {
    this.fromAmount = parseFloat(val) || 0;
    this.recalculate();
  }

  recalculate() {
    const cat = this.categories[this.currentCategory];
    if (!cat) return;

    if (this.currentCategory === 'temperature') {
      this.toAmount = this.convertTemperature(this.fromAmount, this.fromUnit, this.toUnit);
      return;
    }

    const fromRatio = cat.units[this.fromUnit]?.ratio || 1;
    const toRatio = cat.units[this.toUnit]?.ratio || 1;

    // Convert from source to base unit, then base unit to target
    const baseValue = this.fromAmount * fromRatio;
    this.toAmount = baseValue / toRatio;
  }

  convertTemperature(val, from, to) {
    if (from === to) return val;

    // First convert from source to Celsius
    let celsius = val;
    if (from === 'f') {
      celsius = (val - 32) * (5 / 9);
    } else if (from === 'k') {
      celsius = val - 273.15;
    }

    // Now convert Celsius to target
    if (to === 'c') return celsius;
    if (to === 'f') return (celsius * (9 / 5)) + 32;
    if (to === 'k') return celsius + 273.15;

    return celsius;
  }

  getDirectFormula() {
    const cat = this.categories[this.currentCategory];
    const fromName = cat.units[this.fromUnit]?.name || this.fromUnit;
    const toName = cat.units[this.toUnit]?.name || this.toUnit;

    const unitSample = this.fromAmount === 0 ? 1 : this.fromAmount;
    let targetSample = 0;

    if (this.currentCategory === 'temperature') {
      targetSample = this.convertTemperature(1, this.fromUnit, this.toUnit);
      return `1 ${this.fromUnit.toUpperCase()} = ${this.formatValue(targetSample)} ${this.toUnit.toUpperCase()}`;
    }

    const fromRatio = cat.units[this.fromUnit]?.ratio || 1;
    const toRatio = cat.units[this.toUnit]?.ratio || 1;
    const rate = fromRatio / toRatio;

    return `1 ${this.fromUnit} = ${this.formatValue(rate)} ${this.toUnit}`;
  }

  getQuickMatrix() {
    const amounts = [1, 5, 10, 50, 100, 500];
    const cat = this.categories[this.currentCategory];

    return amounts.map(val => {
      let result = 0;
      if (this.currentCategory === 'temperature') {
        result = this.convertTemperature(val, this.fromUnit, this.toUnit);
      } else {
        const fromRatio = cat.units[this.fromUnit]?.ratio || 1;
        const toRatio = cat.units[this.toUnit]?.ratio || 1;
        result = (val * fromRatio) / toRatio;
      }

      return {
        fromStr: `${val} ${this.fromUnit}`,
        toStr: `${this.formatValue(result)} ${this.toUnit}`
      };
    });
  }

  formatValue(val) {
    if (isNaN(val)) return '0';
    if (Math.abs(val) < 0.0001 && val !== 0) return val.toExponential(4);
    return parseFloat(val.toFixed(6)).toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
}

window.unitEngine = new UnitEngine();
