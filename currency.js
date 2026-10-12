/* CalcMaster - Currency Converter Module
   ESPEES FIXED RATE: 1 ESP = 2,050 NGN — permanent, never overridden by API or cache.
*/

class CurrencyEngine {
  constructor() {
    // PERMANENT: 1 ESP = 2050 NGN always
    this.ESPEES_NGN_RATE = 2050;

    this.currencies = {
      USD: { code: 'USD', name: 'US Dollar',           symbol: '$',    flag: '🇺🇸' },
      EUR: { code: 'EUR', name: 'Euro',                 symbol: '€',    flag: '🇪🇺' },
      GBP: { code: 'GBP', name: 'British Pound',       symbol: '£',    flag: '🇬🇧' },
      NGN: { code: 'NGN', name: 'Nigerian Naira',       symbol: '₦',    flag: '🇳🇬' },
      ESP: { code: 'ESP', name: 'Espees (Digital)',     symbol: 'ESP',  flag: '', isEspees: true },
      CAD: { code: 'CAD', name: 'Canadian Dollar',     symbol: 'CA$',  flag: '🇨🇦' },
      AUD: { code: 'AUD', name: 'Australian Dollar',   symbol: 'A$',   flag: '🇦🇺' },
      JPY: { code: 'JPY', name: 'Japanese Yen',        symbol: '¥',    flag: '🇯🇵' },
      INR: { code: 'INR', name: 'Indian Rupee',        symbol: '₹',    flag: '🇮🇳' },
      CNY: { code: 'CNY', name: 'Chinese Yuan',        symbol: '¥',    flag: '🇨🇳' },
      BRL: { code: 'BRL', name: 'Brazilian Real',      symbol: 'R$',   flag: '🇧🇷' },
      ZAR: { code: 'ZAR', name: 'S. African Rand',     symbol: 'R',    flag: '🇿🇦' },
      CHF: { code: 'CHF', name: 'Swiss Franc',         symbol: 'CHF',  flag: '🇨🇭' },
      AED: { code: 'AED', name: 'UAE Dirham',          symbol: 'AED',  flag: '🇦🇪' },
      SAR: { code: 'SAR', name: 'Saudi Riyal',         symbol: 'SAR',  flag: '🇸🇦' },
      KES: { code: 'KES', name: 'Kenyan Shilling',     symbol: 'KSh',  flag: '🇰🇪' },
      GHS: { code: 'GHS', name: 'Ghanaian Cedi',       symbol: 'GH₵',  flag: '🇬🇭' }
    };

    // Base fallback rates relative to USD (ESP is excluded — always computed).
    // Offline snapshot from exchangerate-api — only used when every endpoint fails.
    this.fallbackRates = {
      USD: 1.0, EUR: 0.92, GBP: 0.78, NGN: 1330.0, CAD: 1.36,
      AUD: 1.52, JPY: 154.5, INR: 83.5, CNY: 7.24, BRL: 5.45,
      ZAR: 18.2, CHF: 0.90, AED: 3.67, SAR: 3.75, KES: 130.0, GHS: 15.2
    };

    this.rates = { ...this.fallbackRates };

    // Set defaults and apply ESP
    this.fromCurrency = 'ESP';
    this.toCurrency   = 'NGN';
    this.fromAmount   = 1;
    this.toAmount     = 0;

    this.isLive      = false;
    this.lastUpdated = null;
    this.rateSource  = null;        // which endpoint produced the current rates
    this.lastProviderError = null;  // e.g. 'invalid-key' — surfaced to the UI

    // Bookmarks (pairs) and Favorites (currencies)
    this.bookmarks = [];
    this.favorites = ['ESP', 'NGN', 'USD'];

    this.loadBookmarks();
    this.loadFavorites();

    // Load cached world rates (ESP is deliberately excluded from cache)
    this._loadCachedRates();

    // Always recompute ESP after all rates are loaded
    this._applyEspeesRate();

    // Set initial output
    this.recalculate();
  }

  /* ---------------------------------------------------
     BOOKMARKS & FAVORITES MANAGEMENT
  --------------------------------------------------- */
  loadBookmarks() {
    try {
      const saved = localStorage.getItem('calcmaster_currency_bookmarks');
      if (saved) {
        this.bookmarks = JSON.parse(saved);
      } else {
        // Default bookmarks
        this.bookmarks = [
          { from: 'ESP', to: 'NGN' },
          { from: 'USD', to: 'ESP' },
          { from: 'EUR', to: 'USD' }
        ];
        this.saveBookmarks();
      }
    } catch (e) {
      this.bookmarks = [{ from: 'ESP', to: 'NGN' }];
    }
  }

  saveBookmarks() {
    try {
      localStorage.setItem('calcmaster_currency_bookmarks', JSON.stringify(this.bookmarks));
    } catch (e) {}
  }

  isBookmarked(from, to) {
    return this.bookmarks.some(b => b.from === from && b.to === to);
  }

