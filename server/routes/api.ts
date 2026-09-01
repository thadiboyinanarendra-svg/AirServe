import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  flightAVL,
  passengerAVL,
  bookingAVL,
  waitingListHeap,
  userHashTable,
  airportGraph,
  rebuildAllDSAFromDB,
} from "../dsaRegistry.ts";
import {
  DBUser,
  DBPassenger,
  DBFlight,
  DBBooking,
  DBWaitingList,
  queryAll,
  queryOne,
  execute,
  saveDatabaseToDisk,
} from "../db/database.ts";
import { generateFlightsForDate } from "../db/seedData.ts";

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & USERS (Uses Custom Hash Table)
// ==========================================

apiRouter.post("/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  // 1. O(1) Hash Table Lookup with inspection trace
  const trace = userHashTable.searchWithTrace(username.trim());
  const user = trace.value;

  if (!user) {
    return res.status(401).json({
      error: "Invalid username or credentials",
      dsaTrace: {
        hashFunction: "Polynomial Rolling Hash % Capacity",
        hashIndex: trace.hashIndex,
        chainComparisons: trace.chainComparisons,
        found: false,
      },
    });
  }

  // 2. Verify hashed password
  const passwordMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({
      error: "Invalid password",
      dsaTrace: {
        hashFunction: "Polynomial Rolling Hash % Capacity",
        hashIndex: trace.hashIndex,
        chainComparisons: trace.chainComparisons,
        found: true,
      },
    });
  }

  let passengerRecord: DBPassenger | null = null;
  if (user.passengerId) {
    passengerRecord = passengerAVL.search(user.passengerId);
  }

  return res.json({
    message: "Login successful",
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      passengerId: user.passengerId,
      passenger: passengerRecord,
    },
    dsaTrace: {
      lookupStructure: "Custom Hash Table with Separate Chaining",
      hashIndex: trace.hashIndex,
      chainComparisons: trace.chainComparisons,
      found: true,
    },
  });
});

