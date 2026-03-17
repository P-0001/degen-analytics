import type { FilterOptions } from '../types';
import Handlebars from 'handlebars';
import uploadTemplate from '../templates/upload.hbs?raw';

declare const __APP_VERSION__: string;

export class UploadView {
  private onFileProcess: (file: File, options: FilterOptions) => Promise<void>;
  private isProcessing = false;
  private currentProgress = 0;
  private errorMessage = '';
  private eventListeners: Array<{ element: HTMLElement; event: string; handler: EventListener }> =
    [];

  constructor(onFileProcess: (file: File, options: FilterOptions) => Promise<void>) {
    this.onFileProcess = onFileProcess;
  }

  get progress(): number {
    return this.currentProgress;
  }

  get lastErrorMessage(): string {
    return this.errorMessage;
  }

  public reset(): void {
    this.isProcessing = false;
    this.currentProgress = 0;
    this.errorMessage = '';
    this.removeEventListeners();
  }

  private removeEventListeners(): void {
    for (const { element, event, handler } of this.eventListeners) {
      element.removeEventListener(event, handler);
    }
    this.eventListeners = [];
  }

  private addEventListener(element: HTMLElement, event: string, handler: EventListener): void {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
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
    const template = Handlebars.compile(uploadTemplate);

    const data = {
      appName: 'Degen Analytics',
      tagline: 'Privacy-first betting analytics. All processing happens in your browser.',
      privacyBadge: '100% Client-Side Processing',
      privacyNotice:
        'Your data never leaves your device. Processing is done entirely in your browser.',
      githubUrl: 'https://github.com/P-0001/degen-analytics',
      donateUrl: 'https://solscan.io/account/JBybLSEQPDVrueVsrh9mktEhdytoNaSBQkQbrMNHZDS7', // Replace with your crypto address
      copyright: '© 2026 Degen Analytics. All rights reserved.',
      version: __APP_VERSION__,
      modalTitle: 'How to Use Degen Analytics',
      disclaimer:
        'This tool is not affiliated with any gambling site, casino, or betting platform. Degen Analytics is purely an informational tool for personal use to help you analyze and understand your betting history. Use of this tool does not constitute financial advice, and all gambling activities should be conducted responsibly and within your means.',
    };

    return template(data);
  }

  public attachEventListeners(): void {
    this.removeEventListeners();

    const form = document.getElementById('upload-form') as HTMLFormElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const fileNameDisplay = document.getElementById('file-name');
    const depositFileInput = document.getElementById('deposit-file') as HTMLInputElement;
    const depositFileNameDisplay = document.getElementById('deposit-file-name');
    const withdrawalFileInput = document.getElementById('withdrawal-file') as HTMLInputElement;
    const withdrawalFileNameDisplay = document.getElementById('withdrawal-file-name');
    const advancedToggle = document.getElementById('advanced-toggle');
    const advancedOptions = document.getElementById('advanced-options');
    const advancedIcon = document.getElementById('advanced-icon');
    const howToBtn = document.getElementById('how-to-btn');
    const howToModal = document.getElementById('how-to-modal');
    const closeModal = document.getElementById('close-modal');

    if (advancedToggle) {
      this.addEventListener(advancedToggle, 'click', () => {
        const isHidden = advancedOptions?.classList.contains('hidden');
        if (isHidden) {
          advancedOptions?.classList.remove('hidden');
          advancedIcon?.classList.add('rotate-90');
        } else {
          advancedOptions?.classList.add('hidden');
          advancedIcon?.classList.remove('rotate-90');
        }
      });
    }

    if (howToBtn) {
      this.addEventListener(howToBtn, 'click', () => {
        howToModal?.classList.remove('hidden');
      });
    }

    if (closeModal) {
      this.addEventListener(closeModal, 'click', () => {
        howToModal?.classList.add('hidden');
      });
    }

    if (howToModal) {
      this.addEventListener(howToModal, 'click', e => {
        if (e.target === howToModal) {
          howToModal.classList.add('hidden');
        }
      });
    }

    this.addEventListener(fileInput, 'change', () => {
      const file = fileInput.files?.[0];
      if (file && fileNameDisplay) {
        fileNameDisplay.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      }
    });

    if (depositFileInput) {
      this.addEventListener(depositFileInput, 'change', () => {
        const file = depositFileInput.files?.[0];
        if (file && depositFileNameDisplay) {
          depositFileNameDisplay.textContent = file.name;
        } else if (depositFileNameDisplay) {
          depositFileNameDisplay.textContent = 'Upload Deposit CSV';
        }
      });
    }

    if (withdrawalFileInput) {
      this.addEventListener(withdrawalFileInput, 'change', () => {
        const file = withdrawalFileInput.files?.[0];
        if (file && withdrawalFileNameDisplay) {
          withdrawalFileNameDisplay.textContent = file.name;
        } else if (withdrawalFileNameDisplay) {
          withdrawalFileNameDisplay.textContent = 'Upload Withdrawal CSV';
        }
      });
    }

    this.addEventListener(form, 'submit', async e => {
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

      // Validate and parse numeric inputs
      const topRaw = formData.get('top')?.toString() || '';
      const minPlaysRaw = formData.get('minPlays')?.toString() || '';
      const topBetsRaw = formData.get('topBets')?.toString() || '';
      const topValue = parseInt(topRaw, 10);
      const minPlaysValue = parseInt(minPlaysRaw, 10);
      const topBetsValue = parseInt(topBetsRaw, 10);

      const currencyRaw = formData.get('currency')?.toString();
      const gameRaw = formData.get('game')?.toString();

      const options: FilterOptions = {
        currency: currencyRaw && currencyRaw.trim() !== '' ? currencyRaw.trim() : undefined,
        game: gameRaw && gameRaw.trim() !== '' ? gameRaw.trim() : undefined,
        top: !isNaN(topValue) && topValue > 0 ? topValue : 10,
        minPlays: !isNaN(minPlaysValue) && minPlaysValue >= 0 ? minPlaysValue : 20,
        topBets: !isNaN(topBetsValue) && topBetsValue > 0 ? topBetsValue : 10,
        depositFile: depositFileInput?.files?.[0],
        withdrawalFile: withdrawalFileInput?.files?.[0],
      };

      try {
        await this.onFileProcess(file, options);
      } catch (error) {
        console.error('Processing error:', error);
      }
    });
  }
}
