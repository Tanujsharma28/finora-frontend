import { useEffect, useState } from "react";
import type { Account, Transaction, RecurringTransfer } from "./lib/api";
import {
  getAccountsByUser,
  getTransactions,
  getSession,
  logout,
  createAccount,
  createTransaction,
  createTransfer,
  getRecurringTransfers,
  createRecurringTransfer,
  pauseRecurringTransfer,
  resumeRecurringTransfer,
  cancelRecurringTransfer,
  reverseTransaction,
  exportStatement,
} from "./lib/api";
import Login from "./Login";
import { connectToAccount } from "./lib/websocket";
import { ToastContainer } from "./components/Toast";
import { AnalyticsView } from "./components/AnalyticsView";

function Logomark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="2" y="14" width="4" height="8" rx="1" fill="currentColor" />
      <rect x="10" y="8" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="18" y="2" width="4" height="20" rx="1" fill="currentColor" />
    </svg>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function statusStyle(status: Transaction["status"]) {
  if (status === "FLAGGED") return "text-rust bg-rust/8";
  if (status === "COMPLETED") return "text-ledger bg-ledger/8";
  return "text-ink/40 bg-ink/5";
}

function accountLabel(type: Account["accountType"]) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function frequencyLabel(f: RecurringTransfer["frequency"]) {
  return f.charAt(0) + f.slice(1).toLowerCase();
}

function recurringStatusStyle(status: RecurringTransfer["status"]) {
  if (status === "ACTIVE") return "text-ledger bg-ledger/8";
  if (status === "PAUSED") return "text-ink/50 bg-ink/6";
  return "text-rust bg-rust/8";
}

