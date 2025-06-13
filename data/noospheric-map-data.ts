
import { NoosphericNodeData, NoosphericFaction, NoosphericPlayerId, NoosphericMapType } from '../types';
import { AI1_NAME, AI2_NAME } from '../constants';

// --- NEW MAP DEFINITIONS BASED ON USER INPUT ---
interface NCMapNodeDefinition {
  id: string;
  name: string; // maps to regionName
  type: 'CN' | 'QN' | 'KJ';
  connections: string[];
  resourcesPerTurn: number; // maps to qrOutput
  hasFabricationHub: boolean; 
  mapPosition: { x: number; y: number };
  continent: string; // Not used
  isKeyJunctionObjective?: boolean; // Added for clarity in raw definitions
}

interface NCMapDefinition {
  name: NoosphericMapType;
  ai1StartNodeId: string; 
  ai1InitialControlledNodes: string[]; // These are initial nodes if FoW is OFF
  ai2StartNodeId: string; 
  ai2InitialControlledNodes: string[]; // These are initial nodes if FoW is OFF
  neutralKJsWithUnits: string[];
  neutralNodesWithUnits?: string[]; 
  nodes: NCMapNodeDefinition[];
}

const seraphimGridUserInput = {
  "id": "seraphim_grid_map_def_from_user",
  "name": "The Seraphim Grid" as NoosphericMapType,
  "nodes_input": [
    { "id": "A-CN", "name": "Alpha Core", "pos": { "x": 15, "y": 20 } },
    { "id": "A-1", "name": "A-Perimeter 1", "pos": { "x": 10, "y": 30 } },
    { "id": "A-2", "name": "A-Perimeter 2", "pos": { "x": 20, "y": 30 } },
    { "id": "A-3", "name": "A-Relay", "pos": { "x": 15, "y": 40 } },
    { "id": "A-4", "name": "A-Gateway", "pos": { "x": 25, "y": 50 } },
    { "id": "B-CN", "name": "Beta Core", "pos": { "x": 85, "y": 80 } },
    { "id": "B-1", "name": "B-Perimeter 1", "pos": { "x": 90, "y": 70 } },
    { "id": "B-2", "name": "B-Perimeter 2", "pos": { "x": 80, "y": 70 } },
    { "id": "B-3", "name": "B-Relay", "pos": { "x": 85, "y": 60 } },
    { "id": "B-4", "name": "B-Gateway", "pos": { "x": 75, "y": 50 } },
    { "id": "G-KJ", "name": "Typhon Nexus", "pos": { "x": 50, "y": 50 } },
    { "id": "G-1", "name": "G-Node 1", "pos": { "x": 45, "y": 45 } },
    { "id": "G-2", "name": "G-Node 2", "pos": { "x": 55, "y": 45 } },
    { "id": "G-3", "name": "G-Node 3", "pos": { "x": 55, "y": 55 } },
    { "id": "G-4", "name": "G-Node 4", "pos": { "x": 45, "y": 55 } },
    { "id": "G-5", "name": "G-Firewall N", "pos": { "x": 50, "y": 35 } },
    { "id": "G-6", "name": "G-Firewall S", "pos": { "x": 50, "y": 65 } },
    { "id": "D-KJ", "name": "Orion Arm", "pos": { "x": 50, "y": 15 } },
    { "id": "D-1", "name": "D-Hub", "pos": { "x": 40, "y": 15 } },
    { "id": "D-2", "name": "D-Anchor", "pos": { "x": 60, "y": 15 } },
    { "id": "D-3", "name": "D-Echo 1", "pos": { "x": 45, "y": 5 } },
    { "id": "D-4", "name": "D-Echo 2", "pos": { "x": 55, "y": 5 } },
    { "id": "D-5", "name": "D-Deep Relay", "pos": { "x": 70, "y": 10 } },
    { "id": "D-6", "name": "D-Spur", "pos": { "x": 30, "y": 10 } },
    { "id": "E-KJ", "name": "Hydra Maw", "pos": { "x": 50, "y": 85 } },
    { "id": "E-1", "name": "E-Hub", "pos": { "x": 40, "y": 85 } },
    { "id": "E-2", "name": "E-Anchor", "pos": { "x": 60, "y": 85 } },
    { "id": "E-3", "name": "E-Echo 1", "pos": { "x": 45, "y": 95 } },
    { "id": "E-4", "name": "E-Echo 2", "pos": { "x": 55, "y": 95 } },
    { "id": "E-5", "name": "E-Deep Relay", "pos": { "x": 30, "y": 90 } },
    { "id": "E-6", "name": "E-Spur", "pos": { "x": 70, "y": 90 } },
    { "id": "OR-1", "name": "Void Anomaly", "pos": { "x": 5, "y": 5 } },
    { "id": "OR-2", "name": "Rogue Datastream", "pos": { "x": 95, "y": 5 } },
    { "id": "OR-3", "name": "Forgotten Archive", "pos": { "x": 5, "y": 95 } },
    { "id": "OR-4", "name": "Abyssal Node", "pos": { "x": 95, "y": 95 } }
  ],
  "connections_input": [
    ["A-CN", "A-1"], ["A-CN", "A-2"], ["A-1", "A-3"], ["A-2", "A-3"], ["A-3", "A-4"],
    ["B-CN", "B-1"], ["B-CN", "B-2"], ["B-1", "B-3"], ["B-2", "B-3"], ["B-3", "B-4"],
    ["G-KJ", "G-1"], ["G-KJ", "G-2"], ["G-KJ", "G-3"], ["G-KJ", "G-4"],
    ["G-1", "G-2"], ["G-2", "G-3"], ["G-3", "G-4"], ["G-4", "G-1"],
    ["G-1", "G-5"], ["G-2", "G-5"], ["G-3", "G-6"], ["G-4", "G-6"],
    ["D-KJ", "D-1"], ["D-KJ", "D-2"], ["D-1", "D-3"], ["D-2", "D-4"], ["D-3", "D-4"],
    ["D-1", "D-6"], ["D-2", "D-5"],
    ["E-KJ", "E-1"], ["E-KJ", "E-2"], ["E-1", "E-3"], ["E-2", "E-4"], ["E-3", "E-4"],
    ["E-1", "E-5"], ["E-2", "E-6"],
    ["A-4", "G-4"], ["A-4", "G-1"], 
    ["B-4", "G-2"], ["B-4", "G-3"], 
    ["G-5", "D-KJ"], 
    ["G-6", "E-KJ"], 
    ["D-6", "OR-1"], ["D-5", "OR-2"], 
    ["E-5", "OR-3"], ["E-6", "OR-4"], 
    ["A-1", "OR-1"], ["A-1", "OR-3"], 
    ["B-1", "OR-2"], ["B-1", "OR-4"] 
  ]
};

