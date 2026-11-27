/* ===================================================================
   ACCESSIBLE INDOOR NAVIGATION - GRAPH & DIJKSTRA PATHFINDING ENGINE
   Multi-Criteria Routing: Obstacle Awareness, Wheelchair Safety & Step-Free Paths
   =================================================================== */

window.NavApp = window.NavApp || {};
const NavApp = window.NavApp;

// Node Definitions with Map Coordinates and Metadata
const CAMPUS_GRAPH_NODES = {
  'main-entrance': {
    id: 'main-entrance',
    name: 'Main Campus Entrance',
    shortName: 'Entrance',
    category: 'Entrance / Exit',
    x: 500,
    y: 560,
    floor: 0,
    accessible: true,
    doorX: 500,
    doorY: 520,
    description: 'Ground floor main access with automatic wide sliding doors and gentle tactile slope.'
  },
  'reception': {
    id: 'reception',
    name: 'Reception & Visitor Center',
    shortName: 'Reception',
    category: 'Information & Admin',
    x: 370,
    y: 470,
    floor: 0,
    accessible: true,
    doorX: 400,
    doorY: 420,
    description: 'Central help desk, braille building directory, and audio assistance kiosk.'
  },
  'corridor-a-west': {
    id: 'corridor-a-west',
    name: 'Corridor A (West Junction)',
    shortName: 'Corridor A (West)',
    category: 'Hallway',
    x: 230,
    y: 330,
    floor: 0,
    accessible: true,
    corridorId: 'corridor-a'
  },
  'corridor-a-center': {
    id: 'corridor-a-center',
    name: 'Corridor A (Central Atrium)',
    shortName: 'Corridor A (Center)',
    category: 'Hallway',
    x: 500,
    y: 330,
    floor: 0,
    accessible: true,
    corridorId: 'corridor-a'
  },
  'corridor-a-east': {
    id: 'corridor-a-east',
    name: 'Corridor A (East Junction)',
    shortName: 'Corridor A (East)',
    category: 'Hallway',
    x: 740,
    y: 330,
    floor: 0,
    accessible: true,
    corridorId: 'corridor-a'
  },
  'corridor-b-north': {
    id: 'corridor-b-north',
    name: 'Corridor B (North Hallway)',
    shortName: 'Corridor B (North)',
    category: 'Hallway',
    x: 740,
    y: 190,
    floor: 0,
    accessible: true,
    corridorId: 'corridor-b'
  },
  'corridor-b-south': {
    id: 'corridor-b-south',
    name: 'Corridor B (South Hallway)',
    shortName: 'Corridor B (South)',
    category: 'Hallway',
    x: 740,
    y: 470,
    floor: 0,
    accessible: true,
    corridorId: 'corridor-b'
  },
  'room-101': {
    id: 'room-101',
    name: 'Room 101 - Lecture Theatre',
    shortName: 'Room 101',
    category: 'Academic Classroom',
    x: 220,
    y: 180,
    floor: 0,
    accessible: true,
    doorX: 230,
    doorY: 270,
    description: 'Tiered seating with front-row level wheelchair bays, hearing loop installed.'
  },
  'room-102': {
    id: 'room-102',
    name: 'Room 102 - Smart Classroom',
    shortName: 'Room 102',
    category: 'Academic Classroom',
    x: 370,
    y: 180,
    floor: 0,
    accessible: true,
    doorX: 370,
    doorY: 270,
    description: 'Interactive digital classroom with height-adjustable accessible desks.'
  },
  'room-103': {
    id: 'room-103',
    name: 'Room 103 - Seminar Room',
    shortName: 'Room 103',
    category: 'Academic Classroom',
    x: 520,
    y: 180,
    floor: 0,
    accessible: true,
    doorX: 520,
    doorY: 270,
    description: 'Small group collaborative space with wide 36-inch clearance doorway.'
  },
  'comp-lab': {
    id: 'comp-lab',
    name: 'Advanced Computing Lab',
    shortName: 'Computer Lab',
    category: 'Laboratory',
    x: 670,
    y: 180,
    floor: 0,
    accessible: true,
    doorX: 710,
    doorY: 190,
    description: 'High-performance computing workstations with assistive technology software.'
  },
  'library': {
    id: 'library',
    name: 'Central Digital Library',
    shortName: 'Library',
    category: 'Library & Resource Center',
    x: 880,
    y: 190,
    floor: 0,
    accessible: true,
    doorX: 800,
    doorY: 190,
    description: 'Silent study zones, low-height checkout counters, and screen magnification stations.'
  },
  'seminar-hall': {
    id: 'seminar-hall',
    name: 'Grand Seminar & Conference Hall',
    shortName: 'Seminar Hall',
    category: 'Auditorium & Events',
    x: 880,
    y: 470,
    floor: 0,
    accessible: true,
    doorX: 800,
    doorY: 470,
    description: '250-seat multimedia hall with step-free stage ramp and companion seating.'
  },
  'restroom': {
    id: 'restroom',
    name: 'Unisex Accessible Restroom',
    shortName: 'Accessible Restroom',
    category: 'Restroom Facility',
    x: 630,
    y: 470,
    floor: 0,
    accessible: true,
    doorX: 610,
    doorY: 410,
    description: 'Fully ADA-compliant with grab bars, emergency pull cord, and motion sensors.'
  },
  'elevator': {
    id: 'elevator',
    name: 'Elevator A (Central Atrium)',
    shortName: 'Elevator A',
    category: 'Vertical Transit',
    x: 250,
    y: 470,
    floor: 0,
    accessible: true,
    doorX: 250,
    doorY: 410,
    description: 'High-speed elevator with voice floor announcements and low braille control buttons.'
  },
  'staircase': {
    id: 'staircase',
    name: 'Central Pedestrian Staircase',
    shortName: 'Staircase',
    category: 'Pedestrian Stairs',
    x: 630,
    y: 260,
    floor: 0,
    accessible: false,
    hasStairs: true,
    doorX: 630,
    doorY: 310,
    description: 'Standard 18-step concrete flight connecting Ground Floor to Level 1.'
  },
  'terrace-ramp': {
    id: 'terrace-ramp',
    name: 'South Garden Terrace Ramp',
    shortName: 'Garden Ramp',
    category: 'Accessible Pathway',
    x: 740,
    y: 560,
    floor: 0,
    accessible: true,
    doorX: 740,
    doorY: 560,
    description: 'Wide, smooth concrete ramp with 1:12 slope, non-slip texture, and dual handrails.'
  }
};

