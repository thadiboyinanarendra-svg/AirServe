import React from "react";
import {
  Plane,
  Download,
  Printer,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Booking, Flight } from "../types/index.ts";

interface DigitalBoardingPassProps {
  booking: Booking;
  flight?: Flight;
  onClose?: () => void;
}

export const DigitalBoardingPass: React.FC<DigitalBoardingPassProps> = ({
  booking,
  flight,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const airlineName = flight?.airline || "AirServe Express";
  const source = flight?.sourceAirport || "HYD";
  const destination = flight?.destinationAirport || "DEL";
  const departureTime = flight?.departureTime || "06:30";
  const arrivalTime = flight?.arrivalTime || "08:45";
  const departureDate = flight?.departureDate || "2026-09-02";
  const gate = flight?.gate || "G12";
  const terminal = flight?.terminal || "T1";
  const aircraft = flight?.aircraft || "Boeing 787-9 Dreamliner";
  const seat = booking.seatNumber || "1A";
  const bookingClass = booking.class || "Economy";

  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl text-slate-100 font-sans print:border-none print:shadow-none print:bg-white print:text-black">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-slate-800/80 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition print:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Header Accent Bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-6 py-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
            <Plane className="h-5 w-5 text-white transform -rotate-45" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
              BOARDING PASS & E-TICKET
            </span>
            <h3 className="text-xl font-black tracking-tight text-white">{airlineName}</h3>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {bookingClass}
          </span>
          <div className="text-[11px] font-mono text-cyan-100 mt-1">
            ETKT: {booking.bookingId}
          </div>
        </div>
      </div>

      {/* Main Body with Perforation layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 print:divide-black/20">
        {/* Left 2 Cols: Flight Route & Passenger Meta */}
        <div className="p-6 sm:p-8 md:col-span-2 space-y-6">
          {/* Passenger & Flight Banner */}
          <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                PASSENGER NAME
              </span>
              <p className="text-lg font-bold text-white tracking-wide uppercase">
                {booking.passengerName}
              </p>
              <span className="text-xs font-mono text-cyan-400">ID: {booking.passengerId}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                FLIGHT NUMBER
              </span>
              <p className="text-xl font-black font-mono text-cyan-400 tracking-wider">
                {booking.flightNumber}
              </p>
              <span className="text-xs text-slate-400">{aircraft}</span>
            </div>
          </div>

          {/* Route Visualizer */}
          <div className="rounded-2xl bg-slate-950/70 p-5 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-black font-mono tracking-tight text-white">
                  {source}
                </span>
                <p className="text-xs text-slate-400 font-medium">Departure Airport</p>
                <div className="mt-2 flex items-center space-x-1.5 text-sm font-semibold text-slate-200">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span>{departureTime}</span>
                </div>
              </div>

              {/* Center flight arc */}
              <div className="flex flex-col items-center px-4 flex-1">
                <span className="text-[10px] font-mono text-slate-400 mb-1">
                  {flight?.duration || "2h 15m"} • NON-STOP
                </span>
                <div className="relative w-full flex items-center justify-center">
                  <div className="h-[2px] w-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500"></div>
                  <Plane className="absolute h-5 w-5 text-cyan-400 transform rotate-90" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mt-1">
                  AVL Tree Verified
                </span>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black font-mono tracking-tight text-white">
                  {destination}
                </span>
                <p className="text-xs text-slate-400 font-medium">Arrival Airport</p>
                <div className="mt-2 flex items-center justify-end space-x-1.5 text-sm font-semibold text-slate-200">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span>{arrivalTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gate, Terminal, Boarding Details Grid */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
              <span className="text-[10px] font-bold uppercase text-slate-400">DATE</span>
              <p className="text-xs font-bold text-white font-mono mt-0.5">{departureDate}</p>
            </div>
            <div className="rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
              <span className="text-[10px] font-bold uppercase text-slate-400">TERMINAL</span>
              <p className="text-sm font-black text-cyan-400 font-mono mt-0.5">{terminal}</p>
            </div>
            <div className="rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
              <span className="text-[10px] font-bold uppercase text-slate-400">GATE</span>
              <p className="text-sm font-black text-cyan-400 font-mono mt-0.5">{gate}</p>
            </div>
            <div className="rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
              <span className="text-[10px] font-bold uppercase text-slate-400">SEAT</span>
              <p className="text-sm font-black text-amber-400 font-mono mt-0.5">{seat}</p>
            </div>
          </div>

          {/* Barcode Visual */}
          <div className="pt-2 border-t border-slate-800/60">
            <div className="h-10 w-full bg-slate-950 rounded flex items-center justify-center space-x-1 overflow-hidden px-4">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full ${i % 3 === 0 ? "w-1 bg-white" : i % 5 === 0 ? "w-1.5 bg-white" : "w-0.5 bg-slate-400"}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>AIRSERVE•SEQ•{booking.bookingId}</span>
              <span>ELECTRONIC SECURITY SEAL #{booking.flightNumber}-{booking.seatNumber}</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Tear-off Boarding Stub */}
        <div className="p-6 sm:p-8 bg-slate-950/60 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                BOARDING STUB
              </span>
              <h4 className="text-base font-bold text-white mt-0.5">{booking.passengerName}</h4>
              <p className="text-xs font-mono text-cyan-400 font-bold">{booking.flightNumber}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">From / To:</span>
                <span className="font-mono font-bold text-white">{source} → {destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-mono text-white">{departureDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Seat:</span>
                <span className="font-mono font-black text-amber-400 text-sm">{seat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Class:</span>
                <span className="text-white font-medium">{bookingClass}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400 uppercase">{booking.bookingStatus}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl text-black">
              <QrCode className="h-20 w-20 text-slate-900" />
              <span className="text-[9px] font-mono font-bold mt-1 tracking-wider text-slate-700">
                {booking.bookingId}
              </span>
            </div>
          </div>

          {/* Print / Download Controls */}
          <div className="flex space-x-2 print:hidden pt-2">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 transition shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-3 py-2 text-xs font-bold text-white hover:from-indigo-500 hover:to-cyan-500 transition shadow-lg shadow-indigo-600/20"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