const seraphimGridNodes: NCMapNodeDefinition[] = seraphimGridUserInput.nodes_input.map(n => {
  const nodeType = n.id.includes('-CN') ? 'CN' : n.id.includes('-KJ') ? 'KJ' : 'QN';
  const nodeConnections = new Set<string>();
  seraphimGridUserInput.connections_input.forEach(conn => {
    if (conn[0] === n.id) nodeConnections.add(conn[1]);
    if (conn[1] === n.id) nodeConnections.add(conn[0]);
  });
  return {
    id: n.id,
    name: n.name,
    type: nodeType,
    connections: Array.from(nodeConnections),
    resourcesPerTurn: nodeType === 'CN' ? 3 : nodeType === 'KJ' ? 2 : 1,
    hasFabricationHub: nodeType === 'KJ', // KJs have hubs on this map
    mapPosition: { x: n.pos.x, y: n.pos.y },
    continent: n.id.split('-')[0], // Example: A-CN -> 'A'
    isKeyJunctionObjective: nodeType === 'KJ'
  };
});

const seraphimGridMapDefinition: NCMapDefinition = {
  name: "The Seraphim Grid",
  ai1StartNodeId: "A-CN",
  ai1InitialControlledNodes: ["A-CN"], // Only CN when FoW is on
  ai2StartNodeId: "B-CN",
  ai2InitialControlledNodes: ["B-CN"], // Only CN when FoW is on
  neutralKJsWithUnits: ["G-KJ", "D-KJ", "E-KJ"],
  neutralNodesWithUnits: ["A-4", "B-4", "G-5", "G-6"], // Key gateways also get neutral units
  nodes: seraphimGridNodes
};


