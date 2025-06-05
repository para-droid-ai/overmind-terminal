import { NoosphericConquestGameState, PlayerId, QuantumUnitType, GamePhase, ActiveQuantumFluctuationEvent, QuantumFluctuationEventBase } from '../../types';
import { AI1_ID, AI2_ID, NC_UNIT_DEFINITIONS, SYSTEM_SENDER_NAME, THEME_COLORS } from './constants';

export const NC_QUANTUM_FLUCTUATION_EVENTS_POOL: QuantumFluctuationEventBase[] = [
  { id: "QF001", descriptionTemplate: "Resource Surge! Node {targetNodeName} produces +2 QR for its controller this turn.", effectType: "RESOURCE_NODE_BONUS", details: { bonusValue: 2, numTargetNodes: 1, targetCriteria: "ANY_CONTROLLED" } },
  { id: "QF002", descriptionTemplate: "Temporal Anomaly! {playerName} gains an extra Maneuver Phase this turn.", effectType: "EXTRA_MANEUVER_PHASE", details: {} },
  { id: "QF003", descriptionTemplate: "Weakened Defenses near {targetNodeName}! Units in {targetNodeName} and its direct connections have -1 to their defense roll results this turn.", effectType: "REGIONAL_DEFENSE_DEBUFF", details: { debuffValue: 1, numTargetNodes: 1, targetCriteria: "ANY" } },
  { id: "QF004", descriptionTemplate: "Entanglement Echo! {playerName} can deploy 1 Logic Core to any friendly node with a Fabrication Hub for free.", effectType: "FREE_UNIT_DEPLOYMENT", details: { unitType: QuantumUnitType.LOGIC_CORE, quantity: 1 } },
];

export const getBoardStringRepresentation = (gs: NoosphericConquestGameState, perspectivePlayerId: PlayerId): string => {
    let boardStr = "";
    Object.values(gs.nodes).forEach(node => {
        const unitsInNode = Object.values(gs.units).filter(u => u.nodeId === node.id);
        const unitSummary = unitsInNode.map(u => `${u.type}(${u.owner})`).join(',');
        boardStr += `${node.id}(Type:${node.type},Owner:${node.owner},Res:${node.resourcesPerTurn},Hub:${node.hasFabricationHub?'Y':'N'},Units:[${unitSummary}],Conn:[${node.connections.join(',')}]); `;
    });
    return boardStr.slice(0, -2); 
};

export const getUnitsStringRepresentation = (gs: NoosphericConquestGameState, forPlayerId: PlayerId, type: 'player' | 'opponent'): string => {
    const targetPlayerId = type === 'player' ? forPlayerId : (forPlayerId === AI1_ID ? AI2_ID : AI1_ID);
    const playerUnits = Object.values(gs.units).filter(u => u.owner === targetPlayerId);
    if (playerUnits.length === 0) return "None";
    return playerUnits.map(u => `${u.id}(Type:${u.type},Node:${u.nodeId})`).join(', ');
};

export const parseAIResponse = (responseText: string, addLog: (sender: string, text: string, color?: string, icon?: unknown) => void, currentPhase: GamePhase): { actions: any[], cot: string } => {
    try {
        const jsonStartIndex = responseText.indexOf('{');
        const jsonEndIndex = responseText.lastIndexOf('}');

        if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex < jsonStartIndex) {
            throw new Error("No valid JSON object found in AI response.");
        }

        const jsonString = responseText.substring(jsonStartIndex, jsonEndIndex + 1);
        const aiResponse = JSON.parse(jsonString); 
        
        return {
            actions: aiResponse.actions || [{ ACTION_TYPE: "PASS" }],
            cot: aiResponse.cot || "AI did not provide CoT."
        };
    } catch (e) {
        console.error("Error parsing AI JSON response:", e, "Response was:", responseText);
        addLog(SYSTEM_SENDER_NAME, `Error parsing AI JSON: ${(e as Error).message}. AI will pass.`, THEME_COLORS.ERROR);
        return { actions: [{ ACTION_TYPE: "PASS" }], cot: "Error parsing AI response. Passing turn." };
    }
}; 