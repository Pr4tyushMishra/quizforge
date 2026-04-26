import { ApiService } from '../modules/api';

export class UploadComponent {
  init() {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const dropZone = document.getElementById('drop-zone');
    const btnAnalyze = document.getElementById('btn-analyze') as HTMLButtonElement;
    
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer?.files.length) {
          this.handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) {
          this.handleFile(fileInput.files[0]);
        }
      });
    }

    if (btnAnalyze) {
      btnAnalyze.addEventListener('click', async () => {
        btnAnalyze.disabled = true;
        btnAnalyze.innerHTML = `Analyzing... <i data-lucide="loader" class="spin"></i>`;
        
        try {
          const tabUpload = document.getElementById('tab-upload')?.classList.contains('active');
          let text = '';
          
          if (tabUpload) {
             text = sessionStorage.getItem('qf_uploaded_text') || '';
          } else {
             const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
             text = textInput.value;
          }
          
          if (text.length >= 100) {
            sessionStorage.setItem('qf_syllabus', text);
            try {
              const data = await ApiService.extractModules(text);
              sessionStorage.setItem('qf_modules', JSON.stringify(data.modules));
              (window as any).Router.navigate('modules');
              window.dispatchEvent(new CustomEvent('modulesLoaded'));
            } catch (err: any) {
              alert("Error extracting modules: " + err.message);
            }
          }
        } finally {
          btnAnalyze.disabled = false;
          btnAnalyze.innerHTML = `Analyze Syllabus <i data-lucide="arrow-right"></i>`;
        }
      });
    }
  }

  async handleFile(file: File) {
    const fileNameEl = document.getElementById('file-name');
    const previewEl = document.getElementById('file-preview');
    const dropZone = document.getElementById('drop-zone');
    
    if(fileNameEl && previewEl && dropZone) {
      fileNameEl.textContent = file.name;
      previewEl.classList.remove('hidden');
      dropZone.classList.add('hidden');
    }
    
    const btnAnalyze = document.getElementById('btn-analyze') as HTMLButtonElement;

    try {
      let text = '';
      if (file.name.endsWith('.pdf')) {
        text = await this.readPDF(file);
      } else if (file.name.endsWith('.txt')) {
        text = await file.text();
      } else {
        alert("Unsupported file format.");
        return;
      }
      
      // #15 — Store in sessionStorage instead of global window variable
      sessionStorage.setItem('qf_uploaded_text', text);
      
      if(btnAnalyze) {
        if(text.length >= 100) {
          btnAnalyze.disabled = false;
        } else {
          alert("File content is too short (min 100 characters).");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error reading file.");
    }
  }

  async readPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) throw new Error("PDF.js library not loaded");
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      text += strings.join(' ') + '\n';
    }
    return text;
  }
}
