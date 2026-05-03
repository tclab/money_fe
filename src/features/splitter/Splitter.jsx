import { useState, useEffect, useRef } from "react";
import { Plus, Cloud, Camera, Check } from "lucide-react";
import { useI18n } from "../../i18n/index.jsx";
import { cn, toMonthKey, fmt, fmtMonth } from "../../lib/utils.js";
import {
  fetchSplitters, createSplitter, updateSplitter, deleteSplitter,
  fetchPeople, createPerson, updatePerson,
  addPersonToFeature, removePersonFromFeature,
} from "../../api.js";
import Modal from "../../components/Modal.jsx";
import Btn from "../../components/Btn.jsx";

const SPLITTER_COLORS = ["#10b981", "#8b5cf6", "#f59e0b", "#3b82f6", "#f43f5e", "#06b6d4"];

function StatBadge({ label, value, color, big, locale, currency }) {
  return (
    <div className="text-right">
      <div className="text-[9px] font-mono font-semibold tracking-widest uppercase text-slate-400 dark:text-zinc-600">{label}</div>
      <div className="font-mono font-semibold mt-0.5" style={{ fontSize: big ? 20 : 13, color }}>{fmt(value, locale, currency)}</div>
    </div>
  );
}

function SplitterColumn({ title, total, color, rows, labelKey, valueKey, onEdit, onAdd, locale, currency, t, people }) {
  const getPersonBadge = (row) => {
    if (!row.person_id || !people) return null;
    const person = people.find((p) => p.id === row.person_id);
    if (!person) return null;
    const initials = person.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
    return (
      <span className="w-5 h-5 rounded-full grid place-items-center text-[9px] font-bold shrink-0"
        style={{ background: `${person.color}22`, color: person.color, border: `1px solid ${person.color}55`, lineHeight: 1 }}>
        {initials}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color }}>{title}</span>
        <span className="font-mono text-xs font-semibold" style={{ color }}>{fmt(total, locale, currency)}</span>
      </div>
      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
        {rows.map((r, i) => (
          <div
            key={i}
            onClick={() => onEdit(i)}
            className="flex gap-1.5 items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-md px-2 py-1.5 -mx-2 transition-colors"
          >
            {getPersonBadge(r)}
            <span className="flex-1 text-xs text-slate-800 dark:text-zinc-100 truncate">{r[labelKey] || "—"}</span>
            <span className="font-mono text-xs text-slate-600 dark:text-zinc-300 shrink-0">{fmt(r[valueKey], locale, currency)}</span>
          </div>
        ))}
        <button onClick={onAdd} className="mt-1 border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 text-xs py-1.5 px-2 transition flex items-center gap-1 justify-center">
          <Plus size={11} /> {t("splitter.addRow")}
        </button>
      </div>
    </div>
  );
}

