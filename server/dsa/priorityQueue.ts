/**
 * Custom Priority Queue implemented via a Binary Max-Heap.
 * Used for the Flight Waiting List management system.
 * Higher priority score is dequeued first.
 * On tie, earlier request timestamp is dequeued first.
 * Complexity:
 *   enqueue: O(log n)
 *   dequeue: O(log n)
 *   peek: O(1)
 */

export interface WaitingListEntry {
  id: string; // Waitlist ticket ID
  passengerId: string;
  passengerName: string;
  flightNumber: string;
  priority: number; // e.g. VIP=100, Frequent Flyer Gold=75, Business=50, Economy=25
  priorityLabel: string; // "VIP", "Gold Member", "Business", "Standard"
  requestTime: string; // ISO string
  timestamp: number; // Unix ms for exact comparison
  status: "WAITING" | "PROMOTED" | "CANCELLED";
  preferredClass?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export class PriorityQueue {
  private heap: WaitingListEntry[] = [];
  public queueName: string;

  constructor(queueName: string = "Flight Waiting List Queue") {
    this.queueName = queueName;
  }

  // Get index helpers
  private parentIndex(i: number): number {
    return Math.floor((i - 1) / 2);
  }

  private leftChildIndex(i: number): number {
    return 2 * i + 1;
  }

  private rightChildIndex(i: number): number {
    return 2 * i + 2;
  }

  // Comparison logic: returns true if item A has strictly higher priority than item B
  private isHigherPriority(a: WaitingListEntry, b: WaitingListEntry): boolean {
    if (a.priority !== b.priority) {
      return a.priority > b.priority;
    }
    // Tie-breaker: earlier request time has higher priority (smaller timestamp)
    return a.timestamp < b.timestamp;
  }

  // Swap two elements in the heap
  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  // Heapify Up: restore heap invariant after inserting at the end
  public heapify_up(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = this.parentIndex(current);
      if (this.isHigherPriority(this.heap[current], this.heap[parent])) {
        this.swap(current, parent);
        current = parent;
      } else {
        break;
      }
    }
  }

  // Heapify Down: restore heap invariant after removing root
  public heapify_down(index: number): void {
    let current = index;
    const length = this.heap.length;

    while (this.leftChildIndex(current) < length) {
      let largest = current;
      const left = this.leftChildIndex(current);
      const right = this.rightChildIndex(current);

      if (left < length && this.isHigherPriority(this.heap[left], this.heap[largest])) {
        largest = left;
      }

      if (right < length && this.isHigherPriority(this.heap[right], this.heap[largest])) {
        largest = right;
      }

      if (largest !== current) {
        this.swap(current, largest);
        current = largest;
      } else {
        break;
      }
    }
  }

  // Enqueue new waiting passenger: O(log n)
  public enqueue(entry: WaitingListEntry): void {
    if (!entry.timestamp) {
      entry.timestamp = new Date(entry.requestTime || Date.now()).getTime();
    }
    this.heap.push(entry);
    this.heapify_up(this.heap.length - 1);
  }

  // Dequeue highest-priority passenger: O(log n)
  public dequeue(): WaitingListEntry | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop()!;

    const root = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.heapify_down(0);
    return root;
  }

  // Peek highest-priority passenger: O(1)
  public peek(): WaitingListEntry | null {
    if (this.heap.length === 0) return null;
    return this.heap[0];
  }

  // Remove by ID
  public removeById(id: string): boolean {
    const index = this.heap.findIndex((e) => e.id === id);
    if (index === -1) return false;

    if (index === this.heap.length - 1) {
      this.heap.pop();
      return true;
    }

    this.heap[index] = this.heap.pop()!;
    this.heapify_down(index);
    this.heapify_up(index);
    return true;
  }

  // Get position in queue (1-based index in priority order)
  public getPosition(passengerId: string, flightNumber?: string): number {
    const sorted = [...this.heap]
      .filter((e) => !flightNumber || e.flightNumber === flightNumber)
      .sort((a, b) => (this.isHigherPriority(a, b) ? -1 : 1));
    const idx = sorted.findIndex((e) => e.passengerId === passengerId);
    return idx >= 0 ? idx + 1 : -1;
  }

  // Filter entries for specific flight
  public getEntriesForFlight(flightNumber: string): WaitingListEntry[] {
    return [...this.heap]
      .filter((e) => e.flightNumber === flightNumber)
      .sort((a, b) => (this.isHigherPriority(a, b) ? -1 : 1));
  }

  // Display all entries in sorted priority order
  public display(): WaitingListEntry[] {
    return [...this.heap].sort((a, b) => (this.isHigherPriority(a, b) ? -1 : 1));
  }

  // Raw heap array
  public getHeapArray(): WaitingListEntry[] {
    return [...this.heap];
  }

  public size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public clear(): void {
    this.heap = [];
  }

  // Serialization for interactive visualization
  public serializeForViz(): any {
    return {
      queueName: this.queueName,
      size: this.heap.length,
      heapArray: this.heap.map((item, idx) => ({
        index: idx,
        id: item.id,
        passengerId: item.passengerId,
        passengerName: item.passengerName,
        flightNumber: item.flightNumber,
        priority: item.priority,
        priorityLabel: item.priorityLabel,
        requestTime: item.requestTime,
        parentIndex: idx > 0 ? this.parentIndex(idx) : null,
        leftIndex: this.leftChildIndex(idx) < this.heap.length ? this.leftChildIndex(idx) : null,
        rightIndex: this.rightChildIndex(idx) < this.heap.length ? this.rightChildIndex(idx) : null,
      })),
      sortedOrder: this.display(),
    };
  }
}
