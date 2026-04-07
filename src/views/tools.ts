import toolsTemplate from '../templates/tools.hbs?raw';
import Handlebars from 'handlebars';
import ToolsWorker from '../worker/tools.worker?worker';
import { config } from '../config';
import type { FileGroup } from '../types';

export class ToolsView {
  private onBack: () => void;
  private selectedFiles: FileList | null = null;
  private eventListeners: Array<{ element: HTMLElement; event: string; handler: EventListener }> =
    [];
  private worker: Worker | null = null;
  private isDirectoryMode: boolean = true;
  private processedFiles: Map<string, { csv: string; filename: string; rowCount: number }> =
    new Map();
  private currentMessageHandler: ((e: MessageEvent) => void) | null = null;
  private isProcessing: boolean = false;
  private exchangeRates: Record<string, number> = {};

  constructor(onBack: () => void) {
    this.onBack = onBack;
    this.worker = new ToolsWorker();
  }

  public render(): string {
    const template = Handlebars.compile(toolsTemplate);
    const { appName } = config;
    return template({ appName });
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

  public attachEventListeners(): void {
    this.removeEventListeners();

    this.loadCurrencies();

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', this.onBack);
    }

    const directoryInput = document.getElementById('directory-input') as HTMLInputElement;
    const filesInput = document.getElementById('files-input') as HTMLInputElement;
    const uploadLabel = document.getElementById('upload-label');
    const selectionName = document.getElementById('selection-name');
    const processBtn = document.getElementById('process-btn') as HTMLButtonElement;
    const form = document.getElementById('tools-form') as HTMLFormElement;
    const directoryModeBtn = document.getElementById('directory-mode-btn');
    const filesModeBtn = document.getElementById('files-mode-btn');
    const convertCurrencyCheckbox = document.getElementById('convert-currency') as HTMLInputElement;
    const currencyOptions = document.getElementById('currency-options');

    if (directoryModeBtn && filesModeBtn) {
      this.addEventListener(directoryModeBtn, 'click', () => {
        this.isDirectoryMode = true;
        directoryModeBtn.classList.remove('bg-slate-700', 'hover:bg-slate-600');
        directoryModeBtn.classList.add('bg-primary-500', 'hover:bg-primary-600');
        filesModeBtn.classList.remove('bg-primary-500', 'hover:bg-primary-600');
        filesModeBtn.classList.add('bg-slate-700', 'hover:bg-slate-600');
        this.clearSelection();
        this.updateUploadLabel();
      });

      this.addEventListener(filesModeBtn, 'click', () => {
        this.isDirectoryMode = false;
        filesModeBtn.classList.remove('bg-slate-700', 'hover:bg-slate-600');
        filesModeBtn.classList.add('bg-primary-500', 'hover:bg-primary-600');
        directoryModeBtn.classList.remove('bg-primary-500', 'hover:bg-primary-600');
        directoryModeBtn.classList.add('bg-slate-700', 'hover:bg-slate-600');
        this.clearSelection();
        this.updateUploadLabel();
      });
    }

    if (convertCurrencyCheckbox && currencyOptions) {
      this.addEventListener(convertCurrencyCheckbox, 'change', () => {
        if (convertCurrencyCheckbox.checked) {
          currencyOptions.classList.remove('hidden');
        } else {
          currencyOptions.classList.add('hidden');
        }
      });
    }

    if (uploadLabel) {
      this.addEventListener(uploadLabel, 'click', () => {
        if (this.isDirectoryMode) {
          directoryInput?.click();
        } else {
          filesInput?.click();
        }
      });
    }

    if (directoryInput) {
      this.addEventListener(directoryInput, 'change', () => {
        this.selectedFiles = directoryInput.files;
        if (this.selectedFiles && this.selectedFiles.length > 0) {
          const firstFile = this.selectedFiles[0];
          const path = firstFile.webkitRelativePath || firstFile.name;
          const dirName = path.split('/')[0] || 'Selected Directory';

          if (selectionName) {
            selectionName.textContent = `Selected: ${dirName} (${this.selectedFiles.length} files)`;
          }

          this.displayFileList();

          if (processBtn) {
            processBtn.disabled = false;
          }
        }
      });
    }

    if (filesInput) {
      this.addEventListener(filesInput, 'change', () => {
        this.selectedFiles = filesInput.files;
        if (this.selectedFiles && this.selectedFiles.length > 0) {
          if (selectionName) {
            selectionName.textContent = `Selected: ${this.selectedFiles.length} file${this.selectedFiles.length > 1 ? 's' : ''}`;
          }

          this.displayFileList();

          if (processBtn) {
            processBtn.disabled = false;
          }
        }
      });
    }

    if (form) {
      this.addEventListener(form, 'submit', async e => {
        e.preventDefault();
        await this.processFiles();
      });
    }
  }

