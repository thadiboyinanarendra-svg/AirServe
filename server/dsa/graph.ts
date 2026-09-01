/**
 * Custom Airport Network Graph with Adjacency List Representation
 * and Custom Dijkstra's Shortest Path Algorithm.
 * Implemented manually without third-party graph or pathfinding libraries.
 */

export interface AirportVertex {
  code: string; // e.g. "HYD", "DEL", "BOM"
  name: string; // "Rajiv Gandhi International Airport"
  city: string; // "Hyderabad"
  country: string; // "India"
  lat: number;
  lng: number;
  terminals: number;
  imageUrl?: string;
  description?: string;
  region?: string;
  elevation?: number;
  runways?: number;
}

export interface RouteEdge {
  id?: string;
  source: string;
  destination: string;
  distanceKm: number;
  baseCost: number;
  durationMinutes: number;
  airlines: string[];
}

export interface DijkstraStep {
  currentAirport: string;
  visited: string[];
  tentativeDistances: { [code: string]: number };
  tentativeCosts: { [code: string]: number };
  description: string;
}

export interface DijkstraResult {
  source: string;
  destination: string;
  found: boolean;
  path: string[];
  pathAirports: AirportVertex[];
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
  stepsLog: DijkstraStep[];
}

export class AirportGraph {
  private vertices: Map<string, AirportVertex> = new Map();
  private adjacencyList: Map<string, RouteEdge[]> = new Map();

  constructor() {}

  // Add airport vertex
  public addAirport(airport: AirportVertex): void {
    const code = airport.code.toUpperCase();
    this.vertices.set(code, { ...airport, code });
    if (!this.adjacencyList.has(code)) {
      this.adjacencyList.set(code, []);
    }
  }

  // Remove airport vertex and associated routes
  public removeAirport(code: string): boolean {
    const ucCode = code.toUpperCase();
    if (!this.vertices.has(ucCode)) return false;

    this.vertices.delete(ucCode);
    this.adjacencyList.delete(ucCode);

    // Remove any inbound routes
    for (const [v, edges] of this.adjacencyList.entries()) {
      this.adjacencyList.set(
        v,
        edges.filter((edge) => edge.destination !== ucCode)
      );
    }
    return true;
  }

  // Add bidirectional or directed route edge
  public addRoute(route: RouteEdge, bidirectional: boolean = true): void {
    const src = route.source.toUpperCase();
    const dest = route.destination.toUpperCase();

    if (!this.adjacencyList.has(src)) this.adjacencyList.set(src, []);
    if (!this.adjacencyList.has(dest)) this.adjacencyList.set(dest, []);

    // Remove existing edge if any
    const srcEdges = this.adjacencyList.get(src)!;
    const existingIdx = srcEdges.findIndex((e) => e.destination === dest);
    const edgeData: RouteEdge = {
      id: route.id || `${src}-${dest}`,
      source: src,
      destination: dest,
      distanceKm: route.distanceKm,
      baseCost: route.baseCost,
      durationMinutes: route.durationMinutes,
      airlines: route.airlines || ["AirServe"],
    };

    if (existingIdx !== -1) {
      srcEdges[existingIdx] = edgeData;
    } else {
      srcEdges.push(edgeData);
    }

    if (bidirectional) {
      const destEdges = this.adjacencyList.get(dest)!;
      const reverseIdx = destEdges.findIndex((e) => e.destination === src);
      const reverseEdge: RouteEdge = {
        id: `${dest}-${src}`,
        source: dest,
        destination: src,
        distanceKm: route.distanceKm,
        baseCost: route.baseCost,
        durationMinutes: route.durationMinutes,
        airlines: route.airlines || ["AirServe"],
      };
      if (reverseIdx !== -1) {
        destEdges[reverseIdx] = reverseEdge;
      } else {
        destEdges.push(reverseEdge);
      }
    }
  }

  // Remove route
  public removeRoute(source: string, destination: string, bidirectional: boolean = true): boolean {
    const src = source.toUpperCase();
    const dest = destination.toUpperCase();
    let removed = false;

    if (this.adjacencyList.has(src)) {
      const originalLen = this.adjacencyList.get(src)!.length;
      this.adjacencyList.set(
        src,
        this.adjacencyList.get(src)!.filter((e) => e.destination !== dest)
      );
      if (this.adjacencyList.get(src)!.length < originalLen) removed = true;
    }

    if (bidirectional && this.adjacencyList.has(dest)) {
      this.adjacencyList.set(
        dest,
        this.adjacencyList.get(dest)!.filter((e) => e.destination !== src)
      );
    }

    return removed;
  }

  public getAirport(code: string): AirportVertex | undefined {
    return this.vertices.get(code.toUpperCase());
  }

  public getAllAirports(): AirportVertex[] {
    return Array.from(this.vertices.values());
  }

  public getAllRoutes(): RouteEdge[] {
    const routes: RouteEdge[] = [];
    const seen = new Set<string>();

    for (const [src, edges] of this.adjacencyList.entries()) {
      for (const edge of edges) {
        const key = `${src}-${edge.destination}`;
        if (!seen.has(key)) {
          seen.add(key);
          routes.push(edge);
        }
      }
    }
    return routes;
  }

  public getNeighbors(code: string): RouteEdge[] {
    return this.adjacencyList.get(code.toUpperCase()) || [];
  }

