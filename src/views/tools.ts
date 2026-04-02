import toolsTemplate from '../templates/tools.hbs?raw';
import Handlebars from 'handlebars';

export class ToolsView {
  private onBack: () => void;

  constructor(onBack: () => void) {
    this.onBack = onBack;
  }

  public render(): string {
    const template = Handlebars.compile(toolsTemplate);
    return template({});
  }

  public attachEventListeners(): void {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', this.onBack);
    }
  }

  public destroy(): void {}
}
