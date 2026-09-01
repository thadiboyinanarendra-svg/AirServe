export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  terminals: number;
  imageUrl?: string;
  description?: string;
  region?: string;
  elevation?: number;
  runways?: number;
}

export interface Route {
  id: string;
  source: string;
  destination: string;
  distanceKm: number;
  baseCost: number;
  durationMinutes: number;
  airlines: string[];
}

export interface Flight {
  flightNumber: string;
  airline: string;
  sourceAirport: string;
  destinationAirport: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  duration: string;
  aircraft: string;
  terminal: string;
  gate: string;
  totalSeats: number;
  availableSeats: number;
  ticketPrice: number;
  class: string;
  status: "SCHEDULED" | "BOARDING" | "DEPARTED" | "DELAYED" | "CANCELLED";
}

export interface Booking {
  bookingId: string;
  passengerId: string;
  flightNumber: string;
  passengerName: string;
  bookingDate: string;
  seatNumber: string;
  class: string;
  ticketPrice: number;
  paymentStatus: "PAID" | "PENDING" | "REFUNDED";
  bookingStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  flight?: Flight;
}

export interface WaitingListEntry {
  id: string;
  passengerId: string;
  passengerName: string;
  flightNumber: string;
  priority: number;
  priorityLabel: string;
  requestTime: string;
  timestamp: number;
  status: "WAITING" | "PROMOTED" | "CANCELLED";
  preferredClass?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface Passenger {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  passportNumber: string;
  nationality: string;
  tier: string;
  loyaltyPoints: number;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  role: "ADMIN" | "PASSENGER";
  name: string;
  email: string;
  phone: string;
  passengerId: string | null;
  passenger?: Passenger | null;
}

export interface DijkstraResult {
  source: string;
  destination: string;
  found: boolean;
  path: string[];
  pathAirports: Airport[];
  totalDistanceKm: number;
  totalCost: number;
  totalDurationMinutes: number;
  stops: number;
  segments: {
    from: string;
    to: string;
    distanceKm: number;
    cost: number;
    durationMinutes: number;
    airlines: string[];
  }[];
  stepsLog: {
    currentAirport: string;
    visited: string[];
    tentativeDistances: { [code: string]: number };
    tentativeCosts: { [code: string]: number };
    description: string;
  }[];
}

export interface DSASummaryItem {
  name: string;
  key: string;
  type: string;
  size: number;
  height?: number;
  capacity?: number;
  loadFactor?: number;
  vertices?: number;
  edges?: number;
  timeComplexity: string;
  spaceComplexity: string;
  activeUsage: string;
}