  // Manual Dijkstra Algorithm
  public findShortestPath(
    sourceCode: string,
    destCode: string,
    optimizeBy: "distance" | "cost" = "distance"
  ): DijkstraResult {
    const src = sourceCode.toUpperCase();
    const dest = destCode.toUpperCase();

    if (!this.vertices.has(src) || !this.vertices.has(dest)) {
      return {
        source: src,
        destination: dest,
        found: false,
        path: [],
        pathAirports: [],
        totalDistanceKm: 0,
        totalCost: 0,
        totalDurationMinutes: 0,
        stops: 0,
        segments: [],
        stepsLog: [],
      };
    }

    if (src === dest) {
      const airport = this.vertices.get(src)!;
      return {
        source: src,
        destination: dest,
        found: true,
        path: [src],
        pathAirports: [airport],
        totalDistanceKm: 0,
        totalCost: 0,
        totalDurationMinutes: 0,
        stops: 0,
        segments: [],
        stepsLog: [],
      };
    }

    const distances: { [code: string]: number } = {};
    const costs: { [code: string]: number } = {};
    const previous: { [code: string]: { node: string; edge: RouteEdge } | null } = {};
    const unvisited = new Set<string>();
    const visited = new Set<string>();
    const stepsLog: DijkstraStep[] = [];

    // Initialization
    for (const code of this.vertices.keys()) {
      distances[code] = Infinity;
      costs[code] = Infinity;
      previous[code] = null;
      unvisited.add(code);
    }

    distances[src] = 0;
    costs[src] = 0;

    while (unvisited.size > 0) {
      // Find unvisited node with smallest metric
      let current: string | null = null;
      let minMetric = Infinity;

      for (const node of unvisited) {
        const metric = optimizeBy === "distance" ? distances[node] : costs[node];
        if (metric < minMetric) {
          minMetric = metric;
          current = node;
        }
      }

      // If smallest distance is infinity or no reachable node left
      if (current === null || minMetric === Infinity) {
        break;
      }

      unvisited.delete(current);
      visited.add(current);

      stepsLog.push({
        currentAirport: current,
        visited: Array.from(visited),
        tentativeDistances: { ...distances },
        tentativeCosts: { ...costs },
        description: `Visiting airport ${current} (Current lowest ${optimizeBy}: ${minMetric === 0 ? 0 : minMetric}). Checking adjacent connections.`,
      });

      // Target reached
      if (current === dest) {
        break;
      }

      const neighbors = this.adjacencyList.get(current) || [];
      for (const edge of neighbors) {
        if (visited.has(edge.destination)) continue;

        const weight = optimizeBy === "distance" ? edge.distanceKm : edge.baseCost;
        const currentMetric = optimizeBy === "distance" ? distances[current] : costs[current];
        const newMetric = currentMetric + weight;

        const targetMetric =
          optimizeBy === "distance" ? distances[edge.destination] : costs[edge.destination];

        if (newMetric < targetMetric) {
          distances[edge.destination] = distances[current] + edge.distanceKm;
          costs[edge.destination] = costs[current] + edge.baseCost;
          previous[edge.destination] = { node: current, edge };
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    const segments: DijkstraResult["segments"] = [];
    let curr: string | null = dest;

    if (distances[dest] === Infinity) {
      return {
        source: src,
        destination: dest,
        found: false,
        path: [],
        pathAirports: [],
        totalDistanceKm: 0,
        totalCost: 0,
        totalDurationMinutes: 0,
        stops: 0,
        segments: [],
        stepsLog,
      };
    }

    let totalDuration = 0;
    while (curr && curr !== src) {
      path.unshift(curr);
      const prevInfo = previous[curr];
      if (prevInfo) {
        segments.unshift({
          from: prevInfo.node,
          to: curr,
          distanceKm: prevInfo.edge.distanceKm,
          cost: prevInfo.edge.baseCost,
          durationMinutes: prevInfo.edge.durationMinutes,
          airlines: prevInfo.edge.airlines,
        });
        totalDuration += prevInfo.edge.durationMinutes;
        curr = prevInfo.node;
      } else {
        break;
      }
    }
    path.unshift(src);

    const pathAirports = path.map((code) => this.vertices.get(code)!);

    return {
      source: src,
      destination: dest,
      found: true,
      path,
      pathAirports,
      totalDistanceKm: distances[dest],
      totalCost: costs[dest],
      totalDurationMinutes: totalDuration,
      stops: path.length - 2 > 0 ? path.length - 2 : 0,
      segments,
      stepsLog,
    };
  }

  // Clear graph
  public clear(): void {
    this.vertices.clear();
    this.adjacencyList.clear();
  }

  // Serialize graph for visualizer
  public serializeForViz(): any {
    const nodes = Array.from(this.vertices.values()).map((v) => ({
      id: v.code,
      label: `${v.code} - ${v.city}`,
      city: v.city,
      country: v.country,
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      degree: (this.adjacencyList.get(v.code) || []).length,
    }));

    const edges: any[] = [];
    const seen = new Set<string>();

    for (const [src, edgeList] of this.adjacencyList.entries()) {
      for (const edge of edgeList) {
        const pairKey = [src, edge.destination].sort().join("<->");
        if (!seen.has(pairKey)) {
          seen.add(pairKey);
          edges.push({
            id: edge.id || `${src}-${edge.destination}`,
            source: src,
            target: edge.destination,
            distanceKm: edge.distanceKm,
            baseCost: edge.baseCost,
            durationMinutes: edge.durationMinutes,
            airlines: edge.airlines,
          });
        }
      }
    }

    return {
      verticesCount: this.vertices.size,
      edgesCount: edges.length,
      nodes,
      edges,
    };
  }
}
