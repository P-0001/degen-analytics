import type { FilterOptions, StatsHistoryEntry, StatsResult } from './types';
import { UploadView } from './views/upload';
import { DashboardView } from './views/dashboard';
import { ToolsView } from './views/tools';
import { saveStatsHistory } from './worker/utils';

export class App {
  private container: HTMLElement;
  private currentView: 'upload' | 'dashboard' | 'tools' = 'upload';
  private uploadView: UploadView;
  private dashboardView: DashboardView;
  private toolsView: ToolsView;
  private activeWorker: Worker | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.uploadView = new UploadView(
      this.handleFileProcess.bind(this),
      this.handleLoadHistory.bind(this),
      this.handleNavigateToTools.bind(this)
    );
    this.dashboardView = new DashboardView(this.handleBackToUpload.bind(this));
    this.toolsView = new ToolsView(this.handleBackToUpload.bind(this));
  }

  private async handleFileProcess(file: File, options: FilterOptions): Promise<void> {
    // Terminate any existing worker to prevent race conditions
    if (this.activeWorker) {
      this.activeWorker.onmessage = null;
      this.activeWorker.onerror = null;
      this.activeWorker.terminate();
      this.activeWorker = null;
    }

    let fileContent: string;
    let depositContent: string | undefined;
    let withdrawalContent: string | undefined;

    try {
      fileContent = await file.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read file';
      this.uploadView.showError(`Main file reading error: ${message}`);
      throw error;
    }

    try {
      if (options.depositFile) {
        depositContent = await options.depositFile.text();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read file';
      this.uploadView.showError(`Deposit file reading error: ${message}`);
      throw error;
    }

    try {
      if (options.withdrawalFile) {
        withdrawalContent = await options.withdrawalFile.text();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read file';
      this.uploadView.showError(`Withdrawal file reading error: ${message}`);
      throw error;
    }

    const worker = new Worker(new URL('./worker/stats.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.activeWorker = worker;

    return new Promise((resolve, reject) => {
      worker.onmessage = async e => {
        const { type, data, progress, error } = e.data;

        if (type === 'progress') {
          this.uploadView.updateProgress(progress);
        } else if (type === 'complete') {
          try {
            await saveStatsHistory(data).catch(saveError => {
              console.warn('Failed to save history:', saveError);
            });
            this.currentView = 'dashboard';
            this.dashboardView.setStats(data);
            this.render();
            worker.onmessage = null;
            worker.onerror = null;
            worker.terminate();
            this.activeWorker = null;
            resolve();
          } catch (renderError) {
            this.currentView = 'upload';
            const message = renderError instanceof Error ? renderError.message : 'Rendering failed';
            this.uploadView.showError(`Failed to display results: ${message}`);
            worker.onmessage = null;
            worker.onerror = null;
            worker.terminate();
            this.activeWorker = null;
            reject(renderError);
          }
        } else if (type === 'error') {
          this.uploadView.showError(error);
          worker.onmessage = null;
          worker.onerror = null;
          worker.terminate();
          this.activeWorker = null;
          reject(new Error(error));
        }
      };

      worker.onerror = error => {
        this.uploadView.showError(error.message);
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
        this.activeWorker = null;
        reject(error);
      };

      worker.postMessage({
        type: 'process',
        data: {
          fileContent,
          fileName: file.name,
          options,
          depositContent,
          withdrawalContent,
        },
      });
    });
  }

  private handleLoadHistory(historyEntry: StatsHistoryEntry): void {
    try {
      const deserializedData = this.deserializeStatsData(historyEntry.data);
      if (!this.isValidStatsResult(deserializedData)) {
        throw new Error('Invalid stats data structure');
      }
      this.currentView = 'dashboard';
      this.dashboardView.setStats(deserializedData as StatsResult);
      this.render();
    } catch (error) {
      console.error('Failed to load history entry:', error);
      const message = error instanceof Error ? error.message : 'Failed to load history';
      this.uploadView.showError(`Failed to load history: ${message}`);
    }
  }

  private deserializeStatsData(data: unknown): unknown {
    return JSON.parse(JSON.stringify(data), (key, value) => {
      if ((key === 'time' || key === 'firstBetTime' || key === 'lastBetTime') && value) {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) {
          console.warn(`Invalid date value for key ${key}:`, value);
          return undefined;
        }
        return date;
      }
      return value;
    });
  }

  private isValidStatsResult(data: unknown): data is StatsResult {
    if (!data || typeof data !== 'object') return false;
    const stats = data as Partial<StatsResult>;
    return (
      stats.overall !== undefined &&
      typeof stats.overall === 'object' &&
      Array.isArray(stats.games) &&
      Array.isArray(stats.providers) &&
      stats.streaks !== undefined &&
      stats.betStats !== undefined &&
      Array.isArray(stats.equityCurve)
    );
  }

  private handleNavigateToTools(): void {
    this.currentView = 'tools';
    this.render();
  }

  private handleBackToUpload(): void {
    this.dashboardView.destroy();
    this.currentView = 'upload';
    this.uploadView.reset();
    this.render();
  }

  public render(): void {
    if (this.currentView === 'upload') {
      this.container.innerHTML = this.uploadView.render();
      this.uploadView.attachEventListeners();
    } else if (this.currentView === 'dashboard') {
      this.container.innerHTML = this.dashboardView.render();
      this.dashboardView.attachEventListeners();
    } else if (this.currentView === 'tools') {
      this.container.innerHTML = this.toolsView.render();
      this.toolsView.attachEventListeners();
    }
  }
}
