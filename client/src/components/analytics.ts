import { ApiService } from '../modules/api';

export class AnalyticsComponent {
  init() {
    window.addEventListener('route', (e: any) => {
      if (e.detail.screen === 'analytics') {
        this.render();
      }
    });
  }

  async render() {
    const raw = sessionStorage.getItem('qf_last_attempt');
    if (!raw) return;
    const attempt = JSON.parse(raw);

    const cont = document.getElementById('analytics-content');
    if (!cont) return;

    // Build local stats summary first
    const perc = attempt.score.total > 0 ? Math.round((attempt.score.correct / attempt.score.total) * 100) : 0;
    const percColor = perc >= 80 ? 'var(--accent-primary)' : perc >= 60 ? 'var(--accent-warm)' : 'var(--accent-danger)';
    const durationStr = `${Math.floor((attempt.duration || 0) / 60)}m ${(attempt.duration || 0) % 60}s`;

    cont.innerHTML = `
      <div class="analytics-summary">
        <div class="analytics-score-ring" style="border-color:${percColor}">
          <span style="color:${percColor}">${perc}%</span>
        </div>
        <div class="analytics-stats-grid">
          <div class="stat-box correct-box">
            <span class="stat-value">${attempt.score.correct}</span>
            <span class="stat-label">Correct</span>
          </div>
          <div class="stat-box wrong-box">
            <span class="stat-value">${attempt.score.wrong}</span>
            <span class="stat-label">Wrong</span>
          </div>
          <div class="stat-box skip-box">
            <span class="stat-value">${attempt.score.skipped}</span>
            <span class="stat-label">Skipped</span>
          </div>
          <div class="stat-box time-box">
            <span class="stat-value">${durationStr}</span>
            <span class="stat-label">Time</span>
          </div>
        </div>
      </div>
      <div class="analytics-ai-report">
        <div style="text-align:center; padding:2rem; color:var(--text-muted);">
          <i data-lucide="loader" class="spin" style="margin-bottom:0.5rem;width:24px;height:24px;display:block;margin:0 auto 0.5rem;"></i>
          Generating your personalized performance report...
        </div>
      </div>
    `;
    if ((window as any).lucide) (window as any).lucide.createIcons();
    
    // Fetch AI report
    try {
      const data = await ApiService.generateAnalysis(attempt);
      const mdText = data.markdown;
      const rawHtml = (window as any).marked ? (window as any).marked.parse(mdText) : `<pre style="white-space:pre-wrap; font-family:inherit;">${mdText}</pre>`;
      // #5 — Sanitize to prevent XSS
      const safeHtml = (window as any).DOMPurify ? (window as any).DOMPurify.sanitize(rawHtml) : rawHtml;
      const reportEl = cont.querySelector('.analytics-ai-report');
      if (reportEl) {
        reportEl.innerHTML = `<div class="analytics-report-content">${safeHtml}</div>`;
      }
    } catch(err: any) {
      const reportEl = cont.querySelector('.analytics-ai-report');
      if (reportEl) {
        reportEl.innerHTML = `<div style="color:var(--accent-danger); padding:1rem;">Error generating analysis: ${err.message}</div>`;
      }
    }
  }
}
