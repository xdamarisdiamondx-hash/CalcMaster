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
  const tabUnit            = document.getElementById('tabUnit');
  const viewCalc           = document.getElementById('viewCalc');
  const viewCurrency       = document.getElementById('viewCurrency');
  const viewUnit           = document.getElementById('viewUnit');

  const unitCategoryBar    = document.getElementById('unitCategoryBar');
  const unitFromSelect     = document.getElementById('unitFromSelect');
  const unitToSelect       = document.getElementById('unitToSelect');
  const unitFromInput      = document.getElementById('unitFromInput');
  const unitToOutput       = document.getElementById('unitToOutput');
  const unitSwapBtn        = document.getElementById('unitSwapBtn');
  const unitFormulaDisplay = document.getElementById('unitFormulaDisplay');
  const unitQuickMatrixGrid = document.getElementById('unitQuickMatrixGrid');

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
  const bookmarkCurrentBtn   = document.getElementById('bookmarkCurrentBtn');
  const bookmarkStarIcon     = document.getElementById('bookmarkStarIcon');
  const bookmarksSection     = document.getElementById('bookmarksSection');
  const bookmarksGrid        = document.getElementById('bookmarksGrid');

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
  // ICON HELPERS — build <svg> markup from the #i-* sprite
  // -------------------------------------------------------
  function iconSvg(name, opts = {}) {
    const cls   = opts.cls   || 'icon';
    const fill  = opts.fill  || 'none';
    const title = opts.title ? ` role="img" aria-label="${opts.title}"` : ' aria-hidden="true"';
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${title}><use href="#${name}"></use></svg>`;
  }

  function starSvg(filled, cls = 'icon') {
    return iconSvg('i-star', { cls, fill: filled ? 'currentColor' : 'none' });
  }

  function flagHtml(c) {
    if (!c) return '<span class="flag-icon"></span>';
    if (c.isEspees || !c.flag) {
      return `<span class="flag-icon flag-icon--svg">${iconSvg('i-coins')}</span>`;
    }
    return `<span class="flag-icon">${c.flag}</span>`;
  }

  const caretHtml = () => iconSvg('i-chevron-down', { cls: 'icon icon-sm selector-caret' });

  // -------------------------------------------------------
  // VIEW SWITCHER — single source of truth
  // -------------------------------------------------------
  function showView(viewName) {
    // viewName: 'calc' | 'currency' | 'unit'
    tabCalc.classList.toggle('active', viewName === 'calc');
    tabCalc.setAttribute('aria-selected', viewName === 'calc');

    tabCurrency.classList.toggle('active', viewName === 'currency');
    tabCurrency.setAttribute('aria-selected', viewName === 'currency');

    tabUnit.classList.toggle('active', viewName === 'unit');
    tabUnit.setAttribute('aria-selected', viewName === 'unit');

    viewCalc.classList.toggle('active', viewName === 'calc');
    viewCurrency.classList.toggle('active', viewName === 'currency');
    viewUnit.classList.toggle('active', viewName === 'unit');

    if (viewName === 'currency') {
      if (!currencyInitialized) {
        currencyInitialized = true;
        window.currencyEngine.fetchLiveRates().then(() => renderCurrencyView());
      }
      renderCurrencyView();
    } else if (viewName === 'unit') {
      renderUnitView();
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

  tabUnit.addEventListener('click', (e) => {
    e.stopPropagation();
    window.soundManager.playClick('default');
    showView('unit');
  });

  // -------------------------------------------------------
  // THEME CONTROLLER (LIGHT / DARK MODE)
  // -------------------------------------------------------
  const themeToggleHeaderBtn   = document.getElementById('themeToggleHeaderBtn');
  const themeToggleSettingsBtn = document.getElementById('themeToggleSettingsBtn');
  const themeToggleSettingsIcon= document.getElementById('themeToggleSettingsIcon');
  const themeToggleSettingsText= document.getElementById('themeToggleSettingsText');

  let currentTheme = localStorage.getItem('calcmaster_theme') || 'dark';

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('calcmaster_theme', theme);

    if (theme === 'light') {
      if (themeToggleHeaderBtn) {
        themeToggleHeaderBtn.dataset.icon = 'moon';
        themeToggleHeaderBtn.title = 'Switch to Dark Mode';
      }
      if (themeToggleSettingsIcon) themeToggleSettingsIcon.dataset.icon = 'moon';
      if (themeToggleSettingsText) themeToggleSettingsText.textContent = 'Dark Mode';
    } else {
      if (themeToggleHeaderBtn) {
        themeToggleHeaderBtn.dataset.icon = 'sun';
        themeToggleHeaderBtn.title = 'Switch to Light Mode';
      }
      if (themeToggleSettingsIcon) themeToggleSettingsIcon.dataset.icon = 'sun';
      if (themeToggleSettingsText) themeToggleSettingsText.textContent = 'Light Mode';
    }
  }

  function toggleTheme() {
    window.soundManager.playClick('action');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    showToast(`Switched to ${newTheme.toUpperCase()} mode`);
  }

  if (themeToggleHeaderBtn) {
    themeToggleHeaderBtn.addEventListener('click', toggleTheme);
  }
  if (themeToggleSettingsBtn) {
    themeToggleSettingsBtn.addEventListener('click', toggleTheme);
  }

  // -------------------------------------------------------
  // APP INIT
  // -------------------------------------------------------
  function initApp() {
    // Apply persisted or default theme
    applyTheme(currentTheme);

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
    toggleSciBtn.dataset.icon = isVisible ? 'basic' : 'sci';
    const label = toggleSciBtn.querySelector('span');
    if (label) label.textContent = isVisible ? 'Basic Mode' : 'Scientific Mode';
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

    fromSelectorBtn.innerHTML = `<span>${flagHtml(fromInfo)} ${fromInfo.code}</span> ${caretHtml()}`;
    toSelectorBtn.innerHTML   = `<span>${flagHtml(toInfo)} ${toInfo.code}</span> ${caretHtml()}`;

    fromAmountInput.value = ce.fromAmount;
    toAmountOutput.value  = ce.formatCurrencyValue(ce.toAmount);

    rateStatusPill.innerHTML = ce.isLive
      ? `<span class="status-dot"></span> Live Rates · ${ce.rateSource || 'api'} (${ce.lastUpdated})`
      : `<span class="status-dot offline"></span> Cached (${ce.lastUpdated || 'Offline'})`;

    const directRate = ce.getDirectRate();
    exchangeRateDisplay.innerHTML =
      `1 <span class="rate-highlight">${ce.fromCurrency}</span> = ${ce.formatCurrencyValue(directRate)} <span class="rate-highlight">${ce.toCurrency}</span>`;

    // Bookmark star status
    const isBookmarked = ce.isBookmarked(ce.fromCurrency, ce.toCurrency);
    if (bookmarkStarIcon) bookmarkStarIcon.innerHTML = starSvg(isBookmarked);
    if (bookmarkCurrentBtn) bookmarkCurrentBtn.classList.toggle('active', isBookmarked);

    renderBookmarksGrid();
    renderQuickMatrix();
  }

  function renderBookmarksGrid() {
    const ce = window.currencyEngine;
    if (!bookmarksGrid) return;
    bookmarksGrid.innerHTML = '';

    if (ce.bookmarks.length === 0) {
      if (bookmarksSection) bookmarksSection.style.display = 'none';
      return;
    }

    if (bookmarksSection) bookmarksSection.style.display = 'block';

    ce.bookmarks.forEach(b => {
      const fromInfo = ce.currencies[b.from] || { flag: '', code: b.from };
      const toInfo   = ce.currencies[b.to]   || { flag: '', code: b.to };
      const rate     = ce.calculatePairRate(b.from, b.to);

      const card = document.createElement('div');
      card.className = 'bookmark-card';
      card.innerHTML = `
        <div class="bookmark-card-top">
          <span class="bookmark-pair-label">${flagHtml(fromInfo)} ${b.from} ${iconSvg('i-arrow-right', { cls: 'icon icon-sm pair-arrow' })} ${flagHtml(toInfo)} ${b.to}</span>
          <button class="bookmark-remove-btn" title="Remove Bookmark">${iconSvg('i-x')}</button>
        </div>
        <div class="bookmark-card-rate">1 ${b.from} = ${ce.formatCurrencyValue(rate)} ${b.to}</div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('bookmark-remove-btn')) {
          e.stopPropagation();
          ce.toggleBookmark(b.from, b.to);
          window.soundManager.playClick('action');
          showToast(`Removed ${b.from} ➔ ${b.to} from bookmarks`);
          renderCurrencyView();
          return;
        }

        window.soundManager.playClick('default');
        ce.setFromCurrency(b.from);
        ce.setToCurrency(b.to);
        renderCurrencyView();
        showToast(`Loaded ${b.from} ➔ ${b.to}`);
      });

      bookmarksGrid.appendChild(card);
    });
  }

  if (bookmarkCurrentBtn) {
    bookmarkCurrentBtn.addEventListener('click', () => {
      window.soundManager.playClick('action');
      const ce = window.currencyEngine;
      const added = ce.toggleBookmark(ce.fromCurrency, ce.toCurrency);
      showToast(added ? `Bookmarked ${ce.fromCurrency} ➔ ${ce.toCurrency}` : `Removed ${ce.fromCurrency} ➔ ${ce.toCurrency} from bookmarks`);
      renderCurrencyView();
    });
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

    if (result.error === 'invalid-key') {
      showToast(`API key rejected — check CURRENCY_API_KEY in .env`);
    } else if (result.success) {
      showToast(`Exchange rates updated via ${result.source}!`);
    } else {
      showToast('Using cached offline rates');
    }
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
    const ce  = window.currencyEngine;
    const all = ce.currencies;
    currencyListContainer.innerHTML = '';

    // Sort codes so favorites come first
    const sortedCodes = Object.keys(all).sort((a, b) => {
      const isFavA = ce.isFavorite(a) ? 1 : 0;
      const isFavB = ce.isFavorite(b) ? 1 : 0;
      return isFavB - isFavA;
    });

    sortedCodes.forEach(code => {
      const c = all[code];
      if (!c.code.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return;

      const isFav = ce.isFavorite(code);
      const item = document.createElement('div');
      item.className = 'currency-option-item';
      item.innerHTML = `
        <div class="currency-info">
          ${flagHtml(c)}
          <div>
            <div class="currency-code-text">${c.code}${isFav ? `<span class="fav-badge">${starSvg(true)}<span>Fav</span></span>` : ''}</div>
            <div class="currency-name-text">${c.name}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          ${c.isEspees ? iconSvg('i-coins', { cls: 'icon icon-sm' }) : `<span style="color:var(--text-secondary)">${c.symbol}</span>`}
          <button class="fav-currency-btn${isFav ? ' is-fav' : ''}" title="Toggle Favorite" style="background:transparent; border:none; cursor:pointer; padding:4px;">${starSvg(isFav)}</button>
        </div>`;

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('fav-currency-btn')) {
          e.stopPropagation();
          const favNow = ce.toggleFavorite(c.code);
          window.soundManager.playClick('action');
          showToast(favNow ? `Added ${c.code} to favorites` : `Removed ${c.code} from favorites`);
          renderCurrencyList(query);
          return;
        }

        window.soundManager.playClick('default');
        if (activePickingTarget === 'from') ce.setFromCurrency(c.code);
        else                                ce.setToCurrency(c.code);
        currencyPickerModal.classList.remove('active');
        renderCurrencyView();
      });
      currencyListContainer.appendChild(item);
    });
  }

  // -------------------------------------------------------
  // UNIT CONVERTER RENDERER & CONTROLLER
  // -------------------------------------------------------
  function renderUnitView() {
    const ue = window.unitEngine;
    const catKeys = Object.keys(ue.categories);

    // Render category pills
    unitCategoryBar.innerHTML = '';
    catKeys.forEach(catKey => {
      const cat = ue.categories[catKey];
      const pill = document.createElement('button');
      pill.className = `unit-cat-pill ${catKey === ue.currentCategory ? 'active' : ''}`;
      pill.innerHTML = `${iconSvg(cat.icon)} <span>${cat.name}</span>`;
      pill.addEventListener('click', () => {
        window.soundManager.playClick('default');
        ue.setCategory(catKey);
        renderUnitView();
      });
      unitCategoryBar.appendChild(pill);
    });

    // Render select dropdown options
    const currentUnits = ue.categories[ue.currentCategory].units;
    const unitKeys = Object.keys(currentUnits);

    unitFromSelect.innerHTML = '';
    unitToSelect.innerHTML = '';

    unitKeys.forEach(uKey => {
      const u = currentUnits[uKey];
      const optFrom = document.createElement('option');
      optFrom.value = uKey;
      optFrom.textContent = u.name;
      if (uKey === ue.fromUnit) optFrom.selected = true;
      unitFromSelect.appendChild(optFrom);

      const optTo = document.createElement('option');
      optTo.value = uKey;
      optTo.textContent = u.name;
      if (uKey === ue.toUnit) optTo.selected = true;
      unitToSelect.appendChild(optTo);
    });

    unitFromInput.value = ue.fromAmount;
    unitToOutput.value = ue.formatValue(ue.toAmount);

    unitFormulaDisplay.innerHTML = `<span class="rate-highlight">${ue.getDirectFormula()}</span>`;

    // Render unit quick matrix grid
    const matrixData = ue.getQuickMatrix();
    unitQuickMatrixGrid.innerHTML = '';
    matrixData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'matrix-card';
      card.innerHTML = `<span class="matrix-from">${item.fromStr}</span><span class="matrix-to">${item.toStr}</span>`;
      unitQuickMatrixGrid.appendChild(card);
    });
  }

  unitFromSelect.addEventListener('change', (e) => {
    window.unitEngine.setFromUnit(e.target.value);
    renderUnitView();
  });

  unitToSelect.addEventListener('change', (e) => {
    window.unitEngine.setToUnit(e.target.value);
    renderUnitView();
  });

  unitFromInput.addEventListener('input', (e) => {
    window.unitEngine.setFromAmount(e.target.value);
    renderUnitView();
  });

  unitSwapBtn.addEventListener('click', () => {
    window.soundManager.playClick('action');
    window.unitEngine.swapUnits();
    renderUnitView();
  });

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
