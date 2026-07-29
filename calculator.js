/* CalcMaster - Calculator Engine
   Basic & Scientific Mathematical Evaluator with DEG/RAD Support,
   Expression Parsing, Backspace/Undo, and Keyboard Listeners.
*/

class CalculatorEngine {
  constructor() {
    this.expression = '';
    this.result = '0';
    this.isDegMode = true; // DEG by default
    this.isEvaluated = false;
    this.lastCalculation = null;

    this.onUpdateCallback = null;
  }

  setUpdateCallback(cb) {
    this.onUpdateCallback = cb;
  }

  notifyUpdate() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        expression: this.expression,
        result: this.result,
        isDegMode: this.isDegMode,
        isEvaluated: this.isEvaluated
      });
    }
  }

  toggleAngleUnit() {
    this.isDegMode = !this.isDegMode;
    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  appendDigit(digit) {
    if (this.isEvaluated) {
      // If previous operation just evaluated and user types a digit, start fresh
      this.expression = digit;
      this.isEvaluated = false;
    } else {
      this.expression += digit;
    }
    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  appendOperator(op) {
    if (this.isEvaluated) {
      // Use previous result as starting point
      this.expression = this.result + ' ' + op + ' ';
      this.isEvaluated = false;
    } else {
      // Prevent consecutive duplicated binary operators
      const trimmed = this.expression.trim();
      const lastChar = trimmed.slice(-1);
      if (['+', '-', '×', '÷', '%', '^'].includes(lastChar)) {
        this.expression = trimmed.slice(0, -1) + ' ' + op + ' ';
      } else {
        this.expression += ' ' + op + ' ';
      }
    }
    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  appendFunction(funcName) {
    if (this.isEvaluated) {
      this.expression = funcName + '(' + this.result;
      this.isEvaluated = false;
    } else {
      this.expression += funcName + '(';
    }
    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  appendConstant(constantSymbol) {
    if (this.isEvaluated) {
      this.expression = constantSymbol;
      this.isEvaluated = false;
    } else {
      this.expression += constantSymbol;
    }
    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  appendParenthesis(paren) {
    if (this.isEvaluated && paren === '(') {
      this.expression = '(';
      this.isEvaluated = false;
    } else {
      this.expression += paren;
    }
    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  appendSquareOrCube(power) {
    if (this.expression === '' && this.result !== '0') {
      this.expression = this.result + '^' + power;
    } else {
      this.expression += '^' + power;
    }
    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  appendFactorial() {
    if (this.expression === '' && this.result !== '0') {
      this.expression = this.result + '!';
    } else {
      this.expression += '!';
    }
    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  toggleSign() {
    if (this.expression === '') {
      if (this.result !== '0') {
        if (this.result.startsWith('-')) {
          this.result = this.result.slice(1);
        } else {
          this.result = '-' + this.result;
        }
      }
      this.notifyUpdate();
      return;
    }

    // Toggle last token sign or wrap in parenthesis
    if (this.expression.startsWith('-(') && this.expression.endsWith(')')) {
      this.expression = this.expression.slice(2, -1);
    } else {
      this.expression = '-(' + this.expression + ')';
    }
    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  backspace() {
    if (this.isEvaluated) {
      this.expression = '';
      this.isEvaluated = false;
      this.notifyUpdate();
      return;
    }

    if (this.expression.length > 0) {
      // If trailing space from operator, remove space + op
      if (this.expression.endsWith(' ')) {
        this.expression = this.expression.trimEnd();
        this.expression = this.expression.slice(0, -1).trimEnd();
      } else {
        this.expression = this.expression.slice(0, -1);
      }
    }

    this.evaluateLivePreview();
    this.notifyUpdate();
  }

  clearAll() {
    this.expression = '';
    this.result = '0';
    this.isEvaluated = false;
    this.notifyUpdate();
  }

  evaluateLivePreview() {
    if (!this.expression.trim()) {
      this.result = '0';
      return;
    }

    try {
      const computed = this.parseAndEvaluate(this.expression);
      if (computed !== null && !isNaN(computed) && isFinite(computed)) {
        this.result = this.formatNumber(computed);
      }
    } catch (e) {
      // Keep previous valid preview or display silence
    }
  }

  executeEquals() {
    if (!this.expression.trim()) return;

    try {
      const computed = this.parseAndEvaluate(this.expression);
      if (computed === null || isNaN(computed) || !isFinite(computed)) {
        this.result = 'Error';
      } else {
        const formattedResult = this.formatNumber(computed);
        this.result = formattedResult;
        
        // Save to history engine
        if (window.historyManager) {
          window.historyManager.addEntry({
            type: 'calculator',
            expression: this.expression,
            result: formattedResult,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }

        this.lastCalculation = {
          expression: this.expression,
          result: formattedResult
        };

        this.isEvaluated = true;
      }
    } catch (e) {
      this.result = 'Error';
    }

    this.notifyUpdate();
  }

  // Sanitizer and evaluator for mathematical string
  parseAndEvaluate(rawExp) {
    let exp = rawExp;

    // Replace display operators with JS mathematical syntax
    exp = exp.replace(/×/g, '*').replace(/÷/g, '/').replace(/mod/g, '%');

    // Replace constants
    exp = exp.replace(/π/g, 'Math.PI').replace(/\be\b/g, 'Math.E');

    // Replace factorials n!
    exp = exp.replace(/(\d+(\.\d+)?|\bMath\.PI\b|\bMath\.E\b)\!/g, (match, num) => {
      const val = parseFloat(num);
      return this.factorial(val);
    });

    // Replace exponents x^y
    exp = exp.replace(/(\d+(\.\d+)?|\([^\)]+\))\^(\d+(\.\d+)?|\([^\)]+\))/g, 'Math.pow($1, $3)');

    // Replace square root √
    exp = exp.replace(/√\(([^)]+)\)/g, 'Math.sqrt($1)');
    exp = exp.replace(/√(\d+(\.\d+)?)/g, 'Math.sqrt($1)');

    // Trigonometric functions DEG vs RAD wrapping
    const degToRad = (val) => (this.isDegMode ? (val * Math.PI) / 180 : val);
    const radToDeg = (val) => (this.isDegMode ? (val * 180) / Math.PI : val);

    // Custom functions attached to evaluation context
    const scope = {
      sin: (x) => Math.sin(degToRad(x)),
      cos: (x) => Math.cos(degToRad(x)),
      tan: (x) => Math.tan(degToRad(x)),
      asin: (x) => radToDeg(Math.asin(x)),
      acos: (x) => radToDeg(Math.acos(x)),
      atan: (x) => radToDeg(Math.atan(x)),
      log: (x) => Math.log10(x),
      ln: (x) => Math.log(x),
      sqrt: (x) => Math.sqrt(x),
      cbrt: (x) => Math.cbrt(x),
      pow: (x, y) => Math.pow(x, y),
      abs: (x) => Math.abs(x)
    };

    // Replace function calls for scope execution
    exp = exp.replace(/\bsin\(/g, 'scope.sin(')
             .replace(/\bcos\(/g, 'scope.cos(')
             .replace(/\btan\(/g, 'scope.tan(')
             .replace(/\basin\(/g, 'scope.asin(')
             .replace(/\bacos\(/g, 'scope.acos(')
             .replace(/\batan\(/g, 'scope.atan(')
             .replace(/\blog\(/g, 'scope.log(')
             .replace(/\bln\(/g, 'scope.ln(');

    // Safely evaluate math expression using Function constructor with isolated scope
    const evalFunc = new Function('scope', 'Math', `return (${exp});`);
    return evalFunc(scope, Math);
  }

  factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) {
      res *= i;
    }
    return res;
  }

  formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return 'Error';
    
    // Clean up JS floating point quirks like 0.1 + 0.2 = 0.30000000000000004
    const precisionFixed = parseFloat(num.toFixed(10));
    
    if (Math.abs(precisionFixed) >= 1e12 || (Math.abs(precisionFixed) < 1e-7 && precisionFixed !== 0)) {
      return precisionFixed.toExponential(6);
    }
    
    // Format string nicely
    const parts = precisionFixed.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
}

window.calcEngine = new CalculatorEngine();