// Graph Edges (Connections between nodes with physical distance in meters)
const CAMPUS_GRAPH_EDGES = [
  // Entrance & Reception Foyer
  { u: 'main-entrance', v: 'reception', dist: 15, accessible: true },
  { u: 'main-entrance', v: 'restroom', dist: 18, accessible: true },
  { u: 'main-entrance', v: 'terrace-ramp', dist: 55, accessible: true },
  
  // South Garden Terrace Ramp (Direct bypass to Seminar Hall!)
  { u: 'terrace-ramp', v: 'seminar-hall', dist: 60, accessible: true },

  // Reception Hub
  { u: 'reception', v: 'elevator', dist: 14, accessible: true },
  { u: 'reception', v: 'corridor-a-center', dist: 18, accessible: true },

  // Elevator to West Corridor
  { u: 'elevator', v: 'corridor-a-west', dist: 18, accessible: true },

  // Corridor A Horizontal Spine
  { u: 'corridor-a-west', v: 'corridor-a-center', dist: 28, accessible: true, corridorId: 'corridor-a' },
  { u: 'corridor-a-center', v: 'corridor-a-east', dist: 22, accessible: true, corridorId: 'corridor-a' },

  // North Classrooms along Corridor A
  { u: 'corridor-a-west', v: 'room-101', dist: 15, accessible: true },
  { u: 'corridor-a-center', v: 'room-102', dist: 15, accessible: true },
  { u: 'corridor-a-center', v: 'room-103', dist: 16, accessible: true },
  { u: 'room-103', v: 'comp-lab', dist: 15, accessible: true },
  { u: 'corridor-a-center', v: 'restroom', dist: 18, accessible: true },

  // Central Staircase (Short pedestrian link, has stairs!)
  { u: 'corridor-a-center', v: 'staircase', dist: 12, hasStairs: true, accessible: false },
  { u: 'staircase', v: 'corridor-b-north', dist: 14, hasStairs: true, accessible: false },

  // Corridor B Vertical Backbone (East Wing)
  { u: 'corridor-a-east', v: 'corridor-b-north', dist: 18, accessible: true },
  { u: 'corridor-a-east', v: 'corridor-b-south', dist: 16, accessible: true, corridorId: 'corridor-b' },

  // East Wing Facilities
  { u: 'corridor-b-north', v: 'comp-lab', dist: 12, accessible: true },
  { u: 'corridor-b-north', v: 'library', dist: 16, accessible: true },
  { u: 'corridor-b-south', v: 'seminar-hall', dist: 14, accessible: true }
];

