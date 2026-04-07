import type { FilterOptions, StatsHistoryEntry } from '../types';
import Handlebars from 'handlebars';
import uploadTemplate from '../templates/upload.hbs?raw';
import { getStatsHistory, clearStatsHistory } from '../worker/utils';
import {config} from '../config';

export class UploadView {
  private onFileProcess: (file: File, options: FilterOptions) => Promise<void>;
  private onLoadHistory: (historyEntry: StatsHistoryEntry) => void;
  private onNavigateToTools: () => void;
  private isProcessing = false;
  private currentProgress = 0;
  private errorMessage = '';
  private eventListeners: Array<{ element: HTMLElement; event: string; handler: EventListener }> =
    [];

  constructor(
    onFileProcess: (file: File, options: FilterOptions) => Promise<void>,
    onLoadHistory: (historyEntry: StatsHistoryEntry) => void,
    onNavigateToTools: () => void
  ) {
    this.onFileProcess = onFileProcess;
    this.onLoadHistory = onLoadHistory;
    this.onNavigateToTools = onNavigateToTools;
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
    return template(config);
  }

  public attachEventListeners(): void {
    this.removeEventListeners();
    this.renderHistory();

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
    const toolsBtn = document.getElementById('tools-btn');
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

    if (toolsBtn) {
      this.addEventListener(toolsBtn, 'click', () => {
        this.onNavigateToTools();
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
        submitBtn.innerHTML = `<div class="loading-spinner"></div>\n<span>Processing...</span>`;
      }

      const formData = new FormData(form);
      const options = this.validateForm(formData);

      if (depositFileInput?.files?.[0]) {
        options.depositFile = depositFileInput.files[0];
      }
      if (withdrawalFileInput?.files?.[0]) {
        options.withdrawalFile = withdrawalFileInput.files[0];
      }

      try {
        await this.onFileProcess(file, options);
      } catch (error) {
        console.error('Processing error:', error);
      }
    });

    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
      this.addEventListener(clearHistoryBtn, 'click', async () => {
        if (confirm('Are you sure you want to clear all analysis history?')) {
          await clearStatsHistory();
          await this.renderHistory();
        }
      });
    }
  }

  private async renderHistory(): Promise<void> {
    try {
      const history = await getStatsHistory();
      const historyContainer = document.getElementById('history-container');
      const historyList = document.getElementById('history-list');

      if (!historyContainer || !historyList) return;

      if (history.length === 0) {
        historyContainer.classList.add('hidden');
        return;
      }

      historyContainer.classList.remove('hidden');
      historyList.innerHTML = '';

      const sortedHistory = [...history].sort((a, b) => b.time - a.time);

      for (const entry of sortedHistory) {
        const date = new Date(entry.time);
        const formattedDate = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const roi = entry.data.overall.roi;
        const net = entry.data.overall.net;
        const roiClass = roi >= 0 ? 'text-green-400' : 'text-red-400';
        const roiSign = roi >= 0 ? '+' : '';
        const netClass = net >= 0 ? 'text-green-400' : 'text-red-400';
        const netSign = net >= 0 ? '+' : '';

        const historyItemTemplate = Handlebars.compile('{{> historyItem}}');
        const historyItemHtml = historyItemTemplate({
          formattedDate,
          bets: entry.bets.toLocaleString(),
          roiClass,
          roiSign,
          roi: roi.toFixed(2),
          netClass,
          netSign,
          net: Math.abs(net).toFixed(2),
          currency: entry.data.overall.currency,
          winRate: entry.data.overall.winRate.toFixed(2),
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = historyItemHtml;
        const historyItem = tempDiv.firstElementChild as HTMLButtonElement;

        const clickHandler = () => {
          this.onLoadHistory(entry);
        };
        this.addEventListener(historyItem, 'click', clickHandler);

        historyList.appendChild(historyItem);
      }
    } catch (error) {
      console.error('Failed to render history:', error);
      const historyContainer = document.getElementById('history-container');
      if (historyContainer) {
        historyContainer.classList.add('hidden');
      }
    }
  }

  private validateForm(form: FormData): FilterOptions {
    const isInt = (value: string) => !isNaN(parseInt(value)) && parseInt(value) >= 0;
    const isInRange = (num: number, min: number, max: number) => {
      return !isNaN(num) && num >= min && num <= max;
    };
    const both = (value: string | undefined, defaultValue: number, min: number, max: number) => {
      if (value === undefined || isNaN(Number(value))) return defaultValue;
      const num = parseInt(value);
      if (isInt(value) && isInRange(num, min, max)) {
        return num;
      }
      return defaultValue;
    };

    const top = both(form.get('top')?.toString(), 10, 1, 100);
    const minPlays = both(form.get('minPlays')?.toString(), 20, 0, 1000);
    const topBets = both(form.get('topBets')?.toString(), 10, 1, 100);
    const currency = form.get('currency')?.toString();
    const game = form.get('game')?.toString()?.trim() || undefined;

    const data: FilterOptions = {
      currency,
      game,
      top,
      minPlays,
      topBets,
      depositFile: undefined,
      withdrawalFile: undefined,
    };

    return data;
  }
}
