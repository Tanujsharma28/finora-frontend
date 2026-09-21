import { useEffect, useState } from "react";
import {
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
} from "../lib/api";

export function TwoFactorSettings({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup flow state
  const [setupData, setSetupData] = useState<{ qrCodeDataUri: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Disable flow state
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    getTwoFactorStatus()
      .then((s) => setEnabled(s.enabled))
      .finally(() => setLoading(false));
  }, []);

  async function handleStartSetup() {
    setError(null);
    try {
      const data = await setupTwoFactor();
      setSetupData(data);
    } catch {
      setError("Could not start 2FA setup. Please try again.");
    }
  }

  async function handleConfirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await enableTwoFactor(code.trim());
      setEnabled(true);
      setSetupData(null);
      setCode("");
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await disableTwoFactor(password);
      setEnabled(false);
      setShowDisableConfirm(false);
      setPassword("");
    } catch {
      setError("Incorrect password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-30 px-4">
      <div className="bg-white rounded-xl border border-ink/8 w-full max-w-sm p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-ink font-medium">Two-factor authentication</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-sm">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-ink/35 text-sm">Loading...</p>
        ) : setupData ? (
          <form onSubmit={handleConfirmEnable} className="flex flex-col gap-4">
            <p className="text-ink/60 text-xs leading-relaxed">
              Scan this QR code with Google Authenticator, Authy, or any TOTP app.
            </p>
            <img
              src={setupData.qrCodeDataUri}
              alt="2FA QR code"
              className="w-40 h-40 mx-auto border border-ink/10 rounded-md"
            />
            <div>
              <label className="text-xs text-ink/45 font-medium">Or enter this key manually</label>
              <p className="mt-1 font-mono text-xs text-ink/70 bg-ink/5 rounded-md px-3 py-2 break-all">
                {setupData.secret}
              </p>
            </div>
            <div>
              <label className="text-xs text-ink/45 font-medium">Enter the 6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                placeholder="000000"
                className="w-full mt-1 border border-ink/10 rounded-md px-3 py-2 text-sm font-mono tracking-[0.3em] text-center focus:outline-none focus:border-ledger"
              />
            </div>
            {error && <p className="text-rust text-xs">{error}</p>}
            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full bg-ledger text-paper text-sm font-medium rounded-md py-2.5 disabled:opacity-50"
            >
              {submitting ? "Verifying..." : "Confirm & enable"}
            </button>
          </form>
        ) : showDisableConfirm ? (
          <form onSubmit={handleDisable} className="flex flex-col gap-4">
            <p className="text-ink/60 text-xs leading-relaxed">
              Enter your password to disable two-factor authentication.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="••••••••"
              className="w-full border border-ink/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ledger"
            />
            {error && <p className="text-rust text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDisableConfirm(false)}
                className="flex-1 text-sm text-ink/60 border border-ink/10 rounded-md py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !password}
                className="flex-1 bg-rust text-paper text-sm font-medium rounded-md py-2.5 disabled:opacity-50"
              >
                {submitting ? "Disabling..." : "Disable"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${enabled ? "bg-ledger" : "bg-ink/20"}`} />
              <p className="text-sm text-ink/70">
                {enabled ? "Two-factor authentication is enabled." : "Two-factor authentication is not enabled."}
              </p>
            </div>
            {enabled ? (
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="w-full text-rust border border-rust/20 text-sm font-medium rounded-md py-2.5 hover:bg-rust/8 transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={handleStartSetup}
                className="w-full bg-ledger text-paper text-sm font-medium rounded-md py-2.5 hover:opacity-90 transition-opacity"
              >
                Enable 2FA
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}