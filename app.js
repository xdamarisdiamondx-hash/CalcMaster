/* CalcMaster - Application Controller
   Navigation, Walkthrough Onboarding, Settings, Modals, Keyboard Shortcuts & Event Handlers
*/

document.addEventListener('DOMContentLoaded', () => {

  // -------------------------------------------------------
  // DOM REFERENCES
  // -------------------------------------------------------
  const appContainer       = document.getElementById('appContainer');

  const tabCalc            = document.getElementById('tabCalc');
  const tabCurrency        = document.getElementById('tabCurrency');
  const viewCalc           = document.getElementById('viewCalc');
  const viewCurrency       = document.getElementById('viewCurrency');

  const angleUnitBadge     = document.getElementById('angleUnitBadge');
  const calcExpression     = document.getElementById('calcExpression');
  const calcResult         = document.getElementById('calcResult');
  const toggleSciBtn       = document.getElementById('toggleSciBtn');
  const sciKeypad          = document.getElementById('sciKeypad');

  const historyHeaderBtn   = document.getElementById('historyHeaderBtn');
  const helpHeaderBtn      = document.getElementById('helpHeaderBtn');
  const settingsHeaderBtn  = document.getElementById('settingsHeaderBtn');

  const fromSelectorBtn    = document.getElementById('fromSelectorBtn');
  const toSelectorBtn      = document.getElementById('toSelectorBtn');
  const fromAmountInput    = document.getElementById('fromAmountInput');
  const toAmountOutput     = document.getElementById('toAmountOutput');
  const swapBtn            = document.getElementById('swapBtn');
  const rateStatusPill     = document.getElementById('rateStatusPill');
  const refreshRatesBtn    = document.getElementById('refreshRatesBtn');
  const exchangeRateDisplay = document.getElementById('exchangeRateDisplay');
  const quickMatrixGrid    = document.getElementById('quickMatrixGrid');

  const currencyPickerModal   = document.getElementById('currencyPickerModal');
  const currencySearchBox     = document.getElementById('currencySearchBox');
  const currencyListContainer = document.getElementById('currencyListContainer');
  const closeCurrencyModalBtn = document.getElementById('closeCurrencyModalBtn');

  const historyModal          = document.getElementById('historyModal');
  const historyListContainer  = document.getElementById('historyListContainer');
  const clearHistoryBtn       = document.getElementById('clearHistoryBtn');
  const closeHistoryModalBtn  = document.getElementById('closeHistoryModalBtn');

  const settingsModal         = document.getElementById('settingsModal');
  const soundToggleInput      = document.getElementById('soundToggleInput');
  const espeesRateInput       = document.getElementById('espeesRateInput');
  const saveEspeesRateBtn     = document.getElementById('saveEspeesRateBtn');
  const replayWalkthroughBtn  = document.getElementById('replayWalkthroughBtn');
  const resetAppBtn           = document.getElementById('resetAppBtn');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');

  const walkthroughModal  = document.getElementById('walkthroughModal');
  const walkthroughSkipBtn = document.getElementById('walkthroughSkipBtn');
  const walkthroughNextBtn = document.getElementById('walkthroughNextBtn');
  const dotsContainer     = document.getElementById('dotsContainer');
  const walkthroughCards  = document.querySelectorAll('.walkthrough-card');

  let activePickingTarget      = 'from';
  let currentWalkthroughIndex  = 0;
  const totalWalkthroughCards  = walkthroughCards.length;
  let currencyInitialized      = false;

  // -------------------------------------------------------
  // VIEW SWITCHER — single source of truth
  // -------------------------------------------------------
  function showView(viewName) {
    // viewName: 'calc' | 'currency'
    const isCalc = (viewName === 'calc');

    // Tab active states
    tabCalc.classList.toggle('active', isCalc);
    tabCalc.setAttribute('aria-selected', isCalc);
    tabCurrency.classList.toggle('active', !isCalc);
    tabCurrency.setAttribute('aria-selected', !isCalc);

    // View visibility
    viewCalc.classList.toggle('active', isCalc);
    viewCurrency.classList.toggle('active', !isCalc);

    if (!isCalc) {
      // Lazy-init currency on first switch, then re-render on every switch
      if (!currencyInitialized) {
        currencyInitialized = true;
        window.currencyEngine.fetchLiveRates().then(() => renderCurrencyView());
      }
      renderCurrencyView();
    }
  }

  // Tab click listeners
  tabCalc.addEventListener('click', (e) => {
    e.stopPropagation();
    window.soundManager.playClick('default');
    showView('calc');
  });

  tabCurrency.addEventListener('click', (e) => {
    e.stopPropagation();
    window.soundManager.playClick('default');
    showView('currency');
  });

  // -------------------------------------------------------
  // APP INIT
  // -------------------------------------------------------
  function initApp() {
    // Ensure calc is the default visible view
    showView('calc');

    // Walkthrough check
    const hasSeenWalkthrough = localStorage.getItem('calcmaster_walkthrough_completed');
    if (!hasSeenWalkthrough) showWalkthrough();

    // Wire calculator engine callback
    window.calcEngine.setUpdateCallback(renderCalculator);
    window.calcEngine.notifyUpdate();
  }

  // -------------------------------------------------------
  // WALKTHROUGH CONTROLLER
  // -------------------------------------------------------
  function showWalkthrough() {
    currentWalkthroughIndex = 0;
    updateWalkthroughCard();
    walkthroughModal.classList.add('active');
  }

  function hideWalkthrough(markCompleted = true) {
    walkthroughModal.classList.remove('active');
    if (markCompleted) localStorage.setItem('calcmaster_walkthrough_completed', 'true');
  }

  function updateWalkthroughCard() {
    walkthroughCards.forEach((card, idx) => {
      card.classList.toggle('active', idx === currentWalkthroughIndex);
    });

    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalWalkthroughCards; i++) {
      const dot = document.createElement('div');
      dot.className = `dot ${i === currentWalkthroughIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => { currentWalkthroughIndex = i; updateWalkthroughCard(); });
      dotsContainer.appendChild(dot);
    }

    walkthroughNextBtn.textContent =
      currentWalkthroughIndex === totalWalkthroughCards - 1 ? 'Get Started!' : 'Next';
  }

  walkthroughNextBtn.addEventListener('click', () => {
    window.soundManager.playClick('default');
    if (currentWalkthroughIndex < totalWalkthroughCards - 1) {
      currentWalkthroughIndex++;
      updateWalkthroughCard();
    } else {
      hideWalkthrough(true);
    }
  });

  walkthroughSkipBtn.addEventListener('click', () => {
    window.soundManager.playClick('action');
    hideWalkthrough(true);
  });

  // -------------------------------------------------------
  // CALCULATOR RENDERER
  // -------------------------------------------------------
  function renderCalculator(state) {
    calcExpression.textContent = state.expression;
    calcResult.textContent     = state.result;
    angleUnitBadge.textContent = state.isDegMode ? 'DEG' : 'RAD';

    calcResult.classList.toggle('preview', !state.isEvaluated && state.expression !== '');

    const len = state.result.length;
    calcResult.style.fontSize = len > 12 ? '1.75rem' : len > 8 ? '2.1rem' : '2.5rem';
  }

  angleUnitBadge.addEventListener('click', () => {
    window.soundManager.playClick('action');
    window.calcEngine.toggleAngleUnit();
  });

  toggleSciBtn.addEventListener('click', () => {
    window.soundManager.playClick('action');
    const isVisible = sciKeypad.classList.toggle('visible');
    toggleSciBtn.classList.toggle('active', isVisible);
    const span = toggleSciBtn.querySelector('span');
    if (span) span.textContent = isVisible ? '🔢 Basic Mode' : '🔬 Scientific Mode';
  });

  // -------------------------------------------------------
  // KEYPAD EVENT DELEGATION (calc buttons only)
  // -------------------------------------------------------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.calc-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    const value  = btn.dataset.val;

    switch (action) {
      case 'digit':    window.soundManager.playClick('default');  window.calcEngine.appendDigit(value);       break;
      case 'op':       window.soundManager.playClick('operator'); window.calcEngine.appendOperator(value);    break;
      case 'equals':   window.soundManager.playClick('equals');   window.calcEngine.executeEquals();          break;
      case 'clear':    window.soundManager.playClick('action');   window.calcEngine.clearAll();               break;
      case 'backspace':window.soundManager.playClick('action');   window.calcEngine.backspace();              break;
      case 'func':     window.soundManager.playClick('operator'); window.calcEngine.appendFunction(value);   break;
      case 'const':    window.soundManager.playClick('default');  window.calcEngine.appendConstant(value);   break;
      case 'paren':    window.soundManager.playClick('default');  window.calcEngine.appendParenthesis(value);break;
      case 'power':    window.soundManager.playClick('operator'); window.calcEngine.appendSquareOrCube(value);break;
      case 'factorial':window.soundManager.playClick('operator'); window.calcEngine.appendFactorial();       break;
      case 'negate':   window.soundManager.playClick('action');   window.calcEngine.toggleSign();            break;
    }
  });

  // -------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // -------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
      window.soundManager.playClick('default'); window.calcEngine.appendDigit(e.key);
    } else if (['+', '-'].includes(e.key)) {
      window.soundManager.playClick('operator'); window.calcEngine.appendOperator(e.key);
    } else if (e.key === '*') {
      window.soundManager.playClick('operator'); window.calcEngine.appendOperator('×');
    } else if (e.key === '/') {
      e.preventDefault(); window.soundManager.playClick('operator'); window.calcEngine.appendOperator('÷');
    } else if (e.key === '%') {
      window.soundManager.playClick('operator'); window.calcEngine.appendOperator('%');
    } else if (e.key === '^') {
      window.soundManager.playClick('operator'); window.calcEngine.appendOperator('^');
    } else if (e.key === '(' || e.key === ')') {
      window.soundManager.playClick('default'); window.calcEngine.appendParenthesis(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault(); window.soundManager.playClick('equals'); window.calcEngine.executeEquals();
    } else if (e.key === 'Backspace') {
      window.soundManager.playClick('action'); window.calcEngine.backspace();
    } else if (e.key === 'Escape') {
      window.soundManager.playClick('action'); window.calcEngine.clearAll();
    }
  });

  // -------------------------------------------------------
  // CURRENCY CONVERTER RENDERER
  // -------------------------------------------------------
  function renderCurrencyView() {
    const ce = window.currencyEngine;

    const fromInfo = ce.currencies[ce.fromCurrency] || { flag: '', code: ce.fromCurrency };
    const toInfo   = ce.currencies[ce.toCurrency]   || { flag: '', code: ce.toCurrency };

    fromSelectorBtn.innerHTML = `<span>${fromInfo.flag} ${fromInfo.code}</span> <span style="font-size:0.75rem">▼</span>`;
    toSelectorBtn.innerHTML   = `<span>${toInfo.flag}   ${toInfo.code}</span> <span style="font-size:0.75rem">▼</span>`;

    fromAmountInput.value = ce.fromAmount;
    toAmountOutput.value  = ce.formatCurrencyValue(ce.toAmount);

    rateStatusPill.innerHTML = ce.isLive
      ? `<span class="status-dot"></span> Live Rates (${ce.lastUpdated})`
      : `<span class="status-dot offline"></span> Cached (${ce.lastUpdated || 'Offline'})`;

    const directRate = ce.getDirectRate();
    exchangeRateDisplay.innerHTML =
      `1 <span class="rate-highlight">${ce.fromCurrency}</span> = ${ce.formatCurrencyValue(directRate)} <span class="rate-highlight">${ce.toCurrency}</span>`;

    renderQuickMatrix();
  }

  function renderQuickMatrix() {
    const data = window.currencyEngine.getQuickMatrix();
    quickMatrixGrid.innerHTML = '';
    data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'matrix-card';
      card.innerHTML = `<span class="matrix-from">${item.fromStr}</span><span class="matrix-to">${item.toStr}</span>`;
      quickMatrixGrid.appendChild(card);
    });
  }

  fromAmountInput.addEventListener('input', (e) => {
    window.currencyEngine.setFromAmount(e.target.value);
    renderCurrencyView();
  });

  swapBtn.addEventListener('click', () => {
    window.soundManager.playClick('action');
    window.currencyEngine.swapCurrencies();
    renderCurrencyView();
  });

  refreshRatesBtn.addEventListener('click', async () => {
    window.soundManager.playClick('action');
    showToast('Fetching latest exchange rates...');
    const result = await window.currencyEngine.fetchLiveRates();
    renderCurrencyView();
    showToast(result.success ? 'Exchange rates updated!' : 'Using cached offline rates');
  });

  // -------------------------------------------------------
  // CURRENCY PICKER MODAL
  // -------------------------------------------------------
  fromSelectorBtn.addEventListener('click', (e) => { e.stopPropagation(); activePickingTarget = 'from'; openCurrencyModal(); });
  toSelectorBtn.addEventListener('click',   (e) => { e.stopPropagation(); activePickingTarget = 'to';   openCurrencyModal(); });

  function openCurrencyModal() {
    window.soundManager.playClick('default');
    currencySearchBox.value = '';
    renderCurrencyList('');
    currencyPickerModal.classList.add('active');
  }

  closeCurrencyModalBtn.addEventListener('click', () => currencyPickerModal.classList.remove('active'));

  currencySearchBox.addEventListener('input', (e) => renderCurrencyList(e.target.value));

  function renderCurrencyList(query) {
    const q   = query.toLowerCase().trim();
    const all = window.currencyEngine.currencies;
    currencyListContainer.innerHTML = '';

    Object.keys(all).forEach(code => {
      const c = all[code];
      if (!c.code.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return;

      const item = document.createElement('div');
      item.className = 'currency-option-item';
      item.innerHTML = `
        <div class="currency-info">
          <span class="flag-icon">${c.flag}</span>
          <div>
            <div class="currency-code-text">${c.code}${c.isEspees ? ' 🌟' : ''}</div>
            <div class="currency-name-text">${c.name}</div>
          </div>
        </div>
        <span style="color:var(--text-secondary)">${c.symbol}</span>`;

      item.addEventListener('click', () => {
        window.soundManager.playClick('default');
        if (activePickingTarget === 'from') window.currencyEngine.setFromCurrency(c.code);
        else                                window.currencyEngine.setToCurrency(c.code);
        currencyPickerModal.classList.remove('active');
        renderCurrencyView();
      });
      currencyListContainer.appendChild(item);
    });
  }

  // -------------------------------------------------------
  // HISTORY MODAL
  // -------------------------------------------------------
  historyHeaderBtn.addEventListener('click', () => {
    window.soundManager.playClick('default');
    renderHistoryModal();
    historyModal.classList.add('active');
  });

  closeHistoryModalBtn.addEventListener('click', () => historyModal.classList.remove('active'));

  clearHistoryBtn.addEventListener('click', () => {
    window.soundManager.playClick('action');
    window.historyManager.clearHistory();
    renderHistoryModal();
    showToast('History cleared');
  });

  function renderHistoryModal() {
    const entries = window.historyManager.getEntries();
    historyListContainer.innerHTML = '';

    if (entries.length === 0) {
      historyListContainer.innerHTML = `<div class="empty-state">No past calculations yet.</div>`;
      return;
    }

    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-time">${entry.timestamp} · ${entry.type === 'calculator' ? 'Calculator' : 'Converter'}</div>
        <div class="history-exp">${entry.expression}</div>
        <div class="history-res">= ${entry.result}</div>`;

      item.addEventListener('click', () => {
        window.soundManager.playClick('default');
        window.calcEngine.appendDigit(entry.result.replace(/,/g, ''));
        historyModal.classList.remove('active');
        showView('calc');
        showToast('Result loaded into calculator');
      });
      historyListContainer.appendChild(item);
    });
  }

  // -------------------------------------------------------
  // SETTINGS MODAL
  // -------------------------------------------------------
  settingsHeaderBtn.addEventListener('click', () => {
    window.soundManager.playClick('default');
    espeesRateInput.value = window.currencyEngine.ESPEES_NGN_RATE || 2050;
    settingsModal.classList.add('active');
  });

  helpHeaderBtn.addEventListener('click', () => {
    window.soundManager.playClick('default');
    showWalkthrough();
  });

  closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

  soundToggleInput.addEventListener('change', (e) => window.soundManager.setEnabled(e.target.checked));

  saveEspeesRateBtn.addEventListener('click', () => {
    window.soundManager.playClick('action');
    const parsed = parseFloat(espeesRateInput.value);
    if (!isNaN(parsed) && parsed > 0) {
      window.currencyEngine.ESPEES_NGN_RATE = parsed;
      window.currencyEngine._applyEspeesRate();
      window.currencyEngine.recalculate();
      showToast(`Espees rate: 1 ESP = ₦${parsed.toLocaleString()} NGN`);
      renderCurrencyView();
    } else {
      showToast('Invalid rate number');
    }
  });

  replayWalkthroughBtn.addEventListener('click', () => {
    window.soundManager.playClick('default');
    settingsModal.classList.remove('active');
    showWalkthrough();
  });

  resetAppBtn.addEventListener('click', () => {
    window.soundManager.playClick('action');
    if (confirm('Reset all app data, history, and walkthrough settings?')) {
      localStorage.clear();
      window.location.reload();
    }
  });

  // -------------------------------------------------------
  // TOAST UTILITY
  // -------------------------------------------------------
  function showToast(msg) {
    const toast = document.getElementById('toastContainer');
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 2500);
  }

  // -------------------------------------------------------
  // LAUNCH
  // -------------------------------------------------------
  initApp();
});