function NewTransactionModal({
  accountId,
  onClose,
  onCreated,
}: {
  accountId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [txnType, setTxnType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createTransaction({
        accountId,
        amount: parsedAmount,
        merchant: merchant || undefined,
        category: category || "General",
        txnType,
        idempotencyKey: crypto.randomUUID(),
      });
      onCreated();
      onClose();
    } catch {
      setError("Failed to create transaction. Check backend logs.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-20 px-4">
      <div className="bg-white rounded-xl border border-ink/8 w-full max-w-sm p-7">
        <h2 className="text-ink font-medium mb-5">New transaction</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTxnType("DEBIT")}
              className={`flex-1 text-sm font-medium rounded-md py-2 border transition-colors ${txnType === "DEBIT" ? "border-rust bg-rust/8 text-rust" : "border-ink/10 text-ink/45"
                }`}
            >
              Debit
            </button>
            <button
              type="button"
              onClick={() => setTxnType("CREDIT")}
              className={`flex-1 text-sm font-medium rounded-md py-2 border transition-colors ${txnType === "CREDIT" ? "border-ledger bg-ledger/8 text-ledger" : "border-ink/10 text-ink/45"
                }`}
            >
              Credit
            </button>
          </div>

          <div>
            <label className="text-xs text-ink/45 font-medium">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-ledger"
              placeholder="0.00"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-ink/45 font-medium">Merchant (optional)</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ledger"
              placeholder="e.g. Amazon"
            />
          </div>

          <div>
            <label className="text-xs text-ink/45 font-medium">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ledger"
              placeholder="e.g. Shopping"
            />
          </div>

          {error && <p className="text-rust text-xs">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm text-ink/60 border border-ink/10 rounded-md py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-ledger text-paper text-sm font-medium rounded-md py-2.5 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferModal({
  fromAccountId,
  fromAccountLabel,
  onClose,
  onCreated,
}: {
  fromAccountId: string;
  fromAccountLabel: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; failureReason: string | null } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!toAccountId.trim()) {
      setError("Enter a destination account ID");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await createTransfer({
        fromAccountId,
        toAccountId: toAccountId.trim(),
        amount: parsedAmount,
        idempotencyKey: crypto.randomUUID(),
      });
      setResult({ status: response.status, failureReason: response.failureReason });
      if (response.status === "COMPLETED") {
        onCreated();
      }
    } catch {
      setError("Transfer failed. Check the destination account ID and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const isSuccess = result.status === "COMPLETED";
    return (
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-20 px-4">
        <div className="bg-white rounded-xl border border-ink/8 w-full max-w-sm p-7 text-center">
          <p className={`text-sm font-mono mb-2 ${isSuccess ? "text-ledger" : "text-rust"}`}>
            {result.status}
          </p>
          <p className="text-ink font-medium mb-1">
            {isSuccess ? "Transfer completed" : "Transfer did not complete"}
          </p>
          {result.failureReason && (
            <p className="text-ink/45 text-sm mb-5">{result.failureReason}</p>
          )}
          <button
            onClick={onClose}
            className="w-full bg-ledger text-paper text-sm font-medium rounded-md py-2.5 mt-4"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-20 px-4">
      <div className="bg-white rounded-xl border border-ink/8 w-full max-w-sm p-7">
        <h2 className="text-ink font-medium mb-1">Transfer money</h2>
        <p className="text-ink/45 text-xs font-mono mb-5">From {fromAccountLabel}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-ink/45 font-medium">To account ID</label>
            <input
              type="text"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-ledger"
              placeholder="Destination account ID"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-ink/45 font-medium">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-ledger"
              placeholder="0.00"
            />
          </div>

          {error && <p className="text-rust text-xs">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm text-ink/60 border border-ink/10 rounded-md py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-ledger text-paper text-sm font-medium rounded-md py-2.5 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewRecurringTransferModal({
  fromAccountId,
  fromAccountLabel,
  onClose,
  onCreated,
}: {
  fromAccountId: string;
  fromAccountLabel: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("MONTHLY");
  const [startDate, setStartDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!toAccountId.trim()) {
      setError("Enter a destination account ID");
      return;
    }
    if (!startDate) {
      setError("Pick a start date");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createRecurringTransfer({
        fromAccountId,
        toAccountId: toAccountId.trim(),
        amount: parsedAmount,
        frequency,
        startDate,
        description: description.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch {
      setError("Failed to set up recurring transfer. Check the destination account ID.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-20 px-4">
      <div className="bg-white rounded-xl border border-ink/8 w-full max-w-sm p-7">
        <h2 className="text-ink font-medium mb-1">New recurring transfer</h2>
        <p className="text-ink/45 text-xs font-mono mb-5">From {fromAccountLabel}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-ink/45 font-medium">To account ID</label>
            <input
              type="text"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-ledger"
              placeholder="Destination account ID"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-ink/45 font-medium">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-ledger"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="text-xs text-ink/45 font-medium">Frequency</label>
            <div className="flex gap-2 mt-1">
              {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`flex-1 text-xs font-medium rounded-md py-2 border transition-colors ${frequency === f ? "border-ledger bg-ledger/8 text-ledger" : "border-ink/10 text-ink/45"
                    }`}
                >
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-ink/45 font-medium">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-ledger"
            />
          </div>

          <div>
            <label className="text-xs text-ink/45 font-medium">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ledger"
              placeholder="e.g. Rent payment"
            />
          </div>

          {error && <p className="text-rust text-xs">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm text-ink/60 border border-ink/10 rounded-md py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-ledger text-paper text-sm font-medium rounded-md py-2.5 disabled:opacity-50"
            >
              {submitting ? "Setting up..." : "Set up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecurringTransfersPanel({
  accountId,
  refreshKey,
  onChanged,
}: {
  accountId: string;
  refreshKey: number;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<RecurringTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await getRecurringTransfers(accountId);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [accountId, refreshKey]);

  async function handlePause(id: string) {
    setActioningId(id);
    try {
      await pauseRecurringTransfer(id);
      await load();
      onChanged();
    } finally {
      setActioningId(null);
    }
  }

  async function handleResume(id: string) {
    setActioningId(id);
    try {
      await resumeRecurringTransfer(id);
      await load();
      onChanged();
    } finally {
      setActioningId(null);
    }
  }

  async function handleCancel(id: string) {
    setActioningId(id);
    try {
      await cancelRecurringTransfer(id);
      await load();
      onChanged();
    } finally {
      setActioningId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-ink/8 rounded-xl p-7 mb-6">
        <p className="text-ink/35 text-sm text-center py-4">Loading recurring transfers...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-ink/8 rounded-xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-ink/8">
        <span className="text-sm font-medium text-ink">Recurring transfers</span>
      </div>
      <div>
        {items.map((rt) => (
          <div
            key={rt.id}
            className="flex items-center justify-between px-6 py-4 border-b border-ink/6 last:border-0"
          >
            <div>
              <p className="text-sm text-ink font-medium">
                {rt.description || `Transfer to ${rt.toAccountId.slice(0, 8)}...`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block text-[11px] font-mono px-1.5 py-0.5 rounded ${recurringStatusStyle(rt.status)}`}>
                  {rt.status}
                </span>
                <span className="text-[11px] text-ink/40 font-mono">
                  {frequencyLabel(rt.frequency)} · next {rt.nextRunDate}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-sm text-ink/80">{formatAmount(rt.amount)}</p>
              {rt.status !== "CANCELLED" && (
                <div className="flex gap-1.5">
                  {rt.status === "ACTIVE" ? (
                    <button
                      onClick={() => handlePause(rt.id)}
                      disabled={actioningId === rt.id}
                      className="text-[11px] font-medium text-ink/50 border border-ink/10 rounded px-2 py-1 hover:border-ink/20 disabled:opacity-50"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResume(rt.id)}
                      disabled={actioningId === rt.id}
                      className="text-[11px] font-medium text-ledger border border-ledger/30 rounded px-2 py-1 hover:bg-ledger/8 disabled:opacity-50"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(rt.id)}
                    disabled={actioningId === rt.id}
                    className="text-[11px] font-medium text-rust border border-rust/20 rounded px-2 py-1 hover:bg-rust/8 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ userId, userName, onLogout }: { userId: string; userName: string; onLogout: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringRefreshKey, setRecurringRefreshKey] = useState(0);
  const [toasts, setToasts] = useState<import("./components/Toast").Toast[]>([]);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [view, setView] = useState<"activity" | "analytics">("activity");

  function pushToast(message: string, type: "info" | "flagged" = "info") {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function loadAccounts() {
    const accs = await getAccountsByUser(userId);
    setAccounts(accs);
    if (accs.length > 0) setSelectedId((prev) => prev ?? accs[0].id);
    setLoading(false);
  }

  async function loadTransactions() {
    if (!selectedId) return;
    const txns = await getTransactions(selectedId);
    setTransactions(txns);
  }

  useEffect(() => {
    loadAccounts();
  }, [userId]);

  useEffect(() => {
    loadTransactions();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const disconnect = connectToAccount(
      selectedId,
      (update) => {
        if (update.accountId === selectedId) {
          loadAccounts();
          loadTransactions();
          if (update.status === "FLAGGED") {
            pushToast("Transaction flagged for review", "flagged");
          }
        }
      },
      (notification) => {
        pushToast(notification.message, "info");
      }
    );
    return () => disconnect();
  }, [selectedId]);

  const selectedAccount = accounts.find((a) => a.id === selectedId);
  const flaggedCount = transactions.filter((t) => t.status === "FLAGGED").length;

  async function handleCreateAccount() {
    setCreating(true);
    await createAccount(userId, "SAVINGS");
    await loadAccounts();
    setCreating(false);
  }

  async function handleTransactionCreated() {
    await loadAccounts();
    await loadTransactions();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="flex items-center gap-2 text-ink/40 font-mono text-sm">
          <Logomark className="w-4 h-4 animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper font-sans">
      <header className="border-b border-ink/8 bg-white/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logomark className="w-4 h-4 text-ledger" />
            <span className="font-mono text-sm tracking-wide text-ink">FINORA</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink/60">{userName}</span>
            <button
              onClick={onLogout}
              className="text-xs text-ink/40 hover:text-rust transition-colors border border-ink/10 rounded-md px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 animate-fade-up">
        {accounts.length === 0 ? (
          <div className="bg-white border border-ink/8 rounded-xl p-10 text-center">
            <p className="text-ink font-medium mb-1">No accounts yet</p>
            <p className="text-ink/45 text-sm mb-6">Open your first account to start tracking transactions.</p>
            <button
              onClick={handleCreateAccount}
              disabled={creating}
              className="bg-ledger text-paper text-sm font-medium rounded-md px-5 py-2.5 disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {creating ? "Creating..." : "Open a savings account"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`text-xs font-medium px-3.5 py-2 rounded-md border whitespace-nowrap transition-all ${a.id === selectedId
                        ? "border-ledger bg-ledger/8 text-ledger"
                        : "border-ink/10 text-ink/45 hover:text-ink hover:border-ink/20"
                      }`}
                  >
                    {accountLabel(a.accountType)} · {a.accountNumber.slice(-4)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setView(view === "activity" ? "analytics" : "activity")}
                  className="text-xs font-medium text-ink/60 border border-ink/10 rounded-md px-3.5 py-2 whitespace-nowrap hover:border-ink/20 transition-colors"
                >
                  {view === "activity" ? "Analytics" : "Activity"}
                </button>

                <button
                  onClick={() => setShowTransferModal(true)}
                  className="text-xs font-medium text-ink/60 border border-ink/10 rounded-md px-3.5 py-2 whitespace-nowrap hover:border-ink/20 transition-colors"
                >
                  Transfer
                </button>
                <button
                  onClick={() => setShowRecurringModal(true)}
                  className="text-xs font-medium text-ink/60 border border-ink/10 rounded-md px-3.5 py-2 whitespace-nowrap hover:border-ink/20 transition-colors"
                >
                  Recurring
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs font-medium text-ledger border border-ledger/30 bg-ledger/8 rounded-md px-3.5 py-2 whitespace-nowrap hover:bg-ledger/12 transition-colors"
                >
                  + New transaction
                </button>
              </div>
            </div>

            <div className="bg-white border border-ink/8 rounded-xl p-7 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-ink/45 text-xs font-medium uppercase tracking-wider mb-2">
                    {accountLabel(selectedAccount!.accountType)} Account · {selectedAccount?.accountNumber}
                  </p>
                  <p className="font-mono text-4xl text-ink tracking-tight">
                    {selectedAccount && selectedAccount.balance < 0 ? "-" : ""}
                    {selectedAccount && formatAmount(selectedAccount.balance)}
                  </p>
                </div>
                {flaggedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-rust text-xs font-medium bg-rust/8 rounded-md px-3 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rust" />
                    {flaggedCount} flagged
                  </span>
                )}
                {selectedId && (
                  <button
                    onClick={() => exportStatement(selectedId)}
                    className="text-xs font-medium text-ink/50 border border-ink/10 rounded-md px-3 py-1.5 hover:border-ink/20 transition-colors"
                  >
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            {view === "analytics" && selectedId ? (
              <AnalyticsView accountId={selectedId} />
            ) : (
              <>
                {selectedId && (
                  <RecurringTransfersPanel
                    accountId={selectedId}
                    refreshKey={recurringRefreshKey}
                    onChanged={() => setRecurringRefreshKey((k) => k + 1)}
                  />
                )}

                <div className="bg-white border border-ink/8 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-ink/8 flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">Recent activity</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-ledger animate-pulse" />
                      <span className="text-[10px] font-mono text-ink/35 uppercase tracking-wider">Live</span>
                    </span>
                  </div>

                  {transactions.length === 0 ? (
                    <p className="text-ink/35 text-sm text-center py-12">No transactions yet.</p>
                  ) : (
                    <div>
                      {transactions.map((txn) => (
                        <div
                          key={txn.id}
                          className="flex items-center justify-between px-6 py-4 border-b border-ink/6 last:border-0 hover:bg-ink/[0.015] transition-colors"
                        >
                          <div>
                            <p className="text-sm text-ink font-medium">
                              {txn.merchant
                                ? txn.merchant
                                : txn.category === "TRANSFER_IN"
                                  ? "Transfer received"
                                  : txn.category === "REVERSAL"
                                    ? "Reversal"
                                    : txn.category}
                            </p>
                            <span className={`inline-block text-[11px] font-mono mt-1 px-1.5 py-0.5 rounded ${statusStyle(txn.status)}`}>
                              {txn.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {txn.status === "FLAGGED" && (
                              <button
                                disabled={reversingId === txn.id}
                                onClick={async () => {
                                  if (!window.confirm(`Reverse this ₹${formatAmount(txn.amount)} transaction? This cannot be undone.`)) {
                                    return;
                                  }
                                  setReversingId(txn.id);
                                  try {
                                    await reverseTransaction(txn.id);
                                    await handleTransactionCreated();
                                    pushToast("Transaction reversed", "info");
                                  } catch {
                                    pushToast("Reversal failed — please try again", "flagged");
                                  } finally {
                                    setReversingId(null);
                                  }
                                }}
                                className="text-[11px] font-medium text-rust border border-rust/20 rounded px-2 py-1 hover:bg-rust/8 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {reversingId === txn.id ? "Reversing..." : "Reverse"}
                              </button>
                            )}
                            <p className={`font-mono text-sm ${txn.txnType === "DEBIT" ? "text-ink/80" : "text-ledger"}`}>
                              {txn.txnType === "DEBIT" ? "-" : "+"}{formatAmount(txn.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {showModal && selectedId && (
        <NewTransactionModal
          accountId={selectedId}
          onClose={() => setShowModal(false)}
          onCreated={handleTransactionCreated}
        />
      )}

      {showTransferModal && selectedId && selectedAccount && (
        <TransferModal
          fromAccountId={selectedId}
          fromAccountLabel={`${accountLabel(selectedAccount.accountType)} · ${selectedAccount.accountNumber.slice(-4)}`}
          onClose={() => setShowTransferModal(false)}
          onCreated={handleTransactionCreated}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {showRecurringModal && selectedId && selectedAccount && (
        <NewRecurringTransferModal
          fromAccountId={selectedId}
          fromAccountLabel={`${accountLabel(selectedAccount.accountType)} · ${selectedAccount.accountNumber.slice(-4)}`}
          onClose={() => setShowRecurringModal(false)}
          onCreated={() => setRecurringRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

function App() {
  const [session, setSessionState] = useState(getSession());

  async function handleLogout() {
    await logout();
    setSessionState(null);
  }

  if (!session) {
    return <Login onAuthenticated={() => setSessionState(getSession())} />;
  }

  return <Dashboard userId={session.userId} userName={session.name ?? ""} onLogout={handleLogout} />;
}

export default App;