// Helper to determine if a corridor/edge is currently blocked in NavApp.obstacles
function isEdgeBlocked(edge) {
  const obstacles = NavApp.obstacles || [];
  if (edge.corridorId) {
    const obs = obstacles.find(o => o.corridorId === edge.corridorId);
    if (obs && obs.blocked) return true;
  }
  // Check if either connected node is specifically marked blocked
  const obsU = obstacles.find(o => o.corridorId === edge.u || o.id === `obs-${edge.u}`);
  if (obsU && obsU.blocked) return true;
  const obsV = obstacles.find(o => o.corridorId === edge.v || o.id === `obs-${edge.v}`);
  if (obsV && obsV.blocked) return true;

  return false;
}

/**
 * Dijkstra Pathfinding Algorithm
 * @param {string} startNodeId
 * @param {string} endNodeId
 * @param {object} options { avoidStairs: boolean, wheelchairMode: boolean, avoidObstacles: boolean }
 * @returns {object} { path: string[], distance: number, travelTime: string, instructions: string[], hasStairs: boolean }
 */
function findShortestRoute(startNodeId, endNodeId, options = {}) {
  const {
    avoidStairs = true,
    wheelchairMode = true,
    avoidObstacles = true
  } = options;

  if (!CAMPUS_GRAPH_NODES[startNodeId] || !CAMPUS_GRAPH_NODES[endNodeId]) {
    return null;
  }

  // Build Adjacency List
  const adj = {};
  for (const nodeKey in CAMPUS_GRAPH_NODES) {
    adj[nodeKey] = [];
  }

  CAMPUS_GRAPH_EDGES.forEach(edge => {
    // Check obstacle blockage
    if (avoidObstacles && isEdgeBlocked(edge)) {
      return; // Skip blocked corridor
    }

    // Check stairs restriction
    if ((avoidStairs || wheelchairMode) && edge.hasStairs) {
      return; // Skip edges with stairs
    }

    let weight = edge.dist;
    // If wheelchair mode, prefer wide elevators and level paths (slight bonus)
    if (wheelchairMode && edge.accessible) {
      weight = edge.dist * 0.95;
    }

    adj[edge.u].push({ to: edge.v, weight: weight, rawDist: edge.dist, hasStairs: !!edge.hasStairs });
    adj[edge.v].push({ to: edge.u, weight: weight, rawDist: edge.dist, hasStairs: !!edge.hasStairs });
  });

  // Dijkstra Priority Queue / Tracking
  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(CAMPUS_GRAPH_NODES));

  for (const nodeKey in CAMPUS_GRAPH_NODES) {
    distances[nodeKey] = Infinity;
    previous[nodeKey] = null;
  }
  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    // Pick smallest unvisited node
    let current = null;
    let smallestDist = Infinity;
    for (const node of unvisited) {
      if (distances[node] < smallestDist) {
        smallestDist = distances[node];
        current = node;
      }
    }

    if (!current || distances[current] === Infinity) {
      break; // Unreachable
    }

    if (current === endNodeId) {
      break; // Found destination
    }

    unvisited.delete(current);

    const neighbors = adj[current] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      const alt = distances[current] + neighbor.weight;
      if (alt < distances[neighbor.to]) {
        distances[neighbor.to] = alt;
        previous[neighbor.to] = current;
      }
    }
  }

  // Reconstruct Path
  const path = [];
  let curr = endNodeId;
  if (previous[curr] !== null || curr === startNodeId) {
    while (curr !== null) {
      path.unshift(curr);
      curr = previous[curr];
    }
  }

  if (path.length === 0 || path[0] !== startNodeId) {
    return null; // No route found under current constraints
  }

  // Calculate actual distance & check if stairs used
  let totalDistance = 0;
  let usedStairs = false;

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const edge = CAMPUS_GRAPH_EDGES.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
    if (edge) {
      totalDistance += edge.dist;
      if (edge.hasStairs) usedStairs = true;
    }
  }

  // Estimated Travel Time calculation (m/min)
  // Average wheelchair pace ~ 45-50 m/min; walking ~ 65-75 m/min
  const walkingSpeed = wheelchairMode ? 48 : 65;
  const minutes = (totalDistance / walkingSpeed).toFixed(1);
  const travelTime = `${minutes} min`;

  // Generate Turn-by-Turn Accessible Guidance
  const instructions = generateInstructions(path, usedStairs, wheelchairMode);

  return {
    path,
    distance: totalDistance,
    travelTime,
    instructions,
    hasStairs: usedStairs,
    isAccessible: !usedStairs
  };
}

