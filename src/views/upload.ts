import type { FilterOptions } from '../types';

export class UploadView {
  private onFileProcess: (file: File, options: FilterOptions) => Promise<void>;
  private isProcessing = false;
  private currentProgress = 0;
  private errorMessage = '';

  constructor(onFileProcess: (file: File, options: FilterOptions) => Promise<void>) {
    this.onFileProcess = onFileProcess;
  }

  public updateProgress(progress: number): void {
    this.currentProgress = progress;
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }
  }

  public showError(message: string): void {
    this.errorMessage = message;
    this.isProcessing = false;
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.removeAttribute('disabled');
      submitBtn.innerHTML = '<span>Analyze Data</span>';
    }
  }

  public render(): string {
    return `
      <div class="min-h-screen flex flex-col items-center justify-center p-6">
        <div class="w-full max-w-2xl">
          <div class="text-center mb-8 animate-fade-in">
            <h1 class="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
              Degen Stats V2
            </h1>
            <p class="text-slate-400 text-lg mb-6">
              Privacy-first betting analytics. All processing happens in your browser.
            </p>
            <div class="privacy-badge">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <span>100% Client-Side Processing</span>
            </div>
          </div>

          <div class="card p-8 animate-slide-up">
            <form id="upload-form" class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Upload Your Data
                </label>
                <div class="relative">
                  <input
                    type="file"
                    id="file-input"
                    name="file"
                    accept=".csv"
                    required
                    class="hidden"
                  />
                  <label
                    for="file-input"
                    class="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-primary-500 transition-colors bg-slate-900/30"
                  >
                    <svg class="w-12 h-12 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    <p class="text-sm text-slate-400">
                      <span class="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p class="text-xs text-slate-500 mt-1">CSV files only</p>
                  </label>
                </div>
                <p id="file-name" class="mt-2 text-sm text-slate-400"></p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="currency" class="block text-sm font-medium text-slate-300 mb-2">
                    Currency Filter
                  </label>
                  <input
                    type="text"
                    id="currency"
                    name="currency"
                    placeholder="e.g., USD"
                    class="input"
                  />
                </div>
                <div>
                  <label for="game" class="block text-sm font-medium text-slate-300 mb-2">
                    Game Filter
                  </label>
                  <input
                    type="text"
                    id="game"
                    name="game"
                    placeholder="Game name"
                    class="input"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="top" class="block text-sm font-medium text-slate-300 mb-2">
                    Top N Results
                  </label>
                  <input
                    type="number"
                    id="top"
                    name="top"
                    value="10"
                    min="1"
                    max="100"
                    class="input"
                  />
                </div>
                <div>
                  <label for="minPlays" class="block text-sm font-medium text-slate-300 mb-2">
                    Min Plays
                  </label>
                  <input
                    type="number"
                    id="minPlays"
                    name="minPlays"
                    value="20"
                    min="1"
                    class="input"
                  />
                </div>
              </div>

              <div id="error-message" class="hidden p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"></div>

              <div id="progress-container" class="hidden">
                <div class="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Processing...</span>
                  <span id="progress-text">0%</span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div id="progress-bar" class="bg-gradient-to-r from-primary-500 to-secondary-400 h-full transition-all duration-300" style="width: 0%"></div>
                </div>
              </div>

              <button
                type="submit"
                id="submit-btn"
                class="btn-primary w-full flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <span>Analyze Data</span>
              </button>
            </form>
          </div>

          <div class="mt-8 text-center text-sm text-slate-500">
            <p>Your data never leaves your device. Processing is done entirely in your browser.</p>
          </div>
        </div>
      </div>
    `;
  }

  public attachEventListeners(): void {
    const form = document.getElementById('upload-form') as HTMLFormElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const fileNameDisplay = document.getElementById('file-name');

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file && fileNameDisplay) {
        fileNameDisplay.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (this.isProcessing) return;

      const file = fileInput.files?.[0];
      if (!file) return;

      this.isProcessing = true;
      this.errorMessage = '';
      this.currentProgress = 0;

      const errorEl = document.getElementById('error-message');
      if (errorEl) {
        errorEl.classList.add('hidden');
      }

      const progressContainer = document.getElementById('progress-container');
      if (progressContainer) {
        progressContainer.classList.remove('hidden');
      }

      const submitBtn = document.getElementById('submit-btn');
      if (submitBtn) {
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.innerHTML = `
          <div class="loading-spinner"></div>
          <span>Processing...</span>
        `;
      }

      const formData = new FormData(form);
      const options: FilterOptions = {
        currency: formData.get('currency') as string || undefined,
        game: formData.get('game') as string || undefined,
        top: parseInt(formData.get('top') as string) || 10,
        minPlays: parseInt(formData.get('minPlays') as string) || 20,
      };

      try {
        await this.onFileProcess(file, options);
      } catch (error) {
        console.error('Processing error:', error);
      }
    });
  }
}