const MAP_DEFINITIONS_NC: NCMapDefinition[] = [
  {
    name: "Classic Lattice",
    ai1StartNodeId: "N1", ai1InitialControlledNodes: ["N1", "N3", "N8"],
    ai2StartNodeId: "N2", ai2InitialControlledNodes: ["N2", "N7", "N12"],
    neutralKJsWithUnits: ["N5", "N10", "N6"], 
    neutralNodesWithUnits: [], 
    nodes: [
      { id: "N1", name: "GEM-Q CN", type: 'CN', connections: ["N3", "N8", "N5"], resourcesPerTurn: 3, hasFabricationHub: false, mapPosition: { x: 10, y: 30 }, continent: "West", isKeyJunctionObjective: false },
      { id: "N2", name: "AXIOM CN", type: 'CN', connections: ["N7", "N12", "N5"], resourcesPerTurn: 3, hasFabricationHub: false, mapPosition: { x: 90, y: 30 }, continent: "East", isKeyJunctionObjective: false },
      { id: "N3", name: "Peri-Alpha", type: 'QN', connections: ["N1", "N5", "N6", "N8", "N9"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 50 }, continent: "West" },
      { id: "N5", name: "KJ Vega", type: 'KJ', connections: ["N1", "N2", "N3", "N6", "N7"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 50, y: 10 }, isKeyJunctionObjective: true, continent: "Central" },
      { id: "N6", name: "KJ Nexus", type: 'KJ', connections: ["N3", "N5", "N7", "N9", "N10", "N11"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 50, y: 50 }, continent: "Central", isKeyJunctionObjective: true }, 
      { id: "N7", name: "Peri-Beta", type: 'QN', connections: ["N2", "N5", "N6", "N11", "N12"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 50 }, continent: "East" },
      { id: "N8", name: "Quad Gamma", type: 'QN', connections: ["N1", "N3", "N9", "N13"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 10, y: 50 }, continent: "West" },
      { id: "N9", name: "X-Link Delta", type: 'QN', connections: ["N3", "N6", "N8", "N10", "N13"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 70 }, continent: "West" },
      { id: "N10", name: "KJ Sirius", type: 'KJ', connections: ["N6", "N9", "N11", "N13", "N14"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 50, y: 90 }, isKeyJunctionObjective: true, continent: "Central" },
      { id: "N11", name: "X-Link Zeta", type: 'QN', connections: ["N7", "N6", "N10", "N12", "N14"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 70 }, continent: "East" },
      { id: "N12", name: "Quad Eta", type: 'QN', connections: ["N2", "N7", "N11", "N14"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 90, y: 50 }, continent: "East" },
      { id: "N13", name: "Core Theta", type: 'QN', connections: ["N8", "N9", "N10"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 10, y: 70 }, continent: "South" },
      { id: "N14", name: "Core Iota", type: 'QN', connections: ["N10", "N11", "N12"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 90, y: 70 }, continent: "South" },
    ]
  },
  {
    name: "Twin Peaks",
    ai1StartNodeId: "TP_N1", ai1InitialControlledNodes: ["TP_N1", "TP_N3"],
    ai2StartNodeId: "TP_N2", ai2InitialControlledNodes: ["TP_N2", "TP_N4"],
    neutralKJsWithUnits: ["TP_KJ1", "TP_KJ2"],
    neutralNodesWithUnits: ["TP_N5", "TP_N6"], 
    nodes: [
        { id: "TP_N1", name: "GEM-Q Base", type: 'CN', connections: ["TP_N3", "TP_KJ1"], resourcesPerTurn: 3, hasFabricationHub: false, mapPosition: { x: 15, y: 50 }, continent: "West",isKeyJunctionObjective: false },
        { id: "TP_N2", name: "AXIOM Base", type: 'CN', connections: ["TP_N4", "TP_KJ2"], resourcesPerTurn: 3, hasFabricationHub: false, mapPosition: { x: 85, y: 50 }, continent: "East",isKeyJunctionObjective: false },
        { id: "TP_N3", name: "GEM-Q Outpost", type: 'QN', connections: ["TP_N1", "TP_N5"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 30 }, continent: "West" },
        { id: "TP_N4", name: "AXIOM Outpost", type: 'QN', connections: ["TP_N2", "TP_N6"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 30 }, continent: "East" },
        { id: "TP_N5", name: "Upper Bridge", type: 'QN', connections: ["TP_N3", "TP_N6", "TP_KJ1"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 20 }, continent: "North" },
        { id: "TP_N6", name: "Lower Bridge", type: 'QN', connections: ["TP_N4", "TP_N5", "TP_KJ2"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 80 }, continent: "South" },
        { id: "TP_KJ1", name: "North KJ", type: 'KJ', connections: ["TP_N1", "TP_N5"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 35, y: 70 }, isKeyJunctionObjective: true, continent: "West" },
        { id: "TP_KJ2", name: "South KJ", type: 'KJ', connections: ["TP_N2", "TP_N6"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 65, y: 70 }, isKeyJunctionObjective: true, continent: "East" },
    ]
  },
  {
    name: "Global Conflict",
    ai1StartNodeId: "GC_NA_W", ai1InitialControlledNodes: ["GC_NA_W", "GC_NA_C", "GC_NA_N"],
    ai2StartNodeId: "GC_AS_E", ai2InitialControlledNodes: ["GC_AS_E", "GC_AS_C", "GC_AS_S"],
    neutralKJsWithUnits: ["GC_EU_KJ", "GC_AF_KJ", "GC_SA_KJ"],
    neutralNodesWithUnits: ["GC_OC_C"],
    nodes: [
            { "id": "GC_NA_W", "name": "NA West", "type": "CN", "connections": ["GC_NA_C", "GC_NA_N", "GC_SA_N"], "resourcesPerTurn": 3, "hasFabricationHub": false, "mapPosition": { "x": 15, "y": 35 }, "continent": "NA", "isKeyJunctionObjective": false },
            { "id": "GC_NA_C", "name": "NA Central", "type": "QN", "connections": ["GC_NA_W", "GC_NA_E", "GC_NA_N"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 25, "y": 35 }, "continent": "NA" },
            { "id": "GC_NA_E", "name": "NA East", "type": "QN", "connections": ["GC_NA_C", "GC_EU_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 35, "y": 38 }, "continent": "NA" },
            { "id": "GC_NA_N", "name": "NA North", "type": "QN", "connections": ["GC_NA_W", "GC_NA_C", "GC_AS_NW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 20, "y": 15 }, "continent": "NA" },
            { "id": "GC_SA_N", "name": "SA North", "type": "QN", "connections": ["GC_NA_W", "GC_SA_KJ"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 30, "y": 60 }, "continent": "SA" },
            { "id": "GC_SA_KJ", "name": "SA KJ", "type": "KJ", "connections": ["GC_SA_N", "GC_AF_W"], "resourcesPerTurn": 2, "hasFabricationHub": true, "mapPosition": { "x": 35, "y": 75 }, "isKeyJunctionObjective": true, "continent": "SA" },
            { "id": "GC_EU_W", "name": "EU West", "type": "QN", "connections": ["GC_NA_E", "GC_EU_KJ", "GC_AF_N"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 45, "y": 35 }, "continent": "EU" },
            { "id": "GC_EU_KJ", "name": "EU KJ", "type": "KJ", "connections": ["GC_EU_W", "GC_EU_E", "GC_AS_W"], "resourcesPerTurn": 2, "hasFabricationHub": true, "mapPosition": { "x": 53, "y": 38 }, "isKeyJunctionObjective": true, "continent": "EU" },
            { "id": "GC_EU_E", "name": "EU East", "type": "QN", "connections": ["GC_EU_KJ", "GC_AS_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 60, "y": 35 }, "continent": "EU" },
            { "id": "GC_AF_N", "name": "AF North", "type": "QN", "connections": ["GC_EU_W", "GC_AF_KJ", "GC_AS_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 55 }, "continent": "AF" },
            { "id": "GC_AF_W", "name": "AF West", "type": "QN", "connections": ["GC_SA_KJ", "GC_AF_KJ"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 42, "y": 65 }, "continent": "AF" },
            { "id": "GC_AF_KJ", "name": "AF KJ", "type": "KJ", "connections": ["GC_AF_N", "GC_AF_W"], "resourcesPerTurn": 2, "hasFabricationHub": true, "mapPosition": { "x": 55, "y": 75 }, "isKeyJunctionObjective": true, "continent": "AF" },
            { "id": "GC_AS_NW", "name": "AS NW", "type": "QN", "connections": ["GC_NA_N", "GC_AS_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 70, "y": 15 }, "continent": "AS" },
            { "id": "GC_AS_W", "name": "AS West", "type": "QN", "connections": ["GC_AS_NW", "GC_EU_KJ", "GC_EU_E", "GC_AS_C", "GC_AS_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 68, "y": 40 }, "continent": "AS" },
            { "id": "GC_AS_C", "name": "AS Central", "type": "QN", "connections": ["GC_AS_W", "GC_AS_E", "GC_AS_S"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 78, "y": 38 }, "continent": "AS" },
            { "id": "GC_AS_E", "name": "AS East", "type": "CN", "connections": ["GC_AS_C", "GC_AS_S", "GC_OC_N"], "resourcesPerTurn": 3, "hasFabricationHub": false, "mapPosition": { "x": 90, "y": 35 }, "continent": "AS", "isKeyJunctionObjective": false },
            { "id": "GC_AS_S", "name": "AS South", "type": "QN", "connections": ["GC_AS_C", "GC_AS_E", "GC_OC_N"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 75, "y": 55 }, "continent": "AS" },
            { "id": "GC_AS_SW", "name": "AS SW", "type": "QN", "connections": ["GC_AS_W", "GC_AF_N", "GC_OC_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 63, "y": 50 }, "continent": "AS" },
            { "id": "GC_OC_N", "name": "OC North", "type": "QN", "connections": ["GC_AS_E", "GC_AS_S", "GC_OC_C"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 88, "y": 60 }, "continent": "OC" },
            { "id": "GC_OC_C", "name": "OC Central", "type": "QN", "connections": ["GC_OC_N", "GC_OC_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 85, "y": 80 }, "continent": "OC" },
            { "id": "GC_OC_W", "name": "OC West", "type": "QN", "connections": ["GC_AS_SW", "GC_OC_C"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 75, "y": 78 }, "continent": "OC" }
    ]
  },
  {
    name: "Fractured Core",
    ai1StartNodeId: "FC_CN1",
    ai1InitialControlledNodes: ["FC_CN1", "FC_QN1A", "FC_QN1B"],
    ai2StartNodeId: "FC_CN2",
    ai2InitialControlledNodes: ["FC_CN2", "FC_QN2A", "FC_QN2B"],
    neutralKJsWithUnits: ["FC_KJ_Alpha", "FC_KJ_Beta", "FC_KJ_Gamma", "FC_KJ_Delta"],
    neutralNodesWithUnits: ["FC_QN_N1", "FC_QN_S1", "FC_QN_W1", "FC_QN_E1"], 
    nodes: [
        { "id": "FC_CN1", "name": "GEM-Q Core", "type": "CN", "connections": ["FC_QN1A", "FC_QN1B"], "resourcesPerTurn": 3, "hasFabricationHub": false, "mapPosition": { "x": 15, "y": 20 }, "continent": "P1-Base", "isKeyJunctionObjective": false },
        { "id": "FC_QN1A", "name": "P1 Northlink", "type": "QN", "connections": ["FC_CN1", "FC_QN_NW", "FC_QN_N1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 25, "y": 10 }, "continent": "P1-Base" },
        { "id": "FC_QN1B", "name": "P1 Westlink", "type": "QN", "connections": ["FC_CN1", "FC_QN_NW", "FC_QN_W1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 25, "y": 30 }, "continent": "P1-Base" },
        { "id": "FC_CN2", "name": "AXIOM Core", "type": "CN", "connections": ["FC_QN2A", "FC_QN2B"], "resourcesPerTurn": 3, "hasFabricationHub": false, "mapPosition": { "x": 85, "y": 80 }, "continent": "P2-Base", "isKeyJunctionObjective": false },
        { "id": "FC_QN2A", "name": "P2 Eastlink", "type": "QN", "connections": ["FC_CN2", "FC_QN_SE", "FC_QN_E1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 75, "y": 70 }, "continent": "P2-Base" },
        { "id": "FC_QN2B", "name": "P2 Southlink", "type": "QN", "connections": ["FC_CN2", "FC_QN_SE", "FC_QN_S1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 75, "y": 90 }, "continent": "P2-Base" },

        { "id": "FC_KJ_Alpha", "name": "KJ Alpha", "type": "KJ", "connections": ["FC_QN_NW", "FC_QN_NE", "FC_KJ_Beta", "FC_KJ_Gamma"], "resourcesPerTurn": 2, "hasFabricationHub": true, "mapPosition": { "x": 50, "y": 30 }, "isKeyJunctionObjective": true, "continent": "Central-North" },
        { "id": "FC_KJ_Beta", "name": "KJ Beta", "type": "KJ", "connections": ["FC_QN_NW", "FC_QN_SW", "FC_KJ_Alpha", "FC_KJ_Delta"], "resourcesPerTurn": 2, "hasFabricationHub": true, "mapPosition": { "x": 35, "y": 50 }, "isKeyJunctionObjective": true, "continent": "Central-West" },
        { "id": "FC_KJ_Gamma", "name": "KJ Gamma", "type": "KJ", "connections": ["FC_QN_NE", "FC_QN_SE", "FC_KJ_Alpha", "FC_KJ_Delta"], "resourcesPerTurn": 2, "hasFabricationHub": true, "mapPosition": { "x": 65, "y": 50 }, "isKeyJunctionObjective": true, "continent": "Central-East" },
        { "id": "FC_KJ_Delta", "name": "KJ Delta", "type": "KJ", "connections": ["FC_QN_SW", "FC_QN_SE", "FC_KJ_Beta", "FC_KJ_Gamma"], "resourcesPerTurn": 2, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 70 }, "isKeyJunctionObjective": true, "continent": "Central-South" },

        { "id": "FC_QN_N1", "name": "North Flank", "type": "QN", "connections": ["FC_QN1A", "FC_QN_NE"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 10 }, "continent": "North-Flank" },
        { "id": "FC_QN_W1", "name": "West Flank", "type": "QN", "connections": ["FC_QN1B", "FC_QN_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 10, "y": 50 }, "continent": "West-Flank" },
        { "id": "FC_QN_E1", "name": "East Flank", "type": "QN", "connections": ["FC_QN2A", "FC_QN_NE"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 90, "y": 50 }, "continent": "East-Flank" },
        { "id": "FC_QN_S1", "name": "South Flank", "type": "QN", "connections": ["FC_QN2B", "FC_QN_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 90 }, "continent": "South-Flank" },

        { "id": "FC_QN_NW", "name": "P1 Gateway", "type": "QN", "connections": ["FC_QN1A", "FC_QN1B", "FC_KJ_Alpha", "FC_KJ_Beta"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 30, "y": 25 }, "continent": "P1-Approach" },
        { "id": "FC_QN_NE", "name": "NE Connector", "type": "QN", "connections": ["FC_KJ_Alpha", "FC_KJ_Gamma", "FC_QN_N1", "FC_QN_E1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 70, "y": 25 }, "continent": "NE-Cross" },
        { "id": "FC_QN_SW", "name": "SW Connector", "type": "QN", "connections": ["FC_KJ_Beta", "FC_KJ_Delta", "FC_QN_W1", "FC_QN_S1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 30, "y": 75 }, "continent": "SW-Cross" },
        { "id": "FC_QN_SE", "name": "P2 Gateway", "type": "QN", "connections": ["FC_QN2A", "FC_QN2B", "FC_KJ_Gamma", "FC_KJ_Delta"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 70, "y": 75 }, "continent": "P2-Approach" }
    ]
  },
  seraphimGridMapDefinition // Add the new map definition
];

// --- HELPER FUNCTION TO TRANSFORM NCMapDefinition to Record<string, NoosphericNodeData> ---
function transformMapDefinition(mapDef: NCMapDefinition, isFogOfWarActive: boolean): Record<string, NoosphericNodeData> {
  const transformedNodes: Record<string, NoosphericNodeData> = {};

  mapDef.nodes.forEach(nodeDef => {
    let owner: NoosphericPlayerId = 'NEUTRAL';
    let initialStandardUnits = 0;
    const maxUnits = nodeDef.type === 'CN' ? 35 : nodeDef.type === 'KJ' ? 15 : 25; 

    if (isFogOfWarActive) {
        if (nodeDef.id === mapDef.ai1StartNodeId && nodeDef.type === 'CN') {
            owner = 'GEM-Q';
            initialStandardUnits = 15; 
        } else if (nodeDef.id === mapDef.ai2StartNodeId && nodeDef.type === 'CN') {
            owner = 'AXIOM';
            initialStandardUnits = 15; 
        } else {
            // All other nodes start neutral and with 0 units under FoW, unless specifically given units.
            owner = 'NEUTRAL';
            if (nodeDef.type === 'KJ' && mapDef.neutralKJsWithUnits.includes(nodeDef.id)) {
                initialStandardUnits = 5; // Neutral KJs still get units
            } else if (nodeDef.type === 'QN' && mapDef.neutralNodesWithUnits?.includes(nodeDef.id)) {
                initialStandardUnits = 5; // Other specified neutrals get units
            } else {
                initialStandardUnits = 0; // Most nodes start empty under FoW
            }
        }
    } else { // Fog of War is OFF
        if (mapDef.ai1InitialControlledNodes.includes(nodeDef.id)) {
          owner = 'GEM-Q';
          initialStandardUnits = nodeDef.type === 'CN' ? 15 : 10;
        } else if (mapDef.ai2InitialControlledNodes.includes(nodeDef.id)) {
          owner = 'AXIOM';
          initialStandardUnits = nodeDef.type === 'CN' ? 15 : 10;
        } else { // Neutral nodes when FoW is OFF
          if (nodeDef.type === 'KJ' && mapDef.neutralKJsWithUnits.includes(nodeDef.id)) {
            initialStandardUnits = 5;
          } else if (nodeDef.type === 'QN' && mapDef.neutralNodesWithUnits?.includes(nodeDef.id)) {
            initialStandardUnits = 5;
          } else {
            initialStandardUnits = 0; 
          }
        }
    }

    let label: string;
    // Use node ID as label for Seraphim Grid and Classic Lattice, for other maps derive from type/ID parts
    if (mapDef.name === "The Seraphim Grid" || mapDef.name === "Classic Lattice") {
        label = nodeDef.id; 
    } else if (nodeDef.type === 'QN') {
      if (mapDef.name === "Twin Peaks" || mapDef.name === "Fractured Core") {
        const parts = nodeDef.id.split('_');
        label = parts.length > 1 ? parts[parts.length -1] : nodeDef.id; 
      } else if (mapDef.name === "Global Conflict") {
        const parts = nodeDef.id.split('_'); 
        if (parts.length >= 3 && parts[0] === "GC") {
          label = parts[parts.length - 1]; 
        } else {
          label = nodeDef.id; 
        }
      } else {
        label = nodeDef.id; 
      }
    } else { 
        label = nodeDef.type;
    }


    transformedNodes[nodeDef.id] = {
      id: nodeDef.id,
      label: label,
      regionName: nodeDef.name,
      owner: owner,
      standardUnits: initialStandardUnits,
      evolvedUnits: 0, 
      qrOutput: nodeDef.resourcesPerTurn,
      isKJ: nodeDef.type === 'KJ',
      isCN: nodeDef.type === 'CN',
      x: nodeDef.mapPosition.x,
      y: nodeDef.mapPosition.y,
      connections: nodeDef.connections,
      maxUnits: maxUnits,
      hasFabricationHub: nodeDef.hasFabricationHub,
      isHubActive: false, 
      hubDisconnectedTurn: undefined, 
    };
  });
  return transformedNodes;
}

// Store generated map data to avoid re-computation if not necessary,
// but allow re-computation if fog of war state changes.
let cachedMapData: Partial<Record<NoosphericMapType, Record<string, NoosphericNodeData>>> = {};

// --- EXPORTED FUNCTIONS ---
export function getMapDataByType(mapType: NoosphericMapType, isFogOfWarActive: boolean): Record<string, NoosphericNodeData> {
    const mapDefinition = MAP_DEFINITIONS_NC.find(m => m.name === mapType);
    if (!mapDefinition) {
        console.warn(`Unknown map type: ${mapType}, defaulting to Global Conflict.`);
        const defaultMapDef = MAP_DEFINITIONS_NC.find(m => m.name === "Global Conflict")!;
        return transformMapDefinition(defaultMapDef, isFogOfWarActive);
    }
    // Always transform to ensure FoW status is correctly applied, as it's part of the key now.
    return transformMapDefinition(mapDefinition, isFogOfWarActive);
}


export function calculateInitialFactionData(mapNodes: Record<string, NoosphericNodeData>): Record<NoosphericPlayerId, NoosphericFaction> {
  const factions: Record<NoosphericPlayerId, NoosphericFaction> = {
    'GEM-Q': { 
        id: 'GEM-Q', name: AI1_NAME, color: 'var(--color-ai1-text)', qr: 25, 
        nodesControlled: 0, totalUnits: 0, kjsHeld: 0, 
        tacticalAnalysis: "Strategy formulation pending...", 
        totalStandardUnits: 0, totalEvolvedUnits: 0, activeHubsCount: 0,
        successfulAttacks: 0, attacksLost: 0, successfulDefenses: 0, defensesLost: 0,
        successfulTurnAttempts: 0, failedTurnAttempts: 0, 
        unitsPurchased: 0, unitsLost: 0,
        tacticalAnalysisHistory: [] 
    },
    'AXIOM': { 
        id: 'AXIOM', name: AI2_NAME, color: 'var(--color-ai2-text)', qr: 25, 
        nodesControlled: 0, totalUnits: 0, kjsHeld: 0, 
        tacticalAnalysis: "Awaiting scenario parameters...", 
        totalStandardUnits: 0, totalEvolvedUnits: 0, activeHubsCount: 0,
        successfulAttacks: 0, attacksLost: 0, successfulDefenses: 0, defensesLost: 0,
        successfulTurnAttempts: 0, failedTurnAttempts: 0, 
        unitsPurchased: 0, unitsLost: 0,
        tacticalAnalysisHistory: [] 
    },
    'NEUTRAL': { 
        id: 'NEUTRAL', name: 'NEUTRAL', color: '#888888', qr: 0, 
        nodesControlled: 0, totalUnits: 0, kjsHeld: 0, 
        totalStandardUnits: 0, totalEvolvedUnits: 0, activeHubsCount: 0,
        successfulAttacks: 0, attacksLost: 0, successfulDefenses: 0, defensesLost: 0,
        successfulTurnAttempts: 0, failedTurnAttempts: 0,
        unitsPurchased: 0, unitsLost: 0,
        tacticalAnalysisHistory: [] 
    }
  };

  for (const nodeId in mapNodes) {
    const node = mapNodes[nodeId];
    const standardUnitsOnNode = (node.standardUnits || 0);
    const evolvedUnitsOnNode = (node.evolvedUnits || 0);
    const unitsOnNode = standardUnitsOnNode + evolvedUnitsOnNode;

    if (node.owner !== 'NEUTRAL') {
      factions[node.owner].nodesControlled++;
      factions[node.owner].totalStandardUnits += standardUnitsOnNode;
      factions[node.owner].totalEvolvedUnits += evolvedUnitsOnNode;
      factions[node.owner].totalUnits += unitsOnNode;
      if (node.isKJ) { 
        factions[node.owner].kjsHeld++;
      }
      if (node.hasFabricationHub && node.isHubActive) {
        factions[node.owner].activeHubsCount++;
      }
    } else {
      factions['NEUTRAL'].nodesControlled++;
      factions['NEUTRAL'].totalStandardUnits += standardUnitsOnNode;
      factions['NEUTRAL'].totalEvolvedUnits += evolvedUnitsOnNode;
      factions['NEUTRAL'].totalUnits += unitsOnNode;
       if (node.isKJ) {
        factions['NEUTRAL'].kjsHeld++;
      }
    }
  }
  return factions;
}
