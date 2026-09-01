import { AVLTree } from "./dsa/avlTree.ts";
import { PriorityQueue, WaitingListEntry } from "./dsa/priorityQueue.ts";
import { HashTable } from "./dsa/hashTable.ts";
import { AirportGraph, AirportVertex, RouteEdge } from "./dsa/graph.ts";
import {
  DBUser,
  DBPassenger,
  DBFlight,
  DBBooking,
  DBWaitingList,
  DBAirport,
  DBRoute,
  queryAll,
} from "./db/database.ts";

/**
 * Real in-memory Custom Data Structures initialized and kept in sync with SQLite.
 * Every core airline operation (Search, Login, Booking, Cancellation, Routing)
 * directly exercises these data structures.
 */

export const flightAVL = new AVLTree<DBFlight>("Flight AVL Tree", "flightNumber");
export const passengerAVL = new AVLTree<DBPassenger>("Passenger AVL Tree", "id");
export const bookingAVL = new AVLTree<DBBooking>("Booking AVL Tree", "bookingId");
export const waitingListHeap = new PriorityQueue("Flight Waiting List Max-Heap");
export const userHashTable = new HashTable<DBUser>(37, "User Auth Hash Table");
export const airportGraph = new AirportGraph();

export function rebuildAllDSAFromDB(): {
  flightsCount: number;
  passengersCount: number;
  bookingsCount: number;
  waitingCount: number;
  usersCount: number;
  airportsCount: number;
  routesCount: number;
} {
  console.log("Rebuilding all custom DSA instances from SQLite database...");

  // 1. Rebuild Flight AVL Tree
  flightAVL.clear();
  const flights = queryAll<DBFlight>("SELECT * FROM flights");
  for (const f of flights) {
    flightAVL.insert(f.flightNumber, f);
  }

  // 2. Rebuild Passenger AVL Tree
  passengerAVL.clear();
  const passengers = queryAll<DBPassenger>("SELECT * FROM passengers");
  for (const p of passengers) {
    passengerAVL.insert(p.id, p);
  }

  // 3. Rebuild Booking AVL Tree
  bookingAVL.clear();
  const bookings = queryAll<DBBooking>("SELECT * FROM bookings");
  for (const b of bookings) {
    bookingAVL.insert(b.bookingId, b);
  }

  // 4. Rebuild Waiting List Max Heap
  waitingListHeap.clear();
  const waitingEntries = queryAll<DBWaitingList>(
    "SELECT * FROM waiting_list WHERE status = 'WAITING' ORDER BY timestamp ASC"
  );
  for (const w of waitingEntries) {
    waitingListHeap.enqueue({
      id: w.id,
      passengerId: w.passengerId,
      passengerName: w.passengerName,
      flightNumber: w.flightNumber,
      priority: w.priority,
      priorityLabel: w.priorityLabel,
      requestTime: w.requestTime,
      timestamp: w.timestamp,
      status: w.status,
      preferredClass: w.preferredClass,
      contactEmail: w.contactEmail,
      contactPhone: w.contactPhone,
    });
  }

  // 5. Rebuild User Hash Table
  userHashTable.clear();
  const users = queryAll<DBUser>("SELECT * FROM users");
  for (const u of users) {
    userHashTable.insert(u.username, u);
  }

  // 6. Rebuild Airport Graph
  airportGraph.clear();
  const airports = queryAll<DBAirport>("SELECT * FROM airports");
  for (const a of airports) {
    airportGraph.addAirport({
      code: a.code,
      name: a.name,
      city: a.city,
      country: a.country,
      lat: a.lat,
      lng: a.lng,
      terminals: a.terminals,
      imageUrl: a.imageUrl,
      description: a.description,
      region: a.region,
      elevation: a.elevation,
      runways: a.runways,
    });
  }

  const routes = queryAll<DBRoute>("SELECT * FROM routes");
  for (const r of routes) {
    let airlinesList: string[] = ["AirServe"];
    try {
      airlinesList = JSON.parse(r.airlines);
    } catch {
      airlinesList = [r.airlines];
    }

    airportGraph.addRoute(
      {
        id: r.id,
        source: r.source,
        destination: r.destination,
        distanceKm: r.distanceKm,
        baseCost: r.baseCost,
        durationMinutes: r.durationMinutes,
        airlines: airlinesList,
      },
      false
    );
  }

  console.log(
    `Rebuilt DSA: ${flightAVL.size} flights in AVL, ${passengerAVL.size} passengers in AVL, ${bookingAVL.size} bookings in AVL, ${waitingListHeap.size()} in Priority Queue, ${userHashTable.getSize()} in Hash Table, ${airportGraph.getAllAirports().length} airports in Graph.`
  );

  return {
    flightsCount: flightAVL.size,
    passengersCount: passengerAVL.size,
    bookingsCount: bookingAVL.size,
    waitingCount: waitingListHeap.size(),
    usersCount: userHashTable.getSize(),
    airportsCount: airportGraph.getAllAirports().length,
    routesCount: airportGraph.getAllRoutes().length,
  };
}
