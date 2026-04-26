export const Router = {
  screens: ['upload', 'modules', 'level', 'loading', 'quiz', 'results', 'analytics', 'history'],
  current: 'upload',
  historyStack: ['upload'] as string[],
  historyIndex: 0,
  _navigating: false, // prevent recursive history pushes

  navigate(screen: string, data = {}) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const nxt = document.getElementById(`screen-${screen}`);
    if (nxt) nxt.classList.add('active');
    this.current = screen;

    // Push to history stack (unless we're doing a back/forward)
    if (!this._navigating) {
      // Trim any forward history
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
      this.historyStack.push(screen);
      this.historyIndex = this.historyStack.length - 1;
    }

    this.updateNavButtons();
    window.dispatchEvent(new CustomEvent('route', { detail: { screen, data } }));
  },

  back() {
    if (this.historyIndex <= 0) return;

    const currentScreen = this.historyStack[this.historyIndex];
    
    if (currentScreen === 'results' || currentScreen === 'analytics') {
      // Find the most recent non-quiz/loading/results/analytics screen in history
      let targetIdx = this.historyIndex - 1;
      while (targetIdx > 0 && ['quiz', 'loading', 'results', 'analytics'].includes(this.historyStack[targetIdx])) {
        targetIdx--;
      }
      this._navigating = true;
      this.historyIndex = targetIdx;
      this.navigate(this.historyStack[targetIdx]);
      this._navigating = false;
      return;
    }

    this.historyIndex--;
    this._navigating = true;
    this.navigate(this.historyStack[this.historyIndex]);
    this._navigating = false;
  },

  forward() {
    if (this.historyIndex >= this.historyStack.length - 1) return;
    this.historyIndex++;
    this._navigating = true;
    this.navigate(this.historyStack[this.historyIndex]);
    this._navigating = false;
  },

  updateNavButtons() {
    const backBtn = document.getElementById('nav-back') as HTMLButtonElement;
    const fwdBtn = document.getElementById('nav-forward') as HTMLButtonElement;
    if (backBtn) backBtn.disabled = this.historyIndex <= 0;
    if (fwdBtn) fwdBtn.disabled = this.historyIndex >= this.historyStack.length - 1;
  }
};

import { UploadComponent } from './components/upload';
import { ModuleSelectComponent } from './components/module-select';
import { LevelSelectComponent } from './components/level-select';
import { QuizComponent } from './components/quiz';
import { ResultsComponent } from './components/results';
import { AnalyticsComponent } from './components/analytics';
import { HistoryComponent } from './components/history';

document.addEventListener('DOMContentLoaded', () => {
  // Expose router to window for easy inline access
  (window as any).Router = Router;

  // Initialize router
  Router.navigate('upload');

  const uploadComponent = new UploadComponent();
  uploadComponent.init();

  const moduleSelectComponent = new ModuleSelectComponent();
  moduleSelectComponent.init();

  const levelSelectComponent = new LevelSelectComponent();
  levelSelectComponent.init();

  const quizComponent = new QuizComponent();
  quizComponent.init();

  const resultsComponent = new ResultsComponent();
  resultsComponent.init();

  const analyticsComponent = new AnalyticsComponent();
  analyticsComponent.init();

  const historyComponent = new HistoryComponent();
  historyComponent.init();

  // Render recent history on home screen
  function renderHomeHistory() {
    const history = JSON.parse(localStorage.getItem('qf_history') || '[]');
    const container = document.getElementById('home-history');
    const list = document.getElementById('home-history-list');
    if (!container || !list) return;

    if (history.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    list.innerHTML = '';
    const recent = history.slice(-3).reverse();
    recent.forEach((attempt: any) => {
      const perc = attempt.score.total > 0 ? Math.round((attempt.score.correct / attempt.score.total) * 100) : 0;
      const dur = Math.floor(attempt.duration / 60) + 'm ' + (attempt.duration % 60) + 's';
      const card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '1rem 1.5rem';
      card.style.cursor = 'pointer';
      const color = perc >= 80 ? 'var(--accent-primary)' : perc >= 60 ? 'var(--accent-warm)' : 'var(--accent-danger)';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="mono" style="font-size:1.25rem; color:${color}; font-weight:700;">${perc}%</span>
            <span class="text-muted" style="margin-left:0.75rem;">${attempt.level?.toUpperCase() || ''} · ${attempt.score.correct}/${attempt.score.total} · ${dur}</span>
          </div>
          <i data-lucide="chevron-right" style="color:var(--text-muted);"></i>
        </div>
      `;
      card.addEventListener('click', () => {
        sessionStorage.setItem('qf_last_attempt', JSON.stringify(attempt));
        Router.navigate('results');
        window.dispatchEvent(new CustomEvent('resultsLoaded'));
      });
      list.appendChild(card);
    });
    if ((window as any).lucide) (window as any).lucide.createIcons();
  }

  renderHomeHistory();
  window.addEventListener('route', (e: any) => {
    if (e.detail.screen === 'upload') renderHomeHistory();
  });

  // Simple tabs handling
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      const target = btn.getAttribute('data-tab');
      btn.classList.add('active');
      const tc = document.getElementById(`tab-${target}`);
      if (tc) tc.classList.add('active');
    });
  });

  // Textarea length validation
  const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
  const btnAnalyze = document.getElementById('btn-analyze') as HTMLButtonElement;
  if(textInput && btnAnalyze) {
    textInput.addEventListener('input', () => {
      const len = textInput.value.length;
      const countEl = document.getElementById('char-count');
      if(countEl) {
        countEl.textContent = `${len} / 100 min chars`;
        countEl.style.color = len >= 100 ? 'var(--accent-primary)' : 'var(--text-muted)';
      }
      
      // Only toggle analyze button when paste tab is active
      const pasteTabActive = document.getElementById('tab-paste')?.classList.contains('active');
      if (pasteTabActive) {
        btnAnalyze.disabled = len < 100;
      }
    });
  }
});
