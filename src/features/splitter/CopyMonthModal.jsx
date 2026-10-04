import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/index.jsx";
import { copySplitterMonth } from "../../api.js";
import { errorKey } from "../../lib/apiError.js";
import { reportError } from "../../lib/reportError.js";
import { toMonthKey, fmtMonth } from "../../lib/utils.js";
import Modal from "../../components/Modal.jsx";
import Btn from "../../components/Btn.jsx";
import MonthYearPicker from "../../components/MonthYearPicker.jsx";

const prevMonth = (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1);

// Month copy into the viewed month. Every source pick runs a dry run, so the
// counts shown are the ones the real copy will produce. Mount it only while
// open, so each opening starts again from the previous month.
export default function CopyMonthModal({ targetDate, onClose, onCopied }) {
  const { t, lang } = useI18n();
  const [sourceDate, setSourceDate] = useState(() => prevMonth(targetDate));
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [copying, setCopying] = useState(false);

  const sourceKey = toMonthKey(sourceDate);
  const targetKey = toMonthKey(targetDate);
  const sameMonth = sourceKey === targetKey;
  const monthLocale = lang === "en" ? "en-US" : "es-ES";

  useEffect(() => {
    setPreview(null);
    setError(null);
    if (sameMonth) return;
    // A slower answer for an earlier pick must not overwrite the current one.
    let stale = false;
    copySplitterMonth(sourceKey, targetKey, true)
      .then((counts) => { if (!stale) setPreview(counts); })
      .catch((e) => { if (!stale) { reportError(e); setError(e); } });
    return () => { stale = true; };
  }, [sourceKey, targetKey, sameMonth]);

  const handleCopy = async () => {
    setCopying(true);
    setError(null);
    try {
      await copySplitterMonth(sourceKey, targetKey);
      onCopied();
    } catch (e) {
      reportError(e);
      setError(e);
      setCopying(false);
    }
  };

  const canCopy = !copying && !sameMonth && preview?.to_copy > 0;
  const counts = preview && [
    { label: t("splitter.copyToCopy"), value: preview.to_copy },
    { label: t("splitter.copySkippedMatching"), value: preview.skipped_matching },
    { label: t("splitter.copySkippedOrphan"), value: preview.skipped_orphan },
  ];

  return (
    <Modal open onClose={onClose}
      title={t("splitter.copyFromMonth")}
      actions={<>
        <Btn onClick={onClose}>{t("btn.cancel")}</Btn>
        <Btn variant="primary" size="md" onClick={handleCopy} disabled={!canCopy}>{t("splitter.copyAction")}</Btn>
      </>}
    >
      <div className="space-y-3 mb-2">
        <MonthYearPicker viewDate={sourceDate} onSelect={setSourceDate} />
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 dark:text-zinc-400 text-center">
          {fmtMonth(sourceDate, monthLocale)} → {fmtMonth(targetDate, monthLocale)}
        </div>
        {sameMonth ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">{t("splitter.copySameMonth")}</p>
        ) : counts ? (
          <dl className="space-y-1 text-xs">
            {counts.map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-slate-500 dark:text-zinc-400">{label}</dt>
                <dd className="font-mono font-semibold text-slate-800 dark:text-zinc-100">{value}</dd>
              </div>
            ))}
          </dl>
        ) : !error && (
          <p className="text-xs text-slate-400 dark:text-zinc-500">{t("state.loading")}</p>
        )}
        {error && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{t(errorKey(error))}</p>
        )}
      </div>
    </Modal>
  );
}
