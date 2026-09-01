/**
 * Custom Hash Table with Separate Chaining for Collision Resolution.
 * Used for instant O(1) average lookup for Users & Authentication credentials.
 * Implements polynomial rolling hash function, dynamic rehashing on load factor threshold,
 * collision tracking, and bucket structure inspection for visualization.
 */

export interface HashEntry<V = any> {
  key: string;
  value: V;
  hash: number;
}

export class HashTable<V = any> {
  private capacity: number;
  private size: number = 0;
  private buckets: HashEntry<V>[][];
  private totalCollisions: number = 0;
  private tableName: string;

  constructor(capacity: number = 31, tableName: string = "Auth User Hash Table") {
    this.capacity = capacity;
    this.tableName = tableName;
    this.buckets = Array.from({ length: capacity }, () => []);
  }

  // Custom polynomial rolling hash function
  private hashFunction(key: string): number {
    let hash = 0;
    const PRIME = 31;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * PRIME + key.charCodeAt(i)) >>> 0; // unsigned 32-bit integer
    }
    return hash % this.capacity;
  }

  // Insert or update key-value
  public insert(key: string, value: V): { index: number; collided: boolean } {
    // Check load factor and rehash if > 0.75
    if (this.size / this.capacity > 0.75) {
      this.rehash(this.capacity * 2 + 1);
    }

    const index = this.hashFunction(key);
    const bucket = this.buckets[index];

    // Check if key already exists
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].key === key) {
        bucket[i].value = value;
        return { index, collided: false };
      }
    }

    const collided = bucket.length > 0;
    if (collided) {
      this.totalCollisions++;
    }

    bucket.push({ key, value, hash: index });
    this.size++;
    return { index, collided };
  }

  // Search by key: O(1) average
  public search(key: string): V | null {
    const index = this.hashFunction(key);
    const bucket = this.buckets[index];
    for (const entry of bucket) {
      if (entry.key === key) {
        return entry.value;
      }
    }
    return null;
  }

  // Search with inspection trace for visualization
  public searchWithTrace(key: string): {
    found: boolean;
    value: V | null;
    hashIndex: number;
    chainComparisons: number;
  } {
    const hashIndex = this.hashFunction(key);
    const bucket = this.buckets[hashIndex];
    let comparisons = 0;

    for (const entry of bucket) {
      comparisons++;
      if (entry.key === key) {
        return { found: true, value: entry.value, hashIndex, chainComparisons: comparisons };
      }
    }
    return { found: false, value: null, hashIndex, chainComparisons: comparisons };
  }

  // Delete key
  public delete(key: string): boolean {
    const index = this.hashFunction(key);
    const bucket = this.buckets[index];
    const itemIndex = bucket.findIndex((e) => e.key === key);

    if (itemIndex !== -1) {
      bucket.splice(itemIndex, 1);
      this.size--;
      return true;
    }
    return false;
  }

  // Rehash to resize table
  private rehash(newCapacity: number): void {
    const oldBuckets = this.buckets;
    this.capacity = newCapacity;
    this.buckets = Array.from({ length: newCapacity }, () => []);
    this.size = 0;
    this.totalCollisions = 0;

    for (const bucket of oldBuckets) {
      for (const entry of bucket) {
        this.insert(entry.key, entry.value);
      }
    }
  }

  public getAll(): V[] {
    const list: V[] = [];
    for (const bucket of this.buckets) {
      for (const entry of bucket) {
        list.push(entry.value);
      }
    }
    return list;
  }

  public getSize(): number {
    return this.size;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getLoadFactor(): number {
    return Number((this.size / this.capacity).toFixed(3));
  }

  public clear(): void {
    this.buckets = Array.from({ length: this.capacity }, () => []);
    this.size = 0;
    this.totalCollisions = 0;
  }

  // Serialize buckets and distribution for UI visualization
  public serializeForViz(): any {
    const bucketsInfo = this.buckets.map((bucket, index) => ({
      index,
      chainLength: bucket.length,
      entries: bucket.map((e) => ({
        key: e.key,
        valuePreview:
          typeof e.value === "object"
            ? (e.value as any).role
              ? `User [${(e.value as any).role}]: ${(e.value as any).name || (e.value as any).username}`
              : (e.value as any).name || e.key
            : String(e.value),
      })),
    }));

    return {
      tableName: this.tableName,
      capacity: this.capacity,
      size: this.size,
      loadFactor: this.getLoadFactor(),
      totalCollisions: this.totalCollisions,
      nonEmptyBuckets: bucketsInfo.filter((b) => b.chainLength > 0).length,
      maxChainLength: Math.max(0, ...bucketsInfo.map((b) => b.chainLength)),
      buckets: bucketsInfo,
    };
  }
}
