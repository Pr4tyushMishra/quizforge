export class HistoryComponent {
  init() {
    window.addEventListener('route', (e: any) => {
      if (e.detail.screen === 'history') {
        this.render();
      }
    });

    const btnClear = document.getElementById('btn-clear-history');
    btnClear?.addEventListener('click', () => {
      if (confirm("Are you sure you want to clear all history?")) {
        localStorage.removeItem('qf_history');
        this.render();
      }
    });
  }

  render() {
    const list = document.getElementById('history-list');
    if (!list) return;

    const history = JSON.parse(localStorage.getItem('qf_history') || '[]');
    list.innerHTML = '';

    if (history.length === 0) {
      list.innerHTML = `<p class="text-muted text-center card" style="padding: 2rem;">No history found. Take a quiz first!</p>`;
      return;
    }

    // reverse chronological
    [...history].reverse().forEach((attempt: any) => {
      const perc = attempt.score.total > 0 ? Math.round((attempt.score.correct / attempt.score.total) * 100) : 0;
      const card = document.createElement('div');
      card.className = 'card';
      const durationStr = Math.floor(attempt.duration / 60) + 'm ' + (attempt.duration % 60) + 's';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
             <h3 style="color:var(--accent-primary)">Quiz Score: ${attempt.score.correct}/${attempt.score.total} (${perc}%)</h3>
             <p class="text-muted mt-2">Level: ${attempt.level?.toUpperCase() || 'UNKNOWN'} | Time: ${durationStr}</p>
          </div>
          <div style="text-align:right">
             <button class="btn-ghost btn-view-history" data-id="${attempt.id}">View Analysis</button>
          </div>
        </div>
      `;
      card.querySelector('.btn-view-history')?.addEventListener('click', () => {
         sessionStorage.setItem('qf_last_attempt', JSON.stringify(attempt));
         (window as any).Router.navigate('analytics');
      });
      list.appendChild(card);
    });
  }
}
