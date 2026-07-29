/* CalcMaster - History Engine
   Calculation & Currency Conversion Log Persistence
*/

class HistoryManager {
  constructor() {
    this.maxEntries = 50;
    this.entries = [];
    this.loadHistory();
  }

  loadHistory() {
    try {
      const stored = localStorage.getItem('calcmaster_history');
      if (stored) {
        this.entries = JSON.parse(stored);
      }
    } catch (e) {
      this.entries = [];
    }
  }

  saveHistory() {
    try {
      localStorage.setItem('calcmaster_history', JSON.stringify(this.entries));
    } catch (e) {}
  }

  addEntry(entry) {
    // entry: { type: 'calculator'|'currency', expression, result, timestamp }
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
    this.saveHistory();
  }

  clearHistory() {
    this.entries = [];
    this.saveHistory();
  }

  getEntries() {
    return this.entries;
  }
}

window.historyManager = new HistoryManager();
