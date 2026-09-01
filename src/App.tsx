import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.tsx";
import { AuthModal } from "./components/AuthModal.tsx";
import { FlightSearch } from "./components/FlightSearch.tsx";
import { MyBookings } from "./components/MyBookings.tsx";
import { AirportNetwork } from "./components/AirportNetwork.tsx";
import { DSACenter } from "./components/DSACenter.tsx";
import { AdminSuite } from "./components/AdminSuite.tsx";
import { User } from "./types/index.ts";
import { api } from "./services/api.ts";
import { CheckCircle2, Sparkles, AlertCircle } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("flights");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isRebuildingDSA, setIsRebuildingDSA] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load session or default demo user if stored
  useEffect(() => {
    const savedUser = localStorage.getItem("airserve_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("airserve_user", JSON.stringify(user));
    showToast(`Welcome aboard, ${user.name}! Authenticated via Custom Hash Table.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("airserve_user");
    if (activeTab === "admin") {
      setActiveTab("flights");
    }
    showToast("You have been signed out safely.");
  };

  const handleRebuildDSA = async () => {
    setIsRebuildingDSA(true);
    try {
      const res = await api.rebuildDSA();
      showToast("✈️ AVL Trees, Max-Heap Priority Queue & Route Graph re-synchronized from SQLite!");
    } catch (err: any) {
      alert(err.message || "Failed to rebuild DSA.");
    } finally {
      setIsRebuildingDSA(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onRebuildDSA={handleRebuildDSA}
        isRebuilding={isRebuildingDSA}
      />

      {/* Main View Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === "flights" && (
          <FlightSearch
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onBookingSuccess={() => {
              showToast("🎉 Booking Confirmed! Synced immediately with Booking AVL Tree.");
            }}
          />
        )}

        {activeTab === "my-bookings" && (
          <MyBookings
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === "network" && (
          <AirportNetwork currentUser={currentUser} />
        )}

        {activeTab === "dsa-center" && <DSACenter />}

        {activeTab === "admin" && (
          currentUser?.role === "ADMIN" ? (
            <AdminSuite />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
              <h2 className="text-xl font-bold text-slate-900">Administrator Access Required</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Please sign in with an Admin account (e.g. username: <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-bold">admin</code> / password: <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-bold">admin123</code>) to view fleet operations and revenue intelligence.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
              >
                Sign In as Administrator
              </button>
            </div>
          )
        )}
      </main>

      {/* Professional Polish Footer */}
      <footer className="mt-auto h-10 bg-white border-t border-slate-200 flex items-center justify-between px-6 text-[10px] text-slate-500 uppercase tracking-tight shrink-0 font-medium z-10">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">&copy; 2026 AirServe Technologies</span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1.5 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Storage: airserve_master.db <strong className="text-blue-600 font-bold">ACTIVE</strong>
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            AVL Engine v2.4
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Graph Engine v1.1
          </span>
          <span className="text-blue-600 font-bold">System Load: 4%</span>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 flex items-center space-x-3 rounded-xl border border-slate-700 bg-[#0F172A] px-4 py-3 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-white">{toastMessage}</span>
        </div>
      )}

      {/* Auth & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
