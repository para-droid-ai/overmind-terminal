export enum AppMode {
  NOOSPHERIC_CONQUEST = 'noospheric_conquest.exe',
  GLOBAL_CONFLICT = 'global_conflict.exe',
  QUANTUM_GAMBIT = 'quantum_gambit.exe',
  SIMULATION_ARCHIVE = 'simulation_archive.exe',
  DEBUG_OVERLAY = 'debug_overlay.exe',
}

export type PlayerId = 'AI1_ID' | 'AI2_ID' | 'NEUTRAL';

export enum QuantumUnitType {
  LOGIC_CORE = 'LOGIC_CORE',
  SHIELDING_NODE_UNIT = 'SHIELDING_NODE_UNIT',
  QUANTUM_ENTANGLER = 'QUANTUM_ENTANGLER',
}

export interface QuantumUnit {
    id: string;
    type: QuantumUnitType;
    owner: PlayerId;
    nodeId: string;
    displayOrder: number;
    hasMovedThisTurn?: boolean;
    hasAttackedThisTurn?: boolean;
}

export interface QuantumGambitNode {
    id: string;
    name: string;
    type: 'CN' | 'KJ' | 'REGULAR';
    mapPosition: { x: number; y: number };
    connections: string[];
    owner: PlayerId;
    resourcesPerTurn: number;
    hasFabricationHub: boolean;
    isKeyJunctionObjective: boolean;
    temporaryEffects: any[]; // Define a proper type for effects if needed
}

export interface QuantumGambitPlayerState {
    id: PlayerId;
    name: string;
    color: string;
    bgColor: string;
    resources: number;
    commandNodeId: string;
    controlledKeyJunctionsTurns: Record<string, number>;
    unitsDeployed: number;
}

export interface GameLogEntry {
    id: string;
    sender: string;
    text: string;
    color: string;
    icon?: React.ReactNode; // Use React.ReactNode for the icon
    timestamp: number;
}

export interface CombatRoundLog {
  round: number;
  attackerRoll: number;
  defenderRoll: number;
  attackerModifiedRoll?: number;
  defenderModifiedRoll?: number;
  outcome: 'attacker_hits' | 'defender_hits' | 'clash';
  attackerUnitsRemaining: number;
  defenderUnitsRemaining: number;
}

export interface BattleReport {
    fromNodeId: string;
    toNodeId: string;
    attacker: PlayerId;
    defender: PlayerId | 'NEUTRAL';
    attackingUnitsCommitted: QuantumUnit[];
    defendingUnitsInitial: QuantumUnit[];
    attackerLosses: QuantumUnit[];
    defenderLosses: QuantumUnit[];
    outcome: 'attacker_wins' | 'defender_wins' | 'stalemate_retreat' | 'defender_eliminated_no_capture' | 'pending';
    nodeCaptured: boolean;
    combatLog?: CombatRoundLog[]; // Detailed log of each dice roll exchange
    turn: number;
}

export interface QuantumFluctuationEventBase {
    id: string;
    descriptionTemplate: string;
    effectType: string;
    details?: any;
}

export interface ActiveQuantumFluctuationEvent {
    id: string;
    effectType: string;
    resolvedDescription: string;
    targetNodeIds?: string[];
    targetPlayerId?: PlayerId;
    details?: any; 
    effectApplied: boolean;
    isActiveThisTurn: boolean;
}

export interface MapTemplate {
    name: string;
    nodes: QuantumGambitNode[];
    ai1StartNodeId: string;
    ai2StartNodeId: string;
    ai1InitialControlledNodes: string[];
    ai2InitialControlledNodes: string[];
    neutralKJsWithUnits?: string[];
    neutralNodesWithUnits?: string[];
}

export type GamePhase = 'FLUCTUATION' | 'RESOURCE' | 'DEPLOYMENT' | 'ATTACK' | 'MANEUVER' | 'GAME_OVER';

export interface NoosphericConquestGameState {
  nodes: Record<string, QuantumGambitNode>;
  units: Record<string, QuantumUnit>;
  players: Record<PlayerId, QuantumGambitPlayerState>;
  currentTurn: number;
  currentPlayerId: PlayerId;
  currentPhase: GamePhase;
  gameLog: GameLogEntry[];
  activeFluctuationEvent: ActiveQuantumFluctuationEvent | null;
  battleReport: BattleReport | null;
  battleHistory: BattleReport[];
  keyJunctionsOnMap: string[];
  turnLimit: number;
  isBattlePopupVisible: boolean;
  turnStartTime: number | null;
  selectedNodeId: string | null;
  currentMapTemplateName: string;
  winner?: PlayerId | 'DRAW';
  gameOverMessage?: string;
  turnDurations: number[];
}

export type GameAction = 
  | { type: 'ADD_LOG'; payload: { sender: string; text: string; color?: string; icon?: React.ReactNode; } }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'SET_ACTIVE_EVENT'; payload: ActiveQuantumFluctuationEvent | null }
  | { type: 'APPLY_EVENT_EFFECTS_COMPLETE' }
  | { type: 'COLLECT_RESOURCES' }
  | { type: 'DEPLOY_UNITS'; payload: { playerId: PlayerId; deployments: { unitType: QuantumUnitType; nodeId: string; quantity: number }[] } }
  | { type: 'DECLARE_ATTACK'; payload: { attack: { fromNodeId: string; toNodeId: string; attackingUnits: QuantumUnit[] }; battleReport: BattleReport } }
  | { type: 'SHOW_BATTLE_POPUP'; payload: BattleReport }
  | { type: 'HIDE_BATTLE_POPUP' }
  | { type: 'MANEUVER_UNITS'; payload: { playerId: PlayerId; maneuvers: { unitId: string; toNodeId: string }[] } }
  | { type: 'RESET_GAME_FOR_NEW_TURN'; payload?: { units?: Record<string, Partial<QuantumUnit>> } }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'SET_GAME_OVER'; payload: { winner: PlayerId | 'DRAW'; message: string } }
  | { type: 'START_GAME'; payload?: { templateName?: string } }; 