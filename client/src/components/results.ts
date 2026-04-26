export class ResultsComponent {
  init() {
    window.addEventListener('resultsLoaded', () => {
      this.render();
    });
  }

  render() {
    const raw = sessionStorage.getItem('qf_last_attempt');
    if (!raw) return;
    const attempt = JSON.parse(raw);

    const perc = attempt.score.total > 0 ? Math.round((attempt.score.correct / attempt.score.total) * 100) : 0;
    const percEl = document.getElementById('result-percentage');
    if (percEl) {
      percEl.textContent = `${perc}%`;
      percEl.style.color = perc >= 80 ? 'var(--accent-primary)' : perc >= 60 ? 'var(--accent-warm)' : 'var(--accent-danger)';
      (percEl.parentElement as HTMLElement).style.borderColor = percEl.style.color;
    }

    const statsEl = document.getElementById('result-stats');
    if (statsEl) statsEl.textContent = `Correct: ${attempt.score.correct} | Wrong: ${attempt.score.wrong} | Skipped: ${attempt.score.skipped}`;

    const list = document.getElementById('results-list');
    if (list) {
      list.innerHTML = '';
      attempt.resultsReview.forEach((q: any, i: number) => {
        const card = document.createElement('div');
        card.className = `review-card ${q.isCorrect ? 'correct' : !q.userAns ? '' : 'wrong'}`;
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;margin-bottom:1rem;">
            <strong>Q.${i + 1}</strong>
            <span style="color:${q.isCorrect ? 'var(--accent-primary)' : (!q.userAns ? 'var(--text-muted)' : 'var(--accent-danger)')}">
              ${!q.userAns ? 'SKIPPED' : q.isCorrect ? '✓ CORRECT' : '✗ WRONG'}
            </span>
          </div>
          <p style="margin-bottom:1rem">${q.question}</p>
          <div class="mono" style="margin-bottom:0.5rem; color:var(--text-muted)">Your Answer: [${q.userAns || '-'}] ${q.userAns ? (q.options[q.userAns] || '') : ''}</div>
          <div class="mono" style="margin-bottom:1rem; color:var(--accent-primary)">Correct Answer: [${q.correct}] ${q.options[q.correct] || ''}</div>
          <div style="background:var(--bg-primary); padding:1rem; border-radius:var(--radius-sm); border-left: 3px solid var(--accent-second)">
             <strong>💡 Explanation:</strong> ${q.explanation || 'No explanation provided.'}
          </div>
        `;
        list.appendChild(card);
      });
    }
  }
}
