import React, { useState, useEffect } from "react";
import {
  Compass,
  MapPin,
  Route as RouteIcon,
  Sparkles,
  ArrowRight,
  Navigation,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Layers,
  CheckCircle2,
  Info,
} from "lucide-react";
import { api } from "../services/api.ts";
import { Airport, Route, DijkstraResult, User } from "../types/index.ts";

interface AirportNetworkProps {
  currentUser: User | null;
}

export const AirportNetwork: React.FC<AirportNetworkProps> = ({ currentUser }) => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);

  // Dijkstra inputs
  const [sourceCode, setSourceCode] = useState("HYD");
  const [destCode, setDestCode] = useState("JFK");
  const [optimizeBy, setOptimizeBy] = useState<"distance" | "cost">("distance");
  const [dijkstraResult, setDijkstraResult] = useState<DijkstraResult | null>(null);
  const [solving, setSolving] = useState(false);

  // Selected airport or route inspector
  const [selectedAirportNode, setSelectedAirportNode] = useState<Airport | null>(null);

  // Admin add airport modal
  const [showAddAirportModal, setShowAddAirportModal] = useState(false);
  const [newAirport, setNewAirport] = useState({
    code: "",
    name: "",
    city: "",
    country: "India",
    lat: 19.0,
    lng: 72.8,
    terminals: 2,
  });

  // Admin add route modal
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [newRoute, setNewRoute] = useState({
    source: "HYD",
    destination: "DEL",
    distanceKm: 1250,
    baseCost: 95,
    durationMinutes: 135,
    airlines: "AirServe Express, Air India",
  });

  useEffect(() => {
    loadNetwork();
  }, []);

  const loadNetwork = async () => {
    setLoading(true);
    try {
      const [airportsRes, routesRes] = await Promise.all([
        api.getAirports(),
        api.getRoutes(),
      ]);
      setAirports(airportsRes.airports);
      setRoutes(routesRes.routes);
    } catch (err) {
      console.error("Error loading network:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateShortestPath = async () => {
    if (sourceCode === destCode) {
      alert("Source and destination must be different airports.");
      return;
    }
    setSolving(true);
    try {
      const res = await api.findShortestPath(sourceCode, destCode, optimizeBy);
      setDijkstraResult(res.result);
    } catch (err: any) {
      alert(err.message || "Failed to calculate shortest path.");
    } finally {
      setSolving(false);
    }
  };

  const handleAddAirport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAirport.code || !newAirport.name) return;
    try {
      await api.addAirport({
        ...newAirport,
        code: newAirport.code.toUpperCase(),
      });
      setShowAddAirportModal(false);
      loadNetwork();
    } catch (err: any) {
      alert(err.message || "Failed to add airport.");
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoute.source || !newRoute.destination) return;
    try {
      await api.addRoute({
        source: newRoute.source,
        destination: newRoute.destination,
        distanceKm: Number(newRoute.distanceKm),
        baseCost: Number(newRoute.baseCost),
        durationMinutes: Number(newRoute.durationMinutes),
        airlines: newRoute.airlines.split(",").map((s) => s.trim()),
      });
      setShowAddRouteModal(false);
      loadNetwork();
    } catch (err: any) {
      alert(err.message || "Failed to add route.");
    }
  };

  // Convert lat/lng to standard 2D projection for the SVG canvas
  // Lat range: -10 to 60, Lng range: -80 to 110
  const projectCoords = (lat: number, lng: number, width = 800, height = 460) => {
    // Map bounding box
    const minLng = -85;
    const maxLng = 115;
    const minLat = -5;
    const maxLat = 58;

    const x = ((lng - minLng) / (maxLng - minLng)) * (width - 120) + 60;
    const y = ((maxLat - lat) / (maxLat - minLat)) * (height - 100) + 50;
    return { x, y };
  };

  // Check if an edge is part of the computed shortest path
  const isEdgeInShortestPath = (u: string, v: string) => {
    if (!dijkstraResult || !dijkstraResult.path) return false;
    for (let i = 0; i < dijkstraResult.path.length - 1; i++) {
      if (
        (dijkstraResult.path[i] === u && dijkstraResult.path[i + 1] === v) ||
        (dijkstraResult.path[i] === v && dijkstraResult.path[i + 1] === u)
      ) {
        return true;
      }
    }
    return false;
  };

  const isNodeInShortestPath = (code: string) => {
    return dijkstraResult?.path.includes(code) || false;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <Compass className="h-4 w-4" />
              <span>Adjacency List Graph & Dijkstra's Algorithm</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Global Airport Network & Route Engine
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Weighted Directed Graph representation of commercial flight corridors. Computes optimal multi-hop flight itineraries with minimum distance or lowest fare.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700 shadow-sm">
              Vertices: <strong className="text-blue-600">{airports.length}</strong> | Edges:{" "}
              <strong className="text-indigo-600">{routes.length}</strong>
            </span>

            {currentUser?.role === "ADMIN" && (
              <div className="flex space-x-1.5">
                <button
                  onClick={() => setShowAddAirportModal(true)}
                  className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Airport</span>
                </button>
                <button
                  onClick={() => setShowAddRouteModal(true)}
                  className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Route</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Path Finder Control Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          {/* Origin */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Origin Vertex
            </label>
            <select
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
            >
              {airports.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} – {a.city} ({a.country})
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Destination Vertex
            </label>
            <select
              value={destCode}
              onChange={(e) => setDestCode(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
            >
              {airports.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} – {a.city} ({a.country})
                </option>
              ))}
            </select>
          </div>

          {/* Optimization Goal */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Optimization Objective
            </label>
            <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setOptimizeBy("distance")}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  optimizeBy === "distance"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Shortest (Km)
              </button>
              <button
                type="button"
                onClick={() => setOptimizeBy("cost")}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  optimizeBy === "cost"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Lowest Fare ($)
              </button>
            </div>
          </div>

          {/* Action */}
          <div>
            <button
              onClick={handleCalculateShortestPath}
              disabled={solving}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Navigation className={`h-4 w-4 ${solving ? "animate-spin" : ""}`} />
              <span>{solving ? "Running Dijkstra..." : "Calculate Shortest Route"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Graph Visualization */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md">
        <div className="mb-2 flex items-center justify-between px-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Interactive 2D Flight Corridor Graph (Click node to inspect)</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
            <div className="flex items-center space-x-1">
              <div className="h-2.5 w-6 bg-slate-700 rounded" />
              <span>Flight Route</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2.5 w-6 bg-cyan-400 shadow-[0_0_8px_#38bdf8] rounded" />
              <span>Dijkstra Optimal Path</span>
            </div>
          </div>
        </div>

        {/* SVG Network Map */}
        <div className="relative w-full overflow-x-auto">
          <svg viewBox="0 0 800 460" className="w-full min-w-[700px] h-auto select-none">
            <defs>
              <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
              </radialGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
            </defs>

            {/* Grid Lines */}
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={i * 60}
                x2="800"
                y2={i * 60}
                stroke="#1e293b"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 70}
                y1="0"
                x2={i * 70}
                y2="460"
                stroke="#1e293b"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
            ))}

            {/* Route Lines (Edges) */}
            {routes.map((route) => {
              const srcAirport = airports.find((a) => a.code === route.source);
              const dstAirport = airports.find((a) => a.code === route.destination);
              if (!srcAirport || !dstAirport) return null;

              const p1 = projectCoords(srcAirport.lat, srcAirport.lng);
              const p2 = projectCoords(dstAirport.lat, dstAirport.lng);
              const isHighlighted = isEdgeInShortestPath(route.source, route.destination);

              // Calculate curve control point
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2 - 25;

              return (
                <g key={route.id}>
                  <path
                    d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                    fill="none"
                    stroke={isHighlighted ? "#38bdf8" : "#334155"}
                    strokeWidth={isHighlighted ? "3" : "1.2"}
                    strokeDasharray={isHighlighted ? undefined : "3 3"}
                    filter={isHighlighted ? "url(#glow)" : undefined}
                    className="transition-all duration-500"
                  />
                  {/* Distance label on midpoint */}
                  {isHighlighted && (
                    <text
                      x={midX}
                      y={midY - 4}
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-mono bg-slate-900"
                    >
                      {optimizeBy === "distance" ? `${route.distanceKm} km` : `$${route.baseCost}`}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Airport Nodes (Vertices) */}
            {airports.map((airport) => {
              const { x, y } = projectCoords(airport.lat, airport.lng);
              const isPath = isNodeInShortestPath(airport.code);
              const isSource = airport.code === sourceCode;
              const isDest = airport.code === destCode;
              const isSelected = selectedAirportNode?.code === airport.code;

              return (
                <g
                  key={airport.code}
                  className="cursor-pointer"
                  onClick={() => setSelectedAirportNode(airport)}
                >
                  {/* Outer pulse */}
                  {(isPath || isSource || isDest) && (
                    <circle
                      cx={x}
                      cy={y}
                      r="16"
                      fill={isSource ? "#10b981" : isDest ? "#f43f5e" : "#38bdf8"}
                      opacity="0.25"
                      className="animate-pulse"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? "9" : isPath ? "8" : "6"}
                    fill={
                      isSource
                        ? "#10b981"
                        : isDest
                        ? "#f43f5e"
                        : isPath
                        ? "#38bdf8"
                        : "#1e293b"
                    }
                    stroke={
                      isSelected
                        ? "#ffffff"
                        : isPath
                        ? "#ffffff"
                        : "#64748b"
                    }
                    strokeWidth={isSelected || isPath ? "2" : "1"}
                  />

                  {/* Airport Code Label */}
                  <text
                    x={x}
                    y={y + 16}
                    fill={isPath ? "#38bdf8" : "#94a3b8"}
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {airport.code}
                  </text>
                  <text
                    x={x}
                    y={y + 25}
                    fill="#64748b"
                    fontSize="8"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    {airport.city}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Dijkstra Result Breakdown & Step-by-Step Logs */}
      {dijkstraResult && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-in fade-in">
          {/* Path Summary & Itinerary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Optimal Shortest Route: {dijkstraResult.source} → {dijkstraResult.destination}
                </h3>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 font-mono border border-blue-200">
                {dijkstraResult.stops === 0 ? "Non-stop direct" : `${dijkstraResult.stops} Layover(s)`}
              </span>
            </div>

            {/* Metrics KPI */}
            <div className="grid grid-cols-3 gap-3 text-center font-mono">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Total Distance</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {dijkstraResult.totalDistanceKm} km
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Total Cost</span>
                <p className="text-lg font-bold text-blue-600 mt-0.5">
                  ${dijkstraResult.totalCost}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Est. Flight Time</span>
                <p className="text-lg font-bold text-amber-600 mt-0.5">
                  {Math.floor(dijkstraResult.totalDurationMinutes / 60)}h{" "}
                  {dijkstraResult.totalDurationMinutes % 60}m
                </p>
              </div>
            </div>

            {/* Node Route Path Chain */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Flight Corridor Path Chain:
              </span>
              <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
                {dijkstraResult.path.map((node, i) => (
                  <React.Fragment key={node}>
                    <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 font-bold text-blue-700">
                      {node}
                    </span>
                    {i < dijkstraResult.path.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Segments Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Segment Breakdown:
              </span>
              <div className="space-y-2">
                {dijkstraResult.segments.map((seg, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-mono font-bold text-blue-600">
                        Hop {i + 1}
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
                        {seg.from} → {seg.to}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 font-mono text-slate-600">
                      <span>{seg.distanceKm} km</span>
                      <span className="text-blue-600 font-bold">${seg.cost}</span>
                      <span>{seg.durationMinutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dijkstra Algorithm Step Execution Trace */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Layers className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Dijkstra Algorithm Execution Trace
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Min-Priority queue relaxation steps maintaining tentative shortest distance estimates O((V + E) log V).
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {dijkstraResult.stepsLog.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-600">
                      Step {idx + 1}: Visiting Node [{step.currentAirport}]
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Visited ({step.visited.length}): {step.visited.join(", ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-sans">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Airport Inspector Drawer */}
      {selectedAirportNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 text-slate-800">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-2xl font-black text-blue-600">
                  {selectedAirportNode.code}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedAirportNode.name}</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700">
                {selectedAirportNode.city}, {selectedAirportNode.country}
              </span>
            </div>

            <div className="py-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Coordinates:</span>
                <span className="text-slate-800">
                  {selectedAirportNode.lat.toFixed(4)}° N, {selectedAirportNode.lng.toFixed(4)}° E
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Terminals:</span>
                <span className="text-slate-800">{selectedAirportNode.terminals} Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Graph Adjacency Degree:</span>
                <span className="text-blue-600 font-bold">
                  {
                    routes.filter(
                      (r) =>
                        r.source === selectedAirportNode.code ||
                        r.destination === selectedAirportNode.code
                    ).length
                  }{" "}
                  connected corridors
                </span>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => {
                  setSourceCode(selectedAirportNode.code);
                  setSelectedAirportNode(null);
                }}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
              >
                Set as Source
              </button>
              <button
                onClick={() => {
                  setDestCode(selectedAirportNode.code);
                  setSelectedAirportNode(null);
                }}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
              >
                Set as Destination
              </button>
              <button
                onClick={() => setSelectedAirportNode(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Airport Modal */}
      {showAddAirportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Airport to Graph Network</h3>
            <form onSubmit={handleAddAirport} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Airport Code (IATA)</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={newAirport.code}
                    onChange={(e) => setNewAirport({ ...newAirport, code: e.target.value })}
                    placeholder="e.g. SFO"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-mono uppercase focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newAirport.city}
                    onChange={(e) => setNewAirport({ ...newAirport, city: e.target.value })}
                    placeholder="San Francisco"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Airport Full Name</label>
                <input
                  type="text"
                  required
                  value={newAirport.name}
                  onChange={(e) => setNewAirport({ ...newAirport, name: e.target.value })}
                  placeholder="San Francisco International Airport"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAirport.lat}
                    onChange={(e) =>
                      setNewAirport({ ...newAirport, lat: parseFloat(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAirport.lng}
                    onChange={(e) =>
                      setNewAirport({ ...newAirport, lng: parseFloat(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
                >
                  Add Vertex to Graph
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAirportModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Route Modal */}
      {showAddRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Route Corridor (Edge)</h3>
            <form onSubmit={handleAddRoute} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Source Code</label>
                  <select
                    value={newRoute.source}
                    onChange={(e) => setNewRoute({ ...newRoute, source: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {airports.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Destination Code</label>
                  <select
                    value={newRoute.destination}
                    onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {airports.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    value={newRoute.distanceKm}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, distanceKm: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Base Fare ($)</label>
                  <input
                    type="number"
                    value={newRoute.baseCost}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, baseCost: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={newRoute.durationMinutes}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Operating Airlines</label>
                <input
                  type="text"
                  value={newRoute.airlines}
                  onChange={(e) => setNewRoute({ ...newRoute, airlines: e.target.value })}
                  placeholder="AirServe Express, Emirates"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
                >
                  Add Edge to Graph
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRouteModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
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
