import './style.css';
import { App } from './app';

const appContainer = document.getElementById('app');
if (!appContainer) {
  throw new Error('App container not found');
}
const app = new App(appContainer);
app.render();
