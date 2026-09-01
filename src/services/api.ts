import {
  Airport,
  Route,
  Flight,
  Booking,
  WaitingListEntry,
  Passenger,
  User,
  DijkstraResult,
  DSASummaryItem,
} from "../types/index.ts";

const BASE_URL = "/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "An error occurred while communicating with AIRSERVE server.");
  }
  return data;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ message: string; user: User; dsaTrace: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (payload: {
    username: string;
    password: string;
    name: string;
    email: string;
    phone?: string;
    passportNumber?: string;
    nationality?: string;
    tier?: string;
  }) =>
    request<{ message: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Flights
  getFlights: () => request<{ count: number; flights: Flight[]; dsaSource: string }>("/flights"),

  searchFlights: (params: {
    source?: string;
    destination?: string;
    date?: string;
    flightClass?: string;
    airline?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
    sortBy?: string;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
    });
    return request<{ count: number; flights: Flight[] }>(`/flights/search?${query.toString()}`);
  },

  getFlightByNumber: (flightNumber: string) =>
    request<{ flight: Flight; dsaTrace: any }>(`/flights/${flightNumber}`),

  getFlightSeats: (flightNumber: string) =>
    request<{
      flightNumber: string;
      totalSeats: number;
      availableSeats: number;
      occupiedSeatsCount: number;
      occupiedSeats: string[];
      seatLayout: { seatNumber: string; class: string; isOccupied: boolean; passengerName?: string }[];
    }>(`/flights/${flightNumber}/seats`),

  addFlight: (flight: Partial<Flight>) =>
    request<{ message: string; flight: Flight }>("/flights", {
      method: "POST",
      body: JSON.stringify(flight),
    }),

  updateFlight: (flightNumber: string, flight: Partial<Flight>) =>
    request<{ message: string; flight: Flight }>(`/flights/${flightNumber}`, {
      method: "PUT",
      body: JSON.stringify(flight),
    }),

  deleteFlight: (flightNumber: string) =>
    request<{ message: string }>(`/flights/${flightNumber}`, {
      method: "DELETE",
    }),

  updateFlightStatus: (flightNumber: string, status: string) =>
    request<{ message: string; flight: Flight }>(`/flights/${flightNumber}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Bookings
  createBooking: (payload: {
    flightNumber: string;
    passengerId?: string;
    passengerName: string;
    seatNumber: string;
    class?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) =>
    request<{ message: string; booking: Booking; flight: Flight; dsaSync: any }>("/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getBookings: (params?: { passengerId?: string; flightNumber?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
    }
    return request<{ count: number; bookings: Booking[]; dsaSource: string }>(
      `/bookings?${query.toString()}`
    );
  },

  getBookingById: (bookingId: string) =>
    request<{ booking: Booking; flight?: Flight; passenger?: Passenger; dsaTrace: any }>(
      `/bookings/${bookingId}`
    ),

  cancelBooking: (bookingId: string) =>
    request<{
      message: string;
      cancelledBooking: Booking;
      seatReleased: string;
      autoPromotedPassenger: any;
      dsaAction: string;
    }>(`/bookings/${bookingId}/cancel`, {
      method: "POST",
    }),

  // Waiting List
  getWaitingList: (flightNumber?: string) =>
    request<{
      count: number;
      heapSize: number;
      waitingList: WaitingListEntry[];
      dsaSource: string;
    }>(`/waiting-list${flightNumber ? `?flightNumber=${flightNumber}` : ""}`),

  joinWaitingList: (payload: {
    passengerId?: string;
    passengerName: string;
    flightNumber: string;
    priority?: number;
    priorityLabel?: string;
    preferredClass?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) =>
    request<{
      message: string;
      waitlistEntry: WaitingListEntry;
      queuePosition: number;
      dsaAction: string;
    }>("/waiting-list", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  cancelWaitingList: (id: string) =>
    request<{ message: string; removedFromHeap: boolean }>(`/waiting-list/${id}`, {
      method: "DELETE",
    }),

  getWaitingPosition: (passengerId: string, flightNumber?: string) =>
    request<{
      passengerId: string;
      flightNumber: string | null;
      position: number;
      inQueue: boolean;
      entry: WaitingListEntry | null;
    }>(`/waiting-list/position/${passengerId}${flightNumber ? `?flightNumber=${flightNumber}` : ""}`),

  // Passengers
  getPassengers: () =>
    request<{ count: number; passengers: Passenger[]; dsaSource: string }>("/passengers"),

  getPassengerById: (id: string) =>
    request<{ passenger: Passenger; bookings: Booking[]; dsaTrace: any }>(`/passengers/${id}`),

  addPassenger: (passenger: Partial<Passenger>) =>
    request<{ message: string; passenger: Passenger }>("/passengers", {
      method: "POST",
      body: JSON.stringify(passenger),
    }),

  updatePassenger: (id: string, passenger: Partial<Passenger>) =>
    request<{ message: string; passenger: Passenger }>(`/passengers/${id}`, {
      method: "PUT",
      body: JSON.stringify(passenger),
    }),

  deletePassenger: (id: string) =>
    request<{ message: string }>(`/passengers/${id}`, {
      method: "DELETE",
    }),

  // Airport Network & Dijkstra
  getAirports: () => request<{ count: number; airports: Airport[] }>("/network/airports"),

  getRoutes: () => request<{ count: number; routes: Route[] }>("/network/routes"),

  findShortestPath: (source: string, destination: string, optimizeBy: "distance" | "cost" = "distance") =>
    request<{
      result: DijkstraResult;
      dsaAlgorithm: string;
      timeComplexity: string;
    }>("/network/shortest-path", {
      method: "POST",
      body: JSON.stringify({ source, destination, optimizeBy }),
    }),

  addAirport: (airport: Partial<Airport>) =>
    request<{ message: string; airport: Airport }>("/network/airports", {
      method: "POST",
      body: JSON.stringify(airport),
    }),

  addRoute: (route: Partial<Route>) =>
    request<{ message: string }>("/network/routes", {
      method: "POST",
      body: JSON.stringify(route),
    }),

  deleteAirport: (code: string) =>
    request<{ message: string }>(`/network/airports/${code}`, {
      method: "DELETE",
    }),

  // Analytics
  getAnalytics: () =>
    request<{
      kpis: {
        totalFlights: number;
        totalPassengers: number;
        totalBookings: number;
        confirmedBookings: number;
        cancelledBookings: number;
        waitingListCount: number;
        totalRevenue: number;
        avgTicketPrice: number;
        totalSeats: number;
        availableSeats: number;
        occupiedSeats: number;
        occupancyRate: number;
      };
      revenueByAirline: { airline: string; revenue: number }[];
      revenueByFlight: { flightNumber: string; revenue: number }[];
      revenueByClass: { class: string; revenue: number }[];
      flightOccupancy: any[];
      revenueLogs: any[];
    }>("/analytics"),

  // DSA Visualization Center
  getDSASummary: () => request<{ structures: DSASummaryItem[] }>("/dsa/summary"),

  getFlightAVLTree: () => request<any>("/dsa/flight-avl"),
  insertFlightAVL: (flight: any) =>
    request<{ message: string; tree: any }>("/dsa/flight-avl/insert", {
      method: "POST",
      body: JSON.stringify(flight),
    }),
  deleteFlightAVL: (flightNumber: string) =>
    request<{ success: boolean; message: string; tree: any }>(`/dsa/flight-avl/delete/${flightNumber}`, {
      method: "DELETE",
    }),

  getPassengerAVLTree: () => request<any>("/dsa/passenger-avl"),
  insertPassengerAVL: (passenger: any) =>
    request<{ message: string; tree: any }>("/dsa/passenger-avl/insert", {
      method: "POST",
      body: JSON.stringify(passenger),
    }),
  deletePassengerAVL: (passengerId: string) =>
    request<{ success: boolean; message: string; tree: any }>(`/dsa/passenger-avl/delete/${passengerId}`, {
      method: "DELETE",
    }),

  getBookingAVLTree: () => request<any>("/dsa/booking-avl"),
  insertBookingAVL: (booking: any) =>
    request<{ message: string; tree: any }>("/dsa/booking-avl/insert", {
      method: "POST",
      body: JSON.stringify(booking),
    }),
  deleteBookingAVL: (bookingId: string) =>
    request<{ success: boolean; message: string; tree: any }>(`/dsa/booking-avl/delete/${bookingId}`, {
      method: "DELETE",
    }),

  getPriorityQueueHeap: () => request<any>("/dsa/priority-queue"),
  enqueuePriorityQueue: (payload: any) =>
    request<{ message: string; entry: any; heap: any }>("/dsa/priority-queue/enqueue", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  dequeuePriorityQueue: () =>
    request<{ message: string; dequeued: any; heap: any }>("/dsa/priority-queue/dequeue", {
      method: "POST",
    }),
  clearPriorityQueue: () =>
    request<{ message: string; heap: any }>("/dsa/priority-queue/clear", {
      method: "POST",
    }),

  getHashTableViz: () => request<any>("/dsa/hash-table"),
  insertHashTable: (payload: any) =>
    request<{ message: string; trace: any; table: any }>("/dsa/hash-table/insert", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteHashTable: (key: string) =>
    request<{ success: boolean; message: string; table: any }>(`/dsa/hash-table/delete/${key}`, {
      method: "DELETE",
    }),
  searchHashTable: (key: string) =>
    request<{ trace: any; table: any }>("/dsa/hash-table/search", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),

  getGraphViz: () => request<any>("/dsa/graph"),
  insertGraphVertex: (vertex: any) =>
    request<{ message: string; graph: any }>("/dsa/graph/insert-vertex", {
      method: "POST",
      body: JSON.stringify(vertex),
    }),
  insertGraphEdge: (edge: any) =>
    request<{ message: string; graph: any }>("/dsa/graph/insert-edge", {
      method: "POST",
      body: JSON.stringify(edge),
    }),
  deleteGraphVertex: (code: string) =>
    request<{ success: boolean; message: string; graph: any }>(`/dsa/graph/vertex/${code}`, {
      method: "DELETE",
    }),

  rebuildDSA: () =>
    request<{ message: string; stats: any }>("/dsa/rebuild", {
      method: "POST",
    }),
};
