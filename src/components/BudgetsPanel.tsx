import { useEffect, useState } from "react";
import { getBudgets, setBudget, deleteBudget, type Budget } from "../lib/api";

const CATEGORY_SUGGESTIONS = ["Shopping", "Food", "Travel", "Bills", "Entertainment", "Health"];

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function barColor(percent: number) {
  if (percent > 100) return "bg-rust";
  if (percent >= 80) return "bg-[#d99a2b]";
  return "bg-ledger";
}

export function BudgetsPanel({ accountId, refreshKey }: { accountId: string; refreshKey: number }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setBudgets([]);
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    getBudgets(accountId)
      .then((data) => {
        if (!cancelled) setBudgets(data);
      })
      .catch(() => {
        /* keep previous data on refresh failure */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, refreshKey]);

  async function reload() {
    setBudgets(await getBudgets(accountId));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsedLimit = parseFloat(limit);
    if (!category.trim()) {
      setError("Enter a category");
      return;
    }
    if (!parsedLimit || parsedLimit <= 0) {
      setError("Enter a valid monthly limit");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setBudget(accountId, category.trim(), parsedLimit);
      await reload();
      setCategory("");
      setLimit("");
      setShowForm(false);
    } catch {
      setError("Could not save budget. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(budget: Budget) {
    if (!window.confirm(`Remove the ${budget.category} budget?`)) return;
    setDeletingId(budget.id);
    try {
      await deleteBudget(accountId, budget.id);
      await reload();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white border border-ink/8 rounded-xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-ink/8 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Monthly budgets</span>
        <button
          onClick={() => {
            setShowForm((s) => !s);
            setError(null);
          }}
          className="text-[11px] font-medium text-ledger border border-ledger/30 rounded px-2 py-1 hover:bg-ledger/8"
        >
          {showForm ? "Close" : "Set budget"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="px-6 py-4 border-b border-ink/8 flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-ink/45 font-medium">Category</label>
              <input
                type="text"
                list="budget-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ledger"
                placeholder="e.g. Shopping"
                autoFocus
              />
              <datalist id="budget-categories">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="flex-1">
              <label className="text-xs text-ink/45 font-medium">Monthly limit</label>
              <input
                type="number"
                step="0.01"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-ledger"
                placeholder="0.00"
              />
            </div>
          </div>
          {error && <p className="text-rust text-xs">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="self-end bg-ledger text-paper text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save budget"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-ink/35 text-sm text-center py-6">Loading budgets...</p>
      ) : budgets.length === 0 ? (
        <p className="text-ink/35 text-sm text-center py-6">
          No budgets yet. Set a monthly limit for a category to track overspending.
        </p>
      ) : (
        <div>
          {budgets.map((b) => {
            const percent = Number(b.percentUsed);
            const over = percent > 100;
            return (
              <div key={b.id} className="px-6 py-4 border-b border-ink/6 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-ink font-medium">{b.category}</p>
                  <div className="flex items-center gap-3">
                    <p className={`font-mono text-xs ${over ? "text-rust" : "text-ink/60"}`}>
                      ₹{fmt(Number(b.spent))} / ₹{fmt(Number(b.monthlyLimit))}
                    </p>
                    <button
                      onClick={() => handleDelete(b)}
                      disabled={deletingId === b.id}
                      className="text-[11px] font-medium text-rust border border-rust/20 rounded px-2 py-1 hover:bg-rust/8 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-ink/8 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(percent)}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <p className={`text-[11px] font-mono mt-1.5 ${over ? "text-rust" : "text-ink/40"}`}>
                  {percent.toFixed(0)}% used{over ? " · over budget" : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}