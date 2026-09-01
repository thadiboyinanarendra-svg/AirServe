import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plane,
  ArrowRightLeft,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Armchair,
  Check,
  X,
  Hourglass,
  Layers,
  ChevronDown,
  Info,
  SlidersHorizontal,
  RotateCcw,
  DollarSign,
} from "lucide-react";
import confetti from "canvas-confetti";
import { api } from "../services/api.ts";
import { Airport, Flight, User, Booking } from "../types/index.ts";
import { DigitalBoardingPass } from "./DigitalBoardingPass.tsx";

interface FlightSearchProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onBookingSuccess?: () => void;
}

// Helper to convert "2h 15m" to 135 minutes for accurate sorting and filtering
function parseDurationMinutes(durStr: string | undefined): number {
  if (!durStr) return 0;
  const hoursMatch = durStr.match(/(\d+)\s*h/i);
  const minsMatch = durStr.match(/(\d+)\s*m/i);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
  return hours * 60 + mins;
}

export const FlightSearch: React.FC<FlightSearchProps> = ({
  currentUser,
  onOpenAuthModal,
  onBookingSuccess,
}) => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [rawFlights, setRawFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);

  // Search parameters for server query
  const [source, setSource] = useState("HYD");
  const [destination, setDestination] = useState("DEL");
  const [departureDate, setDepartureDate] = useState("2026-09-02");

  // Dynamic Client-side Filters (Update immediately without new server search)
  const [flightClass, setFlightClass] = useState("ALL");
  const [selectedAirline, setSelectedAirline] = useState("ALL");
  const [stopsFilter, setStopsFilter] = useState<string>("ALL"); // "ALL" | "0" | "1" | "2+"
  const [minAvailableSeats, setMinAvailableSeats] = useState<string>("ALL"); // "ALL" | "available" | "5+" | "10+"
  const [maxPrice, setMaxPrice] = useState<number>(1200);
  const [maxDurationMinutes, setMaxDurationMinutes] = useState<number>(900); // up to 15h
  const [quickKeyword, setQuickKeyword] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("price_asc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(true);

  // Seat selection modal state
  const [selectedFlightForBooking, setSelectedFlightForBooking] = useState<Flight | null>(null);
  const [seatMapData, setSeatMapData] = useState<any | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Waiting list modal state
  const [selectedFlightForWaiting, setSelectedFlightForWaiting] = useState<Flight | null>(null);
  const [waitlistPriority, setWaitlistPriority] = useState<number>(75);
  const [waitlistPriorityLabel, setWaitlistPriorityLabel] = useState<string>("Gold Frequent Flyer");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccessResult, setWaitlistSuccessResult] = useState<any | null>(null);

  // Boarding pass modal after confirmed booking
  const [confirmedBookingData, setConfirmedBookingData] = useState<{
    booking: Booking;
    flight: Flight;
  } | null>(null);

  // Selected flight detail drawer
  const [inspectFlightTrace, setInspectFlightTrace] = useState<{
    flight: Flight;
    trace: any;
  } | null>(null);

  useEffect(() => {
    loadAirports();
    performSearch();
  }, []);

  const loadAirports = async () => {
    try {
      const res = await api.getAirports();
      setAirports(res.airports);
    } catch (err) {
      console.error(err);
    }
  };

  const performSearch = async (overrideParams?: {
    source?: string;
    destination?: string;
    date?: string;
  }) => {
    setLoading(true);
    try {
      const qSource = overrideParams?.source !== undefined ? overrideParams.source : source;
      const qDest = overrideParams?.destination !== undefined ? overrideParams.destination : destination;
      const qDate = overrideParams?.date !== undefined ? overrideParams.date : departureDate;

      const res = await api.searchFlights({
        source: qSource !== "ALL" ? qSource : undefined,
        destination: qDest !== "ALL" ? qDest : undefined,
        date: qDate && qDate !== "ALL" ? qDate : undefined,
      });
      setRawFlights(res.flights);
    } catch (err) {
      console.error("Flight search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (newDate: string) => {
    setDepartureDate(newDate);
    performSearch({ date: newDate });
  };

  const handleDateStep = (offsetDays: number) => {
    const base = departureDate && /^\d{4}-\d{2}-\d{2}$/.test(departureDate)
      ? new Date(`${departureDate}T12:00:00Z`)
      : new Date("2026-09-02T12:00:00Z");
    base.setUTCDate(base.getUTCDate() + offsetDays);
    const newDateStr = base.toISOString().split("T")[0];
    setDepartureDate(newDateStr);
    performSearch({ date: newDateStr });
  };

  const handleClearDate = () => {
    setDepartureDate("");
    performSearch({ date: "" });
  };

  // 7-Day Date Ribbon Generator
  const nearbyDays = useMemo(() => {
    const base = departureDate && /^\d{4}-\d{2}-\d{2}$/.test(departureDate)
      ? new Date(`${departureDate}T12:00:00Z`)
      : new Date("2026-09-02T12:00:00Z");

    const days = [];
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + offset);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
      const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      const fullDate = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
      days.push({
        dateStr,
        dayName,
        monthDay,
        fullDate,
        isSelected: departureDate === dateStr,
        isToday: dateStr === "2026-09-01",
      });
    }
    return days;
  }, [departureDate]);

  const formattedSelectedDate = useMemo(() => {
    if (!departureDate || departureDate === "ALL") return null;
    try {
      const d = new Date(`${departureDate}T12:00:00Z`);
      if (isNaN(d.getTime())) return departureDate;
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return departureDate;
    }
  }, [departureDate]);

  const handleSwapAirports = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  const handleResetFilters = () => {
    setFlightClass("ALL");
    setSelectedAirline("ALL");
    setStopsFilter("ALL");
    setMinAvailableSeats("ALL");
    setMaxPrice(1200);
    setMaxDurationMinutes(900);
    setQuickKeyword("");
    setSortBy("price_asc");
  };

  // Distinct airlines present in results
  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    rawFlights.forEach((f) => {
      if (f.airline) set.add(f.airline);
    });
    return Array.from(set).sort();
  }, [rawFlights]);

  // Comprehensive Real-time Filtered & Sorted Flights
  const displayedFlights = useMemo(() => {
    return rawFlights
      .filter((flight) => {
        // 1. Cabin Class filter
        if (flightClass !== "ALL" && flight.class !== flightClass) {
          return false;
        }

        // 2. Airline filter
        if (selectedAirline !== "ALL" && flight.airline !== selectedAirline) {
          return false;
        }

        // 3. Price filter (maxPrice threshold)
        if (flight.ticketPrice > maxPrice) {
          return false;
        }

        // 4. Duration filter
        const durationMins = parseDurationMinutes(flight.duration);
        if (durationMins > maxDurationMinutes) {
          return false;
        }

        // 5. Stops filter
        const flightStops = (flight as any).stops !== undefined ? (flight as any).stops : 0;
        if (stopsFilter === "0" && flightStops !== 0) return false;
        if (stopsFilter === "1" && flightStops !== 1) return false;
        if (stopsFilter === "2+" && flightStops < 2) return false;

        // 6. Available Seats filter
        if (minAvailableSeats === "available" && flight.availableSeats <= 0) {
          return false;
        }
        if (minAvailableSeats === "5+" && flight.availableSeats < 5) {
          return false;
        }
        if (minAvailableSeats === "10+" && flight.availableSeats < 10) {
          return false;
        }

        // 7. Quick keyword search (flight number, terminal, aircraft, airport)
        if (quickKeyword.trim()) {
          const kw = quickKeyword.trim().toLowerCase();
          const matchFn = flight.flightNumber.toLowerCase().includes(kw);
          const matchSrc = flight.sourceAirport.toLowerCase().includes(kw);
          const matchDest = flight.destinationAirport.toLowerCase().includes(kw);
          const matchAirline = flight.airline.toLowerCase().includes(kw);
          const matchAircraft = (flight.aircraft || "").toLowerCase().includes(kw);
          if (!matchFn && !matchSrc && !matchDest && !matchAirline && !matchAircraft) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Comprehensive Sorting
        switch (sortBy) {
          case "price_asc":
            return a.ticketPrice - b.ticketPrice;
          case "price_desc":
            return b.ticketPrice - a.ticketPrice;
          case "duration_asc":
            return parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration);
          case "duration_desc":
            return parseDurationMinutes(b.duration) - parseDurationMinutes(a.duration);
          case "seats_desc":
            return b.availableSeats - a.availableSeats;
          case "seats_asc":
            return a.availableSeats - b.availableSeats;
          case "departure_asc":
            return (a.departureTime || "").localeCompare(b.departureTime || "");
          case "airline_asc":
            return (a.airline || "").localeCompare(b.airline || "");
          default:
            return a.ticketPrice - b.ticketPrice;
        }
      });
  }, [
    rawFlights,
    flightClass,
    selectedAirline,
    stopsFilter,
    minAvailableSeats,
    maxPrice,
    maxDurationMinutes,
    quickKeyword,
    sortBy,
  ]);

  const handleInspectAVL = async (flightNumber: string) => {
    try {
      const res = await api.getFlightByNumber(flightNumber);
      setInspectFlightTrace({
        flight: res.flight,
        trace: res.dsaTrace,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSeatMap = async (flight: Flight) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    if (flight.availableSeats <= 0) {
      setSelectedFlightForWaiting(flight);
      return;
    }

    setSelectedFlightForBooking(flight);
    setSelectedSeat(null);
    setSeatLoading(true);
    try {
      const res = await api.getFlightSeats(flight.flightNumber);
      setSeatMapData(res);
      const firstAvail = res.seatLayout.find((s) => !s.isOccupied);
      if (firstAvail) setSelectedSeat(firstAvail.seatNumber);
    } catch (err) {
      console.error(err);
    } finally {
      setSeatLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedFlightForBooking || !selectedSeat || !currentUser) return;

    setBookingLoading(true);
    try {
      const res = await api.createBooking({
        flightNumber: selectedFlightForBooking.flightNumber,
        passengerId: currentUser.passengerId || `PAS-${currentUser.id}`,
        passengerName: currentUser.name,
        seatNumber: selectedSeat,
        class: selectedFlightForBooking.class,
        contactEmail: currentUser.email,
        contactPhone: currentUser.phone,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setConfirmedBookingData({
        booking: res.booking,
        flight: res.flight,
      });
      setSelectedFlightForBooking(null);
      performSearch();
      if (onBookingSuccess) onBookingSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to confirm booking.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleJoinWaitingList = async () => {
    if (!selectedFlightForWaiting || !currentUser) {
      onOpenAuthModal();
      return;
    }

    setWaitlistLoading(true);
    try {
      const res = await api.joinWaitingList({
        flightNumber: selectedFlightForWaiting.flightNumber,
        passengerId: currentUser.passengerId || `PAS-${currentUser.id}`,
        passengerName: currentUser.name,
        priority: waitlistPriority,
        priorityLabel: waitlistPriorityLabel,
        preferredClass: selectedFlightForWaiting.class,
        contactEmail: currentUser.email,
        contactPhone: currentUser.phone,
      });

      setWaitlistSuccessResult(res);
    } catch (err: any) {
      alert(err.message || "Failed to join waiting list.");
    } finally {
      setWaitlistLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Search Header Hero Panel */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>AVL Tree Powered Flight Radar</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl font-sans">
                Commercial Flight Schedule & Reservations
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Real-time self-balancing AVL index provides sub-millisecond scheduling, instant dynamic filtering, and live seat allocation.
              </p>
            </div>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 font-medium">
                Hub Airports: <strong className="text-blue-600 font-bold">{airports.length}</strong>
              </span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 font-medium">
                Total Flights in AVL: <strong className="text-slate-800 font-bold">{rawFlights.length}</strong>
              </span>
            </div>
          </div>

          {/* Search Controls Form */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Source */}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Origin
              </label>
              <div className="relative">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                >
                  <option value="ALL">All Origins</option>
                  {airports.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} – {a.city} ({a.name})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Swap button (desktop) */}
            <div className="relative hidden lg:flex items-end justify-center pb-1">
              <button
                type="button"
                onClick={handleSwapAirports}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition shadow-sm"
                title="Swap Origin and Destination"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Destination */}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Destination
              </label>
              <div className="relative">
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                >
                  <option value="ALL">All Destinations</option>
                  {airports.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} – {a.city} ({a.name})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Departure Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Departure Date
                </label>
                {departureDate && (
                  <button
                    type="button"
                    onClick={handleClearDate}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Clear (All Dates)
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => {
                    setDepartureDate(e.target.value);
                    if (e.target.value) {
                      performSearch({ date: e.target.value });
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>
            </div>

            {/* Search CTA */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => performSearch()}
                disabled={loading}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Search className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Searching AVL..." : "Find Flights"}</span>
              </button>
            </div>
          </div>

          {/* Quick Date Presets Strip */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 no-scrollbar border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center mr-1">
              <CalendarDays className="h-3 w-3 mr-1 text-slate-400" />
              Quick Dates:
            </span>
            {[
              { label: "Sep 01 (Today)", val: "2026-09-01" },
              { label: "Sep 02 (Wed)", val: "2026-09-02" },
              { label: "Sep 03 (Thu)", val: "2026-09-03" },
              { label: "Sep 04 (Fri)", val: "2026-09-04" },
              { label: "Sep 05 (Sat)", val: "2026-09-05" },
              { label: "Sep 06 (Sun)", val: "2026-09-06" },
              { label: "Sep 10 (Thu)", val: "2026-09-10" },
              { label: "Sep 15 (Tue)", val: "2026-09-15" },
              { label: "All Dates", val: "" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setDepartureDate(p.val);
                  performSearch({ date: p.val });
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition whitespace-nowrap ${
                  departureDate === p.val
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Quick Hub Airport Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pt-1 no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Popular Hubs:
            </span>
            {["HYD", "DEL", "BOM", "BLR", "DXB", "SIN", "LHR", "JFK"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setDestination(code);
                  performSearch({ destination: code });
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-mono font-semibold transition ${
                  destination === code
                    ? "bg-blue-600 text-white font-bold shadow-sm"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive 7-Day Date Carousel & Day Navigator Ribbon */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          {/* Previous Day Step */}
          <button
            type="button"
            onClick={() => handleDateStep(-1)}
            disabled={loading}
            className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            title="Step to Previous Day"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev Day</span>
          </button>

          {/* 7 Days Strip */}
          <div className="grid grid-cols-7 gap-1.5 flex-1 max-w-3xl">
            {nearbyDays.map((day) => (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => handleDateSelect(day.dateStr)}
                className={`flex flex-col items-center justify-center rounded-lg py-1.5 px-1 text-center transition border ${
                  day.isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${day.isSelected ? "text-blue-100" : "text-slate-400"}`}>
                  {day.dayName}
                </span>
                <span className="text-xs font-bold leading-tight mt-0.5">
                  {day.monthDay}
                </span>
                {day.isToday && (
                  <span className={`text-[9px] font-semibold mt-0.5 px-1 rounded ${day.isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>
                    Today
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Next Day Step */}
          <button
            type="button"
            onClick={() => handleDateStep(1)}
            disabled={loading}
            className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            title="Step to Next Day"
          >
            <span className="hidden sm:inline">Next Day</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Selected Date Status Banner */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 gap-1">
          <div className="flex items-center space-x-2">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>
              {formattedSelectedDate ? (
                <>
                  Showing flights departing on <strong className="text-slate-900 font-semibold">{formattedSelectedDate}</strong> ({departureDate})
                </>
              ) : (
                <>
                  Showing scheduled flights across <strong className="text-slate-900 font-semibold">all available calendar dates</strong>
                </>
              )}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-time AVL Tree Synchronization</span>
          </div>
        </div>
      </div>

      {/* Comprehensive Dynamic Filtering & Sorting Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        {/* Top bar: Summary & Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Dynamic Filters & Live Sorting
              </span>
            </div>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-700">
              Showing {displayedFlights.length} of {rawFlights.length} flights
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              title="Reset all filters to defaults"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              {isFilterPanelOpen ? "Collapse Filters ▲" : "Expand Filters ▼"}
            </button>
          </div>
        </div>

        {isFilterPanelOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
            {/* 1. Sorting Options */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sort Results By
              </label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
                >
                  <option value="price_asc">Price: Low to High ($)</option>
                  <option value="price_desc">Price: High to Low ($)</option>
                  <option value="duration_asc">Duration: Shortest First</option>
                  <option value="duration_desc">Duration: Longest First</option>
                  <option value="seats_desc">Available Seats: Most First</option>
                  <option value="seats_asc">Available Seats: Least First</option>
                  <option value="departure_asc">Departure Time (Earliest)</option>
                  <option value="airline_asc">Airline Name (A-Z)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* 2. Airline Filter */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Filter by Airline
              </label>
              <div className="relative">
                <select
                  value={selectedAirline}
                  onChange={(e) => setSelectedAirline(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
                >
                  <option value="ALL">All Airlines ({availableAirlines.length})</option>
                  {availableAirlines.map((airline) => (
                    <option key={airline} value={airline}>
                      {airline}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* 3. Number of Stops Filter */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Number of Stops
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: "ALL", label: "All" },
                  { id: "0", label: "Non-stop" },
                  { id: "1", label: "1 Stop" },
                  { id: "2+", label: "2+ Stops" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStopsFilter(item.id)}
                    className={`rounded-md py-1.5 px-1 text-center text-[11px] font-semibold transition ${
                      stopsFilter === item.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Available Seats Filter */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Seat Availability
              </label>
              <div className="relative">
                <select
                  value={minAvailableSeats}
                  onChange={(e) => setMinAvailableSeats(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
                >
                  <option value="ALL">Show All (Including Full)</option>
                  <option value="available">Available Seats Only (&gt; 0)</option>
                  <option value="5+">At least 5 Seats</option>
                  <option value="10+">At least 10 Seats</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* 5. Max Price Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="uppercase tracking-wider text-slate-500">Max Ticket Price:</span>
                <span className="font-mono text-blue-600">${maxPrice}</span>
              </div>
              <input
                type="range"
                min="100"
                max="1500"
                step="25"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>$100</span>
                <span>$750</span>
                <span>$1500</span>
              </div>
            </div>

            {/* 6. Max Flight Duration Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="uppercase tracking-wider text-slate-500">Max Flight Duration:</span>
                <span className="font-mono text-blue-600">
                  {Math.floor(maxDurationMinutes / 60)}h {maxDurationMinutes % 60}m
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="1200"
                step="30"
                value={maxDurationMinutes}
                onChange={(e) => setMaxDurationMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>1h</span>
                <span>10h</span>
                <span>20h</span>
              </div>
            </div>

            {/* 7. Cabin Class Filter */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Cabin Class
              </label>
              <div className="grid grid-cols-4 gap-1">
                {["ALL", "Economy", "Business", "First Class"].map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setFlightClass(cls)}
                    className={`rounded-md py-1.5 px-1 text-center text-[10px] font-semibold transition truncate ${
                      flightClass === cls
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {cls === "First Class" ? "First" : cls}
                  </button>
                ))}
              </div>
            </div>

            {/* 8. Quick Filter by Keyword */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Quick Keyword Filter
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={quickKeyword}
                  onChange={(e) => setQuickKeyword(e.target.value)}
                  placeholder="Flight #, Aircraft, City..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Flight Results Grid */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm font-semibold text-slate-800">Searching Flight AVL Tree...</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">O(log n) self-balancing traversal</p>
          </div>
        ) : displayedFlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-14 text-center shadow-sm">
            <Plane className="h-10 w-10 text-slate-400 mb-2" />
            <h3 className="text-base font-bold text-slate-900">No Flights Match Your Filters</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {rawFlights.length > 0
                ? `${rawFlights.length} flights exist for this route, but none match the active price, duration, stop, or seat filters.`
                : "No active scheduled flights match your selected origin, destination, or date."}
            </p>
            <div className="mt-4 flex items-center space-x-2">
              <button
                onClick={handleResetFilters}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm"
              >
                Reset Filters
              </button>
              <button
                onClick={() => {
                  setSource("ALL");
                  setDestination("ALL");
                  setDepartureDate("");
                  handleResetFilters();
                  performSearch();
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-100 transition shadow-sm"
              >
                Show All Flights in AVL Tree
              </button>
            </div>
          </div>
        ) : (
          displayedFlights.map((flight) => {
            const isFull = flight.availableSeats <= 0;
            const flightStops = (flight as any).stops !== undefined ? (flight as any).stops : 0;
            return (
              <div
                key={flight.flightNumber}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:p-6"
              >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
                  {/* Airline & Aircraft */}
                  <div className="lg:col-span-3 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-base tracking-tight">
                        {flight.airline}
                      </span>
                      <button
                        onClick={() => handleInspectAVL(flight.flightNumber)}
                        className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 border border-blue-100 hover:bg-blue-100"
                        title="Inspect AVL Tree Search Trace for this flight"
                      >
                        {flight.flightNumber} 🔍
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{flight.aircraft}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-0.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 border border-slate-200">
                        {flight.class}
                      </span>
                      <span>T{flight.terminal} • Gate {flight.gate}</span>
                    </div>
                  </div>

                  {/* Route & Schedule Timeline */}
                  <div className="lg:col-span-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {flight.departureTime}
                        </span>
                        <div className="text-xs font-bold text-blue-600 font-mono mt-0.5">
                          {flight.sourceAirport}
                        </div>
                        <span className="text-[10px] text-slate-400">{flight.departureDate}</span>
                      </div>

                      {/* Flight Path Vector */}
                      <div className="flex flex-col items-center px-4 flex-1">
                        <span className="text-[10px] font-mono text-slate-500 mb-1">
                          {flight.duration}
                        </span>
                        <div className="relative w-full flex items-center justify-center">
                          <div className="h-[2px] w-full bg-slate-200"></div>
                          <Plane className="absolute h-3.5 w-3.5 text-blue-600 transform rotate-90 bg-white" />
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${
                            flightStops === 0
                              ? "text-emerald-600"
                              : flightStops === 1
                              ? "text-amber-600"
                              : "text-indigo-600"
                          }`}
                        >
                          {flightStops === 0 ? "Non-Stop Direct" : `${flightStops} Stop${flightStops > 1 ? "s" : ""}`}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {flight.arrivalTime}
                        </span>
                        <div className="text-xs font-bold text-blue-600 font-mono mt-0.5">
                          {flight.destinationAirport}
                        </div>
                        <span className="text-[10px] text-slate-400">{flight.arrivalDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Seat Availability & Price */}
                  <div className="flex items-center justify-between lg:col-span-4 lg:justify-end lg:space-x-6 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">
                    <div className="text-left lg:text-right">
                      <div className="flex items-center space-x-1 lg:justify-end">
                        <span className="text-2xl font-bold text-slate-900 font-mono">
                          ${flight.ticketPrice}
                        </span>
                        <span className="text-xs text-slate-500">/ seat</span>
                      </div>

                      <div className="mt-1">
                        {isFull ? (
                          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            <Hourglass className="h-3 w-3" />
                            <span>Flight Full (Waiting List Open)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{flight.availableSeats} of {flight.totalSeats} seats left</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleInspectAVL(flight.flightNumber)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                        title="View AVL Tree Node Details"
                      >
                        Details
                      </button>

                      {isFull ? (
                        <button
                          onClick={() => handleOpenSeatMap(flight)}
                          className="flex items-center space-x-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
                        >
                          <Hourglass className="h-3.5 w-3.5" />
                          <span>Join Waitlist</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenSeatMap(flight)}
                          className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                        >
                          <Armchair className="h-3.5 w-3.5" />
                          <span>Select Seat</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Seat Selection Modal */}
      {selectedFlightForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto text-slate-800">
            <button
              onClick={() => setSelectedFlightForBooking(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                <Plane className="h-4 w-4" />
                <span>Interactive Aircraft Seat Map</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Select Your Seat on {selectedFlightForBooking.flightNumber}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {selectedFlightForBooking.sourceAirport} → {selectedFlightForBooking.destinationAirport} • {selectedFlightForBooking.aircraft}
              </p>
            </div>

            {seatLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-xs text-slate-500">Loading seat layout from AVL index...</p>
              </div>
            ) : seatMapData ? (
              <div className="space-y-6">
                {/* Aircraft Nose Indicator */}
                <div className="mx-auto flex h-10 w-24 items-center justify-center rounded-t-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
                  Cockpit
                </div>

                {/* Seat Matrix Grid */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                  <div className="grid grid-cols-6 gap-2 sm:gap-3 max-w-sm mx-auto">
                    {seatMapData.seatLayout.map((seat: any) => {
                      const isSelected = selectedSeat === seat.seatNumber;
                      const isOccupied = seat.isOccupied;

                      return (
                        <button
                          key={seat.seatNumber}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => setSelectedSeat(seat.seatNumber)}
                          className={`flex flex-col items-center justify-center rounded-lg p-2 text-xs font-mono font-bold transition shadow-sm ${
                            isOccupied
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                              : isSelected
                              ? "bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 scale-105"
                              : "bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 border border-slate-200"
                          }`}
                        >
                          <Armchair className="h-4 w-4 mb-0.5" />
                          <span>{seat.seatNumber}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-slate-600 border-t border-slate-200 pt-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-3.5 w-3.5 rounded bg-white border border-slate-300 shadow-sm" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-3.5 w-3.5 rounded bg-blue-600 text-white" />
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-3.5 w-3.5 rounded bg-slate-200 border border-slate-300" />
                      <span>Occupied</span>
                    </div>
                  </div>
                </div>

                {/* Booking Confirmation Row */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>
                    <span className="text-xs text-slate-500">Selected Seat:</span>
                    <p className="text-base font-bold font-mono text-slate-900">
                      {selectedSeat || "None Selected"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Fare Amount:</span>
                    <p className="text-xl font-bold font-mono text-slate-900">
                      ${selectedFlightForBooking.ticketPrice}
                    </p>
                  </div>
                  <button
                    disabled={!selectedSeat || bookingLoading}
                    onClick={handleConfirmBooking}
                    className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {bookingLoading ? (
                      <span>Syncing AVL...</span>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Confirm & Book</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Waiting List Modal */}
      {selectedFlightForWaiting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 text-slate-800">
            <button
              onClick={() => {
                setSelectedFlightForWaiting(null);
                setWaitlistSuccessResult(null);
              }}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {waitlistSuccessResult ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Enqueued to Binary Max-Heap!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  {waitlistSuccessResult.message}
                </p>
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 font-mono text-xs text-left space-y-1">
                  <div>
                    Ticket ID: <strong className="text-slate-900">{waitlistSuccessResult.waitlistEntry.id}</strong>
                  </div>
                  <div>
                    Priority Score: <strong className="text-blue-600">{waitlistSuccessResult.waitlistEntry.priority} ({waitlistSuccessResult.waitlistEntry.priorityLabel})</strong>
                  </div>
                  <div>
                    Queue Position: <strong className="text-emerald-600">#{waitlistSuccessResult.queuePosition} in Max-Heap</strong>
                  </div>
                  <div>
                    Algorithm: <span className="text-slate-600">O(log n) Heapify-Up</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFlightForWaiting(null);
                    setWaitlistSuccessResult(null);
                  }}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  <Hourglass className="h-4 w-4" />
                  <span>Binary Max-Heap Priority Queue</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Join Waiting List for {selectedFlightForWaiting.flightNumber}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Flight is currently at maximum capacity. When a ticket is cancelled, the highest priority passenger in the Max-Heap is automatically promoted.
                  </p>
                </div>

                {/* Priority Selection */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Select Membership Tier / Priority Score:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { score: 100, label: "VIP Platinum", desc: "Top Priority" },
                      { score: 75, label: "Gold Member", desc: "Frequent Flyer" },
                      { score: 50, label: "Business Tier", desc: "Priority Boarding" },
                      { score: 25, label: "Standard Economy", desc: "Timestamp FIFO" },
                    ].map((tier) => (
                      <button
                        key={tier.score}
                        type="button"
                        onClick={() => {
                          setWaitlistPriority(tier.score);
                          setWaitlistPriorityLabel(tier.label);
                        }}
                        className={`rounded-xl border p-3 text-left transition shadow-sm ${
                          waitlistPriority === tier.score
                            ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span>{tier.label}</span>
                          <span className="font-mono text-blue-600">{tier.score} pts</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{tier.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1 font-mono border border-slate-200">
                  <div>Passenger: <strong>{currentUser?.name}</strong></div>
                  <div>Flight: <strong>{selectedFlightForWaiting.flightNumber} ({selectedFlightForWaiting.sourceAirport} → {selectedFlightForWaiting.destinationAirport})</strong></div>
                  <div>Complexity: <strong className="text-emerald-600">O(log n) Enqueue Heapify-Up</strong></div>
                </div>

                <button
                  disabled={waitlistLoading}
                  onClick={handleJoinWaitingList}
                  className="w-full rounded-lg bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm transition disabled:opacity-50"
                >
                  {waitlistLoading ? "Enqueuing into Max-Heap..." : "Confirm & Join Waiting List"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Boarding Pass Confirmation Modal */}
      {confirmedBookingData && (
        <DigitalBoardingPass
          booking={confirmedBookingData.booking}
          flight={confirmedBookingData.flight}
          onClose={() => setConfirmedBookingData(null)}
        />
      )}

      {/* AVL Tree Trace Inspector Drawer */}
      {inspectFlightTrace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto text-slate-800">
            <button
              onClick={() => setInspectFlightTrace(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>AVL Tree Node Inspection</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Flight {inspectFlightTrace.flight.flightNumber} Tree Index Trace
              </h2>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Search Path Traversed:</span>
                  <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    Found in {inspectFlightTrace.trace.steps} Steps
                  </span>
                </div>
                <div className="text-blue-700 font-bold">
                  {inspectFlightTrace.trace.pathTraversed.join(" → ")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500">Tree Height:</span>
                  <p className="text-base font-bold text-slate-900">{inspectFlightTrace.trace.height}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500">Balance Factor (BF):</span>
                  <p className="text-base font-bold text-emerald-600">{inspectFlightTrace.trace.balanceFactor}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500">Left Child Key:</span>
                  <p className="font-bold text-slate-800">{inspectFlightTrace.trace.leftChild || "null"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500">Right Child Key:</span>
                  <p className="font-bold text-slate-800">{inspectFlightTrace.trace.rightChild || "null"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Node Payload Data:
                </span>
                <pre className="rounded-lg bg-slate-900 text-emerald-400 p-3 text-[11px] overflow-x-auto">
                  {JSON.stringify(inspectFlightTrace.flight, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