  private clearSelection(): void {
    this.selectedFiles = null;
    const selectionName = document.getElementById('selection-name');
    const fileListContainer = document.getElementById('file-list-container');
    const processBtn = document.getElementById('process-btn') as HTMLButtonElement;

    if (selectionName) {
      selectionName.textContent = '';
    }
    if (fileListContainer) {
      fileListContainer.classList.add('hidden');
    }
    if (processBtn) {
      processBtn.disabled = true;
    }
  }

  private updateUploadLabel(): void {
    const uploadLabel = document.getElementById('upload-label');
    if (!uploadLabel) return;

    const iconSvg = uploadLabel.querySelector('svg');
    const titleText = uploadLabel.querySelector('p:first-of-type span');
    const subtitleText = uploadLabel.querySelector('p:last-of-type');

    if (this.isDirectoryMode) {
      if (iconSvg) {
        iconSvg.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>';
      }
      if (titleText) titleText.textContent = 'Click to select directory';
      if (subtitleText) subtitleText.textContent = 'Choose a folder with CSV files';
    } else {
      if (iconSvg) {
        iconSvg.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>';
      }
      if (titleText) titleText.textContent = 'Click to upload files';
      if (subtitleText) subtitleText.textContent = 'Select one or more CSV files';
    }
  }

  private displayFileList(): void {
    if (!this.selectedFiles) return;

    const fileListContainer = document.getElementById('file-list-container');
    const fileList = document.getElementById('file-list');

    if (!fileListContainer || !fileList) return;

    const csvFiles = Array.from(this.selectedFiles).filter(f =>
      f.name.toLowerCase().endsWith('.csv')
    );

    if (csvFiles.length === 0) {
      fileListContainer.classList.add('hidden');
      return;
    }

    const groups = this.groupFiles(csvFiles);

    const fileListTitle = document.getElementById('file-list-title');
    if (fileListTitle) {
      fileListTitle.textContent = `Files Found (${csvFiles.length})`;
    }

    fileList.innerHTML = '';

    const createFileListHTML = (files: File[]): string => {
      return files
        .map(f => {
          const div = document.createElement('div');
          div.textContent = `- ${f.name}`;
          return div.outerHTML;
        })
        .join('');
    };

    if (groups.bets.length > 0) {
      const betSection = document.createElement('div');
      betSection.className = 'mb-3';
      const header = document.createElement('h4');
      header.className = 'text-sm font-semibold text-primary-400 mb-1';
      header.textContent = `Bets (${groups.bets.length})`;
      const fileListDiv = document.createElement('div');
      fileListDiv.className = 'text-xs text-slate-400 space-y-1';
      fileListDiv.innerHTML = createFileListHTML(groups.bets);
      betSection.appendChild(header);
      betSection.appendChild(fileListDiv);
      fileList.appendChild(betSection);
    }

    if (groups.deposits.length > 0) {
      const depositSection = document.createElement('div');
      depositSection.className = 'mb-3';
      const header = document.createElement('h4');
      header.className = 'text-sm font-semibold text-green-400 mb-1';
      header.textContent = `Deposits (${groups.deposits.length})`;
      const fileListDiv = document.createElement('div');
      fileListDiv.className = 'text-xs text-slate-400 space-y-1';
      fileListDiv.innerHTML = createFileListHTML(groups.deposits);
      depositSection.appendChild(header);
      depositSection.appendChild(fileListDiv);
      fileList.appendChild(depositSection);
    }

    if (groups.withdrawals.length > 0) {
      const withdrawalSection = document.createElement('div');
      withdrawalSection.className = 'mb-3';
      const header = document.createElement('h4');
      header.className = 'text-sm font-semibold text-red-400 mb-1';
      header.textContent = `Withdrawals (${groups.withdrawals.length})`;
      const fileListDiv = document.createElement('div');
      fileListDiv.className = 'text-xs text-slate-400 space-y-1';
      fileListDiv.innerHTML = createFileListHTML(groups.withdrawals);
      withdrawalSection.appendChild(header);
      withdrawalSection.appendChild(fileListDiv);
      fileList.appendChild(withdrawalSection);
    }

    fileListContainer.classList.remove('hidden');
  }

