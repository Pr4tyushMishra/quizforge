export class LevelSelectComponent {
  private _aborted = false;

  init() {
    const levelCards = document.querySelectorAll('.level-card');
    const startBtn = document.getElementById('btn-start-quiz') as HTMLButtonElement;
    
    levelCards.forEach(card => {
      card.addEventListener('click', () => {
        levelCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        startBtn.disabled = false;
      });
    });

    // #9 — Cancel button on loading screen
    document.getElementById('btn-cancel-loading')?.addEventListener('click', () => {
      this._aborted = true;
      (window as any).Router.navigate('level');
    });

    startBtn?.addEventListener('click', async () => {
      const selectedLevel = document.querySelector('.level-card.selected')?.getAttribute('data-level');
      if (!selectedLevel) return;
      
      const selectedIds = JSON.parse(sessionStorage.getItem('qf_selected_modules') || '[]');
      const allModules = JSON.parse(sessionStorage.getItem('qf_modules') || '[]');
      
      const targetModules = allModules.filter((m: any) => selectedIds.includes(m.id));
      
      sessionStorage.setItem('qf_level', selectedLevel);
      
      (window as any).Router.navigate('loading');
      this._aborted = false;
      
      // #9 — 90s timeout
      const loadingTimeout = setTimeout(() => {
        if (!this._aborted) {
          this._aborted = true;
          const statusEl = document.getElementById('loading-status');
          if (statusEl) statusEl.textContent = 'Request timed out. Redirecting...';
          setTimeout(() => (window as any).Router.navigate('level'), 1500);
        }
      }, 90000);
      
      try {
        const { ApiService } = await import('../modules/api');
        startBtn.disabled = true;
        
        const quizData = await ApiService.generateQuiz(targetModules, selectedLevel);
        
        clearTimeout(loadingTimeout);
        if (this._aborted) return; // user cancelled

        sessionStorage.setItem('qf_quiz', JSON.stringify(quizData));
        (window as any).Router.navigate('quiz');
        window.dispatchEvent(new CustomEvent('quizLoaded'));
      } catch (err: any) {
        clearTimeout(loadingTimeout);
        if (!this._aborted) {
          alert("Error generating quiz: " + err.message);
          (window as any).Router.navigate('level');
        }
      } finally {
        startBtn.disabled = false;
      }
    });

    // #10 — Guard: if navigated to modules/level with no data, redirect to upload
    window.addEventListener('route', (e: any) => {
      if (e.detail.screen === 'modules' && !sessionStorage.getItem('qf_modules')) {
        (window as any).Router.navigate('upload');
      }
      if (e.detail.screen === 'level' && !sessionStorage.getItem('qf_selected_modules')) {
        (window as any).Router.navigate('upload');
      }
    });
  }
}
