export class QuizComponent {
  private currentIdx = 0;
  private quizData: any = null;
  private answers: Record<string, string> = {};
  private flagged: Set<string> = new Set();
  private timerInt: any = null;
  private timeElapsed = 0;
  private timeLimit = 0;
  private expectedCount = 10;
  private totalChunks = 1;
  private _bgAbort = false;

  init() {
    window.addEventListener('quizLoaded', () => {
      this.startQuiz();
    });

    document.getElementById('btn-quiz-next')?.addEventListener('click', () => {
      if (this.currentIdx < this.quizData.questions.length - 1) {
        this.currentIdx++;
        this.renderQuestion();
      }
    });

    document.getElementById('btn-quiz-prev')?.addEventListener('click', () => {
      if (this.currentIdx > 0) {
        this.currentIdx--;
        this.renderQuestion();
      }
    });

    document.getElementById('btn-quiz-submit')?.addEventListener('click', () => {
      this.submitQuiz();
    });

    document.getElementById('btn-flag')?.addEventListener('click', () => {
      const q = this.quizData.questions[this.currentIdx];
      if (this.flagged.has(q.id)) {
        this.flagged.delete(q.id);
        document.getElementById('btn-flag')!.innerHTML = `<i data-lucide="flag"></i> Flag for Review`;
      } else {
        this.flagged.add(q.id);
        document.getElementById('btn-flag')!.innerHTML = `<i data-lucide="flag" fill="currentColor"></i> Flagged`;
      }
      if ((window as any).lucide) (window as any).lucide.createIcons();
    });

    // #6 — Clear timer when navigating away from quiz
    window.addEventListener('route', (e: any) => {
      if (e.detail.screen !== 'quiz') {
        if (this.timerInt) clearInterval(this.timerInt);
        this.timerInt = null;
        this._bgAbort = true; // stop background fetches
      }
    });
  }

  startQuiz() {
    const raw = sessionStorage.getItem('qf_quiz');
    if (!raw) return;
    this.quizData = JSON.parse(raw);
    this.currentIdx = 0;
    this.answers = {};
    this.flagged.clear();
    this.timeElapsed = 0;

    const level = sessionStorage.getItem('qf_level') || 'easy';
    this.timeLimit = level === 'easy' ? 20 * 60 : level === 'intermediate' ? 60 * 60 : 90 * 60;

    const lvlBadge = document.getElementById('quiz-level-badge');
    if (lvlBadge) lvlBadge.textContent = level.toUpperCase();

    this.expectedCount = parseInt(sessionStorage.getItem('qf_expected_count') || '10');
    this.totalChunks = parseInt(sessionStorage.getItem('qf_total_chunks') || '1');
    this._bgAbort = false;

    if (this.timerInt) clearInterval(this.timerInt);
    this.timerInt = setInterval(() => {
      this.timeElapsed++;
      this.updateTimer();
      if(this.timeLimit > 0 && this.timeElapsed >= this.timeLimit) {
        this.submitQuiz();
      }
    }, 1000);

    this.renderQuestion();
    
    // Start background loading if needed
    if (this.quizData.chunksLoaded < this.totalChunks) {
      this.startBackgroundLoading();
    }
  }

  async startBackgroundLoading() {
    try {
      const { ApiService } = await import('../modules/api');
      const level = sessionStorage.getItem('qf_level');
      
      const selectedIds = JSON.parse(sessionStorage.getItem('qf_selected_modules') || '[]');
      const allModules = JSON.parse(sessionStorage.getItem('qf_modules') || '[]');
      const targetModules = allModules.filter((m: any) => selectedIds.includes(m.id));

      while (this.quizData.chunksLoaded < this.totalChunks) {
        if (this._bgAbort) break;
        
        const nextChunk = this.quizData.chunksLoaded + 1;
        const newChunkData = await ApiService.generateQuiz(targetModules, level || 'easy', nextChunk, this.totalChunks);
        
        if (this._bgAbort) break;
        
        this.quizData.questions.push(...newChunkData.questions);
        this.quizData.chunksLoaded = nextChunk;
        sessionStorage.setItem('qf_quiz', JSON.stringify(this.quizData));
        
        this.renderNavigator();
        this.renderQuestion();
      }
    } catch (e) {
      console.error("Background loading failed", e);
    }
  }