  private groupFiles(files: File[]): FileGroup {
    const groups: FileGroup = {
      bets: [],
      deposits: [],
      withdrawals: [],
    };

    for (const file of files) {
      const lower = file.name.toLowerCase();
      if (lower.startsWith('withdrawal') || lower.match(/^withdrawal[_\-\d]/)) {
        groups.withdrawals.push(file);
      } else if (lower.startsWith('deposit') || lower.match(/^deposit[_\-\d]/)) {
        groups.deposits.push(file);
      } else if (lower.includes('bets')) {
        groups.bets.push(file);
      }
    }

    return groups;
  }

  private async processFiles(): Promise<void> {
    if (!this.selectedFiles || !this.worker || this.isProcessing) return;

    const processBets = (document.getElementById('process-bets') as HTMLInputElement)?.checked;
    const processTransactions = (
      document.getElementById('process-transactions') as HTMLInputElement
    )?.checked;

    if (!processBets && !processTransactions) {
      this.showError('Please select at least one file type to process');
      return;
    }

    this.isProcessing = true;
    const processBtn = document.getElementById('process-btn') as HTMLButtonElement;
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const downloadButtons = document.getElementById('download-buttons');

    if (processBtn) {
      processBtn.disabled = true;
      processBtn.innerHTML = '<div class="loading-spinner"></div><span>Processing...</span>';
    }

    if (progressContainer) {
      progressContainer.classList.remove('hidden');
    }

    if (progressBar) {
      progressBar.style.width = '0%';
    }

    if (progressText) {
      progressText.textContent = '0%';
    }

    if (errorMessage) {
      errorMessage.classList.add('hidden');
    }

    if (successMessage) {
      successMessage.classList.add('hidden');
    }

    if (downloadButtons) {
      downloadButtons.classList.add('hidden');
    }

    try {
      this.processedFiles.clear();
      const csvFiles = Array.from(this.selectedFiles).filter(f =>
        f.name.toLowerCase().endsWith('.csv')
      );

      const groups = this.groupFiles(csvFiles);
      const results: string[] = [];

      if (processBets && groups.bets.length > 0) {
        const combined = await this.combineCSVFiles(groups.bets, 'bets');
        if (combined && combined.rowCount > 0) {
          this.processedFiles.set('bets', {
            csv: combined.csv,
            filename: 'bets.csv',
            rowCount: combined.rowCount,
          });
          results.push(`Bets: ${combined.rowCount} rows`);
        }
      }

      if (processTransactions) {
        if (groups.deposits.length > 0) {
          const combined = await this.combineCSVFiles(groups.deposits, 'deposits');
          if (combined && combined.rowCount > 0) {
            this.processedFiles.set('deposits', {
              csv: combined.csv,
              filename: 'deposit.csv',
              rowCount: combined.rowCount,
            });
            results.push(`Deposits: ${combined.rowCount} rows`);
          }
        }

        if (groups.withdrawals.length > 0) {
          const combined = await this.combineCSVFiles(groups.withdrawals, 'withdrawals');
          if (combined && combined.rowCount > 0) {
            this.processedFiles.set('withdrawals', {
              csv: combined.csv,
              filename: 'withdrawal.csv',
              rowCount: combined.rowCount,
            });
            results.push(`Withdrawals: ${combined.rowCount} rows`);
          }
        }
      }

      if (results.length === 0) {
        this.showError('No valid data found in the selected files');
      } else {
        if (successMessage) {
          successMessage.textContent = `Successfully processed files: ${results.join(', ')}`;
          successMessage.classList.remove('hidden');
        }
        this.showDownloadButtons();
      }
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Failed to process files');
    } finally {
      this.isProcessing = false;
      if (processBtn) {
        processBtn.disabled = false;
        processBtn.innerHTML = '<span>Process Files</span>';
      }
    }
  }

