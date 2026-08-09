import React from "react";
import { useI18n } from "../i18n/index.jsx";
import { reportError } from "../lib/reportError.js";
import Btn from "./Btn.jsx";

// The fallback needs `t`, so the boundary sits INSIDE I18nProvider. The tradeoff:
// a provider that throws is not caught here. Better than hardcoding Spanish.
function Fallback() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center bg-white dark:bg-zinc-950">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
        {t("error.boundaryTitle")}
      </h1>
      <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm">
        {t("error.boundaryBody")}
      </p>
      <Btn variant="primary" size="md" onClick={() => window.location.reload()}>
        {t("error.reload")}
      </Btn>
    </div>
  );
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack });
  }

  render() {
    if (this.state.hasError) return <Fallback />;
    return this.props.children;
  }
}
