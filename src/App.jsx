import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, Cloud, CloudOff, GripVertical, LayoutList, TrendingUp, Download, Upload, Camera } from "lucide-react";

const CollapseIcon = ChevronLeft;

// ─── SHARED ───────────────────────────────────────────────────────────────────
const toMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const fmt = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);
const fmtMonth = (date) => new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date).toUpperCase();
const STORAGE_EXPENSES = "expense-tracker-all-months";
const STORAGE_FLUJO = "flujo-caja-data";

// ─── EXPORT ───────────────────────────────────────────────────────────────────
function exportData(expenses, flujo) {
  const json = JSON.stringify({ expenses, flujo }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const reader = new FileReader();
  reader.onload = () => {
    const a = document.createElement("a");
    a.href = reader.result;
    a.download = `finanzas-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  reader.readAsDataURL(blob);
}

// ─── IMPORT/EXPORT BAR ────────────────────────────────────────────────────────
function ImportExportBar({ onExport, onImport }) {
  const fileRef = useRef();
  const [confirmData, setConfirmData] = useState(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { setConfirmData(JSON.parse(ev.target.result)); }
      catch (err) { console.error("Invalid file", err); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex gap-2">
        <button onClick={() => setShowExportConfirm(true)} className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition">
          <Download size={14} /> Exportar
        </button>
        <button onClick={() => fileRef.current.click()} className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition">
          <Upload size={14} /> Importar
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
      </div>

      {showExportConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Exportar datos</h3>
            <p className="text-sm text-gray-500 mb-6">Se descargará un archivo <span className="font-medium text-gray-700">.json</span> con todos tus datos de Gastos y Flujo de Caja.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowExportConfirm(false)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition">Cancelar</button>
              <button onClick={() => { onExport(); setShowExportConfirm(false); }} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1">
                <Download size={14} /> Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Importar datos</h3>
            <p className="text-sm text-gray-500 mb-6">Esto reemplazará todos los datos actuales. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmData(null)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition">Cancelar</button>
              <button onClick={() => { onImport(confirmData); setConfirmData(null); }} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition">Sí, importar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AMOUNT INPUT ─────────────────────────────────────────────────────────────
function AmountInput({ amount, onChange, className }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  return (
    <input
      type={editing ? "number" : "text"}
      value={editing ? raw : fmt(amount)}
      onChange={(e) => setRaw(e.target.value)}
      onFocus={() => { setRaw(amount === 0 ? "" : String(amount)); setEditing(true); }}
      onBlur={() => { onChange(parseFloat(raw) || 0); setEditing(false); }}
      className={`border-0 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 ${className || ""}`}
    />
  );
}

// ─── EXPENSE TRACKER ─────────────────────────────────────────────────────────
const DEFAULT_TEMPLATE = {
  FIJOS: [
    { id: 1, name: "Inversión", amount: 100000 }, { id: 2, name: "Ahorro", amount: 4000000 },
    { id: 3, name: "Arriendo", amount: 4734000 }, { id: 4, name: "Seguro carro", amount: 460000 },
    { id: 5, name: "EPM", amount: 263489 }, { id: 6, name: "Claro cel", amount: 56000 },
    { id: 7, name: "Claro internet", amount: 99000 }, { id: 8, name: "Internet 4g", amount: 60000 },
  ],
  TARJETAS: [
    { id: 9, name: "Lola Sueldo", amount: 360000 }, { id: 10, name: "Lola Salud", amount: 51347 },
    { id: 11, name: "Falabella", amount: 0 }, { id: 12, name: "Davivienda", amount: 67000 },
    { id: 13, name: "Scotía", amount: 3000000 }, { id: 14, name: "Bancolombia", amount: 48490 },
  ],
  APTOS: [
    { id: 15, name: "Predial", amount: 616000 }, { id: 16, name: "Mini cubi", amount: 300000 },
    { id: 17, name: "Admon 201", amount: 477614 }, { id: 18, name: "Admon 915", amount: 802700 },
    { id: 19, name: "Tomas", amount: 1100000 },
  ],
};

const STATUS_COLORS = {
  Pagado: "bg-green-100 text-green-800 border-green-300",
  "No pagado": "bg-red-100 text-red-800 border-red-300",
  Programado: "bg-blue-100 text-blue-800 border-blue-300",
  Verificar: "bg-yellow-100 text-yellow-800 border-yellow-300",
};

const freshMonth = () => {
  const d = {};
  Object.keys(DEFAULT_TEMPLATE).forEach((c) => {
    d[c] = DEFAULT_TEMPLATE[c].map((e) => ({ ...e, status: "No pagado" }));
  });
  return d;
};

function ExpenseTracker({ importedData }) {
  const today = new Date();
  const [allMonths, setAllMonths] = useState({});
  const [viewDate, setViewDate] = useState(today);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [loaded, setLoaded] = useState(false);
  const drag = useRef({ fromCat: null, fromId: null });
  const [overInfo, setOverInfo] = useState({ cat: null, id: null });

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_EXPENSES);
        if (r && r.value) setAllMonths(JSON.parse(r.value));
        else setAllMonths({ [toMonthKey(today)]: freshMonth() });
      } catch (e) {
        setAllMonths({ [toMonthKey(today)]: freshMonth() });
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (importedData) { setAllMonths(importedData); }
  }, [importedData]);

  const saveData = useCallback(async (data) => {
    setSyncStatus("saving");
    try {
      await window.storage.set(STORAGE_EXPENSES, JSON.stringify(data));
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch (e) { setSyncStatus("error"); }
  }, []);

  useEffect(() => { if (loaded) saveData(allMonths); }, [allMonths, loaded]);

  const viewKey = toMonthKey(viewDate);
  const isCurrentMonth = viewKey === toMonthKey(today);
  const expenses = allMonths[viewKey] || null;

  const setExpenses = (u) => setAllMonths((p) => ({ ...p, [viewKey]: typeof u === "function" ? u(p[viewKey]) : u }));
  const goMonth = (dir) => { const d = new Date(viewDate); d.setDate(1); d.setMonth(d.getMonth() + dir); setViewDate(d); };
  const createCurrentMonth = () => { setAllMonths((p) => ({ ...p, [toMonthKey(today)]: freshMonth() })); setViewDate(new Date(today)); };
  const updateExpense = (cat, id, field, val) => setExpenses((p) => ({ ...p, [cat]: p[cat].map((e) => e.id === id ? { ...e, [field]: val } : e) }));
  const addExpense = (cat) => {
    const maxId = Math.max(...Object.values(expenses).flat().map((e) => e.id), 0);
    setExpenses((p) => ({ ...p, [cat]: [...p[cat], { id: maxId + 1, name: "Nueva", amount: 0, status: "No pagado" }] }));
  };
  const deleteExpense = (cat, id) => setExpenses((p) => ({ ...p, [cat]: p[cat].filter((e) => e.id !== id) }));

  const onDragStart = (cat, id) => { drag.current = { fromCat: cat, fromId: id }; };
  const onDragOverRow = (e, toCat, toId) => {
    e.preventDefault();
    const { fromCat, fromId } = drag.current;
    if (!fromId || (overInfo.cat === toCat && overInfo.id === toId)) return;
    setOverInfo({ cat: toCat, id: toId });
    setExpenses((prev) => {
      const next = {};
      Object.keys(prev).forEach((c) => { next[c] = [...prev[c]]; });
      const fromList = next[fromCat];
      const fromIdx = fromList.findIndex((e) => e.id === fromId);
      if (fromIdx === -1) return prev;
      const [item] = fromList.splice(fromIdx, 1);
      const toList = next[toCat];
      const toIdx = toList.findIndex((e) => e.id === toId);
      toList.splice(toIdx === -1 ? toList.length : toIdx, 0, item);
      drag.current = { fromCat: toCat, fromId };
      return next;
    });
  };
  const onDragOverCat = (e, toCat) => {
    e.preventDefault();
    const { fromCat, fromId } = drag.current;
    if (!fromId || fromCat === toCat) return;
    setOverInfo({ cat: toCat, id: null });
    setExpenses((prev) => {
      const next = {};
      Object.keys(prev).forEach((c) => { next[c] = [...prev[c]]; });
      const fromList = next[fromCat];
      const fromIdx = fromList.findIndex((e) => e.id === fromId);
      if (fromIdx === -1) return prev;
      const [item] = fromList.splice(fromIdx, 1);
      next[toCat].push(item);
      drag.current = { fromCat: toCat, fromId };
      return next;
    });
  };
  const onDragEnd = () => { drag.current = { fromCat: null, fromId: null }; setOverInfo({ cat: null, id: null }); };

  const totals = () => {
    if (!expenses) return {};
    const all = Object.values(expenses).flat();
    return {
      total: all.reduce((s, e) => s + e.amount, 0),
      paid: all.filter((e) => e.status === "Pagado").reduce((s, e) => s + e.amount, 0),
      unpaid: all.filter((e) => e.status === "No pagado").reduce((s, e) => s + e.amount, 0),
      scheduled: all.filter((e) => e.status === "Programado").reduce((s, e) => s + e.amount, 0),
      verify: all.filter((e) => e.status === "Verificar").reduce((s, e) => s + e.amount, 0),
    };
  };
  const t = totals();
  const hasFuture = toMonthKey(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)) <= toMonthKey(today);

  if (!loaded) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <Cloud size={32} className="animate-pulse mr-2" /> Cargando...
    </div>
  );

  return (
    <div>
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => goMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft size={22} /></button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">{fmtMonth(viewDate)}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              {!isCurrentMonth && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Solo lectura</span>}
              <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full ${syncStatus === "saving" ? "bg-blue-100 text-blue-600" : syncStatus === "saved" ? "bg-green-100 text-green-600" : syncStatus === "error" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                {syncStatus === "error" ? <CloudOff size={12} /> : <Cloud size={12} />}
                {syncStatus === "saving" ? "Guardando..." : syncStatus === "saved" ? "Guardado" : syncStatus === "error" ? "Error" : "Sincronizado"}
              </span>
            </div>
          </div>
          <button onClick={() => goMonth(1)} disabled={!hasFuture} className={`p-2 rounded-full ${hasFuture ? "hover:bg-gray-100" : "opacity-30 cursor-not-allowed"}`}><ChevronRight size={22} /></button>
        </div>

        {!expenses && (
          <div className="text-center py-8">
            {isCurrentMonth
              ? <div><p className="text-gray-500 mb-4">No hay datos para este mes.</p><button onClick={createCurrentMonth} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Crear mes actual</button></div>
              : <p className="text-gray-400">No hay datos guardados para este mes.</p>}
          </div>
        )}

        {expenses && (
          <div>
            {isCurrentMonth && <div className="flex justify-end mb-4"><button onClick={createCurrentMonth} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Reiniciar mes</button></div>}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Total", val: t.total, cls: "bg-gray-100 text-gray-800" },
                { label: "Pagado", val: t.paid, cls: "bg-green-50 text-green-800" },
                { label: "No Pagado", val: t.unpaid, cls: "bg-red-50 text-red-800" },
                { label: "Programado", val: t.scheduled, cls: "bg-blue-50 text-blue-800" },
                { label: "Verificar", val: t.verify, cls: "bg-yellow-50 text-yellow-800" },
              ].map(({ label, val, cls }) => (
                <div key={label} className={`${cls} p-4 rounded-lg`}>
                  <div className="text-sm opacity-75">{label}</div>
                  <div className="text-lg font-bold">{fmt(val)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {expenses && Object.keys(expenses).map((cat) => {
        const catTotal = expenses[cat].reduce((s, e) => s + e.amount, 0);
        const isDropTarget = overInfo.cat === cat;
        return (
          <div key={cat} onDragOver={(e) => onDragOverCat(e, cat)} onDragEnd={onDragEnd}
            className={`bg-white rounded-lg shadow-lg p-6 mb-6 transition-all ${isDropTarget ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{cat}</h3>
                <p className="text-sm text-gray-500">Total: {fmt(catTotal)}</p>
              </div>
              {isCurrentMonth && (
                <button onClick={() => addExpense(cat)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">
                  <Plus size={16} /> Agregar
                </button>
              )}
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 text-gray-700 text-sm">
                  {isCurrentMonth && <th className="w-6" />}
                  <th className="text-left py-2 px-2">Gasto</th>
                  <th className="text-right py-2 px-2">Valor</th>
                  <th className="text-center py-2 px-2">Status</th>
                  {isCurrentMonth && <th />}
                </tr>
              </thead>
              <tbody>
                {expenses[cat].map((exp) => {
                  const isDragging = drag.current.fromId === exp.id && drag.current.fromCat === cat;
                  return (
                    <tr key={exp.id} draggable={isCurrentMonth}
                      onDragStart={() => onDragStart(cat, exp.id)}
                      onDragOver={(e) => onDragOverRow(e, cat, exp.id)}
                      onDragEnd={onDragEnd}
                      className={`border-b border-gray-100 transition-opacity ${isDragging ? "opacity-30" : ""}`}>
                      {isCurrentMonth && <td className="py-2 px-1 text-gray-300 cursor-grab w-6"><GripVertical size={16} /></td>}
                      <td className="py-2 px-2">
                        {isCurrentMonth
                          ? <input type="text" value={exp.name} onChange={(e) => updateExpense(cat, exp.id, "name", e.target.value)} className="w-full border-0 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1" />
                          : <span className="px-2">{exp.name}</span>}
                      </td>
                      <td className="py-2 px-2">
                        {isCurrentMonth
                          ? <AmountInput amount={exp.amount} onChange={(v) => updateExpense(cat, exp.id, "amount", v)} className="w-full text-right" />
                          : <span className="px-2 block text-right">{fmt(exp.amount)}</span>}
                      </td>
                      <td className="py-2 px-2">
                        {isCurrentMonth
                          ? <select value={exp.status} onChange={(e) => updateExpense(cat, exp.id, "status", e.target.value)} className={`w-full border-2 rounded px-2 py-1 text-sm font-medium ${STATUS_COLORS[exp.status]}`}>
                              <option value="No pagado">No pagado</option>
                              <option value="Pagado">Pagado</option>
                              <option value="Programado">Programado</option>
                              <option value="Verificar">Verificar</option>
                            </select>
                          : <span className={`inline-block border rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[exp.status]}`}>{exp.status}</span>}
                      </td>
                      {isCurrentMonth && (
                        <td className="py-2 px-2 text-center">
                          <button onClick={() => deleteExpense(cat, exp.id)} className="text-red-500 hover:text-red-700"><Trash2 size={17} /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {isCurrentMonth && expenses[cat].length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-300 text-sm">Arrastra aquí</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ─── FLUJO DE CAJA ────────────────────────────────────────────────────────────
const defaultFlujoMonth = () => ({
  entradas: [{ id: 1, concepto: "915", valor: 0 }, { id: 2, concepto: "Glori", valor: 0 }],
  salidas: [{ id: 1, concepto: "Prediales", valor: 0 }, { id: 2, concepto: "Admon 915", valor: 0 }, { id: 3, concepto: "Admon 201", valor: 0 }, { id: 4, concepto: "Tomas", valor: 0 }],
  descuentos: [
    { id: 1, label: "Menos 201", valor: 0 },
    { id: 2, label: "Menos préstamo", valor: 0 },
    { id: 3, label: "Menos adelanto", valor: 0 },
  ],
  prestamos: {
    conceptos: [{ id: 1, nombre: "Cabina y otros", cantidad: 0 }, { id: 2, nombre: "Arreglo entrada", cantidad: 0 }],
    abonos: [],
  },
});

function FlujoCaja({ importedData }) {
  const today = new Date();
  const [allMonths, setAllMonths] = useState({});
  const [viewDate, setViewDate] = useState(today);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_FLUJO);
        if (r && r.value) {
          const parsed = JSON.parse(r.value);
          Object.keys(parsed).forEach((key) => {
            const d = parsed[key].descuentos;
            if (d && !Array.isArray(d)) {
              parsed[key].descuentos = [
                { id: 1, label: "Menos 201", valor: d.d201 || 0 },
                { id: 2, label: "Menos préstamo", valor: d.prestamo || 0 },
                { id: 3, label: "Menos adelanto", valor: d.adelanto || 0 },
              ];
            }
          });
          setAllMonths(parsed);
        } else {
          setAllMonths({ [toMonthKey(today)]: defaultFlujoMonth() });
        }
      } catch (e) {
        setAllMonths({ [toMonthKey(today)]: defaultFlujoMonth() });
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (importedData) setAllMonths(importedData);
  }, [importedData]);

  const saveData = useCallback(async (data) => {
    setSyncStatus("saving");
    try {
      await window.storage.set(STORAGE_FLUJO, JSON.stringify(data));
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch (e) { setSyncStatus("error"); }
  }, []);

  useEffect(() => { if (loaded) saveData(allMonths); }, [allMonths, loaded]);

  const viewKey = toMonthKey(viewDate);
  const isCurrentMonth = viewKey === toMonthKey(today);
  const data = allMonths[viewKey] || null;
  const setData = (u) => setAllMonths((p) => ({ ...p, [viewKey]: typeof u === "function" ? u(p[viewKey]) : u }));

  const goMonth = (dir) => { const d = new Date(viewDate); d.setDate(1); d.setMonth(d.getMonth() + dir); setViewDate(d); };
  const createMonth = () => { setAllMonths((p) => ({ ...p, [toMonthKey(today)]: defaultFlujoMonth() })); setViewDate(new Date(today)); };
  const hasFuture = toMonthKey(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)) <= toMonthKey(today);

  const calc = (d) => {
    if (!d) return {};
    const totalEntradas = d.entradas.reduce((s, e) => s + e.valor, 0);
    const totalSalidas = d.salidas.reduce((s, e) => s + e.valor, 0);
    const neto = totalEntradas - totalSalidas;
    const cu = neto / 2;
    const descRows = Array.isArray(d.descuentos) ? d.descuentos : [];
    let acc = cu;
    const descAcum = descRows.map((desc) => { acc = acc - (desc.valor || 0); return acc; });
    const totalPrestamos = d.prestamos.conceptos.reduce((s, p) => s + p.cantidad, 0);
    const totalAbonos = d.prestamos.abonos.reduce((s, a) => s + a.valor, 0);
    return { totalEntradas, totalSalidas, neto, cu, descAcum, total: acc, totalPrestamos, totalAbonos, restante: totalPrestamos - totalAbonos };
  };

  const c = data ? calc(data) : {};
  const ro = !isCurrentMonth;

  const tablesRef = useRef();
  const [copyStatus, setCopyStatus] = useState("idle");

  const handleCapture = async () => {
    if (!data) return;
    setCopyStatus("copying");
    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const cc = calc(data);
      const tdS = "border:1px solid #d1d5db;padding:8px 12px;font-size:13px;";
      const tdRS = tdS + "text-align:right;font-weight:500;";
      const tdLS = tdS + "color:#374151;";
      const thGreen = tdS + "font-weight:700;text-align:center;background:#bbf7d0;";
      const thRedS = tdS + "font-weight:700;text-align:center;background:#fecaca;";
      const green50 = "background:#f0fdf4;";
      const red50 = "background:#fff5f5;";

      const fmtR = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

      const entSalRows = Array.from({ length: Math.max(data.entradas.length, data.salidas.length) }).map((_, i) => {
        const ent = data.entradas[i];
        const sal = data.salidas[i];
        return `<tr>
          <td style="${tdLS}">${ent ? ent.concepto : ""}</td>
          <td style="${tdRS}">${ent ? fmtR(ent.valor) : ""}</td>
          <td style="${tdRS}${red50}">${sal ? fmtR(sal.valor) : ""}</td>
          <td style="${tdLS}${red50}">${sal ? sal.concepto : ""}</td>
        </tr>`;
      }).join("");

      const descRowsHtml = (data.descuentos || []).map((desc, i) => `
        <tr style="${green50}">
          <td style="${tdLS}font-weight:600;">${desc.label}</td>
          <td style="${tdRS}">${fmtR(cc.descAcum && cc.descAcum[i])}</td>
          <td style="${tdRS}${red50}">${fmtR(desc.valor)}</td>
          <td style="${tdLS}${red50}">${desc.label.replace(/^Menos\s*/i, "")}</td>
        </tr>`).join("");

      const maxRows = Math.max(data.prestamos.conceptos.length, data.prestamos.abonos.length);
      const prestRows = Array.from({ length: maxRows }).map((_, i) => {
        const p = data.prestamos.conceptos[i];
        const a = data.prestamos.abonos[i];
        return `<tr>
          <td style="${tdLS}">${p ? p.nombre : ""}</td>
          <td style="${tdRS}">${p ? fmtR(p.cantidad) : ""}</td>
          <td style="${tdRS}">${a ? fmtR(a.valor) : ""}</td>
          <td style="${tdLS}">${a ? a.fecha : ""}</td>
        </tr>`;
      }).join("");

      const html = `
        <div style="font-family:sans-serif;background:#f9fafb;padding:24px;display:inline-block;">
          <table style="border-collapse:collapse;width:700px;margin-bottom:24px;">
            <thead><tr>
              <th style="${thGreen}width:25%">CONCEPTO</th>
              <th style="${thGreen}width:25%">ENTRADA</th>
              <th style="${thRedS}width:25%">SALIDA</th>
              <th style="${thRedS}width:25%">CONCEPTO</th>
            </tr></thead>
            <tbody>
              ${entSalRows}
              <tr style="background:#f3f4f6;font-weight:700;">
                <td style="${tdLS}font-weight:700;">TOTAL</td>
                <td style="${tdRS}">${fmtR(cc.totalEntradas)}</td>
                <td style="${tdRS}${red50}">${fmtR(cc.totalSalidas)}</td>
                <td style="${tdLS}${red50}"></td>
              </tr>
              <tr style="${green50}"><td style="${tdLS}font-weight:600;">NETO</td><td style="${tdRS}">${fmtR(cc.neto)}</td><td style="${tdRS}${red50}"></td><td style="${tdLS}${red50}"></td></tr>
              <tr style="${green50}"><td style="${tdLS}font-weight:600;">C/U</td><td style="${tdRS}">${fmtR(cc.cu)}</td><td style="${tdRS}${red50}"></td><td style="${tdLS}${red50}"></td></tr>
              ${descRowsHtml}
              <tr style="background:#bbf7d0;font-weight:700;">
                <td style="${tdLS}font-weight:700;">TOTAL</td>
                <td style="${tdRS}">${fmtR(cc.total)}</td>
                <td style="${tdRS}${red50}"></td>
                <td style="${tdLS}${red50}"></td>
              </tr>
            </tbody>
          </table>
          <div style="font-size:15px;font-weight:700;margin-bottom:8px;color:#111827;">Préstamos</div>
          <table style="border-collapse:collapse;width:700px;">
            <thead><tr>
              <th style="${thGreen}width:30%">CONCEPTO</th>
              <th style="${thGreen}width:25%">CANTIDAD</th>
              <th style="${thGreen}width:25%">PAGADO</th>
              <th style="${thGreen}width:20%">FECHA</th>
            </tr></thead>
            <tbody>
              ${prestRows}
              <tr style="background:#f3f4f6;font-weight:700;">
                <td style="${tdLS}font-weight:700;">TOTALES</td>
                <td style="${tdRS}">${fmtR(cc.totalPrestamos)}</td>
                <td style="${tdRS}">${fmtR(cc.totalAbonos)}</td>
                <td style="${tdLS}"></td>
              </tr>
              <tr style="background:#fefce8;font-weight:700;">
                <td style="${tdLS}font-weight:700;">RESTANTE</td>
                <td style="${tdRS}">${fmtR(cc.restante)}</td>
                <td style="${tdRS}"></td>
                <td style="${tdLS}"></td>
              </tr>
            </tbody>
          </table>
        </div>`;

      const container = document.createElement("div");
      container.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await window.html2canvas(container.firstElementChild, { backgroundColor: "#f9fafb", scale: 2, useCORS: true });
      document.body.removeChild(container);

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setCopyStatus("copied");
          setTimeout(() => setCopyStatus("idle"), 2500);
        } catch (e) {
          const reader = new FileReader();
          reader.onload = () => { const a = document.createElement("a"); a.href = reader.result; a.download = "flujo-caja.png"; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
          reader.readAsDataURL(blob);
          setCopyStatus("idle");
        }
      }, "image/png");
    } catch (e) { console.error(e); setCopyStatus("idle"); }
  };
  const inputCls = "w-full text-right border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none";
  const tdL = "border border-gray-300 px-3 py-2 text-sm text-gray-700";
  const tdR = "border border-gray-300 px-3 py-2 text-sm text-right font-medium";
  const thCls = "border border-gray-300 px-3 py-2 text-sm font-bold text-center bg-green-200";
  const thRedCls = "border border-gray-300 px-3 py-2 text-sm font-bold text-center bg-red-200";

  if (!loaded) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <Cloud size={32} className="animate-pulse mr-2" /> Cargando...
    </div>
  );

  return (
    <div>
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => goMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft size={22} /></button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">{fmtMonth(viewDate)}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              {!isCurrentMonth && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Solo lectura</span>}
              <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full ${syncStatus === "saving" ? "bg-blue-100 text-blue-600" : syncStatus === "saved" ? "bg-green-100 text-green-600" : syncStatus === "error" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                {syncStatus === "error" ? <CloudOff size={12} /> : <Cloud size={12} />}
                {syncStatus === "saving" ? "Guardando..." : syncStatus === "saved" ? "Guardado" : syncStatus === "error" ? "Error" : "Sincronizado"}
              </span>
            </div>
          </div>
          <button onClick={() => goMonth(1)} disabled={!hasFuture} className={`p-2 rounded-full ${hasFuture ? "hover:bg-gray-100" : "opacity-30 cursor-not-allowed"}`}><ChevronRight size={22} /></button>
        </div>
      </div>

      {!data && (
        <div className="text-center py-12">
          {isCurrentMonth
            ? <div><p className="text-gray-500 mb-4">No hay datos para este mes.</p><button onClick={createMonth} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Crear mes actual</button></div>
            : <p className="text-gray-400">No hay datos guardados para este mes.</p>}
        </div>
      )}

      {data && (
        <div className="space-y-6" ref={tablesRef}>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Flujo del Mes</h3>
              <div className="flex gap-2">
                <button onClick={handleCapture} className={`text-sm px-4 py-2 rounded-lg flex items-center gap-1 transition ${copyStatus === "copied" ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}>
                  <Camera size={15} />
                  {copyStatus === "copying" ? "Generando..." : copyStatus === "copied" ? "¡Copiado!" : "Capturar"}
                </button>
                {isCurrentMonth && <button onClick={createMonth} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Reiniciar mes</button>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thCls}>CONCEPTO</th>
                    <th className={thCls}>ENTRADA</th>
                    <th className={thRedCls}>SALIDA</th>
                    <th className={thRedCls}>CONCEPTO</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(data.entradas.length, data.salidas.length) }).map((_, i) => {
                    const ent = data.entradas[i];
                    const sal = data.salidas[i];
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className={tdL}>
                          {ent && (!ro
                            ? <div className="flex items-center gap-1">
                                <input className={inputCls + " text-left flex-1"} value={ent.concepto}
                                  onChange={(e) => setData((p) => ({ ...p, entradas: p.entradas.map((x, j) => j === i ? { ...x, concepto: e.target.value } : x) }))} />
                                <button onClick={() => setData((p) => ({ ...p, entradas: p.entradas.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                              </div>
                            : <input className={inputCls + " text-left w-full"} value={ent.concepto}
                                onChange={(e) => setData((p) => ({ ...p, entradas: p.entradas.map((x, j) => j === i ? { ...x, concepto: e.target.value } : x) }))} />)}
                        </td>
                        <td className={tdR}>
                          {ent && (!ro
                            ? <AmountInput amount={ent.valor} onChange={(v) => setData((p) => ({ ...p, entradas: p.entradas.map((x, j) => j === i ? { ...x, valor: v } : x) }))} className="w-full text-right" />
                            : fmt(ent.valor))}
                        </td>
                        <td className={`${tdR} bg-red-50`}>
                          {sal && (!ro
                            ? <AmountInput amount={sal.valor} onChange={(v) => setData((p) => ({ ...p, salidas: p.salidas.map((x, j) => j === i ? { ...x, valor: v } : x) }))} className="w-full text-right" />
                            : fmt(sal.valor))}
                        </td>
                        <td className={`${tdL} bg-red-50`}>
                          {sal && (!ro
                            ? <div className="flex items-center gap-1">
                                <input className={inputCls + " text-left flex-1"} value={sal.concepto}
                                  onChange={(e) => setData((p) => ({ ...p, salidas: p.salidas.map((x, j) => j === i ? { ...x, concepto: e.target.value } : x) }))} />
                                <button onClick={() => setData((p) => ({ ...p, salidas: p.salidas.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                              </div>
                            : sal.concepto)}
                        </td>
                      </tr>
                    );
                  })}
                  {!ro && (
                    <tr>
                      <td colSpan={2} className="border border-gray-300 px-2 py-1">
                        <button onClick={() => setData((p) => ({ ...p, entradas: [...p.entradas, { id: Date.now(), concepto: "", valor: 0 }] }))} className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"><Plus size={12} /> Entrada</button>
                      </td>
                      <td colSpan={2} className="border border-gray-300 px-2 py-1">
                        <button onClick={() => setData((p) => ({ ...p, salidas: [...p.salidas, { id: Date.now(), concepto: "", valor: 0 }] }))} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"><Plus size={12} /> Salida</button>
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-100 font-bold">
                    <td className={tdL}>TOTAL</td>
                    <td className={tdR}>{fmt(c.totalEntradas)}</td>
                    <td className={`${tdR} bg-red-50`}>{fmt(c.totalSalidas)}</td>
                    <td className={`${tdL} bg-red-50`} />
                  </tr>
                  {[{ label: "NETO", val: c.neto }, { label: "C/U", val: c.cu }].map(({ label, val }) => (
                    <tr key={label} className="bg-green-50">
                      <td className={`${tdL} font-semibold`}>{label}</td>
                      <td className={tdR}>{fmt(val)}</td>
                      <td className={`${tdR} bg-red-50`} />
                      <td className={`${tdL} bg-red-50`} />
                    </tr>
                  ))}
                  {(data.descuentos || []).map((desc, i) => (
                    <tr key={desc.id} className="bg-green-50">
                      <td className={`${tdL} font-semibold`}>
                        {!ro
                          ? <input className={inputCls + " text-left"} value={desc.label}
                              onChange={(e) => setData((p) => ({ ...p, descuentos: p.descuentos.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))} />
                          : desc.label}
                      </td>
                      <td className={tdR}>{fmt(c.descAcum && c.descAcum[i])}</td>
                      <td className={`${tdR} bg-red-50`}>
                        {!ro
                          ? <AmountInput amount={desc.valor} onChange={(v) => setData((p) => ({ ...p, descuentos: p.descuentos.map((x, j) => j === i ? { ...x, valor: v } : x) }))} className="w-full text-right" />
                          : fmt(desc.valor)}
                      </td>
                      <td className={`${tdL} bg-red-50`}>
                        <div className="flex items-center gap-1">
                          <input className={inputCls + " text-left flex-1"}
                            value={desc.label.replace(/^Menos\s*/i, "")}
                            onChange={(e) => setData((p) => ({ ...p, descuentos: p.descuentos.map((x, j) => j === i ? { ...x, label: "Menos " + e.target.value } : x) }))}
                            readOnly={ro} />
                          {!ro && <button onClick={() => setData((p) => ({ ...p, descuentos: p.descuentos.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!ro && (
                    <tr>
                      <td colSpan={4} className="border border-gray-300 px-2 py-1">
                        <button onClick={() => setData((p) => ({ ...p, descuentos: [...(p.descuentos || []), { id: Date.now(), label: "Menos ...", valor: 0 }] }))} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus size={12} /> Descuento</button>
                      </td>
                    </tr>
                  )}
                  <tr className="bg-green-200 font-bold">
                    <td className={`${tdL} font-bold`}>TOTAL</td>
                    <td className={tdR}>{fmt(c.total)}</td>
                    <td className={`${tdR} bg-red-50`} />
                    <td className={`${tdL} bg-red-50`} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Préstamos</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`${tdL} font-bold bg-gray-100`}>CONCEPTO</th>
                    <th className={`${tdR} font-bold bg-gray-100`}>CANTIDAD</th>
                    <th className={`${tdR} font-bold bg-gray-100`}>PAGADO</th>
                    <th className={`${tdL} font-bold bg-gray-100`}>FECHA</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(data.prestamos.conceptos.length, data.prestamos.abonos.length) }).map((_, i) => {
                    const p = data.prestamos.conceptos[i];
                    const a = data.prestamos.abonos[i];
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className={tdL}>
                          {p && (!ro
                            ? <div className="flex items-center gap-1">
                                <input className={inputCls + " text-left flex-1"} value={p.nombre}
                                  onChange={(e) => setData((d) => ({ ...d, prestamos: { ...d.prestamos, conceptos: d.prestamos.conceptos.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x) } }))} />
                                <button onClick={() => setData((d) => ({ ...d, prestamos: { ...d.prestamos, conceptos: d.prestamos.conceptos.filter((_, j) => j !== i) } }))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                              </div>
                            : p.nombre)}
                        </td>
                        <td className={tdR}>
                          {p && (!ro
                            ? <AmountInput amount={p.cantidad} onChange={(v) => setData((d) => ({ ...d, prestamos: { ...d.prestamos, conceptos: d.prestamos.conceptos.map((x, j) => j === i ? { ...x, cantidad: v } : x) } }))} className="w-full text-right" />
                            : fmt(p.cantidad))}
                        </td>
                        <td className={tdR}>
                          {a && (!ro
                            ? <AmountInput amount={a.valor} onChange={(v) => setData((d) => ({ ...d, prestamos: { ...d.prestamos, abonos: d.prestamos.abonos.map((x, j) => j === i ? { ...x, valor: v } : x) } }))} className="w-full text-right" />
                            : fmt(a.valor))}
                        </td>
                        <td className={tdL}>
                          {a && (
                            <div className="flex items-center gap-1">
                              {!ro
                                ? <input type="date" className="border border-gray-300 rounded px-2 py-1 text-sm" value={a.fecha}
                                    onChange={(e) => setData((d) => ({ ...d, prestamos: { ...d.prestamos, abonos: d.prestamos.abonos.map((x, j) => j === i ? { ...x, fecha: e.target.value } : x) } }))} />
                                : a.fecha}
                              {!ro && <button onClick={() => setData((d) => ({ ...d, prestamos: { ...d.prestamos, abonos: d.prestamos.abonos.filter((_, j) => j !== i) } }))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!ro && (
                    <tr>
                      <td colSpan={2} className="border border-gray-300 px-2 py-1">
                        <button onClick={() => setData((d) => ({ ...d, prestamos: { ...d.prestamos, conceptos: [...d.prestamos.conceptos, { id: Date.now(), nombre: "", cantidad: 0 }] } }))} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus size={12} /> Préstamo</button>
                      </td>
                      <td colSpan={2} className="border border-gray-300 px-2 py-1">
                        <button onClick={() => setData((d) => ({ ...d, prestamos: { ...d.prestamos, abonos: [...d.prestamos.abonos, { id: Date.now(), valor: 0, fecha: new Date().toISOString().split("T")[0] }] } }))} className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"><Plus size={12} /> Abono</button>
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-100 font-bold">
                    <td className={tdL}>TOTALES</td>
                    <td className={tdR}>{fmt(c.totalPrestamos)}</td>
                    <td className={tdR}>{fmt(c.totalAbonos)}</td>
                    <td className={tdL} />
                  </tr>
                  <tr className="bg-yellow-50 font-bold">
                    <td className={tdL}>RESTANTE</td>
                    <td className={tdR}>{fmt(c.restante)}</td>
                    <td className={tdR} />
                    <td className={tdL} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("expenses");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importedExpenses, setImportedExpenses] = useState(null);
  const [importedFlujo, setImportedFlujo] = useState(null);

  const handleExport = async () => {
    try {
      const [e, f] = await Promise.all([
        window.storage.get(STORAGE_EXPENSES),
        window.storage.get(STORAGE_FLUJO),
      ]);
      exportData(e && e.value ? JSON.parse(e.value) : {}, f && f.value ? JSON.parse(f.value) : {});
    } catch (err) { console.error("Export error:", err); }
  };

  const handleImport = async (parsed) => {
    if (!parsed.expenses || !parsed.flujo) return;
    try { await window.storage.set(STORAGE_EXPENSES, JSON.stringify(parsed.expenses)); } catch (e) { console.error(e); }
    try { await window.storage.set(STORAGE_FLUJO, JSON.stringify(parsed.flujo)); } catch (e) { console.error(e); }
    setImportedExpenses(parsed.expenses);
    setImportedFlujo(parsed.flujo);
  };

  const navItem = (id, label, Icon) => (
    <button onClick={() => { setTab(id); setMobileMenuOpen(false); }} title={collapsed ? label : undefined}
      className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all ${collapsed ? "justify-center" : "text-left"} ${tab === id ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"}`}>
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );

  const sidebarContent = (
    <>
      <div className={`flex items-center mb-2 ${collapsed ? "justify-center" : "justify-between px-1"}`}>
        {!collapsed && <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menú</span>}
        <button onClick={() => setCollapsed((v) => !v)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all hidden md:block">
          <CollapseIcon size={18} className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>
      {navItem("expenses", "Gastos", LayoutList)}
      {navItem("flujo", "Flujo de Caja", TrendingUp)}
      {!collapsed && (
        <div className="mt-auto pt-4 border-t border-gray-100">
          <ImportExportBar onExport={handleExport} onImport={handleImport} />
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow flex items-center justify-between px-4 py-3">
        <span className="font-bold text-gray-700">{tab === "expenses" ? "Gastos" : "Flujo de Caja"}</span>
        <button onClick={() => setMobileMenuOpen((v) => !v)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <LayoutList size={22} />
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="bg-white w-56 p-3 flex flex-col gap-2 shadow-xl">
            {sidebarContent}
          </div>
          <div className="flex-1 bg-black bg-opacity-40" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      <aside className={`hidden md:flex ${collapsed ? "w-16" : "w-56"} bg-white shadow-lg p-3 flex-col gap-2 shrink-0 transition-all duration-200`}>
        {sidebarContent}
      </aside>

      <main className="flex-1 p-4 md:p-6 overflow-auto mt-14 md:mt-0">
        {tab === "expenses" && <ExpenseTracker importedData={importedExpenses} />}
        {tab === "flujo" && <FlujoCaja importedData={importedFlujo} />}
      </main>
    </div>
  );
}