  private async combineCSVFiles(
    files: File[],
    fileType: string
  ): Promise<{ csv: string; rowCount: number } | null> {
    if (files.length === 0 || !this.worker) return null;

    const convertCurrency =
      (document.getElementById('convert-currency') as HTMLInputElement)?.checked || false;
    const currencyFromSelect = document.getElementById('currency-from') as HTMLSelectElement;
    const currencyColumnsInput = document.getElementById('currency-columns') as HTMLInputElement;

    const currencyFrom = currencyFromSelect?.value || undefined;
    const currencyTo = 'USD';
    const currencyColumns = currencyColumnsInput?.value
      ? currencyColumnsInput.value
          .split(',')
          .map(col => col.trim())
          .filter(col => col.length > 0)
      : undefined;

    return new Promise((resolve, reject) => {
      if (this.currentMessageHandler && this.worker) {
        this.worker.removeEventListener('message', this.currentMessageHandler);
        this.currentMessageHandler = null;
      }

      const messageHandler = (e: MessageEvent) => {
        const { type, progress, data, error } = e.data;

        if (type === 'progress') {
          this.updateProgress(progress);
        } else if (type === 'complete') {
          if (this.worker && this.currentMessageHandler) {
            this.worker.removeEventListener('message', this.currentMessageHandler);
            this.currentMessageHandler = null;
          }
          resolve(data);
        } else if (type === 'error') {
          if (this.worker && this.currentMessageHandler) {
            this.worker.removeEventListener('message', this.currentMessageHandler);
            this.currentMessageHandler = null;
          }
          reject(new Error(error));
        }
      };

      this.currentMessageHandler = messageHandler;

      Promise.all(files.map(f => f.text().then(content => ({ name: f.name, content }))))
        .then(contents => {
          if (!this.worker) {
            reject(new Error('Worker not available'));
            return;
          }

          this.worker.addEventListener('message', messageHandler);

          this.worker.postMessage({
            type: 'process',
            data: {
              files: contents,
              fileType,
              convertCurrency,
              currencyFrom,
              currencyTo,
              currencyColumns,
            },
          });
        })
        .catch(error => {
          if (this.worker && this.currentMessageHandler) {
            this.worker.removeEventListener('message', this.currentMessageHandler);
            this.currentMessageHandler = null;
          }
          reject(error);
        });
    });
  }

  private downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private updateProgress(progress: number): void {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }
  }

  private showError(message: string): void {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  private showDownloadButtons(): void {
    const downloadButtons = document.getElementById('download-buttons');
    const downloadList = document.getElementById('download-list');

    if (!downloadButtons || !downloadList || this.processedFiles.size === 0) return;

    downloadList.innerHTML = '';

    const fileTypeIcons: Record<string, string> = {
      bets: 'text-primary-400',
      deposits: 'text-green-400',
      withdrawals: 'text-red-400',
    };

    const fileTypeLabels: Record<string, string> = {
      bets: 'Bets',
      deposits: 'Deposits',
      withdrawals: 'Withdrawals',
    };

    this.processedFiles.forEach((data, key) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className =
        'w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-between group';

      const colorClass = fileTypeIcons[key] || 'text-slate-400';
      const label = fileTypeLabels[key] || key;

      button.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <div class="text-left">
            <div class="font-medium text-slate-200">${label}</div>
            <div class="text-xs text-slate-400">${data.rowCount.toLocaleString()} rows</div>
          </div>
        </div>
        <svg class="w-5 h-5 text-slate-400 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      `;

      const clickHandler = () => {
        this.downloadCSV(data.csv, data.filename);
      };
      this.addEventListener(button, 'click', clickHandler);

      downloadList.appendChild(button);
    });

    downloadButtons.classList.remove('hidden');
  }

  private async loadCurrencies(): Promise<void> {
    try {
      console.log('Fetching exchange rates...');
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) {
        console.error('Failed to fetch exchange rates:', response.status, response.statusText);
        return;
      }
      const data = (await response.json()) as { rates: Record<string, number> };
      console.log('Exchange rates received:', Object.keys(data.rates || {}).length, 'currencies');
      if (!data.rates || Object.keys(data.rates).length === 0) {
        console.error('Failed to load exchange rates - empty rates');
        return;
      }
      this.exchangeRates = data.rates;
      console.log('Populating currency dropdowns...');
      this.populateCurrencyDropdowns();
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    }
  }

  private populateCurrencyDropdowns(): void {
    const currencyFromSelect = document.getElementById('currency-from') as HTMLSelectElement;

    if (!currencyFromSelect) {
      console.warn('Currency dropdown element not found');
      return;
    }

    const currencies = ['USD', ...Object.keys(this.exchangeRates).sort()];
    const uniqueCurrencies = [...new Set(currencies)];

    console.log('Populating dropdown with', uniqueCurrencies.length, 'currencies');

    currencyFromSelect.innerHTML = '';

    uniqueCurrencies.forEach(currency => {
      const option = document.createElement('option');
      option.value = currency;
      option.textContent = currency;
      currencyFromSelect.appendChild(option);
    });

    currencyFromSelect.value = 'USD';
    console.log('Currency dropdown populated successfully');
  }

  public destroy(): void {
    this.removeEventListeners();
    if (this.worker) {
      if (this.currentMessageHandler) {
        this.worker.removeEventListener('message', this.currentMessageHandler);
        this.currentMessageHandler = null;
      }
      this.worker.terminate();
      this.worker = null;
    }
    this.isProcessing = false;
  }
}
