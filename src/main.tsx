import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initI18n } from './i18n'; // 👈 ahora es una función async

const renderApp = async () => {
  //console.log("main.tsx: awaiting initI18n() to finish");
  await initI18n(); // 👈 inicializa i18next antes de renderizar
  //console.log("main.tsx: initI18n() finished, now rendering App");

  createRoot(document.getElementById("root")!).render(
    <App />
  );
};

renderApp();
