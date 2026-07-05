// Pure waterfall allocation, mirroring the backend distribute_payment
// (money_be/app/debt_payments/service.py::allocate). Given each active debt's
// remaining balance (order preserved) and an amount to spread, return the per-debt
// allocation: an equal share to still-pending debts, capped at each remaining, with
// any overflow redistributed to the rest. Used for the live split preview so what
// the user sees matches what the server computes.
export function allocate(remainings, amount) {
  const alloc = remainings.map(() => 0);
  const active = remainings
    .map((r, i) => ({ i, r }))
    .filter((x) => x.r > 0);
  if (!active.length) return alloc;

  let budget = Math.max(0, Number(amount) || 0);
  let pending = [...active].sort((a, b) => a.r - b.r); // by remaining ascending

  while (pending.length && budget > 0.005) {
    const share = budget / pending.length;
    if (pending[0].r <= share) {
      const { i, r } = pending.shift();
      alloc[i] = r;
      budget -= r;
    } else {
      for (const { i } of pending) alloc[i] = share;
      budget = 0;
    }
  }
  return alloc;
}
