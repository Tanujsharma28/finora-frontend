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
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
  requiresTwoFactor: boolean;
  pendingToken: string | null;
}


export interface TokenResponse {
  token: string;
  refreshToken: string;
}

function getToken(): string | null {
  return localStorage.getItem("finora_token");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("finora_refresh_token");
}

export function setSession(auth: AuthResponse) {
  localStorage.setItem("finora_token", auth.token);
  localStorage.setItem("finora_refresh_token", auth.refreshToken);
  localStorage.setItem("finora_user_id", auth.userId);
  localStorage.setItem("finora_user_name", auth.name);
}

function setTokens(tokens: TokenResponse) {
  localStorage.setItem("finora_token", tokens.token);
  localStorage.setItem("finora_refresh_token", tokens.refreshToken);
}

export function clearSession() {
  localStorage.removeItem("finora_token");
  localStorage.removeItem("finora_refresh_token");
  localStorage.removeItem("finora_user_id");
  localStorage.removeItem("finora_user_name");
}
export interface TwoFactorStatusResponse {
  enabled: boolean;
}

export function getTwoFactorStatus() {
  return request<TwoFactorStatusResponse>("/auth/2fa/status");
}

export function getSession() {
  const token = getToken();
  const userId = localStorage.getItem("finora_user_id");
  const name = localStorage.getItem("finora_user_name");
  if (!token || !userId) return null;
  return { token, userId, name };
}

// Ensures concurrent 401s only trigger a single /refresh call
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const tokens: TokenResponse = await res.json();
      setTokens(tokens);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if ((res.status === 401 || res.status === 403) && !isRetry && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, true);
    }
    clearSession();
    window.location.reload();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
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

export async function logout() {
  const token = getToken();
  const refreshToken = getRefreshToken();
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // best-effort — clear local session regardless
    }
  }
  clearSession();
}

export function getAccountsByUser(userId: string) {
  return request<Account[]>(`/accounts?userId=${userId}`);
}
export interface Budget {
  id: string;
  accountId: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  percentUsed: number;
}

export function getBudgets(accountId: string) {
  return request<Budget[]>(`/accounts/${accountId}/budgets`);
}

export function setBudget(accountId: string, category: string, monthlyLimit: number) {
  return request<Budget>(`/accounts/${accountId}/budgets`, {
    method: "POST",
    body: JSON.stringify({ category, monthlyLimit }),
  });
}

export function deleteBudget(accountId: string, budgetId: string) {
  return request<void>(`/accounts/${accountId}/budgets/${budgetId}`, {
    method: "DELETE",
  });
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

export function reverseTransaction(id: string) {
  return request<Transaction>(`/transactions/${id}/reverse`, {
    method: "POST",
  });
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
export function verifyTwoFactorLogin(pendingToken: string, code: string) {
  return request<AuthResponse>("/auth/2fa/login-verify", {
    method: "POST",
    body: JSON.stringify({ pendingToken, code }),
  });
}

export interface TwoFactorSetupResponse {
  qrCodeDataUri: string;
  secret: string;
}

export function setupTwoFactor() {
  return request<TwoFactorSetupResponse>("/auth/2fa/setup", {
    method: "POST",
  });
}

export function enableTwoFactor(code: string) {
  return request<void>("/auth/2fa/enable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function disableTwoFactor(password: string) {
  return request<void>("/auth/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
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