  updateTimer() {
    const remaining = Math.max(0, this.timeLimit - this.timeElapsed);
    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s = (remaining % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('quiz-timer');
    if (timerEl) {
      timerEl.textContent = `${m}:${s}`;
      if (remaining < this.timeLimit * 0.1) timerEl.style.color = 'var(--accent-danger)';
      else if (remaining < this.timeLimit * 0.25) timerEl.style.color = 'var(--accent-warm)';
      else timerEl.style.color = '';
    }
  }

  renderQuestion() {
    const total = this.quizData.questions.length;
    const q = this.quizData.questions[this.currentIdx];

    const qnum = document.getElementById('quiz-qnum');
    if (qnum) qnum.textContent = `Question ${this.currentIdx + 1} of ${total}`;

    const textEl = document.getElementById('quiz-question-text');
    if (textEl) textEl.textContent = q.question;

    const prog = document.getElementById('quiz-progress');
    if (prog) prog.style.width = `${((this.currentIdx + 1) / total) * 100}%`;

    const btnFlag = document.getElementById('btn-flag');
    if (btnFlag) {
      btnFlag.innerHTML = this.flagged.has(q.id) 
        ? `<i data-lucide="flag" fill="currentColor"></i> Flagged` 
        : `<i data-lucide="flag"></i> Flag for Review`;
    }

    const optsContainer = document.getElementById('quiz-options');
    if (optsContainer) {
      optsContainer.innerHTML = '';
      if(q.options) {
        Object.entries(q.options).forEach(([k, v]) => {
          const div = document.createElement('div');
          div.className = `quiz-option ${this.answers[q.id] === k ? 'selected' : ''}`;
          div.innerHTML = `<span class="mono">${k}</span> <span>${v}</span>`;
          div.addEventListener('click', () => {
            this.answers[q.id] = k;
            this.renderQuestion();
          });
          optsContainer.appendChild(div);
        });
      }
    }

    const btnPrev = document.getElementById('btn-quiz-prev') as HTMLButtonElement;
    const btnNext = document.getElementById('btn-quiz-next') as HTMLButtonElement;
    const btnSubmit = document.getElementById('btn-quiz-submit') as HTMLButtonElement;

    if (btnPrev) btnPrev.disabled = this.currentIdx === 0;
    
    if (this.currentIdx === this.expectedCount - 1) {
      if (btnNext) btnNext.classList.add('hidden');
      if (btnSubmit) btnSubmit.classList.remove('hidden');
    } else {
      if (btnSubmit) btnSubmit.classList.add('hidden');
      if (btnNext) {
         if (this.currentIdx === this.quizData.questions.length - 1) {
             btnNext.disabled = true;
             btnNext.innerHTML = `<i data-lucide="loader" class="spin"></i> Loading...`;
         } else {
             btnNext.classList.remove('hidden');
             btnNext.disabled = false;
             btnNext.textContent = 'Next';
         }
      }
    }

    if ((window as any).lucide) (window as any).lucide.createIcons();
    this.renderNavigator();
  }

  renderNavigator() {
    const grid = document.getElementById('quiz-nav-grid');
    if (!grid || !this.quizData) return;
    
    grid.innerHTML = '';
    this.quizData.questions.forEach((q: any, i: number) => {
      const dot = document.createElement('div');
      dot.className = 'nav-dot';
      dot.textContent = `${i + 1}`;
      
      if (i === this.currentIdx) {
        dot.classList.add('current');
      } else if (this.flagged.has(q.id)) {
        dot.classList.add('flagged');
      } else if (this.answers[q.id]) {
        dot.classList.add('answered');
      }
      
      dot.addEventListener('click', () => {
        this.currentIdx = i;
        this.renderQuestion();
      });
      grid.appendChild(dot);
    });
  }

  submitQuiz() {
    if (this.timerInt) clearInterval(this.timerInt);
    
    const total = this.quizData.questions.length;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    const resultsReview = this.quizData.questions.map((q: any) => {
      const userAns = this.answers[q.id];
      const isCorrect = userAns === q.correct;
      if (!userAns) skipped++;
      else if (isCorrect) correct++;
      else wrong++;

      return {
        ...q,
        userAns,
        isCorrect
      };
    });

    const attempt = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level: sessionStorage.getItem('qf_level'),
      score: { correct, wrong, skipped, total },
      duration: this.timeElapsed,
      resultsReview
    };

    sessionStorage.setItem('qf_last_attempt', JSON.stringify(attempt));
    
    // #7 — Cap history to last 20 entries
    const history = JSON.parse(localStorage.getItem('qf_history') || '[]');
    history.push(attempt);
    const capped = history.slice(-20);
    localStorage.setItem('qf_history', JSON.stringify(capped));

    (window as any).Router.navigate('results');
    window.dispatchEvent(new CustomEvent('resultsLoaded'));
  }
}
