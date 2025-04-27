import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initI18n } from './i18n'; // 👈 ahora es una función async

const renderApp = async () => {
  await initI18n(); // 👈 inicializa i18next antes de renderizar

  createRoot(document.getElementById("root")!).render(
    <App />
  );
};

renderApp();
