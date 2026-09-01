import React, { useState, useEffect } from "react";
import {
  Layers,
  Search,
  RefreshCw,
  GitFork,
  Database,
  ShieldCheck,
  Zap,
  TrendingUp,
  Cpu,
  Clock,
  ArrowRight,
  Info,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Play,
  ArrowDown,
  Navigation,
  Globe,
} from "lucide-react";
import { api } from "../services/api.ts";
import { DSASummaryItem } from "../types/index.ts";

export const DSACenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "flight-avl" | "passenger-avl" | "booking-avl" | "priority-queue" | "hash-table" | "graph" | "complexity"
  >("flight-avl");

  const [summary, setSummary] = useState<DSASummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tree data
  const [flightTreeData, setFlightTreeData] = useState<any | null>(null);
  const [passengerTreeData, setPassengerTreeData] = useState<any | null>(null);
  const [bookingTreeData, setBookingTreeData] = useState<any | null>(null);
  const [heapData, setHeapData] = useState<any | null>(null);
  const [hashTableData, setHashTableData] = useState<any | null>(null);
  const [graphData, setGraphData] = useState<any | null>(null);

  // Search tracer inside AVL
  const [searchKey, setSearchKey] = useState("");
  const [searchTrace, setSearchTrace] = useState<string[]>([]);
  const [searchFound, setSearchFound] = useState<boolean | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  // Interactive Form States
  // Flight AVL Insert
  const [newFlightNum, setNewFlightNum] = useState("AS-999");
  const [newFlightSrc, setNewFlightSrc] = useState("HYD");
  const [newFlightDest, setNewFlightDest] = useState("LHR");
  const [newFlightPrice, setNewFlightPrice] = useState(650);

  // Passenger AVL Insert
  const [newPassId, setNewPassId] = useState("PAS-99");
  const [newPassName, setNewPassName] = useState("Ada Lovelace");
  const [newPassEmail, setNewPassEmail] = useState("ada@algorithm.org");

  // Booking AVL Insert
  const [newBkgId, setNewBkgId] = useState("BKG-9999");
  const [newBkgFlight, setNewBkgFlight] = useState("AS-101");
  const [newBkgPass, setNewBkgPass] = useState("PAS-1");
  const [newBkgSeat, setNewBkgSeat] = useState("1A");

  // Priority Queue Enqueue
  const [pqName, setPqName] = useState("Grace Hopper");
  const [pqFlight, setPqFlight] = useState("AS-101");
  const [pqPriority, setPqPriority] = useState(90);

  // Hash Table Insert & Search
  const [htKey, setHtKey] = useState("ada@algorithm.org");
  const [htName, setHtName] = useState("Ada Lovelace");
  const [htRole, setHtRole] = useState("PASSENGER");
  const [htSearchKey, setHtSearchKey] = useState("");
  const [htSearchResult, setHtSearchResult] = useState<any | null>(null);

  // Graph Dijkstra interactive
  const [graphSrc, setGraphSrc] = useState("HYD");
  const [graphDest, setGraphDest] = useState("JFK");
  const [dijkstraResult, setDijkstraResult] = useState<any | null>(null);

  useEffect(() => {
    loadAllDSA();
  }, []);

  const showNotification = (type: "success" | "error", text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const loadAllDSA = async () => {
    setLoading(true);
    try {
      const [sumRes, fRes, pRes, bRes, hRes, htRes, gRes] = await Promise.all([
        api.getDSASummary(),
        api.getFlightAVLTree(),
        api.getPassengerAVLTree(),
        api.getBookingAVLTree(),
        api.getPriorityQueueHeap(),
        api.getHashTableViz(),
        api.getGraphViz(),
      ]);
      setSummary(sumRes.structures);
      setFlightTreeData(fRes);
      setPassengerTreeData(pRes);
      setBookingTreeData(bRes);
      setHeapData(hRes);
      setHashTableData(htRes);
      setGraphData(gRes);
    } catch (err) {
      console.error("Error loading DSA data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      await api.rebuildDSA();
      await loadAllDSA();
      showNotification("success", "Rebuilt all in-memory DSA from SQLite database successfully!");
    } catch (err) {
      console.error("Error rebuilding DSA:", err);
      showNotification("error", "Failed to rebuild DSA structures.");
    } finally {
      setRebuilding(false);
    }
  };

  // Interactive AVL Search
  const handleSearchKeyInAVL = (key: string, root: any) => {
    if (!key || !root) return;
    const path: string[] = [];
    let curr = root;
    let found = false;

    while (curr) {
      path.push(curr.key);
      if (curr.key === key) {
        found = true;
        setSelectedNodeData(curr);
        break;
      } else if (key < curr.key) {
        curr = curr.left;
      } else {
        curr = curr.right;
      }
    }

    setSearchTrace(path);
    setSearchFound(found);
    if (!found) setSelectedNodeData(null);
  };

  // Interactive Insert / Delete handlers
  const handleInsertFlightAVL = async () => {
    if (!newFlightNum.trim()) return;
    try {
      const res = await api.insertFlightAVL({
        flightNumber: newFlightNum.toUpperCase(),
        airline: "AirServe Express",
        sourceAirport: newFlightSrc,
        destinationAirport: newFlightDest,
        departureTime: "10:00",
        arrivalTime: "18:30",
        departureDate: "2026-09-02",
        arrivalDate: "2026-09-02",
        duration: "8h 30m",
        ticketPrice: Number(newFlightPrice) || 500,
        totalSeats: 180,
        availableSeats: 180,
        class: "Economy",
        aircraft: "Boeing 787 Dreamliner",
        terminal: "2",
        gate: "B12",
        status: "ON_TIME",
      });
      setFlightTreeData(res.tree);
      showNotification("success", res.message || `Inserted ${newFlightNum} with AVL auto-balancing.`);
      setNewFlightNum(`AS-${Math.floor(100 + Math.random() * 899)}`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to insert flight.");
    }
  };

  const handleDeleteFlightAVL = async (flightNum: string) => {
    try {
      const res = await api.deleteFlightAVL(flightNum);
      setFlightTreeData(res.tree);
      setSelectedNodeData(null);
      showNotification("success", res.message || `Deleted ${flightNum} and rebalanced AVL.`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete flight.");
    }
  };

  const handleInsertPassengerAVL = async () => {
    if (!newPassId.trim()) return;
    try {
      const res = await api.insertPassengerAVL({
        passengerId: newPassId.toUpperCase(),
        name: newPassName,
        email: newPassEmail,
        phone: "+1-555-0199",
        passportNumber: "P998877",
        nationality: "International",
      });
      setPassengerTreeData(res.tree);
      showNotification("success", res.message || `Inserted ${newPassId} into Passenger AVL.`);
      setNewPassId(`PAS-${Math.floor(100 + Math.random() * 899)}`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to insert passenger.");
    }
  };

  const handleDeletePassengerAVL = async (passId: string) => {
    try {
      const res = await api.deletePassengerAVL(passId);
      setPassengerTreeData(res.tree);
      setSelectedNodeData(null);
      showNotification("success", res.message || `Deleted ${passId} from Passenger AVL.`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete passenger.");
    }
  };

  const handleInsertBookingAVL = async () => {
    if (!newBkgId.trim()) return;
    try {
      const res = await api.insertBookingAVL({
        bookingId: newBkgId.toUpperCase(),
        flightNumber: newBkgFlight,
        passengerId: newBkgPass,
        passengerName: "Test Passenger",
        seatNumber: newBkgSeat,
        class: "Economy",
        ticketPrice: 450,
        bookingDate: "2026-09-01",
        status: "CONFIRMED",
        paymentStatus: "PAID",
      });
      setBookingTreeData(res.tree);
      showNotification("success", res.message || `Inserted ${newBkgId} into Booking AVL.`);
      setNewBkgId(`BKG-${Math.floor(1000 + Math.random() * 8999)}`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to insert booking.");
    }
  };

  const handleDeleteBookingAVL = async (bkgId: string) => {
    try {
      const res = await api.deleteBookingAVL(bkgId);
      setBookingTreeData(res.tree);
      setSelectedNodeData(null);
      showNotification("success", res.message || `Deleted ${bkgId} from Booking AVL.`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete booking.");
    }
  };

  const handleEnqueuePQ = async () => {
    if (!pqName.trim()) return;
    try {
      const res = await api.enqueuePriorityQueue({
        flightNumber: pqFlight,
        passengerId: `PAS-${Date.now().toString().slice(-4)}`,
        passengerName: pqName,
        priority: Number(pqPriority),
        priorityLabel: pqPriority >= 80 ? "VIP Platinum" : pqPriority >= 60 ? "Gold Member" : "Standard",
        preferredClass: "Economy",
        contactEmail: "waitlist@airserve.com",
        contactPhone: "+1-555-0100",
      });
      setHeapData(res.heap);
      showNotification("success", `Enqueued ${pqName} (Priority: ${pqPriority}) with Heapify-Up O(log n).`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to enqueue.");
    }
  };

  const handleDequeuePQ = async () => {
    try {
      const res = await api.dequeuePriorityQueue();
      setHeapData(res.heap);
      if (res.dequeued) {
        showNotification("success", `Extracted Max: ${res.dequeued.passengerName} (Score: ${res.dequeued.priority}) via Heapify-Down O(log n)!`);
      } else {
        showNotification("error", "Priority Queue is already empty.");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Failed to dequeue.");
    }
  };

  const handleInsertHashTable = async () => {
    if (!htKey.trim()) return;
    try {
      const res = await api.insertHashTable({
        key: htKey,
        name: htName,
        role: htRole,
      });
      setHashTableData(res.table);
      showNotification("success", `Hashed key "${htKey}" into bucket [${res.trace.bucketIndex}] via polynomial rolling hash.`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to insert into Hash Table.");
    }
  };

  const handleSearchHashTable = async () => {
    if (!htSearchKey.trim()) return;
    try {
      const res = await api.searchHashTable(htSearchKey);
      setHashTableData(res.table);
      setHtSearchResult(res.trace);
      if (res.trace.found) {
        showNotification("success", `Found "${htSearchKey}" in bucket [${res.trace.bucketIndex}] in ${res.trace.chainPosition} chain hop(s)!`);
      } else {
        showNotification("error", `Key "${htSearchKey}" not found (Bucket [${res.trace.bucketIndex}] checked).`);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Failed to search Hash Table.");
    }
  };

  const handleRunDijkstra = async () => {
    try {
      const res = await api.findShortestPath(graphSrc, graphDest);
      setDijkstraResult(res.result);
      if (res.result.found) {
        showNotification("success", `Calculated shortest path (${res.result.totalDistanceKm} km) using Dijkstra's Algorithm!`);
      } else {
        showNotification("error", `No route found between ${graphSrc} and ${graphDest}`);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Failed to compute shortest route.");
    }
  };

  // Helper to render binary tree into SVG coordinate nodes
  const renderTreeSVG = (
    root: any,
    x: number,
    y: number,
    dx: number,
    level = 0
  ): { nodes: React.ReactNode[]; links: React.ReactNode[] } => {
    if (!root) return { nodes: [], links: [] };

    const nodes: React.ReactNode[] = [];
    const links: React.ReactNode[] = [];

    const isSearchPath = searchTrace.includes(root.key);
    const isTarget = isSearchPath && searchTrace[searchTrace.length - 1] === root.key && searchFound;

    const leftX = x - dx;
    const leftY = y + 70;
    const rightX = x + dx;
    const rightY = y + 70;

    // Draw lines to children
    if (root.left) {
      const leftIsPath = isSearchPath && searchTrace.includes(root.left.key);
      links.push(
        <line
          key={`link-l-${root.key}-${root.left.key}`}
          x1={x}
          y1={y}
          x2={leftX}
          y2={leftY}
          stroke={leftIsPath ? "#2563eb" : "#94a3b8"}
          strokeWidth={leftIsPath ? "2.5" : "1.2"}
          strokeDasharray={leftIsPath ? undefined : "3 3"}
        />
      );
      const leftSub = renderTreeSVG(root.left, leftX, leftY, dx * 0.55, level + 1);
      nodes.push(...leftSub.nodes);
      links.push(...leftSub.links);
    }

    if (root.right) {
      const rightIsPath = isSearchPath && searchTrace.includes(root.right.key);
      links.push(
        <line
          key={`link-r-${root.key}-${root.right.key}`}
          x1={x}
          y1={y}
          x2={rightX}
          y2={rightY}
          stroke={rightIsPath ? "#2563eb" : "#94a3b8"}
          strokeWidth={rightIsPath ? "2.5" : "1.2"}
          strokeDasharray={rightIsPath ? undefined : "3 3"}
        />
      );
      const rightSub = renderTreeSVG(root.right, rightX, rightY, dx * 0.55, level + 1);
      nodes.push(...rightSub.nodes);
      links.push(...rightSub.links);
    }

    // Balance factor calculation
    const bf = root.balanceFactor !== undefined ? root.balanceFactor : 0;
    const isBalanced = Math.abs(bf) <= 1;

    nodes.push(
      <g
        key={`node-${root.key}`}
        className="cursor-pointer transition-transform duration-200 hover:scale-110"
        onClick={() => setSelectedNodeData(root)}
      >
        {/* Target Glow */}
        {isTarget && (
          <circle cx={x} cy={y} r="26" fill="#3b82f6" opacity="0.3" className="animate-ping" />
        )}

        <circle
          cx={x}
          cy={y}
          r="20"
          fill={isTarget ? "#2563eb" : isSearchPath ? "#dbeafe" : "#ffffff"}
          stroke={isTarget ? "#1d4ed8" : isSearchPath ? "#2563eb" : isBalanced ? "#64748b" : "#ef4444"}
          strokeWidth={isTarget || isSearchPath ? "2.5" : "1.5"}
        />

        {/* Key label */}
        <text
          x={x}
          y={y - 2}
          fill={isTarget ? "#ffffff" : isSearchPath ? "#1e3a8a" : "#0f172a"}
          fontSize="9"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          {root.key.length > 7 ? root.key.slice(0, 7) : root.key}
        </text>

        {/* Height & BF badges */}
        <text
          x={x}
          y={y + 9}
          fill={isTarget ? "#93c5fd" : isBalanced ? "#059669" : "#dc2626"}
          fontSize="7.5"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
          h:{root.height} | bf:{bf}
        </text>
      </g>
    );

    return { nodes, links };
  };

  const currentTree =
    activeTab === "flight-avl"
      ? flightTreeData
      : activeTab === "passenger-avl"
      ? passengerTreeData
      : bookingTreeData;

  const treeRender = currentTree?.root
    ? renderTreeSVG(currentTree.root, 450, 40, 200)
    : { nodes: [], links: [] };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <Cpu className="h-4 w-4" />
              <span>Academic & Operational Data Structure Visualizer</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl font-sans">
              DSA Center & Interactive Visualizer
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Inspect and interact with the live in-memory custom data structures driving AIRSERVE. Perform insertions, deletions, priority queue operations, hash lookups, and graph pathfinding in real-time.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRebuild}
              disabled={rebuilding}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${rebuilding ? "animate-spin" : ""}`} />
              <span>{rebuilding ? "Rebuilding from SQLite..." : "Rebuild & Sync Live DSA"}</span>
            </button>
          </div>
        </div>

        {/* Action Notification Banner */}
        {actionMessage && (
          <div
            className={`mt-4 rounded-lg p-3 text-xs font-semibold flex items-center space-x-2 animate-in fade-in ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* DSA Summary Inventory Matrix */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summary.map((item) => (
          <div
            key={item.key}
            onClick={() => {
              if (item.key.includes("flight")) setActiveTab("flight-avl");
              else if (item.key.includes("passenger")) setActiveTab("passenger-avl");
              else if (item.key.includes("booking")) setActiveTab("booking-avl");
              else if (item.key.includes("heap")) setActiveTab("priority-queue");
              else if (item.key.includes("hash")) setActiveTab("hash-table");
              else if (item.key.includes("graph")) setActiveTab("graph");
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
              <span>{item.type}</span>
              <span className="text-emerald-600">{item.timeComplexity}</span>
            </div>
            <p className="text-xs font-bold text-slate-900 mt-1 truncate">{item.name}</p>
            <div className="mt-2 flex items-baseline justify-between font-mono">
              <span className="text-lg font-bold text-blue-600">{item.size}</span>
              <span className="text-[10px] text-slate-400">
                {item.height !== undefined ? `h=${item.height}` : `cap=${item.capacity || item.vertices || 0}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "flight-avl", label: "Flight AVL Tree", type: "AVL Tree" },
          { id: "passenger-avl", label: "Passenger AVL Tree", type: "AVL Tree" },
          { id: "booking-avl", label: "Booking AVL Tree", type: "AVL Tree" },
          { id: "priority-queue", label: "Waiting List Binary Heap", type: "Priority Queue" },
          { id: "hash-table", label: "User Auth Hash Table", type: "Hash Table" },
          { id: "graph", label: "Airport Network Graph", type: "Adjacency Graph" },
          { id: "complexity", label: "Big-O Complexity Matrix", type: "Academic Ref" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSearchTrace([]);
              setSearchFound(null);
              setSelectedNodeData(null);
            }}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono ${activeTab === tab.id ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"}`}>
              {tab.type}
            </span>
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === "flight-avl" || activeTab === "passenger-avl" || activeTab === "booking-avl" ? (
        <div className="space-y-6">
          {/* Educational Explanation Box */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-blue-900">
                <Info className="h-4 w-4 text-blue-600" />
                <span>
                  {activeTab === "flight-avl"
                    ? "Flight AVL Tree Data Structure"
                    : activeTab === "passenger-avl"
                    ? "Passenger AVL Tree Data Structure"
                    : "Booking AVL Tree Data Structure"}
                </span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <span className="rounded bg-white px-2 py-0.5 font-bold text-emerald-700 border border-blue-200">
                  Search: O(log n)
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-bold text-emerald-700 border border-blue-200">
                  Insert: O(log n)
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-bold text-emerald-700 border border-blue-200">
                  Delete: O(log n)
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-bold text-indigo-700 border border-blue-200">
                  Space: O(n)
                </span>
              </div>
            </div>
            <p>
              <strong>Purpose:</strong> Self-balancing binary search tree where the difference between heights of left and right subtrees (Balance Factor = Height(L) - Height(R)) cannot exceed ±1. Any imbalance triggers single (LL, RR) or double (LR, RL) rotations in O(1) time.
            </p>
          </div>

          {/* Interactive Insert & Delete Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Interactive AVL Operations Playground (Dynamic In-Memory Updates)
            </span>

            {activeTab === "flight-avl" ? (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Flight No</label>
                  <input
                    type="text"
                    value={newFlightNum}
                    onChange={(e) => setNewFlightNum(e.target.value.toUpperCase())}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                    placeholder="e.g. AS-999"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Origin</label>
                  <input
                    type="text"
                    value={newFlightSrc}
                    onChange={(e) => setNewFlightSrc(e.target.value.toUpperCase())}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                    placeholder="HYD"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Destination</label>
                  <input
                    type="text"
                    value={newFlightDest}
                    onChange={(e) => setNewFlightDest(e.target.value.toUpperCase())}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                    placeholder="LHR"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Price ($)</label>
                  <input
                    type="number"
                    value={newFlightPrice}
                    onChange={(e) => setNewFlightPrice(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleInsertFlightAVL}
                    className="flex-1 flex items-center justify-center space-x-1 rounded bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Insert Node</span>
                  </button>
                </div>
              </div>
            ) : activeTab === "passenger-avl" ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Passenger ID</label>
                  <input
                    type="text"
                    value={newPassId}
                    onChange={(e) => setNewPassId(e.target.value.toUpperCase())}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                    placeholder="PAS-99"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={newPassName}
                    onChange={(e) => setNewPassName(e.target.value)}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Email</label>
                  <input
                    type="email"
                    value={newPassEmail}
                    onChange={(e) => setNewPassEmail(e.target.value)}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleInsertPassengerAVL}
                    className="w-full flex items-center justify-center space-x-1 rounded bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Insert Passenger</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Booking ID</label>
                  <input
                    type="text"
                    value={newBkgId}
                    onChange={(e) => setNewBkgId(e.target.value.toUpperCase())}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Flight No</label>
                  <input
                    type="text"
                    value={newBkgFlight}
                    onChange={(e) => setNewBkgFlight(e.target.value.toUpperCase())}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Passenger ID</label>
                  <input
                    type="text"
                    value={newBkgPass}
                    onChange={(e) => setNewBkgPass(e.target.value.toUpperCase())}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Seat</label>
                  <input
                    type="text"
                    value={newBkgSeat}
                    onChange={(e) => setNewBkgSeat(e.target.value.toUpperCase())}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleInsertBookingAVL}
                    className="w-full flex items-center justify-center space-x-1 rounded bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Insert Booking</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tree Metadata & Live Search Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <span className="text-slate-500">
                Nodes (N): <strong className="text-slate-900">{currentTree?.size || 0}</strong>
              </span>
              <span className="text-slate-500">
                Tree Height: <strong className="text-blue-600">{currentTree?.height || 0}</strong>
              </span>
              <span className="text-slate-500">
                Max Allowed Height (1.44 log2 N):{" "}
                <strong className="text-emerald-600">
                  {Math.ceil(1.44 * Math.log2(Math.max(2, currentTree?.size || 2)))}
                </strong>
              </span>
            </div>

            {/* Interactive Search */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value.toUpperCase())}
                  placeholder={`Search ${activeTab === "flight-avl" ? "Flight (e.g. AS-101)" : activeTab === "passenger-avl" ? "Passenger (e.g. PAS-1)" : "Booking (e.g. BKG-1001)"}...`}
                  className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none shadow-sm"
                />
              </div>
              <button
                onClick={() => handleSearchKeyInAVL(searchKey, currentTree?.root)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
              >
                Trace Path
              </button>
            </div>
          </div>

          {/* Search Trace Log */}
          {searchTrace.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-slate-700">
                    AVL Search Path for <strong className="text-slate-900">{searchKey}</strong>:
                  </span>
                  <span className="text-blue-600 font-bold">{searchTrace.join(" → ")}</span>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    searchFound ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {searchFound ? `FOUND in ${searchTrace.length} step(s)` : "NOT FOUND (Null Leaf)"}
                </span>
              </div>
            </div>
          )}

          {/* SVG Tree Canvas */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500">
                Self-Balancing Binary Search Tree Visualizer (BF = Left Height - Right Height)
              </span>
              <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500">
                <span className="flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Balanced (|BF| ≤ 1)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Unbalanced</span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <svg viewBox="0 0 900 360" className="w-full min-w-[800px] h-auto select-none">
                {treeRender.links}
                {treeRender.nodes}
              </svg>
            </div>
          </div>

          {/* In-order / Pre-order / Post-order Traversals */}
          {currentTree && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  In-Order Traversal (Sorted Key Order):
                </span>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto font-mono text-[10px]">
                  {(currentTree.inorder || []).map((k: string) => (
                    <span key={k} className="rounded bg-slate-50 px-2 py-1 text-blue-700 border border-slate-200 font-semibold">
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pre-Order Traversal (Root First):
                </span>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto font-mono text-[10px]">
                  {(currentTree.preorder || []).map((k: string) => (
                    <span key={k} className="rounded bg-slate-50 px-2 py-1 text-indigo-700 border border-slate-200 font-semibold">
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Post-Order Traversal (Leaves First):
                </span>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto font-mono text-[10px]">
                  {(currentTree.postorder || []).map((k: string) => (
                    <span key={k} className="rounded bg-slate-50 px-2 py-1 text-emerald-700 border border-slate-200 font-semibold">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Node Inspector & Delete */}
          {selectedNodeData && (
            <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm space-y-3 font-mono text-xs animate-in fade-in text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 text-sm">
                  Inspecting Node [{selectedNodeData.key}]
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (activeTab === "flight-avl") handleDeleteFlightAVL(selectedNodeData.key);
                      else if (activeTab === "passenger-avl") handleDeletePassengerAVL(selectedNodeData.key);
                      else if (activeTab === "booking-avl") handleDeleteBookingAVL(selectedNodeData.key);
                    }}
                    className="flex items-center space-x-1 rounded bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Node (Rebalance AVL)</span>
                  </button>
                  <button
                    onClick={() => setSelectedNodeData(null)}
                    className="text-slate-400 hover:text-slate-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                  <span className="text-[10px] text-slate-500">Height:</span>
                  <p className="font-bold text-slate-900">{selectedNodeData.height}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                  <span className="text-[10px] text-slate-500">Balance Factor:</span>
                  <p className="font-bold text-emerald-600">{selectedNodeData.balanceFactor || 0}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                  <span className="text-[10px] text-slate-500">Left Child:</span>
                  <p className="font-bold text-slate-700">{selectedNodeData.left?.key || "null"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                  <span className="text-[10px] text-slate-500">Right Child:</span>
                  <p className="font-bold text-slate-700">{selectedNodeData.right?.key || "null"}</p>
                </div>
              </div>
              <pre className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-700 overflow-x-auto">
                {JSON.stringify(selectedNodeData.data || selectedNodeData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : activeTab === "priority-queue" ? (
        <div className="space-y-6">
          {/* Priority Queue Explanation Box */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-amber-900">
                <Info className="h-4 w-4 text-amber-600" />
                <span>Binary Max-Heap Priority Queue (Waiting List Engine)</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <span className="rounded bg-white px-2 py-0.5 font-bold text-emerald-700 border border-amber-200">
                  Enqueue (siftUp): O(log n)
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-bold text-emerald-700 border border-amber-200">
                  Extract-Max (siftDown): O(log n)
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-bold text-blue-700 border border-amber-200">
                  Peek: O(1)
                </span>
              </div>
            </div>
            <p>
              <strong>Purpose:</strong> Manages waiting lists when flights are fully booked. Passengers with higher priority points (VIP tier, booking timestamp) are always positioned at the root and promoted automatically when seats open up.
            </p>
          </div>

          {/* Interactive Enqueue / Dequeue Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Interactive Binary Heap Operations
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Passenger Name</label>
                <input
                  type="text"
                  value={pqName}
                  onChange={(e) => setPqName(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Flight Number</label>
                <input
                  type="text"
                  value={pqFlight}
                  onChange={(e) => setPqFlight(e.target.value.toUpperCase())}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Priority Score (1-100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={pqPriority}
                  onChange={(e) => setPqPriority(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={handleEnqueuePQ}
                  className="flex-1 flex items-center justify-center space-x-1 rounded bg-amber-600 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Enqueue (siftUp)</span>
                </button>
                <button
                  onClick={handleDequeuePQ}
                  className="flex items-center justify-center space-x-1 rounded bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition"
                  title="Extract highest priority element"
                >
                  <span>Extract Max</span>
                </button>
              </div>
            </div>
          </div>

          {/* Priority Queue Header Stats */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm font-mono text-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <span>
                Heap Array Size: <strong className="text-amber-600">{heapData?.size || 0}</strong>
              </span>
              <span>
                Root Element (Max Priority):{" "}
                <strong className="text-blue-600">{heapData?.peek?.passengerName || "Empty Heap"}</strong>
              </span>
              <span>
                Heap Property: <strong className="text-emerald-600">A[Parent] ≥ A[Child]</strong>
              </span>
            </div>
          </div>

          {/* 1D Array Representation of Binary Heap */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              1D Array Mapping: heap[i] → Parent = ⌊(i-1)/2⌋, Left = 2i+1, Right = 2i+2
            </span>

            {heapData?.heap && heapData.heap.length > 0 ? (
              <div className="flex flex-wrap gap-3 overflow-x-auto pb-2">
                {heapData.heap.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 font-mono text-xs min-w-[140px] shadow-sm ${
                      idx === 0
                        ? "border-amber-300 bg-amber-50/60 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-200 pb-1 mb-1">
                      <span>Index [{idx}]</span>
                      {idx === 0 && <span className="font-bold text-amber-700">ROOT (MAX)</span>}
                    </div>
                    <p className="font-bold text-slate-900 truncate">{item.passengerName}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{item.flightNumber}</span>
                      <span className="font-bold text-blue-600">Score: {item.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                Binary Max-Heap is currently empty. Use the Enqueue controls above to add passengers!
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "hash-table" ? (
        <div className="space-y-6">
          {/* Hash Table Explanation Box */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-indigo-900">
                <Info className="h-4 w-4 text-indigo-600" />
                <span>Custom Hash Table with Separate Chaining</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <span className="rounded bg-white px-2 py-0.5 font-bold text-emerald-700 border border-indigo-200">
                  Lookup: O(1) avg
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-bold text-emerald-700 border border-indigo-200">
                  Insert: O(1) avg
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-bold text-indigo-700 border border-indigo-200">
                  Space: O(n + k)
                </span>
              </div>
            </div>
            <p>
              <strong>Purpose:</strong> O(1) average time authentication credentials & session storage. Employs polynomial rolling hash arithmetic <code>hash = (hash * 31 + char) % capacity</code> with dynamic resizing when load factor α &gt; 0.75.
            </p>
          </div>

          {/* Interactive Hash Table Insert & Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Insert form */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                Insert User / Token Key
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Key (Email/Token)</label>
                  <input
                    type="text"
                    value={htKey}
                    onChange={(e) => setHtKey(e.target.value)}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Role</label>
                  <select
                    value={htRole}
                    onChange={(e) => setHtRole(e.target.value)}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="PASSENGER">PASSENGER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="STAFF">STAFF</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleInsertHashTable}
                className="w-full flex items-center justify-center space-x-1 rounded bg-indigo-600 py-2 font-bold text-white hover:bg-indigo-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Hash & Store in Bucket</span>
              </button>
            </div>

            {/* Search form */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                Search / Trace Hash Bucket
              </span>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Search Key</label>
                <input
                  type="text"
                  value={htSearchKey}
                  onChange={(e) => setHtSearchKey(e.target.value)}
                  placeholder="e.g. admin@airserve.com or passenger@airserve.com"
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                />
              </div>
              <button
                onClick={handleSearchHashTable}
                className="w-full flex items-center justify-center space-x-1 rounded bg-slate-800 py-2 font-bold text-white hover:bg-slate-900 transition"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Compute Hash & Trace Bucket</span>
              </button>
              {htSearchResult && (
                <div className="rounded bg-slate-50 p-2 font-mono text-[11px] text-slate-700 border border-slate-200 space-y-1">
                  <div>Computed Hash: <strong className="text-indigo-600">[{htSearchResult.bucketIndex}]</strong></div>
                  <div>Status: <strong className={htSearchResult.found ? "text-emerald-600" : "text-rose-600"}>{htSearchResult.found ? "Found in Chain" : "Key Not Found"}</strong></div>
                </div>
              )}
            </div>
          </div>

          {/* Hash Table Stats Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm font-mono text-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <span>
                Total Buckets: <strong className="text-slate-900">{hashTableData?.capacity || 37} (Prime)</strong>
              </span>
              <span>
                Total Entries: <strong className="text-blue-600">{hashTableData?.size || 0}</strong>
              </span>
              <span>
                Load Factor: <strong className="text-amber-600">{(hashTableData?.loadFactor || 0).toFixed(3)}</strong>
              </span>
              <span>
                Collisions: <strong className="text-rose-600">{hashTableData?.collisionCount || 0}</strong>
              </span>
            </div>
          </div>

          {/* Hash Table Buckets Grid */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Bucket Array with Separate Chaining Linked Lists
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1 font-mono text-xs">
              {hashTableData?.buckets &&
                hashTableData.buckets.map((b: any) => {
                  const hasItems = b.items.length > 0;
                  return (
                    <div
                      key={b.index}
                      className={`rounded-lg border p-2.5 shadow-sm ${
                        hasItems
                          ? b.items.length > 1
                            ? "border-amber-200 bg-amber-50/50"
                            : "border-slate-200 bg-slate-50"
                          : "border-slate-100 bg-slate-50/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Bucket [{b.index}]</span>
                        <span>{b.items.length} item(s)</span>
                      </div>

                      {hasItems ? (
                        <div className="space-y-1">
                          {b.items.map((item: any, i: number) => (
                            <div
                              key={i}
                              className="rounded bg-white p-1.5 flex items-center justify-between text-[11px] border border-slate-200 shadow-sm"
                            >
                              <span className="font-bold text-blue-600 truncate max-w-[150px]">{item.key}</span>
                              <span className="text-slate-500">{item.value?.role || "USER"}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Empty pointer (null)</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : activeTab === "graph" ? (
        <div className="space-y-6">
          {/* Graph Explanation Box */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-rose-900">
                <Globe className="h-4 w-4 text-rose-600" />
                <span>Weighted Adjacency List Airport Network & Dijkstra Route Finder</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <span className="rounded bg-white px-2 py-0.5 font-bold text-emerald-700 border border-rose-200">
                  Dijkstra: O((V + E) log V)
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-bold text-indigo-700 border border-rose-200">
                  Space: O(V + E)
                </span>
              </div>
            </div>
            <p>
              <strong>Purpose:</strong> Models global airline route connectivity. Vertices represent commercial hub airports, and weighted edges represent flight distances (km) and estimated durations.
            </p>
          </div>

          {/* Dijkstra Runner Form */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Interactive Dijkstra Shortest Path Engine
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Origin Airport</label>
                <input
                  type="text"
                  value={graphSrc}
                  onChange={(e) => setGraphSrc(e.target.value.toUpperCase())}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                  placeholder="HYD"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Destination Airport</label>
                <input
                  type="text"
                  value={graphDest}
                  onChange={(e) => setGraphDest(e.target.value.toUpperCase())}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none"
                  placeholder="JFK"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleRunDijkstra}
                  className="w-full flex items-center justify-center space-x-1.5 rounded bg-rose-600 py-2 font-bold text-white hover:bg-rose-700 transition shadow-sm"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Compute Dijkstra Route</span>
                </button>
              </div>
            </div>

            {dijkstraResult && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 font-mono text-xs space-y-2 mt-3 animate-in fade-in">
                <div className="flex items-center justify-between text-slate-900">
                  <span className="font-bold">Shortest Path Traversed:</span>
                  <span className="font-bold text-rose-600">{dijkstraResult.totalDistanceKm} km total</span>
                </div>
                <div className="text-base font-bold text-blue-700">
                  {dijkstraResult.path.join(" ➔ ")}
                </div>
                <div className="text-[11px] text-slate-600">
                  Number of Vertices Relaxed: <strong>{dijkstraResult.steps?.length || dijkstraResult.path.length}</strong> | Algorithm: <strong>Min-Priority Queue Dijkstra</strong>
                </div>
              </div>
            )}
          </div>

          {/* Adjacency List Inspection */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Adjacency List Mapping: Graph.adj[Vertex] ➔ Edge(Neighbor, Distance, Time)
              </span>
              <span className="font-mono text-xs text-slate-500">
                Total Vertices: <strong>{graphData?.vertices?.length || 0}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
              {graphData?.adjacencyList &&
                Object.entries(graphData.adjacencyList).map(([code, edges]: [string, any]) => (
                  <div key={code} className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="font-bold text-blue-700">{code}</span>
                      <span className="text-[10px] text-slate-400">{edges.length} outbound edge(s)</span>
                    </div>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {edges.map((edge: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-100">
                          <span className="text-slate-800 font-semibold">➔ {edge.to || edge.destination}</span>
                          <span className="text-slate-500">{edge.distance || edge.distanceKm} km</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        /* Academic Big-O Complexity Reference */
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">
              Algorithmic Time & Space Complexity Reference
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Theoretical bounds and mathematical proofs for custom data structures implemented in AIRSERVE.
            </p>
          </div>

          <div className="overflow-x-auto font-mono text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Data Structure</th>
                  <th className="py-2.5 px-3">Primary Role</th>
                  <th className="py-2.5 px-3">Search Time</th>
                  <th className="py-2.5 px-3">Insert Time</th>
                  <th className="py-2.5 px-3">Delete Time</th>
                  <th className="py-2.5 px-3">Space Complexity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 px-3 font-bold text-blue-600">Flight AVL Tree</td>
                  <td className="py-3 px-3">Flight Catalog & Index</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3">O(n)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-blue-600">Passenger AVL Tree</td>
                  <td className="py-3 px-3">Passenger Lookup Index</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3">O(n)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-blue-600">Booking AVL Tree</td>
                  <td className="py-3 px-3">Reservation Records</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3">O(n)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-amber-600">Binary Max-Heap</td>
                  <td className="py-3 px-3">Waiting List Priority Queue</td>
                  <td className="py-3 px-3 text-slate-400">O(1) peek max</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(log n) extract</td>
                  <td className="py-3 px-3">O(n)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-indigo-600">Hash Table (Chaining)</td>
                  <td className="py-3 px-3">User Authentication</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(1) avg</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(1) avg</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">O(1) avg</td>
                  <td className="py-3 px-3">O(n + k)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-rose-600">Adjacency List Graph</td>
                  <td className="py-3 px-3">Airport Route Network</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">Dijkstra: O((V+E)log V)</td>
                  <td className="py-3 px-3">O(1) add edge</td>
                  <td className="py-3 px-3">O(deg V)</td>
                  <td className="py-3 px-3">O(V + E)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