apiRouter.post("/auth/register", (req: Request, res: Response) => {
  const { username, password, name, email, phone, passportNumber, nationality, tier } = req.body;

  if (!username || !password || !name || !email) {
    return res.status(400).json({ error: "Username, password, name, and email are required" });
  }

  // Check username in Hash Table
  if (userHashTable.search(username.trim())) {
    return res.status(400).json({ error: "Username already taken. Please choose another." });
  }

  const userId = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
  const passengerId = `PAS-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(password, 10);

  const newUser: DBUser = {
    id: userId,
    username: username.trim(),
    passwordHash,
    role: "PASSENGER",
    name: name.trim(),
    email: email.trim(),
    phone: phone || "",
    passengerId,
    createdAt: now,
  };

  const newPassenger: DBPassenger = {
    id: passengerId,
    userId,
    name: name.trim(),
    email: email.trim(),
    phone: phone || "",
    passportNumber: passportNumber || "P" + Math.floor(10000000 + Math.random() * 90000000),
    nationality: nationality || "International",
    tier: tier || "STANDARD",
    loyaltyPoints: 500, // Sign-up bonus points
    createdAt: now,
  };

  // 1. Insert into SQLite
  execute(
    `INSERT INTO users (id, username, passwordHash, role, name, email, phone, passengerId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newUser.id,
      newUser.username,
      newUser.passwordHash,
      newUser.role,
      newUser.name,
      newUser.email,
      newUser.phone,
      newUser.passengerId,
      newUser.createdAt,
    ]
  );

  execute(
    `INSERT INTO passengers (id, userId, name, email, phone, passportNumber, nationality, tier, loyaltyPoints, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newPassenger.id,
      newPassenger.userId,
      newPassenger.name,
      newPassenger.email,
      newPassenger.phone,
      newPassenger.passportNumber,
      newPassenger.nationality,
      newPassenger.tier,
      newPassenger.loyaltyPoints,
      newPassenger.createdAt,
    ]
  );

  // 2. Synchronize Custom Data Structures: Hash Table & Passenger AVL Tree
  userHashTable.insert(newUser.username, newUser);
  passengerAVL.insert(newPassenger.id, newPassenger);

  return res.status(201).json({
    message: "Registration successful! Welcome to AIRSERVE.",
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      passengerId: newUser.passengerId,
      passenger: newPassenger,
    },
  });
});

// ==========================================
// 2. FLIGHT MANAGEMENT (Uses Custom Flight AVL Tree)
// ==========================================

// Get all flights (Inorder traversal of Flight AVL Tree)
apiRouter.get("/flights", (req: Request, res: Response) => {
  const flights = flightAVL.inorder();
  return res.json({
    count: flights.length,
    flights,
    dsaSource: "Flight AVL Tree (Inorder Traversal)",
  });
});

function parseDurationMinutes(durationStr: string): number {
  if (!durationStr) return 0;
  const hMatch = durationStr.match(/(\d+)\s*h/i);
  const mMatch = durationStr.match(/(\d+)\s*m/i);
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hours * 60 + mins;
}

// Search flights with dynamic date schedule generation & comprehensive filters
apiRouter.get("/flights/search", (req: Request, res: Response) => {
  const {
    source,
    destination,
    date,
    flightClass,
    airline,
    minPrice,
    maxPrice,
    status,
    sortBy,
  } = req.query as { [key: string]: string };

  const trimmedDate = date && date !== "ALL" && date !== "undefined" ? date.trim() : undefined;

  // If a specific departure date is queried, check if flights exist in the AVL tree for that date
  if (trimmedDate) {
    const existingForDate = flightAVL.inorder().filter((f) => f.departureDate === trimmedDate);
    if (existingForDate.length === 0) {
      console.log(`Dynamically scheduling standard commercial flights for requested date: ${trimmedDate}`);
      try {
        const generated = generateFlightsForDate(trimmedDate);
        for (const f of generated) {
          try {
            execute(
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
            // Insert into in-memory Flight AVL Tree
            flightAVL.insert(f.flightNumber, f as DBFlight);
          } catch (err) {
            // Ignore duplicate insert errors
          }
        }
        saveDatabaseToDisk();
      } catch (e) {
        console.warn("Failed dynamic flight scheduling for date:", e);
      }
    }
  }

  let flights = flightAVL.inorder();

  if (source && source !== "ALL") {
    flights = flights.filter(
      (f) => f.sourceAirport.toUpperCase() === source.trim().toUpperCase()
    );
  }

  if (destination && destination !== "ALL") {
    flights = flights.filter(
      (f) => f.destinationAirport.toUpperCase() === destination.trim().toUpperCase()
    );
  }

  if (trimmedDate) {
    flights = flights.filter((f) => f.departureDate === trimmedDate);
  }

  if (flightClass && flightClass !== "ALL") {
    flights = flights.filter(
      (f) => f.class.toLowerCase() === flightClass.trim().toLowerCase()
    );
  }

  if (airline && airline !== "ALL") {
    flights = flights.filter((f) => f.airline.toLowerCase() === airline.trim().toLowerCase());
  }

  if (status && status !== "ALL") {
    flights = flights.filter((f) => f.status === status.trim());
  }

  if (minPrice) {
    flights = flights.filter((f) => f.ticketPrice >= Number(minPrice));
  }

  if (maxPrice) {
    flights = flights.filter((f) => f.ticketPrice <= Number(maxPrice));
  }

  // Sorting
  if (sortBy === "price_asc") {
    flights.sort((a, b) => a.ticketPrice - b.ticketPrice);
  } else if (sortBy === "price_desc") {
    flights.sort((a, b) => b.ticketPrice - a.ticketPrice);
  } else if (sortBy === "duration_asc") {
    flights.sort((a, b) => parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration));
  } else if (sortBy === "duration_desc") {
    flights.sort((a, b) => parseDurationMinutes(b.duration) - parseDurationMinutes(a.duration));
  } else if (sortBy === "departure_asc" || sortBy === "departure_time") {
    flights.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  } else if (sortBy === "departure_desc") {
    flights.sort((a, b) => b.departureTime.localeCompare(a.departureTime));
  } else if (sortBy === "seats_desc" || sortBy === "available_seats") {
    flights.sort((a, b) => b.availableSeats - a.availableSeats);
  } else if (sortBy === "seats_asc") {
    flights.sort((a, b) => a.availableSeats - b.availableSeats);
  } else if (sortBy === "airline_asc") {
    flights.sort((a, b) => a.airline.localeCompare(b.airline));
  }

  return res.json({
    count: flights.length,
    flights,
  });
});

// Search by Flight Number via AVL Tree: O(log n)
apiRouter.get("/flights/:flightNumber", (req: Request, res: Response) => {
  const { flightNumber } = req.params;
  const trace = flightAVL.searchWithTrace(flightNumber.toUpperCase());

  if (!trace.found || !trace.value) {
    return res.status(404).json({
      error: `Flight ${flightNumber} not found in Flight AVL Tree.`,
      dsaTrace: trace,
    });
  }

  return res.json({
    flight: trace.value,
    dsaTrace: {
      structure: "Flight AVL Tree",
      timeComplexity: "O(log n)",
      steps: trace.steps,
      traversalPath: trace.path,
    },
  });
});

// Get flight seat map and occupancy
apiRouter.get("/flights/:flightNumber/seats", (req: Request, res: Response) => {
  const { flightNumber } = req.params;
  const flight = flightAVL.search(flightNumber.toUpperCase());

  if (!flight) {
    return res.status(404).json({ error: "Flight not found" });
  }

  // Query confirmed bookings for this flight
  const confirmedBookings = queryAll<DBBooking>(
    "SELECT seatNumber, passengerName, bookingId, class FROM bookings WHERE flightNumber = ? AND bookingStatus = 'CONFIRMED'",
    [flight.flightNumber]
  );

  const occupiedSeats = confirmedBookings.map((b) => b.seatNumber);

  // Generate seat layout based on class and total seats
  // Standard layout: First Class (1A-2D), Business (3A-4D), Economy (5A-10F)
  const seatLayout: { seatNumber: string; class: string; isOccupied: boolean; passengerName?: string }[] = [];
  const rows = Math.ceil(flight.totalSeats / 6);
  const seatCols = ["A", "B", "C", "D", "E", "F"];

  let count = 0;
  for (let r = 1; r <= rows && count < flight.totalSeats; r++) {
    const seatClass = r <= 2 ? "First Class" : r <= 4 ? "Business" : "Economy";
    for (const c of seatCols) {
      if (count >= flight.totalSeats) break;
      const seatNum = `${r}${c}`;
      const booking = confirmedBookings.find((b) => b.seatNumber === seatNum);
      seatLayout.push({
        seatNumber: seatNum,
        class: seatClass,
        isOccupied: Boolean(booking),
        passengerName: booking ? booking.passengerName : undefined,
      });
      count++;
    }
  }

  return res.json({
    flightNumber: flight.flightNumber,
    totalSeats: flight.totalSeats,
    availableSeats: flight.availableSeats,
    occupiedSeatsCount: occupiedSeats.length,
    occupiedSeats,
    seatLayout,
  });
});

// Admin Add Flight (Syncs SQLite + Flight AVL Tree)
apiRouter.post("/flights", (req: Request, res: Response) => {
  const {
    flightNumber,
    airline,
    sourceAirport,
    destinationAirport,
    departureDate,
    departureTime,
    arrivalDate,
    arrivalTime,
    duration,
    aircraft,
    terminal,
    gate,
    totalSeats,
    ticketPrice,
    class: flightClass,
    status,
  } = req.body;

  const fn = (flightNumber || "").trim().toUpperCase();
  if (!fn || !sourceAirport || !destinationAirport || !departureDate || !departureTime) {
    return res.status(400).json({ error: "Missing required flight fields" });
  }

  if (sourceAirport.toUpperCase() === destinationAirport.toUpperCase()) {
    return res.status(400).json({ error: "Source and Destination airports must be different." });
  }

  // Check duplicate in Flight AVL Tree
  if (flightAVL.search(fn)) {
    return res.status(400).json({ error: `Flight number ${fn} already exists in the system.` });
  }

  const seats = Number(totalSeats) || 30;
  const newFlight: DBFlight = {
    flightNumber: fn,
    airline: airline || "AirServe Express",
    sourceAirport: sourceAirport.toUpperCase(),
    destinationAirport: destinationAirport.toUpperCase(),
    departureDate,
    departureTime,
    arrivalDate: arrivalDate || departureDate,
    arrivalTime: arrivalTime || departureTime,
    duration: duration || "2h 00m",
    aircraft: aircraft || "Boeing 787-9 Dreamliner",
    terminal: terminal || "T1",
    gate: gate || "G01",
    totalSeats: seats,
    availableSeats: seats,
    ticketPrice: Number(ticketPrice) || 100,
    class: flightClass || "Economy",
    status: status || "SCHEDULED",
  };

  // 1. Insert into SQLite
  execute(
    `INSERT INTO flights (flightNumber, airline, sourceAirport, destinationAirport, departureDate, departureTime, arrivalDate, arrivalTime, duration, aircraft, terminal, gate, totalSeats, availableSeats, ticketPrice, class, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newFlight.flightNumber,
      newFlight.airline,
      newFlight.sourceAirport,
      newFlight.destinationAirport,
      newFlight.departureDate,
      newFlight.departureTime,
      newFlight.arrivalDate,
      newFlight.arrivalTime,
      newFlight.duration,
      newFlight.aircraft,
      newFlight.terminal,
      newFlight.gate,
      newFlight.totalSeats,
      newFlight.availableSeats,
      newFlight.ticketPrice,
      newFlight.class,
      newFlight.status,
    ]
  );

  // 2. Insert into Flight AVL Tree: O(log n)
  flightAVL.insert(newFlight.flightNumber, newFlight);

  return res.status(201).json({
    message: `Flight ${fn} added and indexed in Flight AVL Tree.`,
    flight: newFlight,
  });
});

