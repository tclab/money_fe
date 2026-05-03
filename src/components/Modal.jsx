import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Modal({ open, onClose, title, description, children, actions }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100 mb-1">{title}</h3>
          {description && <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">{description}</p>}
          {children}
          <div className="flex gap-2 justify-end mt-6">{actions}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