/**
 * Generate human-friendly step-by-step navigation instructions
 */
function generateInstructions(path, hasStairs, wheelchairMode) {
  const steps = [];
  if (path.length < 2) return ['You are already at your destination.'];

  const startNode = CAMPUS_GRAPH_NODES[path[0]];
  const endNode = CAMPUS_GRAPH_NODES[path[path.length - 1]];

  steps.push({
    icon: 'map-pin',
    text: `Start from ${startNode.name}.`,
    subtext: `Ensure your path is clear. ${wheelchairMode ? 'Wheelchair mode active.' : 'Pedestrian pace.'}`
  });

  for (let i = 1; i < path.length; i++) {
    const curr = CAMPUS_GRAPH_NODES[path[i]];
    const prev = CAMPUS_GRAPH_NODES[path[i - 1]];

    if (curr.id === 'terrace-ramp') {
      steps.push({
        icon: 'trending-up',
        text: 'Proceed via South Garden Terrace Ramp.',
        subtext: 'Bypassing central corridors. Smooth 1:12 accessible incline with handrails.'
      });
    } else if (curr.id === 'elevator') {
      steps.push({
        icon: 'chevrons-up',
        text: 'Take Elevator A at Central Atrium.',
        subtext: 'Step-free access. Audio prompts will announce floor level.'
      });
    } else if (curr.id === 'staircase') {
      steps.push({
        icon: 'alert-triangle',
        text: 'Take Central Pedestrian Staircase.',
        subtext: 'Warning: 18 concrete steps. Not suitable for wheelchairs.'
      });
    } else if (curr.id.startsWith('corridor')) {
      steps.push({
        icon: 'navigation',
        text: `Continue through ${curr.name}.`,
        subtext: 'Follow the illuminated blue tactile floor guidance line.'
      });
    } else if (curr.id === endNode.id) {
      steps.push({
        icon: 'check-circle-2',
        text: `Arrive at ${curr.name}.`,
        subtext: `Destination reached safely. Door clearance: 36 inches.`
      });
    } else {
      steps.push({
        icon: 'corner-down-right',
        text: `Pass by ${curr.name}.`,
        subtext: 'Keep straight along the designated accessible lane.'
      });
    }
  }

  return steps;
}

// Export functions to global NavApp
NavApp.graphNodes = CAMPUS_GRAPH_NODES;
NavApp.graphEdges = CAMPUS_GRAPH_EDGES;
NavApp.findShortestRoute = findShortestRoute;
NavApp.isEdgeBlocked = isEdgeBlocked;
