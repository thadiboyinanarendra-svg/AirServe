import React from "react";
import {
  Plane,
  Layers,
  MapPin,
  Compass,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  RefreshCw,
  Sparkles,
  Ticket,
  Search,
} from "lucide-react";
import { User } from "../types/index.ts";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onRebuildDSA: () => void;
  isRebuilding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onRebuildDSA,
  isRebuilding,
}) => {
  const navItems = [
    { id: "flights", label: "Search & Book", icon: Search },
    { id: "my-bookings", label: "My Bookings", icon: Ticket },
    { id: "network", label: "Airport Network & Dijkstra", icon: Compass },
    { id: "dsa-center", label: "DSA Visualization Center", icon: Layers, highlight: true },
    ...(currentUser?.role === "ADMIN"
      ? [{ id: "admin", label: "Admin Operations", icon: ShieldCheck }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0F172A] text-white shadow-md">
      {/* Top Status Bar */}
      <div className="hidden border-b border-slate-800 bg-slate-900/90 px-6 py-1.5 text-xs text-slate-400 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-2.5 py-0.5 bg-slate-800 rounded-full border border-slate-700/80 text-[11px] font-medium text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Online: AVL-HT-Graph Active</span>
          </div>
          <span className="text-slate-700">|</span>
          <span className="font-mono text-[11px]">AVL Trees: <strong className="text-slate-300">Synchronized</strong></span>
          <span className="text-slate-700">|</span>
          <span className="font-mono text-[11px]">Priority Queue: <strong className="text-slate-300">Binary Max-Heap</strong></span>
          <span className="text-slate-700">|</span>
          <span className="font-mono text-[11px]">Auth: <strong className="text-slate-300">Hash Table O(1)</strong></span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRebuildDSA}
            disabled={isRebuilding}
            className="flex items-center space-x-1.5 rounded-md px-2.5 py-0.5 text-xs text-blue-300 hover:bg-slate-800 hover:text-white border border-slate-700/50 transition font-medium"
            title="Rebuild in-memory AVL Trees, Heap & Graph from SQLite"
          >
            <RefreshCw className={`h-3 w-3 ${isRebuilding ? "animate-spin text-blue-400" : ""}`} />
            <span>Sync DSA & DB</span>
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div
          className="flex cursor-pointer items-center space-x-3"
          onClick={() => setActiveTab("flights")}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-lg shadow-md shadow-blue-600/30">
            A
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                AIRSERVE <span className="text-blue-400 font-light">PRO</span>
              </h1>
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
                DSA CORE
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
              Fleet Operations & Intelligence Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group flex items-center space-x-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                } ${
                  item.highlight && !isActive
                    ? "text-blue-300 bg-blue-950/40 border border-blue-500/20 hover:bg-blue-900/40"
                    : ""
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? "text-white" : item.highlight ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span>{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Auth / Profile Area */}
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-100 flex items-center justify-end space-x-1.5">
                  <span>{currentUser.name}</span>
                  {currentUser.role === "ADMIN" ? (
                    <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/30">
                      ADMIN
                    </span>
                  ) : (
                    <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-300 border border-blue-500/30">
                      {currentUser.passenger?.tier || "PASSENGER"}
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{currentUser.username}</span>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 border border-white/20 text-white font-bold text-xs">
                {currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || currentUser.name.charAt(0)}
              </div>

              <button
                onClick={onLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 hover:bg-rose-950/40 hover:border-rose-500/40 hover:text-rose-400 transition"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Sign In / Demo</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden overflow-x-auto border-t border-slate-800 px-3 py-2 space-x-1 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex whitespace-nowrap items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
