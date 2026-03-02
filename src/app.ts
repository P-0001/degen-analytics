import type { StatsResult, FilterOptions } from './types';
import { UploadView } from './views/upload';
import { DashboardView } from './views/dashboard';

export class App {
  private container: HTMLElement;
  private currentView: 'upload' | 'dashboard' = 'upload';
  private uploadView: UploadView;
  private dashboardView: DashboardView;
  private stats: StatsResult | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.uploadView = new UploadView(this.handleFileProcess.bind(this));
    this.dashboardView = new DashboardView(this.handleBackToUpload.bind(this));
  }

  private async handleFileProcess(file: File, options: FilterOptions): Promise<void> {
    const fileContent = await file.text();
    
    const worker = new Worker(
      new URL('./worker/stats.worker.ts', import.meta.url),
      { type: 'module' }
    );

    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        const { type, data, progress, error } = e.data;

        if (type === 'progress') {
          this.uploadView.updateProgress(progress);
        } else if (type === 'complete') {
          this.stats = data;
          this.currentView = 'dashboard';
          this.dashboardView.setStats(data, options);
          this.render();
          worker.terminate();
          resolve();
        } else if (type === 'error') {
          this.uploadView.showError(error);
          worker.terminate();
          reject(new Error(error));
        }
      };

      worker.onerror = (error) => {
        this.uploadView.showError(error.message);
        worker.terminate();
        reject(error);
      };

      worker.postMessage({
        type: 'process',
        data: { fileContent, fileName: file.name, options }
      });
    });
  }

  private handleBackToUpload(): void {
    this.currentView = 'upload';
    this.stats = null;
    this.render();
  }

  public render(): void {
    if (this.currentView === 'upload') {
      this.container.innerHTML = this.uploadView.render();
      this.uploadView.attachEventListeners();
    } else {
      this.container.innerHTML = this.dashboardView.render();
      this.dashboardView.attachEventListeners();
    }
  }
}
