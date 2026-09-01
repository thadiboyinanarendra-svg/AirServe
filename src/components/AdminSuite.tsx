import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Plane,
  Users,
  Ticket,
  DollarSign,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  X,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { api } from "../services/api.ts";
import { Flight, Booking, Passenger, Airport } from "../types/index.ts";

export const AdminSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "flights" | "reservations" | "passengers" | "revenue"
  >("overview");

  const [analytics, setAnalytics] = useState<any | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);

  // Flight Management Modals
  const [showAddFlightModal, setShowAddFlightModal] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [flightForm, setFlightForm] = useState<Partial<Flight>>({
    flightNumber: "",
    airline: "AirServe Express",
    sourceAirport: "HYD",
    destinationAirport: "DEL",
    departureDate: "2026-09-02",
    departureTime: "10:00",
    arrivalDate: "2026-09-02",
    arrivalTime: "12:15",
    duration: "2h 15m",
    aircraft: "Boeing 787-9 Dreamliner",
    terminal: "T1",
    gate: "G05",
    totalSeats: 30,
    availableSeats: 30,
    ticketPrice: 120,
    class: "Economy",
    status: "SCHEDULED",
  });

  // Passenger Modal
  const [showAddPassengerModal, setShowAddPassengerModal] = useState(false);
  const [passengerForm, setPassengerForm] = useState<Partial<Passenger>>({
    name: "",
    email: "",
    phone: "",
    passportNumber: "",
    nationality: "India",
    tier: "STANDARD",
    loyaltyPoints: 500,
  });

  // Filter queries
  const [flightSearchQuery, setFlightSearchQuery] = useState("");
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [passengerSearchQuery, setPassengerSearchQuery] = useState("");

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [anRes, flRes, bkRes, psRes, apRes] = await Promise.all([
        api.getAnalytics(),
        api.getFlights(),
        api.getBookings(),
        api.getPassengers(),
        api.getAirports(),
      ]);
      setAnalytics(anRes);
      setFlights(flRes.flights);
      setBookings(bkRes.bookings);
      setPassengers(psRes.passengers);
      setAirports(apRes.airports);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Flight Handlers
  const handleSaveFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFlight) {
        await api.updateFlight(editingFlight.flightNumber, flightForm);
      } else {
        await api.addFlight(flightForm);
      }
      setShowAddFlightModal(false);
      setEditingFlight(null);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to save flight.");
    }
  };

  const handleDeleteFlight = async (flightNumber: string) => {
    if (!confirm(`Are you sure you want to delete flight ${flightNumber}? This will remove it from SQLite and the Flight AVL Tree.`)) return;
    try {
      await api.deleteFlight(flightNumber);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to delete flight.");
    }
  };

  const handleUpdateFlightStatus = async (flightNumber: string, status: string) => {
    try {
      await api.updateFlightStatus(flightNumber, status);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  // Passenger Handlers
  const handleSavePassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addPassenger(passengerForm);
      setShowAddPassengerModal(false);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to add passenger.");
    }
  };

  const handleDeletePassenger = async (id: string) => {
    if (!confirm(`Delete passenger ${id}?`)) return;
    try {
      await api.deletePassenger(id);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to delete passenger.");
    }
  };

  const COLORS = ["#2563eb", "#3b82f6", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6"];

  const filteredFlights = flights.filter(
    (f) =>
      f.flightNumber.toLowerCase().includes(flightSearchQuery.toLowerCase()) ||
      f.airline.toLowerCase().includes(flightSearchQuery.toLowerCase()) ||
      f.sourceAirport.toLowerCase().includes(flightSearchQuery.toLowerCase()) ||
      f.destinationAirport.toLowerCase().includes(flightSearchQuery.toLowerCase())
  );

  const filteredBookings = bookings.filter(
    (b) =>
      b.bookingId.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
      b.passengerName.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
      b.flightNumber.toLowerCase().includes(bookingSearchQuery.toLowerCase())
  );

  const filteredPassengers = passengers.filter(
    (p) =>
      p.name.toLowerCase().includes(passengerSearchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(passengerSearchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(passengerSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-rose-600 uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              <span>Admin Fleet Operations & Intelligence Suite</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Airline Management Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Synchronized SQLite database persistence with real-time AVL Trees and Priority Queue.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadAllAdminData}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              <span>Refresh Fleet Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "overview", label: "Analytics & KPIs", icon: TrendingUp },
          { id: "flights", label: `Flight Management (${flights.length})`, icon: Plane },
          { id: "reservations", label: `Reservations (${bookings.length})`, icon: Ticket },
          { id: "passengers", label: `Passengers (${passengers.length})`, icon: Users },
          { id: "revenue", label: "Revenue Breakdown", icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Overview & Analytics */}
      {activeTab === "overview" && analytics && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Confirmed Revenue</span>
              <p className="text-2xl font-bold text-emerald-600 font-mono mt-1">
                ${analytics.kpis.totalRevenue.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 font-mono">
                Avg Ticket: ${analytics.kpis.avgTicketPrice.toFixed(2)}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fleet Occupancy Rate</span>
              <p className="text-2xl font-bold text-blue-600 font-mono mt-1">
                {analytics.kpis.occupancyRate}%
              </p>
              <span className="text-[11px] text-slate-500 font-mono">
                {analytics.kpis.occupiedSeats} / {analytics.kpis.totalSeats} seats booked
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Reservations</span>
              <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {analytics.kpis.totalBookings}
              </p>
              <span className="text-[11px] text-emerald-600 font-mono">
                {analytics.kpis.confirmedBookings} Confirmed | {analytics.kpis.cancelledBookings} Cancelled
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Priority Heap Waiting</span>
              <p className="text-2xl font-bold text-amber-600 font-mono mt-1">
                {analytics.kpis.waitingListCount}
              </p>
              <span className="text-[11px] text-slate-500 font-mono">
                Across active scheduled flights
              </span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Revenue by Airline */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Revenue by Airline Partner
                </h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.revenueByAirline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="airline" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "8px", color: "#0f172a", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue by Class */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <PieIcon className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Revenue by Seating Class
                </h3>
              </div>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.revenueByClass}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="revenue"
                      nameKey="class"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.revenueByClass.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "8px", color: "#0f172a", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Flight Management */}
      {activeTab === "flights" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={flightSearchQuery}
                onChange={(e) => setFlightSearchQuery(e.target.value)}
                placeholder="Search by flight number, airline, airport..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
              />
            </div>

            <button
              onClick={() => {
                setEditingFlight(null);
                setFlightForm({
                  flightNumber: `AS-${Math.floor(100 + Math.random() * 900)}`,
                  airline: "AirServe Express",
                  sourceAirport: "HYD",
                  destinationAirport: "DEL",
                  departureDate: "2026-09-02",
                  departureTime: "14:00",
                  arrivalDate: "2026-09-02",
                  arrivalTime: "16:15",
                  duration: "2h 15m",
                  aircraft: "Airbus A350-900",
                  terminal: "T2",
                  gate: "G10",
                  totalSeats: 30,
                  availableSeats: 30,
                  ticketPrice: 140,
                  class: "Economy",
                  status: "SCHEDULED",
                });
                setShowAddFlightModal(true);
              }}
              className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule New Flight</span>
            </button>
          </div>

          {/* Flight Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="p-3">Flight</th>
                  <th className="p-3">Airline & Aircraft</th>
                  <th className="p-3">Route</th>
                  <th className="p-3">Schedule</th>
                  <th className="p-3">Seats</th>
                  <th className="p-3">Fare</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredFlights.map((f) => (
                  <tr key={f.flightNumber} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-bold text-blue-600">{f.flightNumber}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 font-sans">{f.airline}</div>
                      <div className="text-[10px] text-slate-400">{f.aircraft}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800">
                        {f.sourceAirport} → {f.destinationAirport}
                      </span>
                      <div className="text-[10px] text-slate-400">T{f.terminal} • Gate {f.gate}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-800">{f.departureTime} - {f.arrivalTime}</div>
                      <div className="text-[10px] text-slate-400">{f.departureDate}</div>
                    </td>
                    <td className="p-3">
                      <span className={f.availableSeats <= 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                        {f.availableSeats} / {f.totalSeats}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">${f.ticketPrice}</td>
                    <td className="p-3">
                      <select
                        value={f.status}
                        onChange={(e) => handleUpdateFlightStatus(f.flightNumber, e.target.value)}
                        className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 border border-slate-200 focus:outline-none"
                      >
                        <option value="SCHEDULED">SCHEDULED</option>
                        <option value="BOARDING">BOARDING</option>
                        <option value="DEPARTED">DEPARTED</option>
                        <option value="DELAYED">DELAYED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setEditingFlight(f);
                            setFlightForm(f);
                            setShowAddFlightModal(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          title="Edit Flight"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFlight(f.flightNumber)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete Flight"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Reservation Management */}
      {activeTab === "reservations" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={bookingSearchQuery}
              onChange={(e) => setBookingSearchQuery(e.target.value)}
              placeholder="Search by Booking ID, Passenger Name..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm font-mono text-xs">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="p-3">Booking ID</th>
                  <th className="p-3">Passenger</th>
                  <th className="p-3">Flight</th>
                  <th className="p-3">Seat</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Fare</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBookings.map((b) => (
                  <tr key={b.bookingId} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-bold text-blue-600">{b.bookingId}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 font-sans">{b.passengerName}</div>
                      <div className="text-[10px] text-slate-400">{b.passengerId}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{b.flightNumber}</td>
                    <td className="p-3 font-bold text-amber-600">{b.seatNumber}</td>
                    <td className="p-3">{b.class}</td>
                    <td className="p-3 font-bold text-slate-900">${b.ticketPrice}</td>
                    <td className="p-3 text-slate-500">{b.bookingDate}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          b.bookingStatus === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {b.bookingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Passenger Management */}
      {activeTab === "passengers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={passengerSearchQuery}
                onChange={(e) => setPassengerSearchQuery(e.target.value)}
                placeholder="Search passengers by name, ID, email..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
              />
            </div>

            <button
              onClick={() => {
                setPassengerForm({
                  name: "",
                  email: "",
                  phone: "",
                  passportNumber: "",
                  nationality: "India",
                  tier: "STANDARD",
                  loyaltyPoints: 500,
                });
                setShowAddPassengerModal(true);
              }}
              className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Passenger Record</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm font-mono text-xs">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Passport</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Loyalty Points</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPassengers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-bold text-blue-600">{p.id}</td>
                    <td className="p-3 font-bold text-slate-900 font-sans">{p.name}</td>
                    <td className="p-3 text-slate-500">
                      <div>{p.email}</div>
                      <div className="text-[10px] text-slate-400">{p.phone}</div>
                    </td>
                    <td className="p-3">{p.passportNumber || "N/A"}</td>
                    <td className="p-3">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                        {p.tier}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-600">
                      {p.loyaltyPoints.toLocaleString()} pts
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeletePassenger(p.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete passenger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Revenue Breakdown */}
      {activeTab === "revenue" && analytics && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Revenue Per Active Flight Route
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.revenueByFlight}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="flightNumber" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "8px", color: "#0f172a", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Flight Modal */}
      {showAddFlightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-800">
            <button
              onClick={() => setShowAddFlightModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingFlight ? `Edit Flight ${editingFlight.flightNumber}` : "Schedule New Flight"}
            </h3>

            <form onSubmit={handleSaveFlight} className="space-y-3 font-sans text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Flight Number *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingFlight}
                    value={flightForm.flightNumber}
                    onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. AS-301"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Operating Airline *</label>
                  <input
                    type="text"
                    required
                    value={flightForm.airline}
                    onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Origin Airport *</label>
                  <select
                    value={flightForm.sourceAirport}
                    onChange={(e) => setFlightForm({ ...flightForm, sourceAirport: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:border-blue-500"
                  >
                    {airports.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} ({a.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Destination Airport *</label>
                  <select
                    value={flightForm.destinationAirport}
                    onChange={(e) => setFlightForm({ ...flightForm, destinationAirport: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:border-blue-500"
                  >
                    {airports.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} ({a.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Departure Time</label>
                  <input
                    type="time"
                    value={flightForm.departureTime}
                    onChange={(e) => setFlightForm({ ...flightForm, departureTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Arrival Time</label>
                  <input
                    type="time"
                    value={flightForm.arrivalTime}
                    onChange={(e) => setFlightForm({ ...flightForm, arrivalTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Aircraft Model</label>
                  <input
                    type="text"
                    value={flightForm.aircraft}
                    onChange={(e) => setFlightForm({ ...flightForm, aircraft: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Total Capacity</label>
                  <input
                    type="number"
                    value={flightForm.totalSeats}
                    onChange={(e) => setFlightForm({ ...flightForm, totalSeats: Number(e.target.value), availableSeats: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Ticket Price ($)</label>
                  <input
                    type="number"
                    value={flightForm.ticketPrice}
                    onChange={(e) => setFlightForm({ ...flightForm, ticketPrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  {editingFlight ? "Update Flight & Sync AVL Node" : "Insert Flight to AVL Tree"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddFlightModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Passenger Modal */}
      {showAddPassengerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-800">
            <button
              onClick={() => setShowAddPassengerModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Passenger Record</h3>
            <form onSubmit={handleSavePassenger} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={passengerForm.name}
                  onChange={(e) => setPassengerForm({ ...passengerForm, name: e.target.value })}
                  placeholder="e.g. David Vance"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={passengerForm.email}
                  onChange={(e) => setPassengerForm({ ...passengerForm, email: e.target.value })}
                  placeholder="david@example.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Phone</label>
                  <input
                    type="text"
                    value={passengerForm.phone}
                    onChange={(e) => setPassengerForm({ ...passengerForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Passport</label>
                  <input
                    type="text"
                    value={passengerForm.passportNumber}
                    onChange={(e) => setPassengerForm({ ...passengerForm, passportNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
                >
                  Insert Passenger to AVL Tree
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPassengerModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