export default function Splitter() {
  const { t, locale, currency, lang, theme } = useI18n();
  const today = new Date();
  const monthKey = toMonthKey(today);

  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editModal, setEditModal] = useState(null);
  const [createModal, setCreateModal] = useState(null);
  const [amountFocused, setAmountFocused] = useState(false);

  const [addPersonModal, setAddPersonModal] = useState(false);
  const [personCreateForm, setPersonCreateForm] = useState(null);
  const [editPersonModal, setEditPersonModal] = useState(null);
  const [captureStatus, setCaptureStatus] = useState("idle");
  const captureRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [splitterData, peopleData, allPeopleData] = await Promise.all([
          fetchSplitters(),
          fetchPeople("splitter"),
          fetchPeople(),
        ]);
        setItems(splitterData);
        setPeople(peopleData.length > 0 ? peopleData : []);
        setAllPeople(allPeopleData);
      } catch (e) {
        console.error("Failed to load splitter data:", e);
        setItems([]);
        setPeople([]);
        setAllPeople([]);
      }
      setLoading(false);
    })();
  }, []);

  const entradas = items.filter((i) => i.type === "income");
  const salidas = items.filter((i) => i.type === "expense");
  const descuentos = items.filter((i) => i.type === "discount");

  const totalEntradas = entradas.reduce((s, e) => s + (e.value || 0), 0);
  const totalSalidas = salidas.reduce((s, e) => s + (e.value || 0), 0);
  const totalDesc = descuentos.reduce((s, e) => s + (e.value || 0), 0);
  const neto = totalEntradas - totalSalidas;
  const pool = neto;
  const totalShares = people.reduce((s, p) => s + (p.share || 0), 0);

  const perPerson = people.map((p) => {
    const pct = totalShares > 0 ? p.share / totalShares : 0;
    const personDiscounts = descuentos
      .filter((d) => d.person_id === p.id)
      .reduce((sum, d) => sum + (d.value || 0), 0);
    const initials = p.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
    return { ...p, pct, amount: (pool * pct) - personDiscounts, discounts: personDiscounts, initials };
  });

  const unlinkedPeople = allPeople.filter((p) => !people.find((q) => q.id === p.id));

  const openCreate = (type) => {
    setCreateModal({ type, label: "", value: 0, person_id: type === "discount" && people.length > 0 ? people[0].id : null });
    setAmountFocused(false);
  };

  const handleCreate = async () => {
    if (!createModal) return;
    const { type, label, value, person_id } = createModal;
    const position = items.filter((i) => i.type === type).length;
    setCreateModal(null);
    try {
      const created = await createSplitter(type, label || t("splitter.newRow"), value, position, type === "discount" ? person_id : null);
      setItems((xs) => [...xs, created]);
    } catch (e) {
      console.error("Failed to create splitter:", e);
    }
  };

  const openEdit = (type, rows, index) => {
    const row = rows[index];
    setEditModal({ type, id: row.id, label: row.label, value: row.value, person_id: row.person_id || null });
    setAmountFocused(false);
  };

  const handleEdit = async () => {
    if (!editModal) return;
    const { id, label, value, person_id, type } = editModal;
    setEditModal(null);
    setItems((xs) => xs.map((x) => x.id === id ? { ...x, label, value, person_id } : x));
    try {
      const patch = { label, value };
      if (type === "discount") patch.person_id = person_id;
      await updateSplitter(id, patch);
    } catch (e) {
      console.error("Failed to update splitter:", e);
    }
  };

  const handleDelete = async () => {
    if (!editModal) return;
    const { id } = editModal;
    setEditModal(null);
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      await deleteSplitter(id);
    } catch (e) {
      console.error("Failed to delete splitter:", e);
    }
  };

  const openAddPerson = () => {
    const idx = allPeople.length;
    const color = SPLITTER_COLORS[idx % SPLITTER_COLORS.length];
    setAddPersonModal(true);
    if (unlinkedPeople.length === 0) {
      setPersonCreateForm({ name: "", color, share: 50 });
    } else {
      setPersonCreateForm(null);
    }
  };

  const closeAddPersonModal = () => {
    setAddPersonModal(false);
    setPersonCreateForm(null);
  };

  const handleSelectPerson = async (person) => {
    closeAddPersonModal();
    setPeople((ps) => [...ps, person]);
    try {
      await addPersonToFeature(person.id, "splitter");
    } catch (e) {
      console.error("Failed to associate person:", e);
    }
  };

  const handleCreatePerson = async () => {
    if (!personCreateForm) return;
    const { name, color, share } = personCreateForm;
    const position = allPeople.length;
    closeAddPersonModal();
    try {
      const created = await createPerson(name || t("splitter.newRow"), color, share, position);
      await addPersonToFeature(created.id, "splitter");
      setPeople((ps) => [...ps, created]);
      setAllPeople((ps) => [...ps, created]);
    } catch (e) {
      console.error("Failed to create person:", e);
    }
  };

  const openEditPerson = (index) => {
    const p = people[index];
    setEditPersonModal({ id: p.id, name: p.name, color: p.color, share: p.share, index });
  };

  const handleEditPerson = async () => {
    if (!editPersonModal) return;
    const { id, name, color, share } = editPersonModal;
    setEditPersonModal(null);
    setPeople((ps) => ps.map((p) => p.id === id ? { ...p, name, color, share } : p));
    try {
      await updatePerson(id, { name, color, share });
    } catch (e) {
      console.error("Failed to update person:", e);
    }
  };

  const handleRemoveFromSplitter = async () => {
    if (!editPersonModal) return;
    const { id } = editPersonModal;
    setEditPersonModal(null);
    setPeople((ps) => ps.filter((p) => p.id !== id));
    try {
      await removePersonFromFeature(id, "splitter");
    } catch (e) {
      console.error("Failed to remove person from splitter:", e);
    }
  };

  const fmtShort = (n) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
    return String(Math.round(n));
  };

  const handleCapture = async () => {
    if (captureStatus !== "idle") return;
    setCaptureStatus("generating");
    try {
      if (!window.html2canvas) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
      }
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await window.html2canvas(captureRef.current, { backgroundColor: "#ffffff", scale: 2 });
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setCaptureStatus("copied");
          setTimeout(() => setCaptureStatus("idle"), 2000);
        } catch {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `splitter-${monthKey}.png`; a.click();
          URL.revokeObjectURL(url);
          setCaptureStatus("idle");
        }
      }, "image/png");
    } catch (e) {
      console.error("Capture failed:", e);
      setCaptureStatus("idle");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-fade-in" style={{ fontVariantNumeric: "tabular-nums" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-end">
        <div className="flex items-end gap-3">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{fmtMonth(today, lang === "en" ? "en-US" : "es-ES")}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-zinc-50 font-mono tracking-tight mt-1">{t("nav.splitter")}</div>
          </div>
          <button
            onClick={handleCapture}
            disabled={captureStatus !== "idle"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all",
              captureStatus === "copied"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300"
            )}
          >
            {captureStatus === "generating" ? (
              <><Cloud size={14} className="animate-pulse" /> {t("btn.generating")}</>
            ) : captureStatus === "copied" ? (
              <><Check size={14} /> {t("btn.copied")}</>
            ) : (
              <><Camera size={14} /> {t("btn.capture")}</>
            )}
          </button>
        </div>
        <div className="flex gap-5 items-center">
          <StatBadge label={t("splitter.neto")} value={neto} color={neto >= 0 ? "#34d399" : "#f87171"} locale={locale} currency={currency} />
          <StatBadge label={t("splitter.discounts")} value={totalDesc} color="#fbbf24" locale={locale} currency={currency} />
          <StatBadge label={t("splitter.pool")} value={pool} color="#60a5fa" locale={locale} currency={currency} big />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <SplitterColumn
            title={t("splitter.entradas")} total={totalEntradas} color="#34d399"
            rows={entradas} labelKey="label" valueKey="value"
            onEdit={(i) => openEdit("income", entradas, i)}
            onAdd={() => openCreate("income")}
            locale={locale} currency={currency} t={t}
          />
          <SplitterColumn
            title={t("splitter.salidas")} total={totalSalidas} color="#f87171"
            rows={salidas} labelKey="label" valueKey="value"
            onEdit={(i) => openEdit("expense", salidas, i)}
            onAdd={() => openCreate("expense")}
            locale={locale} currency={currency} t={t}
          />
          <SplitterColumn
            title={t("splitter.discounts")} total={totalDesc} color="#fbbf24"
            rows={descuentos} labelKey="label" valueKey="value"
            onEdit={(i) => openEdit("discount", descuentos, i)}
            onAdd={() => openCreate("discount")}
            locale={locale} currency={currency} t={t} people={people}
          />

          <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-700">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-blue-500">{t("splitter.people")} · {people.length}</span>
              <span className="font-mono text-xs font-semibold text-blue-500">{fmt(pool, locale, currency)}</span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {perPerson.map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => openEditPerson(i)}
                  className="rounded-xl p-2.5 flex flex-col gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: `${p.color}14`, border: `1px solid ${p.color}33` }}
                >
                  <div className="flex gap-2 items-center">
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        position: 'relative',
                        background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}55`
                      }}>
                      <span style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 10, fontWeight: 'bold', lineHeight: 1,
                        whiteSpace: 'nowrap'
                      }}>{p.initials}</span>
                    </div>
                    <span className="flex-1 text-xs text-slate-800 dark:text-zinc-100 truncate">{p.name}</span>
                    <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500">{p.share}%</span>
                  </div>
                  <div className="flex justify-between text-xs pl-9">
                    <span className="text-slate-400 dark:text-zinc-600">{Math.round(p.pct * 100)}% {t("splitter.ofPool")}</span>
                    <span className="font-mono font-semibold" style={{ color: p.color }}>{fmt(p.amount, locale, currency)}</span>
                  </div>
                  {p.features?.length > 0 && (
                    <div className="flex gap-1 pl-9">
                      {p.features.map((f) => (
                        <span
                          key={f}
                          className="text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: `${p.color}22`, color: p.color }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={openAddPerson}
                className="mt-1 border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 text-xs py-1.5 px-2 transition flex items-center gap-1 justify-center"
              >
                <Plus size={11} /> {t("splitter.addPerson")}
              </button>
            </div>
          </div>
        </div>

        {perPerson.length > 0 && pool > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-mono font-semibold tracking-widest text-slate-400 dark:text-zinc-600 uppercase">{t("splitter.distribution")}</div>
            <div className="h-8 rounded-lg overflow-hidden flex border border-slate-200 dark:border-zinc-800">
              {perPerson.map((p) => (
                <div key={p.id}
                  className="flex items-center justify-center text-[11px] font-bold overflow-hidden whitespace-nowrap px-1"
                  style={{ flex: p.amount || 0.0001, background: p.color, color: "#fff" }}>
                  {p.amount > pool * 0.08 ? `${p.name} · ${fmtShort(p.amount)}` : ""}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={!!createModal} onClose={() => setCreateModal(null)}
        title={createModal?.type === "income" ? t("splitter.entradas") : createModal?.type === "expense" ? t("splitter.salidas") : t("splitter.discounts")}
        actions={<>
          <Btn onClick={() => setCreateModal(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleCreate}>{t("btn.save")}</Btn>
        </>}
      >
        {createModal && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.concept")}</label>
              <input
                type="text"
                value={createModal.label}
                onChange={(e) => setCreateModal((p) => ({ ...p, label: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.value")}</label>
              {amountFocused ? (
                <input
                  type="number"
                  value={createModal.value || ""}
                  autoFocus
                  onChange={(e) => setCreateModal((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
                  onBlur={() => setAmountFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
                />
              ) : (
                <input
                  readOnly
                  value={createModal.value === 0 ? "" : fmt(createModal.value, locale, currency)}
                  onFocus={() => setAmountFocused(true)}
                  placeholder="0"
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right cursor-text"
                />
              )}
            </div>
            {createModal.type === "discount" && people.length > 0 && (
              <div>
                <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("splitter.people")}</label>
                <select
                  value={createModal.person_id || ""}
                  onChange={(e) => setCreateModal((p) => ({ ...p, person_id: e.target.value || null }))}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)}
        title={editModal?.type === "income" ? t("splitter.entradas") : editModal?.type === "expense" ? t("splitter.salidas") : t("splitter.discounts")}
        actions={<>
          <Btn variant="danger" onClick={handleDelete}>{t("btn.delete")}</Btn>
          <Btn onClick={() => setEditModal(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleEdit}>{t("btn.save")}</Btn>
        </>}
      >
        {editModal && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.concept")}</label>
              <input
                type="text"
                value={editModal.label}
                onChange={(e) => setEditModal((p) => ({ ...p, label: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.value")}</label>
              {amountFocused ? (
                <input
                  type="number"
                  value={editModal.value || ""}
                  autoFocus
                  onChange={(e) => setEditModal((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
                  onBlur={() => setAmountFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
                />
              ) : (
                <input
                  readOnly
                  value={editModal.value === 0 ? "" : fmt(editModal.value, locale, currency)}
                  onFocus={() => setAmountFocused(true)}
                  placeholder="0"
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right cursor-text"
                />
              )}
            </div>
            {editModal.type === "discount" && people.length > 0 && (
              <div>
                <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("splitter.people")}</label>
                <select
                  value={editModal.person_id || ""}
                  onChange={(e) => setEditModal((p) => ({ ...p, person_id: e.target.value || null }))}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add person modal */}
      <Modal open={addPersonModal} onClose={closeAddPersonModal}
        title={t("splitter.addPerson")}
        actions={<>
          <Btn onClick={closeAddPersonModal}>{t("btn.cancel")}</Btn>
          {personCreateForm && <Btn variant="primary" size="md" onClick={handleCreatePerson}>{t("btn.save")}</Btn>}
        </>}
      >
        <div className="space-y-3 mb-2">
          {unlinkedPeople.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{t("splitter.addExisting")}</label>
              {unlinkedPeople.map((p) => {
                const initials = p.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPerson(p)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 transition-colors text-left w-full"
                  >
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${p.color}22`, border: `1px solid ${p.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "bold", color: p.color, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <span className="text-sm text-slate-800 dark:text-zinc-100">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {unlinkedPeople.length > 0 && !personCreateForm && (
            <button
              onClick={() => {
                const idx = allPeople.length;
                setPersonCreateForm({ name: "", color: SPLITTER_COLORS[idx % SPLITTER_COLORS.length], share: 50 });
              }}
              className="w-full border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 text-xs py-1.5 px-2 transition flex items-center gap-1 justify-center"
            >
              <Plus size={11} /> {t("splitter.createNew")}
            </button>
          )}

          {personCreateForm && (
            <div className={`space-y-3 ${unlinkedPeople.length > 0 ? "border-t border-slate-200 dark:border-zinc-700 pt-3" : ""}`}>
              {unlinkedPeople.length > 0 && (
                <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{t("splitter.createNew")}</label>
              )}
              <div>
                <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  value={personCreateForm.name}
                  onChange={(e) => setPersonCreateForm((p) => ({ ...p, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCreatePerson()}
                  autoFocus
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                />
              </div>
              <div>
                <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Share %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={personCreateForm.share}
                  onChange={(e) => setPersonCreateForm((p) => ({ ...p, share: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
                />
              </div>
              <div>
                <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Color</label>
                <div className="flex gap-2">
                  {SPLITTER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setPersonCreateForm((p) => ({ ...p, color: c }))}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: personCreateForm.color === c ? "#fff" : "transparent", boxShadow: personCreateForm.color === c ? `0 0 0 2px ${c}` : "none" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit person modal */}
      <Modal open={!!editPersonModal} onClose={() => setEditPersonModal(null)}
        title={t("splitter.people")}
        actions={<>
          <Btn variant="danger" onClick={handleRemoveFromSplitter}>{t("splitter.removeFromSplitter")}</Btn>
          <Btn onClick={() => setEditPersonModal(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleEditPerson}>{t("btn.save")}</Btn>
        </>}
      >
        {editPersonModal && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Name</label>
              <input
                type="text"
                value={editPersonModal.name}
                onChange={(e) => setEditPersonModal((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleEditPerson()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Share %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editPersonModal.share}
                onChange={(e) => setEditPersonModal((p) => ({ ...p, share: parseInt(e.target.value) || 0 }))}
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Color</label>
              <div className="flex gap-2">
                {SPLITTER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditPersonModal((p) => ({ ...p, color: c }))}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: editPersonModal.color === c ? "#fff" : "transparent", boxShadow: editPersonModal.color === c ? `0 0 0 2px ${c}` : "none" }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden capture layout */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {(() => {
          const isDark = theme === "dark";
          const bg = isDark ? "#18181b" : "#fff";
          const cardBg = isDark ? "#27272a" : "#f8fafc";
          const border = isDark ? "#3f3f46" : "#e2e8f0";
          const textPrimary = isDark ? "#fafafa" : "#1e293b";
          const textSecondary = isDark ? "#a1a1aa" : "#475569";
          const textMuted = isDark ? "#71717a" : "#94a3b8";

          const getPersonBadge = (row) => {
            if (!row.person_id) return null;
            const person = people.find((p) => p.id === row.person_id);
            if (!person) return null;
            const initials = person.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
            return (
              <svg width="20" height="20" style={{ flexShrink: 0 }}>
                <circle cx="10" cy="10" r="9.5" fill={`${person.color}22`} stroke={`${person.color}55`} strokeWidth="1"/>
                <text x="10" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill={person.color} fontFamily="inherit">{initials}</text>
              </svg>
            );
          };

          return (
            <div ref={captureRef} style={{ width: 500, padding: 24, background: bg, fontFamily: "ui-monospace, monospace" }}>
              {/* Header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: 2 }}>{fmtMonth(today, lang === "en" ? "en-US" : "es-ES")}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary }}>{t("nav.splitter")}</div>
                  <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: textMuted, textTransform: "uppercase" }}>{t("splitter.neto")}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: neto >= 0 ? "#34d399" : "#f87171" }}>{fmt(neto, locale, currency)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: textMuted, textTransform: "uppercase" }}>{t("splitter.discounts")}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#fbbf24" }}>{fmt(totalDesc, locale, currency)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: textMuted, textTransform: "uppercase" }}>{t("splitter.pool")}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa" }}>{fmt(pool, locale, currency)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Entradas */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#34d399", textTransform: "uppercase", letterSpacing: 1 }}>{t("splitter.entradas")}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#34d399" }}>{fmt(totalEntradas, locale, currency)}</span>
                </div>
                {entradas.map((e, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i > 0 ? `1px dashed ${border}` : "none" }}>
                    <span style={{ fontSize: 12, color: textSecondary }}>{e.label}</span>
                    <span style={{ fontSize: 12, color: textMuted }}>{fmt(e.value, locale, currency)}</span>
                  </div>
                ))}
              </div>

              {/* Salidas */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#f87171", textTransform: "uppercase", letterSpacing: 1 }}>{t("splitter.salidas")}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#f87171" }}>{fmt(totalSalidas, locale, currency)}</span>
                </div>
                {salidas.map((e, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i > 0 ? `1px dashed ${border}` : "none" }}>
                    <span style={{ fontSize: 12, color: textSecondary }}>{e.label}</span>
                    <span style={{ fontSize: 12, color: textMuted }}>{fmt(e.value, locale, currency)}</span>
                  </div>
                ))}
              </div>

              {/* Descuentos */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#fbbf24", textTransform: "uppercase", letterSpacing: 1 }}>{t("splitter.discounts")}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24" }}>{fmt(totalDesc, locale, currency)}</span>
                </div>
                {descuentos.map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i > 0 ? `1px dashed ${border}` : "none" }}>
                    {getPersonBadge(e)}
                    <span style={{ flex: 1, fontSize: 12, color: textSecondary }}>{e.label}</span>
                    <span style={{ fontSize: 12, color: textMuted }}>{fmt(e.value, locale, currency)}</span>
                  </div>
                ))}
              </div>

              {/* People */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#60a5fa", textTransform: "uppercase", letterSpacing: 1 }}>{t("splitter.people")} · {people.length}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#60a5fa" }}>{fmt(pool, locale, currency)}</span>
                </div>
                {perPerson.map((p, i) => (
                  <div key={p.id} style={{ background: `${p.color}14`, border: `1px solid ${p.color}33`, borderRadius: 10, padding: 10, marginTop: i > 0 ? 8 : 0 }}>
                    <svg width="100%" height="24" style={{ display: "block" }}>
                      <circle cx="12" cy="12" r="11.5" fill={`${p.color}22`} stroke={`${p.color}55`} strokeWidth="1"/>
                      <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill={p.color} fontFamily="inherit">{p.initials}</text>
                      <text x="32" y="16" fontSize="12" fontWeight="500" fill={textPrimary} fontFamily="inherit">{p.name}</text>
                      <text x="100%" y="16" textAnchor="end" fontSize="11" fill={textMuted} fontFamily="inherit">{p.share}%</text>
                    </svg>
                    <div style={{ display: "table", width: "100%", marginTop: 6, paddingLeft: 32 }}>
                      <div style={{ display: "table-cell", fontSize: 11, color: textMuted }}>{Math.round(p.pct * 100)}% {t("splitter.ofPool")}</div>
                      <div style={{ display: "table-cell", textAlign: "right", fontSize: 13, fontWeight: 600, color: p.color }}>{fmt(p.amount, locale, currency)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Distribution bar */}
              {perPerson.length > 0 && pool > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{t("splitter.distribution")}</div>
                  {(() => {
                    const total = perPerson.reduce((s, p) => s + (p.amount > 0 ? p.amount : 0.0001), 0);
                    let xPct = 0;
                    return (
                      <svg width="100%" height="28" style={{ borderRadius: 6, border: `1px solid ${border}`, display: "block" }}>
                        {perPerson.map((p) => {
                          const wPct = ((p.amount > 0 ? p.amount : 0.0001) / total) * 100;
                          const cx = xPct + wPct / 2;
                          const x = xPct;
                          xPct += wPct;
                          return (
                            <g key={p.id}>
                              <rect x={`${x}%`} y="0" width={`${wPct}%`} height="28" fill={p.color}/>
                              {p.amount > pool * 0.08 && (
                                <text x={`${cx}%`} y="14" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="600" fill="#fff" fontFamily="inherit">
                                  {p.name} · {fmtShort(p.amount)}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
