import { useState } from "react";
import { login, register, setSession } from "./lib/api";

interface LoginProps {
  onAuthenticated: () => void;
}

function Logomark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="2" y="14" width="4" height="8" rx="1" fill="currentColor" />
      <rect x="10" y="8" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="18" y="2" width="4" height="20" rx="1" fill="currentColor" />
    </svg>
  );
}

const previewTxns = [
  { name: "Amazon", status: "COMPLETED", amount: "-₹2,450.00" },
  { name: "Unknown Merchant", status: "FLAGGED", amount: "-₹85,000.00" },
  { name: "Salary Credit", status: "COMPLETED", amount: "+₹68,000.00" },
];

function ProductPreview() {
  return (
    <div className="relative animate-fade-up" style={{ animationDelay: "0.3s" }}>
      <div className="absolute -inset-10 bg-ledger/[0.12] blur-[60px] rounded-full animate-glow-pulse" />
      <div className="relative bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/10 w-[320px] overflow-hidden animate-float">
        <div className="px-5 py-4 border-b border-ink/8 flex items-center justify-between">
          <span className="text-xs font-medium text-ink/50">Recent activity</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ledger animate-pulse" />
            <span className="text-[10px] font-mono text-ink/35 uppercase tracking-wider">Live</span>
          </span>
        </div>
        <div>
          {previewTxns.map((t, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-ink/6 last:border-0">
              <div>
                <p className="text-sm text-ink font-medium">{t.name}</p>
                <p className={`text-[11px] font-mono mt-0.5 ${t.status === "FLAGGED" ? "text-rust" : "text-ledger"}`}>
                  {t.status}
                </p>
              </div>
              <p className="text-sm font-mono text-ink/80">{t.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-ink text-paper flex-col relative overflow-hidden px-14 py-12">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, #E9E7E2 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="flex items-center gap-2 relative z-10 animate-fade-up">
        <Logomark className="w-4 h-4 text-ledger" />
        <span className="font-mono text-sm tracking-wide">FINORA</span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-14 relative z-10">
        <div className="max-w-md animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="text-[2.75rem] font-medium leading-[1.1] mb-4 tracking-tight">
            Every transaction,<br />accounted for.
          </h1>
          <p className="text-paper/45 text-[15px] leading-relaxed max-w-sm">
            Real-time fraud detection and transaction intelligence, built for the way modern banking actually works.
          </p>
        </div>

        <ProductPreview />
      </div>

      <div className="flex items-center gap-5 text-paper/35 text-xs relative z-10 animate-fade-up" style={{ animationDelay: "0.5s" }}>
        <span>Event-driven architecture</span>
        <span className="w-1 h-1 rounded-full bg-paper/20" />
        <span>Real-time fraud scoring</span>
        <span className="w-1 h-1 rounded-full bg-paper/20" />
        <span>JWT-secured</span>
      </div>
    </div>
  );
}

function Login({ onAuthenticated }: LoginProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth = mode === "login"
        ? await login(email, password)
        : await register(name, email, password);
      setSession(auth);
      onAuthenticated();
    } catch {
      setError(mode === "login" ? "Invalid email or password" : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-paper">
      <BrandPanel />

      <div className="flex-1 flex flex-col">
        <div className="flex justify-end px-8 py-6">
          <span className="text-xs text-ink/40">
            Need help? <a href="#" className="text-ink/60 hover:text-ink underline underline-offset-2">Contact support</a>
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-[360px] animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center gap-2 mb-10 lg:hidden justify-center">
              <Logomark className="w-4 h-4 text-ledger" />
              <span className="font-mono text-sm tracking-wide text-ink">FINORA</span>
            </div>

            <h2 className="text-[28px] font-semibold text-ink mb-1.5 tracking-tight">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-ink/45 text-sm mb-9">
              {mode === "login" ? "Sign in to continue to your dashboard." : "Takes less than a minute."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="text-xs font-medium text-ink/60 block mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Tanuj Sharma"
                    className="w-full bg-white border border-ink/12 rounded-md px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 shadow-sm focus:outline-none focus:ring-2 focus:ring-ledger/25 focus:border-ledger transition-all"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-ink/60 block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-white border border-ink/12 rounded-md px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 shadow-sm focus:outline-none focus:ring-2 focus:ring-ledger/25 focus:border-ledger transition-all"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-ink/60">Password</label>
                  {mode === "login" && (
                    <button type="button" className="text-xs text-ink/35 hover:text-ink/60 transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full bg-white border border-ink/12 rounded-md px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 shadow-sm focus:outline-none focus:ring-2 focus:ring-ledger/25 focus:border-ledger transition-all"
                />
              </div>

              {mode === "login" && (
                <label className="flex items-center gap-2 text-xs text-ink/50 cursor-pointer select-none">
                  <input type="checkbox" className="rounded border-ink/20 accent-ledger w-3.5 h-3.5" />
                  Keep me signed in
                </label>
              )}

              {error && (
                <p className="text-rust text-xs bg-rust/5 border border-rust/15 rounded-md px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ledger text-paper font-medium rounded-md px-3 py-2.5 text-sm shadow-sm disabled:opacity-50 hover:opacity-90 active:scale-[0.99] transition-all mt-2"
              >
                {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="text-center text-xs text-ink/45 mt-8">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                className="text-ledger font-medium hover:underline"
              >
                {mode === "login" ? "Register" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;