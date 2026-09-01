import React, { useState, useEffect } from "react";
import {
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  Printer,
  Hourglass,
  Layers,
  ArrowRight,
  Sparkles,
  Plane,
  Trash2,
  Eye,
  Search,
} from "lucide-react";
import { api } from "../services/api.ts";
import { Booking, Flight, User, WaitingListEntry } from "../types/index.ts";
import { DigitalBoardingPass } from "./DigitalBoardingPass.tsx";

interface MyBookingsProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
}

export const MyBookings: React.FC<MyBookingsProps> = ({
  currentUser,
  onOpenAuthModal,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"confirmed" | "waiting" | "cancelled">("confirmed");

  // Selected booking for boarding pass view
  const [selectedPassBooking, setSelectedPassBooking] = useState<{
    booking: Booking;
    flight?: Flight;
  } | null>(null);

  // Cancellation feedback toast/modal with DSA auto-promotion details
  const [cancellationResult, setCancellationResult] = useState<{
    message: string;
    seatReleased: string;
    autoPromotedPassenger?: any;
    dsaAction: string;
  } | null>(null);

  // Guest booking lookup
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (currentUser) {
        const passengerId = currentUser.passengerId || `PAS-${currentUser.id}`;
        const res = await api.getBookings({ passengerId });
        setBookings(res.bookings);

        // Fetch user waitlist
        const wlRes = await api.getWaitingList();
        const myWl = wlRes.waitingList.filter(
          (w) => w.passengerId === passengerId || w.passengerName === currentUser.name
        );
        setWaitingList(myWl);
      } else {
        // Fetch recent demo bookings
        const res = await api.getBookings();
        setBookings(res.bookings);
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm(`Are you sure you want to cancel booking ${bookingId}? This will release the seat into the Flight AVL Tree and auto-promote any passenger in the Binary Max-Heap waiting list.`)) {
      return;
    }

    try {
      const res = await api.cancelBooking(bookingId);
      setCancellationResult({
        message: res.message,
        seatReleased: res.seatReleased,
        autoPromotedPassenger: res.autoPromotedPassenger,
        dsaAction: res.dsaAction,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel booking.");
    }
  };

  const handleCancelWaitlist = async (id: string) => {
    try {
      await api.cancelWaitingList(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to remove from waiting list.");
    }
  };

  const handleLookupBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;

    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await api.getBookingById(lookupQuery.trim().toUpperCase());
      setLookupResult(res);
    } catch (err: any) {
      alert(err.message || "Booking ID not found in AVL Tree.");
    } finally {
      setLookupLoading(false);
    }
  };

  const confirmedList = bookings.filter((b) => b.bookingStatus === "CONFIRMED");
  const cancelledList = bookings.filter((b) => b.bookingStatus === "CANCELLED");

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <Ticket className="h-4 w-4" />
              <span>Passenger Reservations & Boarding Passes</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              {currentUser ? `${currentUser.name}'s Travel Dashboard` : "Passenger Reservations Hub"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time synchronization with Booking AVL Tree & Binary Max-Heap Priority Queue.
            </p>
          </div>

          {!currentUser && (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>Sign In to See Your Profile</span>
            </button>
          )}
        </div>

        {/* Quick Booking ID Lookup Form */}
        <form onSubmit={handleLookupBooking} className="mt-6 flex max-w-lg items-center space-x-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="Instant Search by Booking ID (e.g. BKG-1001)..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            {lookupLoading ? "Searching AVL..." : "AVL Lookup"}
          </button>
        </form>

        {lookupResult && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 font-mono">
                  AVL Match: {lookupResult.booking.bookingId} ({lookupResult.booking.passengerName})
                </span>
              </div>
              <button
                onClick={() =>
                  setSelectedPassBooking({
                    booking: lookupResult.booking,
                    flight: lookupResult.flight,
                  })
                }
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
              >
                View Boarding Pass
              </button>
            </div>
            <p className="text-[11px] text-slate-600 font-mono mt-1">
              Flight: {lookupResult.booking.flightNumber} | Seat: {lookupResult.booking.seatNumber} |
              Status: {lookupResult.booking.bookingStatus} | Search steps: {lookupResult.dsaTrace?.steps || 1}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab("confirmed")}
          className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            activeSubTab === "confirmed"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <CheckCircle2 className={`h-4 w-4 ${activeSubTab === "confirmed" ? "text-white" : "text-emerald-500"}`} />
          <span>Active Bookings ({confirmedList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("waiting")}
          className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            activeSubTab === "waiting"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Hourglass className={`h-4 w-4 ${activeSubTab === "waiting" ? "text-white" : "text-amber-500"}`} />
          <span>Waiting List ({waitingList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("cancelled")}
          className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            activeSubTab === "cancelled"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <XCircle className={`h-4 w-4 ${activeSubTab === "cancelled" ? "text-white" : "text-rose-500"}`} />
          <span>Cancelled ({cancelledList.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 font-mono">
          Loading Booking AVL Records...
        </div>
      ) : activeSubTab === "confirmed" ? (
        confirmedList.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <Ticket className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Active Bookings</h3>
            <p className="text-xs text-slate-500 mt-1">
              You do not have any confirmed flight reservations currently.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {confirmedList.map((b) => (
              <div
                key={b.bookingId}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-600">{b.bookingId}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{b.passengerName}</h3>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-700 border border-emerald-200">
                    {b.bookingStatus}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-4 text-xs font-mono">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Flight</span>
                    <p className="font-bold text-slate-900 mt-0.5">{b.flightNumber}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Seat</span>
                    <p className="font-bold text-amber-600 mt-0.5">{b.seatNumber}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Class</span>
                    <p className="font-bold text-slate-700 mt-0.5">{b.class}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Paid:</span>
                    <p className="font-mono text-sm font-bold text-slate-900">${b.ticketPrice}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCancelBooking(b.bookingId)}
                      className="flex items-center space-x-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-sm"
                      title="Cancel ticket & auto-promote waiting list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Cancel</span>
                    </button>

                    <button
                      onClick={() => setSelectedPassBooking({ booking: b, flight: b.flight })}
                      className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Boarding Pass</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeSubTab === "waiting" ? (
        waitingList.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <Hourglass className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Active Waitlist Entries</h3>
            <p className="text-xs text-slate-500 mt-1">
              You are not currently in any flight queue in the Binary Max-Heap.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {waitingList.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-600">{w.id}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{w.flightNumber}</h3>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-700 border border-amber-200">
                    Priority Score: {w.priority}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Membership Tier:</span>
                    <span className="text-slate-900 font-bold">{w.priorityLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Request Time:</span>
                    <span className="text-slate-700">{w.requestTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Heap State:</span>
                    <span className="text-amber-600 font-bold">Awaiting seat cancellation</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleCancelWaitlist(w.id)}
                    className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition shadow-sm"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Leave Waitlist</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cancelledList.map((b) => (
            <div
              key={b.bookingId}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 opacity-80"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-slate-400 font-bold">{b.bookingId}</span>
                  <h3 className="text-sm font-bold text-slate-700 mt-0.5">{b.passengerName}</h3>
                </div>
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-700 border border-rose-200">
                  CANCELLED
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500">
                Flight {b.flightNumber} • Seat {b.seatNumber} • Refund Status: {b.paymentStatus}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Cancellation & Auto-Promotion Modal Feedback */}
      {cancellationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 text-slate-800">
            <div className="mb-4 flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Ticket Cancelled & DSA Synchronized</span>
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {cancellationResult.message}
            </h2>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Seat Released:</span>
                  <span className="font-bold text-amber-600">{cancellationResult.seatReleased}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Flight AVL Update:</span>
                  <span className="font-bold text-emerald-600">Available seats incremented</span>
                </div>
              </div>

              {cancellationResult.autoPromotedPassenger ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2 font-sans">
                  <div className="flex items-center space-x-2 text-xs font-bold text-blue-600">
                    <Sparkles className="h-4 w-4" />
                    <span>Automatic Priority Queue Promotion!</span>
                  </div>
                  <p className="text-xs text-slate-700">
                    Passenger <strong className="text-slate-900">{cancellationResult.autoPromotedPassenger.passengerName}</strong> (Priority: {cancellationResult.autoPromotedPassenger.priority}) was at the root of the Binary Max-Heap and has been immediately assigned released seat <strong className="text-amber-600">{cancellationResult.seatReleased}</strong>.
                  </p>
                  <p className="text-[11px] font-mono text-blue-600 font-bold">
                    New Confirmed Booking: {cancellationResult.autoPromotedPassenger.confirmedBookingId}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  Priority Queue was empty for this flight. Seat returned to general availability in Flight AVL Tree.
                </div>
              )}
            </div>

            <button
              onClick={() => setCancellationResult(null)}
              className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Boarding Pass Modal */}
      {selectedPassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="relative w-full max-w-3xl">
            <DigitalBoardingPass
              booking={selectedPassBooking.booking}
              flight={selectedPassBooking.flight}
              onClose={() => setSelectedPassBooking(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
