import { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { errorKey } from "../lib/apiError.js";
import { reportError } from "../lib/reportError.js";
import { useI18n } from "../i18n/index.jsx";

const ToastContext = createContext(null);
export const DISMISS_MS = 5000;

const VARIANTS = {
  error: {
    icon: AlertTriangle,
    cls: "bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900/70 text-rose-700 dark:text-rose-300",
  },
  success: {
    icon: CheckCircle2,
    cls: "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-900/70 text-emerald-700 dark:text-emerald-300",
  },
  info: {
    icon: Info,
    cls: "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200",
  },
};

// Mount inside I18nProvider: showError translates the error code itself, so
// callers pass the caught error straight through.
export function ToastProvider({ children, dismissMs = DISMISS_MS }) {
  const { t } = useI18n();
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((xs) => xs.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  // A toast carries either a literal `message` or a `messageKey` translated at
  // render time. Keeping the key means showError never closes over `t`, so its
  // identity survives a language switch and effects can safely capture it.
  const showToast = useCallback(({ message, messageKey, variant = "info" }) => {
    const id = nextId.current++;
    setToasts((xs) => [...xs, { id, message, messageKey, variant }]);
    timers.current.set(id, setTimeout(() => dismiss(id), dismissMs));
    return id;
  }, [dismiss, dismissMs]);

  // The server message is English prose and not user-facing, so show the
  // translated key for the code instead.
  const showError = useCallback((err) => {
    reportError(err);
    return showToast({ messageKey: errorKey(err), variant: "error" });
  }, [showToast]);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showError, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, cls } = VARIANTS[toast.variant] ?? VARIANTS.info;
            return (
              <motion.div
                key={toast.id}
                role="alert"
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className={`pointer-events-auto flex items-start gap-2 max-w-xs rounded-lg border px-3 py-2 text-xs shadow-lg ${cls}`}
              >
                <Icon size={14} className="mt-0.5 shrink-0" />
                <span className="flex-1">
                  {toast.messageKey ? t(toast.messageKey) : toast.message}
                </span>
                <button
                  onClick={() => dismiss(toast.id)}
                  aria-label={t("error.dismiss")}
                  className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside a ToastProvider");
  return ctx;
}
