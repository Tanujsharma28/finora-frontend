const API_BASE_URL = "http://localhost:8080/api";

export interface Account {
  id: string;
  accountNumber: string;
  accountType: "SAVINGS" | "CURRENT" | "CREDIT";
  balance: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  category: string;
  merchant: string | null;
  txnType: "DEBIT" | "CREDIT";
  status: "PENDING" | "COMPLETED" | "FLAGGED" | "REVERSED";
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  name: string;
  email: string;
}

function getToken(): string | null {
  return localStorage.getItem("finora_token");
}

export function setSession(auth: AuthResponse) {
  localStorage.setItem("finora_token", auth.token);
  localStorage.setItem("finora_user_id", auth.userId);
  localStorage.setItem("finora_user_name", auth.name);
}

export function clearSession() {
  localStorage.removeItem("finora_token");
  localStorage.removeItem("finora_user_id");
  localStorage.removeItem("finora_user_name");
}
export function reverseTransaction(id: string) {
  return request<Transaction>(`/transactions/${id}/reverse`, {
    method: "POST",
  });
}

export function getSession() {
  const token = getToken();
  const userId = localStorage.getItem("finora_user_id");
  const name = localStorage.getItem("finora_user_name");
  if (!token || !userId) return null;
  return { token, userId, name };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export function register(name: string, email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getAccountsByUser(userId: string) {
  return request<Account[]>(`/accounts?userId=${userId}`);
}

export function createAccount(userId: string, accountType: Account["accountType"]) {
  return request<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify({ userId, accountType }),
  });
}

export function getTransactions(accountId: string) {
  return request<Transaction[]>(`/transactions?accountId=${accountId}`);
}

export interface TransferResponse {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "COMPENSATED";
  failureReason: string | null;
  createdAt: string;
}

export function createTransfer(payload: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  idempotencyKey: string;
}) {
  return request<TransferResponse>("/transfers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface RecurringTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  nextRunDate: string;
  description: string | null;
  createdAt: string;
}

export function createRecurringTransfer(payload: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  startDate: string;
  description?: string;
}) {
  return request<RecurringTransfer>("/recurring-transfers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRecurringTransfers(accountId: string) {
  return request<RecurringTransfer[]>(`/recurring-transfers?accountId=${accountId}`);
}

export function pauseRecurringTransfer(id: string) {
  return request<RecurringTransfer>(`/recurring-transfers/${id}/pause`, {
    method: "PATCH",
  });
}

export function resumeRecurringTransfer(id: string) {
  return request<RecurringTransfer>(`/recurring-transfers/${id}/resume`, {
    method: "PATCH",
  });
}

export function cancelRecurringTransfer(id: string) {
  return request<RecurringTransfer>(`/recurring-transfers/${id}`, {
    method: "DELETE",
  });
}
export function getAnalytics(accountId: string) {
  return request<Record<string, number>>(`/analytics/${accountId}`);
}
export async function exportStatement(accountId: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/transactions/${accountId}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `statement-${accountId}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function createTransaction(payload: {
  accountId: string;
  amount: number;
  category?: string;
  merchant?: string;
  txnType: "DEBIT" | "CREDIT";
  idempotencyKey: string;
}) {
  return request<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