// Admin Edit Flight
apiRouter.put("/flights/:flightNumber", (req: Request, res: Response) => {
  const { flightNumber } = req.params;
  const fn = flightNumber.toUpperCase();
  const existing = flightAVL.search(fn);

  if (!existing) {
    return res.status(404).json({ error: `Flight ${fn} not found.` });
  }

  const updated: DBFlight = {
    ...existing,
    airline: req.body.airline ?? existing.airline,
    sourceAirport: (req.body.sourceAirport ?? existing.sourceAirport).toUpperCase(),
    destinationAirport: (req.body.destinationAirport ?? existing.destinationAirport).toUpperCase(),
    departureDate: req.body.departureDate ?? existing.departureDate,
    departureTime: req.body.departureTime ?? existing.departureTime,
    arrivalDate: req.body.arrivalDate ?? existing.arrivalDate,
    arrivalTime: req.body.arrivalTime ?? existing.arrivalTime,
    duration: req.body.duration ?? existing.duration,
    aircraft: req.body.aircraft ?? existing.aircraft,
    terminal: req.body.terminal ?? existing.terminal,
    gate: req.body.gate ?? existing.gate,
    totalSeats: Number(req.body.totalSeats ?? existing.totalSeats),
    availableSeats: Number(req.body.availableSeats ?? existing.availableSeats),
    ticketPrice: Number(req.body.ticketPrice ?? existing.ticketPrice),
    class: req.body.class ?? existing.class,
    status: req.body.status ?? existing.status,
  };

  execute(
    `UPDATE flights SET airline = ?, sourceAirport = ?, destinationAirport = ?, departureDate = ?, departureTime = ?, arrivalDate = ?, arrivalTime = ?, duration = ?, aircraft = ?, terminal = ?, gate = ?, totalSeats = ?, availableSeats = ?, ticketPrice = ?, class = ?, status = ?
     WHERE flightNumber = ?`,
    [
      updated.airline,
      updated.sourceAirport,
      updated.destinationAirport,
      updated.departureDate,
      updated.departureTime,
      updated.arrivalDate,
      updated.arrivalTime,
      updated.duration,
      updated.aircraft,
      updated.terminal,
      updated.gate,
      updated.totalSeats,
      updated.availableSeats,
      updated.ticketPrice,
      updated.class,
      updated.status,
      fn,
    ]
  );

  // Update in AVL Tree
  flightAVL.insert(fn, updated);

  return res.json({
    message: `Flight ${fn} updated successfully.`,
    flight: updated,
  });
});

// Admin Delete Flight
apiRouter.delete("/flights/:flightNumber", (req: Request, res: Response) => {
  const { flightNumber } = req.params;
  const fn = flightNumber.toUpperCase();

  const flight = flightAVL.search(fn);
  if (!flight) {
    return res.status(404).json({ error: `Flight ${fn} not found.` });
  }

  // Check if active confirmed bookings exist
  const activeBookings = queryAll<DBBooking>(
    "SELECT * FROM bookings WHERE flightNumber = ? AND bookingStatus = 'CONFIRMED'",
    [fn]
  );

  if (activeBookings.length > 0) {
    return res.status(400).json({
      error: `Cannot delete flight ${fn}: ${activeBookings.length} confirmed booking(s) exist. Cancel bookings or mark flight CANCELLED instead.`,
    });
  }

  // Delete from SQLite
  execute("DELETE FROM flights WHERE flightNumber = ?", [fn]);
  execute("DELETE FROM waiting_list WHERE flightNumber = ?", [fn]);

  // Delete from Flight AVL Tree: O(log n)
  flightAVL.delete(fn);

  return res.json({
    message: `Flight ${fn} deleted from SQLite and removed from Flight AVL Tree.`,
  });
});

// Admin Change Status
apiRouter.patch("/flights/:flightNumber/status", (req: Request, res: Response) => {
  const { flightNumber } = req.params;
  const { status } = req.body;
  const fn = flightNumber.toUpperCase();

  const flight = flightAVL.search(fn);
  if (!flight) {
    return res.status(404).json({ error: "Flight not found" });
  }

  flight.status = status;
  execute("UPDATE flights SET status = ? WHERE flightNumber = ?", [status, fn]);
  flightAVL.insert(fn, flight);

  return res.json({
    message: `Flight ${fn} status changed to ${status}`,
    flight,
  });
});

// ==========================================
// 3. BOOKING SYSTEM & CANCELLATION (Uses Booking AVL & Binary Max-Heap Waiting List)
// ==========================================

