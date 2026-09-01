import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  User,
  Lock,
  Mail,
  Phone,
  CreditCard,
  Globe,
  Sparkles,
  ArrowRight,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { api } from "../services/api.ts";
import { User as UserType } from "../types/index.ts";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [nationality, setNationality] = useState("India");
  const [tier, setTier] = useState("STANDARD");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dsaTrace, setDsaTrace] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError("Please provide username and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ username, password });
      setDsaTrace(res.dsaTrace);
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !name || !email) {
      setError("Please complete all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.register({
        username,
        password,
        name,
        email,
        phone,
        passportNumber,
        nationality,
        tier,
      });
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to register account.");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setMode("login");
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === "login" ? "Sign In to AIRSERVE" : "Create Passenger Account"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Authenticated with <strong className="text-cyan-400">Custom Hash Table Separate Chaining O(1)</strong>
          </p>
        </div>

        {/* Quick Demo Credentials Bar */}
        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center space-x-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span>1-Click Test Accounts</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => fillQuickAccount("admin", "Admin@123")}
              className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-950/20 px-2.5 py-1.5 text-rose-300 hover:bg-rose-900/40 transition text-left"
            >
              <div>
                <span className="font-bold block">Admin Portal</span>
                <span className="text-[10px] text-rose-400 font-mono">admin / Admin@123</span>
              </div>
              <ShieldCheck className="h-4 w-4 text-rose-400" />
            </button>

            <button
              type="button"
              onClick={() => fillQuickAccount("alex.miller", "Pass@123")}
              className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-950/20 px-2.5 py-1.5 text-indigo-300 hover:bg-indigo-900/40 transition text-left"
            >
              <div>
                <span className="font-bold block">VIP Passenger</span>
                <span className="text-[10px] text-indigo-400 font-mono">alex.miller</span>
              </div>
              <User className="h-4 w-4 text-indigo-400" />
            </button>

            <button
              type="button"
              onClick={() => fillQuickAccount("sarah.chen", "Pass@123")}
              className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 px-2.5 py-1.5 text-amber-300 hover:bg-amber-900/40 transition text-left"
            >
              <div>
                <span className="font-bold block">Gold Passenger</span>
                <span className="text-[10px] text-amber-400 font-mono">sarah.chen</span>
              </div>
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
            </button>

            <button
              type="button"
              onClick={() => fillQuickAccount("priya.sharma", "Pass@123")}
              className="flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2.5 py-1.5 text-cyan-300 hover:bg-cyan-900/40 transition text-left"
            >
              <div>
                <span className="font-bold block">Business Member</span>
                <span className="text-[10px] text-cyan-400 font-mono">priya.sharma</span>
              </div>
              <KeyRound className="h-4 w-4 text-cyan-400" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Tab switch */}
        <div className="mb-5 flex rounded-lg bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              mode === "login"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              mode === "register"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Register Passenger
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Username</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or alex.miller"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-cyan-500 transition disabled:opacity-50"
            >
              <span>{loading ? "Authenticating in Hash Table..." : "Sign In"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Johnathan Davis"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 0192"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Passport Number</label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="US889102"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Nationality</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Loyalty Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="STANDARD">Standard (+500 pts)</option>
                  <option value="BUSINESS">Business (+1200 pts)</option>
                  <option value="GOLD">Gold Frequent Flyer</option>
                  <option value="VIP">VIP Executive</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 hover:from-cyan-500 hover:to-indigo-500 transition disabled:opacity-50"
            >
              <span>{loading ? "Registering..." : "Create Account & Sync AVL"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
