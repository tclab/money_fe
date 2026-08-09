import "./storage.js";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./auth/index.jsx";
import { I18nProvider } from "./i18n/index.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

// The boundary and the toasts both need `t`, so both sit inside I18nProvider.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <I18nProvider>
        <ToastProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </AuthProvider>
  </React.StrictMode>
);
