import fs from "fs";
import path from "path";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import {
  getInitialUsers,
  getInitialPassengers,
  getInitialFlights,
  getInitialBookings,
  getInitialWaitingList,
  initialAirports,
  initialRoutes,
} from "./seedData.ts";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "airserve.sqlite");

let SQL: SqlJsStatic;
let db: Database;

export interface DBUser {
  id: string;
  username: string;
  passwordHash: string;
  role: "ADMIN" | "PASSENGER";
  name: string;
  email: string;
  phone: string;
  passengerId: string | null;
  createdAt: string;
}

export interface DBPassenger {
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

export interface DBFlight {
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

export interface DBBooking {
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
}

export interface DBWaitingList {
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

export interface DBAirport {
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

export interface DBRoute {
  id: string;
  source: string;
  destination: string;
  distanceKm: number;
  baseCost: number;
  durationMinutes: number;
  airlines: string; // JSON string
}

export function saveDatabaseToDisk(): void {
  if (!db) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error("Error saving SQLite database to disk:", err);
  }
}

export async function initializeDatabase(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log("Loaded existing SQLite database from disk.");

      // Migration: Ensure new airport columns exist
      try {
        db.run("ALTER TABLE airports ADD COLUMN imageUrl TEXT");
      } catch (_) {}
      try {
        db.run("ALTER TABLE airports ADD COLUMN description TEXT");
      } catch (_) {}
      try {
        db.run("ALTER TABLE airports ADD COLUMN region TEXT");
      } catch (_) {}
      try {
        db.run("ALTER TABLE airports ADD COLUMN elevation REAL");
      } catch (_) {}
      try {
        db.run("ALTER TABLE airports ADD COLUMN runways INTEGER");
      } catch (_) {}

      // Sync and upsert initialAirports
      try {
        for (const a of initialAirports) {
          db.run(
            `INSERT INTO airports (code, name, city, country, lat, lng, terminals, imageUrl, description, region, elevation, runways)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(code) DO UPDATE SET
               name=excluded.name,
               city=excluded.city,
               country=excluded.country,
               lat=excluded.lat,
               lng=excluded.lng,
               terminals=excluded.terminals,
               imageUrl=excluded.imageUrl,
               description=excluded.description,
               region=excluded.region,
               elevation=excluded.elevation,
               runways=excluded.runways`,
            [
              a.code,
              a.name,
              a.city,
              a.country,
              a.lat,
              a.lng,
              a.terminals,
              a.imageUrl || null,
              a.description || null,
              a.region || null,
              a.elevation || null,
              a.runways || null,
            ]
          );
        }
      } catch (err) {
        console.warn("Error syncing initialAirports into existing DB:", err);
      }

      // Sync and upsert initialRoutes
      try {
        for (const r of initialRoutes) {
          const id = `${r.source}-${r.destination}`;
          db.run(
            `INSERT INTO routes (id, source, destination, distanceKm, baseCost, durationMinutes, airlines)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               distanceKm=excluded.distanceKm,
               baseCost=excluded.baseCost,
               durationMinutes=excluded.durationMinutes,
               airlines=excluded.airlines`,
            [id, r.source, r.destination, r.distanceKm, r.baseCost, r.durationMinutes, JSON.stringify(r.airlines)]
          );
        }
      } catch (err) {
        console.warn("Error syncing initialRoutes into existing DB:", err);
      }

      // Check flight count and backfill full multi-date schedule if needed
      try {
        const stmt = db.prepare("SELECT COUNT(*) as count FROM flights");
        if (stmt.step()) {
          const row = stmt.getAsObject() as { count: number };
          if (row.count < 50) {
            console.log("Backfilling multi-day flight schedules into existing database...");
            const flights = getInitialFlights();
            for (const f of flights) {
              db.run(
                `INSERT OR IGNORE INTO flights (flightNumber, airline, sourceAirport, destinationAirport, departureDate, departureTime, arrivalDate, arrivalTime, duration, aircraft, terminal, gate, totalSeats, availableSeats, ticketPrice, class, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  f.flightNumber,
                  f.airline,
                  f.sourceAirport,
                  f.destinationAirport,
                  f.departureDate,
                  f.departureTime,
                  f.arrivalDate,
                  f.arrivalTime,
                  f.duration,
                  f.aircraft,
                  f.terminal,
                  f.gate,
                  f.totalSeats,
                  f.availableSeats,
                  f.ticketPrice,
                  f.class,
                  f.status,
                ]
              );
            }
          }
        }
        stmt.free();
      } catch (err) {
        console.warn("Error checking flight count in existing DB:", err);
      }

      saveDatabaseToDisk();
      return db;
    } catch (e) {
      console.warn("Could not load existing DB file, creating fresh:", e);
    }
  }

  db = new SQL.Database();
  console.log("Creating new SQLite tables and seeding initial data...");

  // Create SQLite Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      passengerId TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS passengers (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      passportNumber TEXT,
      nationality TEXT,
      tier TEXT DEFAULT 'STANDARD',
      loyaltyPoints INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flights (
      flightNumber TEXT PRIMARY KEY,
      airline TEXT NOT NULL,
      sourceAirport TEXT NOT NULL,
      destinationAirport TEXT NOT NULL,
      departureDate TEXT NOT NULL,
      departureTime TEXT NOT NULL,
      arrivalDate TEXT NOT NULL,
      arrivalTime TEXT NOT NULL,
      duration TEXT NOT NULL,
      aircraft TEXT NOT NULL,
      terminal TEXT NOT NULL,
      gate TEXT NOT NULL,
      totalSeats INTEGER NOT NULL,
      availableSeats INTEGER NOT NULL,
      ticketPrice REAL NOT NULL,
      class TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      bookingId TEXT PRIMARY KEY,
      passengerId TEXT NOT NULL,
      flightNumber TEXT NOT NULL,
      passengerName TEXT NOT NULL,
      bookingDate TEXT NOT NULL,
      seatNumber TEXT NOT NULL,
      class TEXT NOT NULL,
      ticketPrice REAL NOT NULL,
      paymentStatus TEXT NOT NULL,
      bookingStatus TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS waiting_list (
      id TEXT PRIMARY KEY,
      passengerId TEXT NOT NULL,
      passengerName TEXT NOT NULL,
      flightNumber TEXT NOT NULL,
      priority INTEGER NOT NULL,
      priorityLabel TEXT NOT NULL,
      requestTime TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL,
      preferredClass TEXT,
      contactEmail TEXT,
      contactPhone TEXT
    );

    CREATE TABLE IF NOT EXISTS airports (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      terminals INTEGER NOT NULL,
      imageUrl TEXT,
      description TEXT,
      region TEXT,
      elevation REAL,
      runways INTEGER
    );

    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      distanceKm REAL NOT NULL,
      baseCost REAL NOT NULL,
      durationMinutes INTEGER NOT NULL,
      airlines TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revenue_logs (
      id TEXT PRIMARY KEY,
      bookingId TEXT,
      flightNumber TEXT NOT NULL,
      airline TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- 'BOOKING' or 'REFUND'
      timestamp TEXT NOT NULL
    );
  `);

  // Seed Data
  const users = getInitialUsers();
  for (const u of users) {
    db.run(
      `INSERT INTO users (id, username, passwordHash, role, name, email, phone, passengerId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.username, u.passwordHash, u.role, u.name, u.email, u.phone, u.passengerId, u.createdAt]
    );
  }

  const passengers = getInitialPassengers();
  for (const p of passengers) {
    db.run(
      `INSERT INTO passengers (id, userId, name, email, phone, passportNumber, nationality, tier, loyaltyPoints, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.userId, p.name, p.email, p.phone, p.passportNumber, p.nationality, p.tier, p.loyaltyPoints, p.createdAt]
    );
  }

  const flights = getInitialFlights();
  for (const f of flights) {
    db.run(
      `INSERT INTO flights (flightNumber, airline, sourceAirport, destinationAirport, departureDate, departureTime, arrivalDate, arrivalTime, duration, aircraft, terminal, gate, totalSeats, availableSeats, ticketPrice, class, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.flightNumber,
        f.airline,
        f.sourceAirport,
        f.destinationAirport,
        f.departureDate,
        f.departureTime,
        f.arrivalDate,
        f.arrivalTime,
        f.duration,
        f.aircraft,
        f.terminal,
        f.gate,
        f.totalSeats,
        f.availableSeats,
        f.ticketPrice,
        f.class,
        f.status,
      ]
    );
  }

  const bookings = getInitialBookings();
  for (const b of bookings) {
    db.run(
      `INSERT INTO bookings (bookingId, passengerId, flightNumber, passengerName, bookingDate, seatNumber, class, ticketPrice, paymentStatus, bookingStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.bookingId, b.passengerId, b.flightNumber, b.passengerName, b.bookingDate, b.seatNumber, b.class, b.ticketPrice, b.paymentStatus, b.bookingStatus]
    );

    // Initial revenue log
    if (b.bookingStatus === "CONFIRMED") {
      const flight = flights.find((f) => f.flightNumber === b.flightNumber);
      db.run(
        `INSERT INTO revenue_logs (id, bookingId, flightNumber, airline, amount, type, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`REV-${b.bookingId}`, b.bookingId, b.flightNumber, flight?.airline || "AirServe Express", b.ticketPrice, "BOOKING", b.bookingDate]
      );
    }
  }

  const waitingList = getInitialWaitingList();
  for (const w of waitingList) {
    db.run(
      `INSERT INTO waiting_list (id, passengerId, passengerName, flightNumber, priority, priorityLabel, requestTime, timestamp, status, preferredClass, contactEmail, contactPhone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [w.id, w.passengerId, w.passengerName, w.flightNumber, w.priority, w.priorityLabel, w.requestTime, w.timestamp, w.status, w.preferredClass, w.contactEmail, w.contactPhone]
    );
  }

  for (const a of initialAirports) {
    db.run(
      `INSERT INTO airports (code, name, city, country, lat, lng, terminals, imageUrl, description, region, elevation, runways)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        a.code,
        a.name,
        a.city,
        a.country,
        a.lat,
        a.lng,
        a.terminals,
        a.imageUrl || null,
        a.description || null,
        a.region || null,
        a.elevation || null,
        a.runways || null,
      ]
    );
  }

  for (const r of initialRoutes) {
    const id = `${r.source}-${r.destination}`;
    db.run(
      `INSERT INTO routes (id, source, destination, distanceKm, baseCost, durationMinutes, airlines)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, r.source, r.destination, r.distanceKm, r.baseCost, r.durationMinutes, JSON.stringify(r.airlines)]
    );
  }

  saveDatabaseToDisk();
  return db;
}

export function getDB(): Database {
  if (!db) {
    throw new Error("Database has not been initialized yet. Call initializeDatabase() first.");
  }
  return db;
}

// Database query helpers
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const stmt = getDB().prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const list = queryAll<T>(sql, params);
  return list.length > 0 ? list[0] : null;
}

export function execute(sql: string, params: any[] = []): void {
  getDB().run(sql, params);
  saveDatabaseToDisk();
}
