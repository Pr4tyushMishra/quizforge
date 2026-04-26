export class ModuleSelectComponent {
  init() {
    window.addEventListener('modulesLoaded', () => {
      this.render();
    });

    const btnSelectAll = document.getElementById('btn-select-all');
    btnSelectAll?.addEventListener('click', () => {
      const isSelectAll = btnSelectAll.textContent === 'Select All';
      document.querySelectorAll('.module-card').forEach(c => {
        if (isSelectAll) {
          c.classList.add('selected');
        } else {
          c.classList.remove('selected');
        }
      });
      btnSelectAll.textContent = isSelectAll ? 'Deselect All' : 'Select All';
      this.updateNextButton();
    });

    const btnPractice = document.getElementById('btn-practice-selected');
    btnPractice?.addEventListener('click', () => {
      const selectedIds = Array.from(document.querySelectorAll('.module-card.selected')).map(c => c.getAttribute('data-id'));
      sessionStorage.setItem('qf_selected_modules', JSON.stringify(selectedIds));
      (window as any).Router.navigate('level');
    });
  }

  render() {
    const modulesStr = sessionStorage.getItem('qf_modules');
    if (!modulesStr) return;
    const modules = JSON.parse(modulesStr);

    const header = document.getElementById('modules-header');
    if (header) header.textContent = `We found ${modules.length} modules in your syllabus`;

    const grid = document.getElementById('modules-grid');
    if (grid) {
      grid.innerHTML = '';
      modules.forEach((mod: any) => {
        const card = document.createElement('div');
        card.className = 'module-card card selected'; // default selected
        card.setAttribute('data-id', mod.id);
        card.innerHTML = `
          <h3 style="margin-bottom: 0.5rem; color: var(--accent-primary)">${mod.name}</h3>
          <p class="text-primary" style="font-size: 0.875rem">${mod.description}</p>
          <div class="mt-2 text-muted" style="font-size: 0.8rem">
            ${mod.subtopics?.length || 0} subtopics
          </div>
        `;
        card.addEventListener('click', () => {
          card.classList.toggle('selected');
          this.updateNextButton();
        });
        grid.appendChild(card);
      });
      this.updateNextButton();
    }
  }

  updateNextButton() {
    const selectedCount = document.querySelectorAll('.module-card.selected').length;
    const btnPractice = document.getElementById('btn-practice-selected') as HTMLButtonElement;
    if (btnPractice) {
      btnPractice.disabled = selectedCount === 0;
    }
  }
}
