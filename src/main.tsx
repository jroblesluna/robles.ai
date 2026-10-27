import { createRoot, hydrateRoot } from 'react-dom/client';
import { Root } from './Root';
import './index.css';
import i18n, { initI18n } from './i18n';
import { captureAttribution } from './lib/attribution';

captureAttribution();

async function renderApp() {
  await initI18n();
  const root = document.getElementById('root')!;
  const app = <Root instance={i18n} path={window.location.pathname + window.location.search} />;
  if (root.dataset.renderMode === 'hydrate') hydrateRoot(root, app);
  else createRoot(root).render(app);
}
void renderApp();