// Create Flight Booking
apiRouter.post("/bookings", (req: Request, res: Response) => {
  const {
    flightNumber,
    passengerId,
    passengerName,
    seatNumber,
    class: bookingClass,
    contactEmail,
    contactPhone,
  } = req.body;

  const fn = (flightNumber || "").trim().toUpperCase();
  const flight = flightAVL.search(fn);

  if (!flight) {
    return res.status(404).json({ error: `Flight ${fn} not found.` });
  }

  if (flight.status === "CANCELLED" || flight.status === "DEPARTED") {
    return res.status(400).json({ error: `Cannot book flight ${fn}: Flight is ${flight.status}.` });
  }

  if (flight.availableSeats <= 0) {
    return res.status(400).json({
      error: `Flight ${fn} is fully booked. No available seats remaining.`,
      canJoinWaitingList: true,
    });
  }

  const seat = (seatNumber || "1A").trim().toUpperCase();

  // Check if seat is already occupied
  const existingSeatBooking = queryOne<DBBooking>(
    "SELECT * FROM bookings WHERE flightNumber = ? AND seatNumber = ? AND bookingStatus = 'CONFIRMED'",
    [fn, seat]
  );

  if (existingSeatBooking) {
    return res.status(400).json({
      error: `Seat ${seat} is already occupied on flight ${fn}. Please select an available seat.`,
    });
  }

  const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const ticketPrice = flight.ticketPrice;

  const newBooking: DBBooking = {
    bookingId,
    passengerId: passengerId || `PAS-${Math.floor(1000 + Math.random() * 9000)}`,
    flightNumber: fn,
    passengerName: passengerName || "Guest Passenger",
    bookingDate: now,
    seatNumber: seat,
    class: bookingClass || flight.class,
    ticketPrice,
    paymentStatus: "PAID",
    bookingStatus: "CONFIRMED",
  };

  // 1. Insert into SQLite bookings & revenue_logs
  execute(
    `INSERT INTO bookings (bookingId, passengerId, flightNumber, passengerName, bookingDate, seatNumber, class, ticketPrice, paymentStatus, bookingStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newBooking.bookingId,
      newBooking.passengerId,
      newBooking.flightNumber,
      newBooking.passengerName,
      newBooking.bookingDate,
      newBooking.seatNumber,
      newBooking.class,
      newBooking.ticketPrice,
      newBooking.paymentStatus,
      newBooking.bookingStatus,
    ]
  );

  execute(
    `INSERT INTO revenue_logs (id, bookingId, flightNumber, airline, amount, type, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [`REV-${bookingId}`, bookingId, fn, flight.airline, ticketPrice, "BOOKING", now]
  );

  // 2. Decrement available seats on flight
  flight.availableSeats = Math.max(0, flight.availableSeats - 1);
  execute("UPDATE flights SET availableSeats = ? WHERE flightNumber = ?", [flight.availableSeats, fn]);
  flightAVL.insert(fn, flight);

  // 3. Insert into Booking AVL Tree: O(log n)
  bookingAVL.insert(newBooking.bookingId, newBooking);

  return res.status(201).json({
    message: "Booking confirmed successfully!",
    booking: newBooking,
    flight,
    dsaSync: {
      bookingAVLInserted: true,
      flightAVLSeatsUpdated: flight.availableSeats,
    },
  });
});

// Get Bookings (All for Admin, or by Passenger ID)
apiRouter.get("/bookings", (req: Request, res: Response) => {
  const { passengerId, flightNumber, status } = req.query as { [key: string]: string };

  let bookings = bookingAVL.inorder();

  if (passengerId) {
    bookings = bookings.filter((b) => b.passengerId === passengerId);
  }

  if (flightNumber) {
    bookings = bookings.filter((b) => b.flightNumber.toUpperCase() === flightNumber.toUpperCase());
  }

  if (status && status !== "ALL") {
    bookings = bookings.filter((b) => b.bookingStatus === status);
  }

  // Enrich with flight details
  const enriched = bookings.map((b) => {
    const flight = flightAVL.search(b.flightNumber);
    return {
      ...b,
      flight,
    };
  });

  return res.json({
    count: enriched.length,
    bookings: enriched,
    dsaSource: "Booking AVL Tree",
  });
});

// Search Booking by Booking ID via Booking AVL: O(log n)
apiRouter.get("/bookings/:bookingId", (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const trace = bookingAVL.searchWithTrace(bookingId.toUpperCase());

  if (!trace.found || !trace.value) {
    return res.status(404).json({
      error: `Booking ${bookingId} not found in Booking AVL Tree.`,
      dsaTrace: trace,
    });
  }

  const flight = flightAVL.search(trace.value.flightNumber);
  const passenger = passengerAVL.search(trace.value.passengerId);

  return res.json({
    booking: trace.value,
    flight,
    passenger,
    dsaTrace: {
      structure: "Booking AVL Tree",
      timeComplexity: "O(log n)",
      steps: trace.steps,
      traversalPath: trace.path,
    },
  });
});

// Ticket Cancellation & Automatic Waiting List Promotion
apiRouter.post("/bookings/:bookingId/cancel", (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const bkId = bookingId.toUpperCase();
  const booking = bookingAVL.search(bkId);

  if (!booking) {
    return res.status(404).json({ error: `Booking ${bkId} not found.` });
  }

  if (booking.bookingStatus === "CANCELLED") {
    return res.status(400).json({ error: `Booking ${bkId} is already cancelled.` });
  }

  // 1. Mark booking as CANCELLED in SQLite and Booking AVL
  booking.bookingStatus = "CANCELLED";
  booking.paymentStatus = "REFUNDED";
  execute(
    "UPDATE bookings SET bookingStatus = 'CANCELLED', paymentStatus = 'REFUNDED' WHERE bookingId = ?",
    [bkId]
  );
  bookingAVL.insert(bkId, booking);

  // 2. Log refund in revenue_logs
  const flight = flightAVL.search(booking.flightNumber);
  const now = new Date().toISOString();
  execute(
    `INSERT INTO revenue_logs (id, bookingId, flightNumber, airline, amount, type, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [`REF-${bkId}`, bkId, booking.flightNumber, flight?.airline || "AirServe", -booking.ticketPrice, "REFUND", now]
  );

  const releasedSeat = booking.seatNumber;
  let autoPromotedPassenger: any = null;

  // 3. Check Waiting List for this flight via Binary Max-Heap Priority Queue!
  const waitingForFlight = waitingListHeap.getEntriesForFlight(booking.flightNumber);

  if (waitingForFlight.length > 0) {
    // High-priority waiting passenger exists!
    // Find highest priority for this specific flight
    // We dequeue top elements until we find the candidate for this flight
    const tempDequeued: any[] = [];
    let candidate: any = null;

    while (!waitingListHeap.isEmpty()) {
      const top = waitingListHeap.dequeue();
      if (!top) break;

      if (top.flightNumber === booking.flightNumber && top.status === "WAITING") {
        candidate = top;
        break;
      } else {
        tempDequeued.push(top);
      }
    }

    // Re-enqueue other dequeued items back to maintain heap
    for (const item of tempDequeued) {
      waitingListHeap.enqueue(item);
    }

    if (candidate) {
      // 4. Promote candidate: Allocate released seat, create new confirmed booking!
      const newPromotionBookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
      const promotedBooking: DBBooking = {
        bookingId: newPromotionBookingId,
        passengerId: candidate.passengerId,
        flightNumber: booking.flightNumber,
        passengerName: candidate.passengerName,
        bookingDate: now,
        seatNumber: releasedSeat,
        class: candidate.preferredClass || flight?.class || "Economy",
        ticketPrice: flight?.ticketPrice || 100,
        paymentStatus: "PAID",
        bookingStatus: "CONFIRMED",
      };

      // Update candidate waitlist status in SQLite
      execute("UPDATE waiting_list SET status = 'PROMOTED' WHERE id = ?", [candidate.id]);

      // Insert new promoted booking in SQLite & Booking AVL Tree
      execute(
        `INSERT INTO bookings (bookingId, passengerId, flightNumber, passengerName, bookingDate, seatNumber, class, ticketPrice, paymentStatus, bookingStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          promotedBooking.bookingId,
          promotedBooking.passengerId,
          promotedBooking.flightNumber,
          promotedBooking.passengerName,
          promotedBooking.bookingDate,
          promotedBooking.seatNumber,
          promotedBooking.class,
          promotedBooking.ticketPrice,
          promotedBooking.paymentStatus,
          promotedBooking.bookingStatus,
        ]
      );
      bookingAVL.insert(newPromotionBookingId, promotedBooking);

      // Log promotion revenue
      execute(
        `INSERT INTO revenue_logs (id, bookingId, flightNumber, airline, amount, type, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`REV-${newPromotionBookingId}`, newPromotionBookingId, booking.flightNumber, flight?.airline || "AirServe", promotedBooking.ticketPrice, "BOOKING", now]
      );

      autoPromotedPassenger = {
        waitlistId: candidate.id,
        passengerId: candidate.passengerId,
        passengerName: candidate.passengerName,
        priority: candidate.priority,
        priorityLabel: candidate.priorityLabel,
        allocatedSeat: releasedSeat,
        newBookingId: newPromotionBookingId,
      };
    }
  } else {
    // No waiting passengers: increment available seat on flight
    if (flight) {
      flight.availableSeats = Math.min(flight.totalSeats, flight.availableSeats + 1);
      execute("UPDATE flights SET availableSeats = ? WHERE flightNumber = ?", [flight.availableSeats, flight.flightNumber]);
      flightAVL.insert(flight.flightNumber, flight);
    }
  }

  return res.json({
    message: `Booking ${bkId} cancelled and refund processed.`,
    cancelledBooking: booking,
    seatReleased: releasedSeat,
    autoPromotedPassenger,
    dsaAction: autoPromotedPassenger
      ? "Auto-Promoted highest-priority passenger from Binary Max-Heap Priority Queue into released seat."
      : "No waiting list passengers. Available seats incremented in Flight AVL Tree.",
  });
});

// ==========================================
// 4. WAITING LIST SYSTEM (Custom Binary Max-Heap Priority Queue)
// ==========================================

apiRouter.get("/waiting-list", (req: Request, res: Response) => {
  const { flightNumber } = req.query as { [key: string]: string };

  let entries = waitingListHeap.display();
  if (flightNumber) {
    entries = entries.filter((e) => e.flightNumber.toUpperCase() === flightNumber.toUpperCase());
  }

  return res.json({
    count: entries.length,
    heapSize: waitingListHeap.size(),
    waitingList: entries,
    dsaSource: "Custom Binary Max-Heap Priority Queue",
  });
});

apiRouter.post("/waiting-list", (req: Request, res: Response) => {
  const {
    passengerId,
    passengerName,
    flightNumber,
    priority,
    priorityLabel,
    preferredClass,
    contactEmail,
    contactPhone,
  } = req.body;

  const fn = (flightNumber || "").trim().toUpperCase();
  const flight = flightAVL.search(fn);

  if (!flight) {
    return res.status(404).json({ error: `Flight ${fn} not found.` });
  }

  // Calculate priority score: VIP=100, Gold=75, Business=50, Standard=25
  let priorityScore = Number(priority) || 25;
  let label = priorityLabel || "Economy Standard";

  if (priorityLabel === "VIP Priority" || priorityScore >= 100) {
    priorityScore = 100;
    label = "VIP Priority";
  } else if (priorityLabel === "Gold Frequent Flyer" || priorityScore >= 75) {
    priorityScore = 75;
    label = "Gold Frequent Flyer";
  } else if (priorityLabel === "Business Class" || priorityScore >= 50) {
    priorityScore = 50;
    label = "Business Class";
  }

  const waitlistId = `WL-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();
  const timestamp = Date.now();

  const entry: DBWaitingList = {
    id: waitlistId,
    passengerId: passengerId || `PAS-${Math.floor(1000 + Math.random() * 9000)}`,
    passengerName: passengerName || "Passenger",
    flightNumber: fn,
    priority: priorityScore,
    priorityLabel: label,
    requestTime: now,
    timestamp,
    status: "WAITING",
    preferredClass: preferredClass || flight.class,
    contactEmail: contactEmail || "",
    contactPhone: contactPhone || "",
  };

  // 1. Insert into SQLite
  execute(
    `INSERT INTO waiting_list (id, passengerId, passengerName, flightNumber, priority, priorityLabel, requestTime, timestamp, status, preferredClass, contactEmail, contactPhone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.passengerId,
      entry.passengerName,
      entry.flightNumber,
      entry.priority,
      entry.priorityLabel,
      entry.requestTime,
      entry.timestamp,
      entry.status,
      entry.preferredClass,
      entry.contactEmail,
      entry.contactPhone,
    ]
  );

  // 2. Enqueue in Binary Max Heap Priority Queue: O(log n)
  waitingListHeap.enqueue(entry);

  const position = waitingListHeap.getPosition(entry.passengerId, fn);

  return res.status(201).json({
    message: "Added to priority waiting list!",
    waitlistEntry: entry,
    queuePosition: position,
    dsaAction: "Inserted into Binary Max-Heap with heapify_up() O(log n)",
  });
});

apiRouter.delete("/waiting-list/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  execute("UPDATE waiting_list SET status = 'CANCELLED' WHERE id = ?", [id]);
  const removed = waitingListHeap.removeById(id);

  return res.json({
    message: `Waiting list entry ${id} cancelled.`,
    removedFromHeap: removed,
  });
});

apiRouter.get("/waiting-list/position/:passengerId", (req: Request, res: Response) => {
  const { passengerId } = req.params;
  const { flightNumber } = req.query as { flightNumber?: string };

  const position = waitingListHeap.getPosition(passengerId, flightNumber);
  const entry = waitingListHeap.getHeapArray().find((e) => e.passengerId === passengerId);

  return res.json({
    passengerId,
    flightNumber: flightNumber || null,
    position,
    inQueue: position !== -1,
    entry: entry || null,
  });
});

// ==========================================
// 5. PASSENGER MANAGEMENT (Uses Passenger AVL Tree)
// ==========================================

apiRouter.get("/passengers", (req: Request, res: Response) => {
  const passengers = passengerAVL.inorder();
  return res.json({
    count: passengers.length,
    passengers,
    dsaSource: "Passenger AVL Tree (Inorder Traversal)",
  });
});

// Passenger search by Passenger ID via AVL: O(log n)
apiRouter.get("/passengers/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const trace = passengerAVL.searchWithTrace(id.toUpperCase());

  if (!trace.found || !trace.value) {
    return res.status(404).json({
      error: `Passenger ${id} not found in Passenger AVL Tree.`,
      dsaTrace: trace,
    });
  }

  // Get passenger bookings
  const bookings = queryAll<DBBooking>(
    "SELECT * FROM bookings WHERE passengerId = ? ORDER BY bookingDate DESC",
    [id.toUpperCase()]
  );

  return res.json({
    passenger: trace.value,
    bookings,
    dsaTrace: {
      structure: "Passenger AVL Tree",
      timeComplexity: "O(log n)",
      steps: trace.steps,
      traversalPath: trace.path,
    },
  });
});

// Admin Add Passenger
apiRouter.post("/passengers", (req: Request, res: Response) => {
  const { name, email, phone, passportNumber, nationality, tier, loyaltyPoints } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const id = `PAS-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newPassenger: DBPassenger = {
    id,
    userId: null,
    name: name.trim(),
    email: email.trim(),
    phone: phone || "",
    passportNumber: passportNumber || "P" + Math.floor(10000000 + Math.random() * 90000000),
    nationality: nationality || "International",
    tier: tier || "STANDARD",
    loyaltyPoints: Number(loyaltyPoints) || 0,
    createdAt: now,
  };

  execute(
    `INSERT INTO passengers (id, userId, name, email, phone, passportNumber, nationality, tier, loyaltyPoints, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newPassenger.id,
      newPassenger.userId,
      newPassenger.name,
      newPassenger.email,
      newPassenger.phone,
      newPassenger.passportNumber,
      newPassenger.nationality,
      newPassenger.tier,
      newPassenger.loyaltyPoints,
      newPassenger.createdAt,
    ]
  );

  passengerAVL.insert(id, newPassenger);

  return res.status(201).json({
    message: "Passenger created and inserted into Passenger AVL Tree.",
    passenger: newPassenger,
  });
});

// Admin Edit Passenger
apiRouter.put("/passengers/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const pId = id.toUpperCase();
  const existing = passengerAVL.search(pId);

  if (!existing) {
    return res.status(404).json({ error: `Passenger ${pId} not found.` });
  }

  const updated: DBPassenger = {
    ...existing,
    name: req.body.name ?? existing.name,
    email: req.body.email ?? existing.email,
    phone: req.body.phone ?? existing.phone,
    passportNumber: req.body.passportNumber ?? existing.passportNumber,
    nationality: req.body.nationality ?? existing.nationality,
    tier: req.body.tier ?? existing.tier,
    loyaltyPoints: Number(req.body.loyaltyPoints ?? existing.loyaltyPoints),
  };

  execute(
    `UPDATE passengers SET name = ?, email = ?, phone = ?, passportNumber = ?, nationality = ?, tier = ?, loyaltyPoints = ?
     WHERE id = ?`,
    [
      updated.name,
      updated.email,
      updated.phone,
      updated.passportNumber,
      updated.nationality,
      updated.tier,
      updated.loyaltyPoints,
      pId,
    ]
  );

  passengerAVL.insert(pId, updated);

  return res.json({
    message: `Passenger ${pId} updated in Passenger AVL Tree.`,
    passenger: updated,
  });
});

// Admin Delete Passenger
apiRouter.delete("/passengers/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const pId = id.toUpperCase();

  const existing = passengerAVL.search(pId);
  if (!existing) {
    return res.status(404).json({ error: `Passenger ${pId} not found.` });
  }

  const activeBookings = queryAll<DBBooking>(
    "SELECT * FROM bookings WHERE passengerId = ? AND bookingStatus = 'CONFIRMED'",
    [pId]
  );

  if (activeBookings.length > 0) {
    return res.status(400).json({
      error: `Cannot delete passenger: has ${activeBookings.length} confirmed booking(s). Cancel bookings first.`,
    });
  }

  execute("DELETE FROM passengers WHERE id = ?", [pId]);
  execute("DELETE FROM waiting_list WHERE passengerId = ?", [pId]);
  passengerAVL.delete(pId);

  return res.json({
    message: `Passenger ${pId} deleted from database and removed from Passenger AVL Tree.`,
  });
});

// ==========================================
// 6. AIRPORT NETWORK & DIJKSTRA SHORTEST PATH
// ==========================================

apiRouter.get("/network/airports", (req: Request, res: Response) => {
  const airports = airportGraph.getAllAirports();
  return res.json({
    count: airports.length,
    airports,
  });
});

apiRouter.get("/network/routes", (req: Request, res: Response) => {
  const routes = airportGraph.getAllRoutes();
  return res.json({
    count: routes.length,
    routes,
  });
});

// Dijkstra Shortest Path Search
apiRouter.post("/network/shortest-path", (req: Request, res: Response) => {
  const { source, destination, optimizeBy } = req.body;

  if (!source || !destination) {
    return res.status(400).json({ error: "Source and Destination airport codes are required." });
  }

  const result = airportGraph.findShortestPath(
    source.trim(),
    destination.trim(),
    optimizeBy === "cost" ? "cost" : "distance"
  );

  return res.json({
    result,
    dsaAlgorithm: "Dijkstra's Shortest Path Algorithm (Manual Implementation)",
    timeComplexity: "O((V + E) log V)",
  });
});

// Add Airport
apiRouter.post("/network/airports", (req: Request, res: Response) => {
  const { code, name, city, country, lat, lng, terminals } = req.body;
  const ucCode = (code || "").trim().toUpperCase();

  if (!ucCode || !name || !city || !country) {
    return res.status(400).json({ error: "Airport Code, Name, City, and Country are required." });
  }

  if (airportGraph.getAirport(ucCode)) {
    return res.status(400).json({ error: `Airport ${ucCode} already exists.` });
  }

  const airport = {
    code: ucCode,
    name: name.trim(),
    city: city.trim(),
    country: country.trim(),
    lat: Number(lat) || 0,
    lng: Number(lng) || 0,
    terminals: Number(terminals) || 1,
  };

  execute(
    "INSERT INTO airports (code, name, city, country, lat, lng, terminals) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [airport.code, airport.name, airport.city, airport.country, airport.lat, airport.lng, airport.terminals]
  );

  airportGraph.addAirport(airport);

  return res.status(201).json({
    message: `Airport ${ucCode} added to Airport Graph.`,
    airport,
  });
});

// Add Route Edge
apiRouter.post("/network/routes", (req: Request, res: Response) => {
  const { source, destination, distanceKm, baseCost, durationMinutes, airlines } = req.body;
  const src = (source || "").trim().toUpperCase();
  const dest = (destination || "").trim().toUpperCase();

  if (!src || !dest || !distanceKm || !baseCost) {
    return res.status(400).json({ error: "Source, Destination, Distance, and Base Cost are required." });
  }

  const id = `${src}-${dest}`;
  const airlinesList = Array.isArray(airlines) ? airlines : [airlines || "AirServe"];

  execute(
    `INSERT INTO routes (id, source, destination, distanceKm, baseCost, durationMinutes, airlines)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, src, dest, Number(distanceKm), Number(baseCost), Number(durationMinutes || 90), JSON.stringify(airlinesList)]
  );

  airportGraph.addRoute({
    id,
    source: src,
    destination: dest,
    distanceKm: Number(distanceKm),
    baseCost: Number(baseCost),
    durationMinutes: Number(durationMinutes || 90),
    airlines: airlinesList,
  });

  return res.status(201).json({
    message: `Route ${src} <-> ${dest} added to Airport Graph.`,
  });
});

// Remove Airport
apiRouter.delete("/network/airports/:code", (req: Request, res: Response) => {
  const { code } = req.params;
  const ucCode = code.toUpperCase();

  execute("DELETE FROM airports WHERE code = ?", [ucCode]);
  execute("DELETE FROM routes WHERE source = ? OR destination = ?", [ucCode, ucCode]);
  airportGraph.removeAirport(ucCode);

  return res.json({
    message: `Airport ${ucCode} and connecting routes removed from Graph.`,
  });
});

// ==========================================
// 7. REVENUE ANALYSIS & ADMIN ANALYTICS
// ==========================================

apiRouter.get("/analytics", (req: Request, res: Response) => {
  const flights = flightAVL.inorder();
  const bookings = bookingAVL.inorder();
  const passengers = passengerAVL.inorder();
  const waitingList = waitingListHeap.display();

  const confirmedBookings = bookings.filter((b) => b.bookingStatus === "CONFIRMED");
  const cancelledBookings = bookings.filter((b) => b.bookingStatus === "CANCELLED");

  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.ticketPrice, 0);
  const avgTicketPrice = confirmedBookings.length > 0 ? totalRevenue / confirmedBookings.length : 0;

  const totalSeats = flights.reduce((sum, f) => sum + f.totalSeats, 0);
  const availableSeats = flights.reduce((sum, f) => sum + f.availableSeats, 0);
  const occupiedSeats = totalSeats - availableSeats;
  const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;

  // Revenue by airline
  const revenueByAirline: { [airline: string]: number } = {};
  for (const b of confirmedBookings) {
    const flight = flightAVL.search(b.flightNumber);
    const airline = flight ? flight.airline : "AirServe Express";
    revenueByAirline[airline] = (revenueByAirline[airline] || 0) + b.ticketPrice;
  }

  // Revenue by flight
  const revenueByFlight: { [flight: string]: number } = {};
  for (const b of confirmedBookings) {
    revenueByFlight[b.flightNumber] = (revenueByFlight[b.flightNumber] || 0) + b.ticketPrice;
  }

  // Revenue by class
  const revenueByClass: { [cls: string]: number } = {
    Economy: 0,
    Business: 0,
    "First Class": 0,
  };
  for (const b of confirmedBookings) {
    revenueByClass[b.class] = (revenueByClass[b.class] || 0) + b.ticketPrice;
  }

  // Flight occupancy list
  const flightOccupancy = flights.map((f) => ({
    flightNumber: f.flightNumber,
    route: `${f.sourceAirport} -> ${f.destinationAirport}`,
    airline: f.airline,
    totalSeats: f.totalSeats,
    availableSeats: f.availableSeats,
    occupiedSeats: f.totalSeats - f.availableSeats,
    occupancyPercent: Math.round(((f.totalSeats - f.availableSeats) / f.totalSeats) * 100),
    status: f.status,
    ticketPrice: f.ticketPrice,
    revenue: (f.totalSeats - f.availableSeats) * f.ticketPrice,
  }));

  // Revenue logs timeline
  const revenueLogs = queryAll("SELECT * FROM revenue_logs ORDER BY timestamp DESC LIMIT 20");

  return res.json({
    kpis: {
      totalFlights: flights.length,
      totalPassengers: passengers.length,
      totalBookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      cancelledBookings: cancelledBookings.length,
      waitingListCount: waitingList.length,
      totalRevenue,
      avgTicketPrice: Math.round(avgTicketPrice),
      totalSeats,
      availableSeats,
      occupiedSeats,
      occupancyRate: Math.round(occupancyRate),
    },
    revenueByAirline: Object.entries(revenueByAirline).map(([airline, revenue]) => ({ airline, revenue })),
    revenueByFlight: Object.entries(revenueByFlight).map(([flightNumber, revenue]) => ({ flightNumber, revenue })),
    revenueByClass: Object.entries(revenueByClass).map(([className, revenue]) => ({ class: className, revenue })),
    flightOccupancy,
    revenueLogs,
  });
});

// ==========================================
// 8. DSA VISUALIZATION CENTER ENDPOINTS
// ==========================================

apiRouter.get("/dsa/summary", (req: Request, res: Response) => {
  return res.json({
    structures: [
      {
        name: "Flight AVL Tree",
        key: "flightNumber",
        type: "Self-Balancing Binary Search Tree (AVL)",
        size: flightAVL.size,
        height: flightAVL.root ? flightAVL.root.height : 0,
        timeComplexity: "Search: O(log n), Insert: O(log n), Delete: O(log n), Rotation: O(1)",
        spaceComplexity: "O(n)",
        activeUsage: "Primary index for all flight searches, scheduling, and seat lookups.",
      },
      {
        name: "Passenger AVL Tree",
        key: "passengerId",
        type: "Self-Balancing Binary Search Tree (AVL)",
        size: passengerAVL.size,
        height: passengerAVL.root ? passengerAVL.root.height : 0,
        timeComplexity: "Search: O(log n), Insert: O(log n), Delete: O(log n), Rotation: O(1)",
        spaceComplexity: "O(n)",
        activeUsage: "Primary index for passenger profile retrieval and history management.",
      },
      {
        name: "Booking AVL Tree",
        key: "bookingId",
        type: "Self-Balancing Binary Search Tree (AVL)",
        size: bookingAVL.size,
        height: bookingAVL.root ? bookingAVL.root.height : 0,
        timeComplexity: "Search: O(log n), Insert: O(log n), Delete: O(log n), Rotation: O(1)",
        spaceComplexity: "O(n)",
        activeUsage: "Fast booking ID verification, boarding pass generator, and cancellation lookup.",
      },
      {
        name: "Waiting List Binary Max-Heap",
        key: "priority + timestamp",
        type: "Priority Queue (Array-based Binary Max Heap)",
        size: waitingListHeap.size(),
        timeComplexity: "Enqueue: O(log n), Dequeue: O(log n), Peek: O(1)",
        spaceComplexity: "O(n)",
        activeUsage: "Automatic priority promotion when flight seats are cancelled.",
      },
      {
        name: "User Authentication Hash Table",
        key: "username",
        type: "Hash Table with Separate Chaining",
        size: userHashTable.getSize(),
        capacity: userHashTable.getCapacity(),
        loadFactor: userHashTable.getLoadFactor(),
        timeComplexity: "Search: O(1) avg, Insert: O(1) avg, Delete: O(1) avg",
        spaceComplexity: "O(capacity + n)",
        activeUsage: "Real-time user authentication and role-based credential verification.",
      },
      {
        name: "Airport Network Graph",
        key: "airport code",
        type: "Adjacency List Directed/Undirected Weighted Graph",
        vertices: airportGraph.getAllAirports().length,
        edges: airportGraph.getAllRoutes().length,
        timeComplexity: "Dijkstra Shortest Path: O((V + E) log V)",
        spaceComplexity: "O(V + E)",
        activeUsage: "Airport interconnectivity, shortest path calculation, and flight routing.",
      },
    ],
  });
});

apiRouter.get("/dsa/flight-avl", (req: Request, res: Response) => {
  return res.json(flightAVL.serializeForViz());
});

apiRouter.post("/dsa/flight-avl/insert", (req: Request, res: Response) => {
  const { flightNumber, airline, sourceAirport, destinationAirport, ticketPrice } = req.body;
  const fn = (flightNumber || `AS-${Math.floor(100 + Math.random() * 900)}`).toUpperCase();
  const newFlight: DBFlight = {
    flightNumber: fn,
    airline: airline || "AirServe Express",
    sourceAirport: (sourceAirport || "HYD").toUpperCase(),
    destinationAirport: (destinationAirport || "DEL").toUpperCase(),
    departureDate: "2026-09-05",
    departureTime: "10:30",
    arrivalDate: "2026-09-05",
    arrivalTime: "12:45",
    duration: "2h 15m",
    aircraft: "Airbus A320neo",
    terminal: "T2",
    gate: "G4",
    totalSeats: 180,
    availableSeats: 45,
    ticketPrice: Number(ticketPrice) || 280,
    class: "Economy",
    status: "SCHEDULED",
  };
  flightAVL.insert(fn, newFlight);
  return res.json({
    message: `Flight ${fn} inserted into Flight AVL Tree in O(log n) time.`,
    tree: flightAVL.serializeForViz(),
  });
});

apiRouter.delete("/dsa/flight-avl/delete/:flightNumber", (req: Request, res: Response) => {
  const { flightNumber } = req.params;
  const fn = flightNumber.toUpperCase();
  const deleted = flightAVL.delete(fn);
  return res.json({
    success: deleted,
    message: deleted ? `Flight ${fn} deleted from Flight AVL Tree.` : `Flight ${fn} not found.`,
    tree: flightAVL.serializeForViz(),
  });
});

apiRouter.get("/dsa/passenger-avl", (req: Request, res: Response) => {
  return res.json(passengerAVL.serializeForViz());
});

apiRouter.post("/dsa/passenger-avl/insert", (req: Request, res: Response) => {
  const { id, name, email, tier, loyaltyPoints } = req.body;
  const pId = (id || `PAS-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
  const passenger: DBPassenger = {
    id: pId,
    userId: null,
    name: name || "Demo Passenger",
    email: email || `${pId.toLowerCase()}@airline.com`,
    phone: "+1-555-0199",
    passportNumber: "P" + Math.floor(10000000 + Math.random() * 90000000),
    nationality: "International",
    tier: tier || "STANDARD",
    loyaltyPoints: Number(loyaltyPoints) || 500,
    createdAt: new Date().toISOString(),
  };
  passengerAVL.insert(pId, passenger);
  return res.json({
    message: `Passenger ${pId} inserted into Passenger AVL Tree in O(log n) time.`,
    tree: passengerAVL.serializeForViz(),
  });
});

apiRouter.delete("/dsa/passenger-avl/delete/:passengerId", (req: Request, res: Response) => {
  const { passengerId } = req.params;
  const pId = passengerId.toUpperCase();
  const deleted = passengerAVL.delete(pId);
  return res.json({
    success: deleted,
    message: deleted ? `Passenger ${pId} deleted from Passenger AVL Tree.` : `Passenger ${pId} not found.`,
    tree: passengerAVL.serializeForViz(),
  });
});

apiRouter.get("/dsa/booking-avl", (req: Request, res: Response) => {
  return res.json(bookingAVL.serializeForViz());
});

apiRouter.post("/dsa/booking-avl/insert", (req: Request, res: Response) => {
  const { bookingId, flightNumber, passengerName, seatNumber, ticketPrice } = req.body;
  const bkId = (bookingId || `BK-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
  const booking: DBBooking = {
    bookingId: bkId,
    passengerId: `PAS-${Math.floor(1000 + Math.random() * 9000)}`,
    flightNumber: (flightNumber || "AS-101").toUpperCase(),
    passengerName: passengerName || "Test Passenger",
    bookingDate: new Date().toISOString(),
    seatNumber: (seatNumber || "12B").toUpperCase(),
    class: "Economy",
    ticketPrice: Number(ticketPrice) || 250,
    paymentStatus: "PAID",
    bookingStatus: "CONFIRMED",
  };
  bookingAVL.insert(bkId, booking);
  return res.json({
    message: `Booking ${bkId} inserted into Booking AVL Tree in O(log n) time.`,
    tree: bookingAVL.serializeForViz(),
  });
});

apiRouter.delete("/dsa/booking-avl/delete/:bookingId", (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const bkId = bookingId.toUpperCase();
  const deleted = bookingAVL.delete(bkId);
  return res.json({
    success: deleted,
    message: deleted ? `Booking ${bkId} deleted from Booking AVL Tree.` : `Booking ${bkId} not found.`,
    tree: bookingAVL.serializeForViz(),
  });
});

apiRouter.get("/dsa/priority-queue", (req: Request, res: Response) => {
  return res.json(waitingListHeap.serializeForViz());
});

apiRouter.post("/dsa/priority-queue/enqueue", (req: Request, res: Response) => {
  const { passengerName, flightNumber, priority, priorityLabel } = req.body;
  const id = `WL-${Math.floor(1000 + Math.random() * 9000)}`;
  const prio = Number(priority) || 50;
  const entry = {
    id,
    passengerId: `PAS-${Math.floor(1000 + Math.random() * 9000)}`,
    passengerName: passengerName || "Waitlist Passenger",
    flightNumber: (flightNumber || "AS-101").toUpperCase(),
    priority: prio,
    priorityLabel: priorityLabel || (prio >= 100 ? "VIP Platinum" : prio >= 75 ? "Gold Frequent Flyer" : prio >= 50 ? "Business" : "Standard Economy"),
    requestTime: new Date().toISOString(),
    timestamp: Date.now(),
    status: "WAITING" as const,
  };
  waitingListHeap.enqueue(entry);
  return res.json({
    message: `Passenger ${entry.passengerName} (Priority: ${entry.priority}) enqueued to Binary Max-Heap in O(log n) time.`,
    entry,
    heap: waitingListHeap.serializeForViz(),
  });
});

apiRouter.post("/dsa/priority-queue/dequeue", (req: Request, res: Response) => {
  const dequeued = waitingListHeap.dequeue();
  return res.json({
    message: dequeued
      ? `Dequeued Max Priority element: ${dequeued.passengerName} (Priority: ${dequeued.priority}) in O(log n) time.`
      : "Binary Max-Heap is currently empty.",
    dequeued,
    heap: waitingListHeap.serializeForViz(),
  });
});

apiRouter.post("/dsa/priority-queue/clear", (req: Request, res: Response) => {
  waitingListHeap.clear();
  return res.json({
    message: "Binary Max-Heap Priority Queue cleared.",
    heap: waitingListHeap.serializeForViz(),
  });
});

apiRouter.get("/dsa/hash-table", (req: Request, res: Response) => {
  return res.json(userHashTable.serializeForViz());
});

apiRouter.post("/dsa/hash-table/insert", (req: Request, res: Response) => {
  const { username, name, role } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }
  const un = username.trim();
  const dummyUser: any = {
    id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
    username: un,
    passwordHash: "$2a$10$dummyHashValue",
    role: role || "PASSENGER",
    name: name || un,
    email: `${un}@airline.com`,
    phone: "+1-555-0123",
    passengerId: `PAS-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
  };
  userHashTable.insert(un, dummyUser);
  const trace = userHashTable.searchWithTrace(un);
  return res.json({
    message: `Key '${un}' inserted into Hash Table bucket [${trace.hashIndex}] in O(1) average time.`,
    trace,
    table: userHashTable.serializeForViz(),
  });
});

apiRouter.delete("/dsa/hash-table/delete/:key", (req: Request, res: Response) => {
  const { key } = req.params;
  const deleted = userHashTable.delete(key.trim());
  return res.json({
    success: deleted,
    message: deleted ? `Key '${key}' deleted from Hash Table in O(1) average time.` : `Key '${key}' not found in Hash Table.`,
    table: userHashTable.serializeForViz(),
  });
});

apiRouter.post("/dsa/hash-table/search", (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: "Key is required" });
  const trace = userHashTable.searchWithTrace(key.trim());
  return res.json({
    trace,
    table: userHashTable.serializeForViz(),
  });
});

apiRouter.get("/dsa/graph", (req: Request, res: Response) => {
  return res.json(airportGraph.serializeForViz());
});

apiRouter.post("/dsa/graph/insert-vertex", (req: Request, res: Response) => {
  const { code, name, city, country, lat, lng } = req.body;
  const ucCode = (code || "").trim().toUpperCase();
  if (!ucCode || !city) {
    return res.status(400).json({ error: "Airport Code and City are required." });
  }
  const vertex = {
    code: ucCode,
    name: name || `${city} International Airport`,
    city,
    country: country || "Global",
    lat: Number(lat) || 20.0,
    lng: Number(lng) || 75.0,
    terminals: 2,
  };
  airportGraph.addAirport(vertex);
  return res.json({
    message: `Vertex '${ucCode}' added to Adjacency List Graph.`,
    graph: airportGraph.serializeForViz(),
  });
});

apiRouter.post("/dsa/graph/insert-edge", (req: Request, res: Response) => {
  const { source, destination, distanceKm, baseCost, durationMinutes } = req.body;
  const src = (source || "").trim().toUpperCase();
  const dest = (destination || "").trim().toUpperCase();
  if (!src || !dest) {
    return res.status(400).json({ error: "Source and Destination airport codes are required." });
  }
  airportGraph.addRoute({
    id: `${src}-${dest}`,
    source: src,
    destination: dest,
    distanceKm: Number(distanceKm) || 1200,
    baseCost: Number(baseCost) || 180,
    durationMinutes: Number(durationMinutes) || 110,
    airlines: ["AirServe Express"],
  }, true);
  return res.json({
    message: `Undirected Edge '${src} <-> ${dest}' added to Graph.`,
    graph: airportGraph.serializeForViz(),
  });
});

apiRouter.delete("/dsa/graph/vertex/:code", (req: Request, res: Response) => {
  const { code } = req.params;
  const ucCode = code.toUpperCase();
  const deleted = airportGraph.removeAirport(ucCode);
  return res.json({
    success: deleted,
    message: deleted ? `Vertex '${ucCode}' and incident edges removed from Graph.` : `Vertex '${ucCode}' not found.`,
    graph: airportGraph.serializeForViz(),
  });
});

// Rebuild DSA from SQLite trigger
apiRouter.post("/dsa/rebuild", (req: Request, res: Response) => {
  const result = rebuildAllDSAFromDB();
  return res.json({
    message: "All Custom Data Structures rebuilt from SQLite database successfully!",
    stats: result,
  });
});