  toggleBookmark(from, to) {
    const idx = this.bookmarks.findIndex(b => b.from === from && b.to === to);
    if (idx >= 0) {
      this.bookmarks.splice(idx, 1);
      this.saveBookmarks();
      return false; // unbookmarked
    } else {
      this.bookmarks.push({ from, to });
      this.saveBookmarks();
      return true; // bookmarked
    }
  }

  loadFavorites() {
    try {
      const saved = localStorage.getItem('calcmaster_currency_favorites');
      if (saved) {
        this.favorites = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveFavorites() {
    try {
      localStorage.setItem('calcmaster_currency_favorites', JSON.stringify(this.favorites));
    } catch (e) {}
  }

  isFavorite(code) {
    return this.favorites.includes(code);
  }

  toggleFavorite(code) {
    const idx = this.favorites.indexOf(code);
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.push(code);
    }
    this.saveFavorites();
    return this.isFavorite(code);
  }

  calculatePairRate(from, to) {
    const fromRate = this.rates[from] || 1.0;
    const toRate   = this.rates[to]   || 1.0;
    return (1 / fromRate) * toRate;
  }

  /* ---------------------------------------------------
     ESPEES RATE — always derived from NGN. Never stored.
     Formula: 1 ESP (in USD) = NGN_USD_RATE / 2050
     This means: (1 ESP) * (NGN / USD) / 2050 = 1 NGN pair
  --------------------------------------------------- */
  _applyEspeesRate() {
    const ngnRate = this.rates.NGN || 2050.0;
    // 1 ESP costs the same as 2050 NGN in USD terms
    this.rates.ESP = ngnRate / this.ESPEES_NGN_RATE;
  }

  _loadCachedRates() {
    try {
      const cached = localStorage.getItem('calcmaster_rates_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.rates) {
          // Merge in world rates — but never allow ESP from cache
          const merged = { ...this.fallbackRates, ...parsed.rates };
          delete merged.ESP;
          this.rates = merged;
          this.lastUpdated = parsed.lastUpdated || null;
          this.isLive = parsed.isLive || false;
          this.rateSource = parsed.source || null;
        }
      }
    } catch (e) {
      console.warn('Cache load failed, using defaults');
    }
  }

  _saveRatesToCache() {
    try {
      const toSave = { ...this.rates };
      delete toSave.ESP; // never persist ESP in cache
      localStorage.setItem('calcmaster_rates_v2', JSON.stringify({
        rates: toSave,
        lastUpdated: this.lastUpdated,
        isLive: this.isLive,
        source: this.rateSource
      }));
    } catch (e) {}
  }

  /* ---------------------------------------------------
     PROVIDER CONFIG (config.js)
     The key lives in config.js so users never type one.
  --------------------------------------------------- */
  _providerConfig() {
    const cfg = (window.CALC_CONFIG && window.CALC_CONFIG.currency) || null;
    if (!cfg) return null;

    const key = String(cfg.apiKey || '').trim();
    // Empty, or an unedited placeholder -> provider disabled, use fallbacks
    if (!key || /(paste|your[_-]?api[_-]?key|xxxxxx|replace[_-]?me)/i.test(key)) return null;

    return Object.assign({}, cfg, { apiKey: key });
  }

  _buildProviderUrl(cfg, base = 'USD') {
    const template = cfg.endpoint || 'https://v6.exchangerate-api.com/v6/{key}/latest/{base}';
    return template
      .replace('{key}', encodeURIComponent(cfg.apiKey))
      .replace('{base}', encodeURIComponent(base));
  }

  async _fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 8000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /* Normalise any provider payload into USD-relative rates.
     Returns { rates, error } — rates is null when unusable. */
  _normaliseProviderRates(data) {
    if (!data) return { rates: null, error: 'empty-response' };

    // exchangerate-api v6 error body: { result: 'error', 'error-type': 'invalid-key' }
    if (data.result === 'error') {
      return { rates: null, error: data['error-type'] || 'provider-error' };
    }

    const raw = data.rates;
    if (!raw || typeof raw !== 'object') return { rates: null, error: 'bad-payload' };

    // Express everything per 1 USD regardless of the provider's base currency
    const perBaseUsd = raw.USD || 1;
    const usdRelative = { USD: 1.0 };
    Object.keys(raw).forEach(code => {
      usdRelative[code] = raw[code] / perBaseUsd;
    });

    return { rates: usdRelative, error: null };
  }

  /* Commit a fresh USD-relative rate set. Espees is stripped first and
     always recomputed from the fixed 2,050 NGN rate — never from an API. */
  _applyLiveRates(usdRates, source) {
    const next = Object.assign({}, usdRates);
    delete next.ESP;

    this.rates = next;
    this._applyEspeesRate();

    this.isLive = true;
    this.rateSource = source;
    this.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this._saveRatesToCache();
    this.recalculate();
  }

  /* Which provider error codes mean "the key is wrong" — as opposed to
     'no-key', which simply means no key is configured yet. */
  _isKeyError(err) {
    return typeof err === 'string' && err !== 'no-key' &&
           /(key|account|quota|forbidden|denied|expired)/i.test(err);
  }

  async fetchLiveRates() {
    this.lastProviderError = null;
    const cfg = this._providerConfig();

    // -------------------------------------------------------
    // 1) Local proxy (/api/rates) — server.ps1 reads the key
    //    from .env, so it never reaches the browser. This is
    //    also the ONLY way to use an exchangerate-api key:
    //    their v6 endpoint sends no CORS headers, so a direct
    //    browser call always fails.
    // -------------------------------------------------------
    try {
      const body = await this._fetchJson('/api/rates', 15000);
      if (body && body.ok && body.payload) {
        const norm = this._normaliseProviderRates(body.payload);
        if (norm.rates) {
          this._applyLiveRates(norm.rates, body.source || 'exchangerate-api.com');
          return { success: true, isLive: true, source: this.rateSource };
        }
        if (this._isKeyError(norm.error)) this.lastProviderError = 'invalid-key';
      } else if (body && this._isKeyError(body.error)) {
        // The proxy answered, but the key in .env was rejected
        console.warn('[CalcMaster] .env API key rejected by the provider:', body.error);
        this.lastProviderError = 'invalid-key';
      }
    } catch (err) {
      // No proxy available (file:// or a plain static host) — continue
    }

    // -------------------------------------------------------
    // 2) Key from config.js, called directly (only works on
    //    hosts that return CORS headers)
    // -------------------------------------------------------
    if (cfg) {
      try {
        const data = await this._fetchJson(this._buildProviderUrl(cfg), cfg.timeoutMs);
        const norm = this._normaliseProviderRates(data);

        if (norm.rates) {
          this._applyLiveRates(norm.rates, cfg.provider);
          return { success: true, isLive: true, source: cfg.provider, error: this.lastProviderError };
        }

        if (this._isKeyError(norm.error)) {
          console.warn('[CalcMaster] Currency API key rejected:', norm.error);
          this.lastProviderError = 'invalid-key';
        } else {
          console.warn('[CalcMaster] Currency API unusable payload:', norm.error);
        }
      } catch (err) {
        console.warn('[CalcMaster] Currency API unreachable:', err && err.message);
      }
    }

    // -------------------------------------------------------
    // 3) Keyless exchangerate-api endpoint — no key required,
    //    CORS-enabled, and always current
    // -------------------------------------------------------
    try {
      const data = await this._fetchJson('https://api.exchangerate-api.com/v4/latest/USD', 8000);
      const norm = this._normaliseProviderRates(data);
      if (norm.rates) {
        this._applyLiveRates(norm.rates, 'exchangerate-api.com keyless');
        return { success: true, isLive: true, source: this.rateSource, error: this.lastProviderError };
      }
    } catch (err) {
      // next endpoint
    }

    // -------------------------------------------------------
    // 4) Secondary keyless endpoint
    // -------------------------------------------------------
    try {
      const data = await this._fetchJson('https://api.frankfurter.app/latest?from=USD', 8000);
      if (data && data.rates) {
        this._applyLiveRates({ USD: 1.0, ...data.rates }, 'frankfurter.app');
        return { success: true, isLive: true, source: this.rateSource, error: this.lastProviderError };
      }
    } catch (err) {
      // next endpoint
    }

    // -------------------------------------------------------
    // 5) Everything failed — keep whatever is cached on device
    // -------------------------------------------------------
    this.isLive = false;
    if (!this.lastUpdated) this.lastUpdated = 'Offline';
    return {
      success: false,
      isLive: false,
      source: this.rateSource || 'cache',
      error: this.lastProviderError
    };
  }

  setFromCurrency(code) {
    if (this.currencies[code]) { this.fromCurrency = code; this.recalculate(); }
  }

  setToCurrency(code) {
    if (this.currencies[code]) { this.toCurrency = code; this.recalculate(); }
  }

  swapCurrencies() {
    const tmp = this.fromCurrency;
    this.fromCurrency = this.toCurrency;
    this.toCurrency = tmp;
    this.recalculate();
  }

  setFromAmount(amount) {
    this.fromAmount = parseFloat(amount) || 0;
    this.recalculate();
  }

  recalculate() {
    const fromRate = this.rates[this.fromCurrency] || 1.0;
    const toRate   = this.rates[this.toCurrency]   || 1.0;
    this.toAmount  = (this.fromAmount / fromRate) * toRate;
  }

  getDirectRate() {
    const fromRate = this.rates[this.fromCurrency] || 1.0;
    const toRate   = this.rates[this.toCurrency]   || 1.0;
    return (1 / fromRate) * toRate;
  }

  getQuickMatrix() {
    const amounts = [1, 5, 10, 50, 100, 500, 1000];
    const unitRate = this.getDirectRate();
    return amounts.map(val => ({
      fromStr: `${val} ${this.fromCurrency}`,
      toStr: `${(val * unitRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${this.toCurrency}`
    }));
  }

  formatCurrencyValue(val) {
    if (isNaN(val)) return '0.00';
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
}

window.currencyEngine = new CurrencyEngine();
