// Pure splitter math: the month's pool (income minus expenses) shared across
// people by their share. Discounts come off each person's amount, never the pool.
const sum = (rows) => rows.reduce((s, r) => s + (r.value || 0), 0);

export function splitterAllocate(items, people) {
  const ofType = (type) => items.filter((i) => i.type === type);
  const totalEntradas = sum(ofType("income"));
  const totalSalidas = sum(ofType("expense"));
  const discountRows = ofType("discount");
  const totalDesc = sum(discountRows);
  const pool = totalEntradas - totalSalidas;
  const totalShares = people.reduce((s, p) => s + (p.share || 0), 0);
  const perPerson = people.map((p) => {
    const pct = totalShares > 0 ? (p.share || 0) / totalShares : 0;
    const discounts = sum(discountRows.filter((d) => d.person_id === p.id));
    return { ...p, pct, amount: pool * pct - discounts, discounts };
  });
  return { totalEntradas, totalSalidas, totalDesc, pool, perPerson };
}
