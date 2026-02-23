import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPWAUpdater } from "./lib/pwaUpdater";

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('snookos-theme');
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
}

// Initialize PWA update detection
initPWAUpdater();

createRoot(document.getElementById("root")!).render(<App />);
