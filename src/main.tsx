import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import './i18n' // 👈 importa esto antes de usar traducciones

createRoot(document.getElementById("root")!).render(<App />);
