import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "./index.css";

console.log("App mounting");

// Use BrowserRouter during development for clean URLs.
// Use HashRouter in production builds so direct URL access and refresh
// work on static hosts that don't provide server-side SPA fallback.
const Router = import.meta.env.PROD ? HashRouter : BrowserRouter;

// Global error handlers: render a visible error message on the page
// instead of a white screen so we can see what's failing at runtime.
function renderFatalError(message: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="padding:24px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;">
      <h2 style="color:#b91c1c">Application error</h2>
      <pre style="white-space:pre-wrap;color:#111;background:#fee2e2;padding:12px;border-radius:6px;">${message}</pre>
    </div>
  `;
}

window.addEventListener("error", (ev) => {
  try {
    renderFatalError(String(ev.error ?? ev.message ?? "Unknown error"));
  } catch (e) {
    // ignore
  }
});

window.addEventListener("unhandledrejection", (ev) => {
  try {
    renderFatalError(String((ev.reason && ev.reason.message) || ev.reason || "Unhandled promise rejection"));
  } catch (e) {
    // ignore
  }
});

// Import `App` directly; if there is a compilation or evaluation
// error it will already be surfaced in the console and Vite overlay instead
// of triggering the network error we were seeing during the dynamic import.
import App from "./App";

try {
  createRoot(document.getElementById("root")!).render(
    <Router>
      <App />
    </Router>
  );
} catch (err) {
  // fallback to the same fatal renderer used above.
  renderFatalError(String(err));
}

