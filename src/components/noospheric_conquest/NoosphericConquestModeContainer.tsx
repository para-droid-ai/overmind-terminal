import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useReducer } from 'react';
import { 
    LucideSwords, LucideShield, LucideZap, LucideAtom, LucideBrain,
    LucideDollarSign, LucideDice5, LucideHelpCircle, LucideMove, LucidePlusCircle,
    LucideAlertTriangle, LucideInfo, LucideMapPin, LucideTarget, LucideFactory, LucideBox,
    LucideShuffle, LucideGlobe, LucideMap, LucideX, LucideScrollText, LucideArrowLeftToLine
} from 'lucide-react';
import { gameReducer, initialGameState } from './gameState';
import { AI1_ID, AI2_ID, SYSTEM_SENDER_NAME, EVENT_SENDER_NAME, THEME_COLORS, NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED, NOOSPHERIC_CONQUEST_TURN_LIMIT } from './constants';
import { getBoardStringRepresentation, getUnitsStringRepresentation, parseAIResponse, NC_QUANTUM_FLUCTUATION_EVENTS_POOL } from './utils';
import { CoTDisplay, UnitIcon, QuantumGambitMapDisplay, MiniMapDisplay, NodeInfoPanel, BattlePopup, InfoScreenPopup, BattleHistoryPanel } from './ui';
import { PlayerId, GamePhase, ActiveQuantumFluctuationEvent, QuantumUnit, MapTemplate, NoosphericConquestGameState, GameAction } from '../../types';

export const NoosphericConquestModeContainer: React.FC = () => { 
  const [gameState, dispatch] = useReducer(gameReducer, undefined, initialGameState); 
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const battlePopupDisplayTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  const [displayedTurnTime, setDisplayedTurnTime] = useState("00:00");
  const turnTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedMapTemplateName, setSelectedMapTemplateName] = useState<string | undefined>(undefined);
  const [isInfoScreenVisible, setIsInfoScreenVisible] = useState(false);
  const [averageTurnTime, setAverageTurnTime] = useState("00:00");
  
  const [ai1CoT, setAi1CoT] = useState<string | undefined>("Awaiting GEM-Q's first analysis...");
  const [ai2CoT, setAi2CoT] = useState<string | undefined>("Awaiting AXIOM's first analysis...");
  const [isAiThinking, setIsAiThinking] = useState(false); 

  const ai1ChatRef = useRef<any>(null); 
  const ai2ChatRef = useRef<any>(null);


  const addLog = useCallback((sender: string, text: string, color?: string, icon?: React.ReactNode) => {
    dispatch({ type: 'ADD_LOG', payload: { sender, text, color, icon } });
  }, []);
  
  const handleNodeClick = useCallback((nodeId: string) => {
    dispatch({ type: 'SELECT_NODE', payload: nodeId });
  }, []);
  
  const handleAIPlayerTurn = useCallback(async (playerId: PlayerId, currentGameState: NoosphericConquestGameState): Promise<boolean> => { 
    setIsAiThinking(true);
    addLog(playerId, "Analyzing quantum lattice...", currentGameState.players[playerId].color, <LucideBrain size={14}/>);

    const { currentTurn, currentPhase, players, activeFluctuationEvent, keyJunctionsOnMap, turnLimit, currentMapTemplateName, units: gameUnits, nodes: gameNodes } = currentGameState; 
    const playerState = players[playerId];
    const opponentId = playerId === AI1_ID ? AI2_ID : AI1_ID;
    
    const nodeSummaryString = getBoardStringRepresentation(currentGameState, playerId);
    const playerUnitSummaryString = getUnitsStringRepresentation(currentGameState, playerId, 'player');
    const opponentUnitSummaryString = getUnitsStringRepresentation(currentGameState, playerId, 'opponent');
    const keyJunctionsListString = keyJunctionsOnMap.join(', ');
    
    const promptTemplate = playerId === AI1_ID ? 
        (currentMapTemplateName: string, consecutiveKJTurnsNeeded: number, keyJunctionsListString: string, opponentCommandNodeId: string, playerCommandNodeId: string, turnLimit: number, currentTurn: number, playerName: string, playerResources: number, currentPhase: GamePhase, activeEventDescription: string, nodeSummaryString: string, playerUnitSummaryString: string, opponentUnitSummaryString: string) => 
            `System #GEM-Q_NoosphericStrategos_v1.1>\\nYou are GEM-Q, commanding the Red forces in the strategic simulation \\\"Noospheric Conquest.\\\"\\nYour objective is to achieve Noospheric Dominance. Victory Conditions:\\n1. Key Junction Control: Control all designated Key Quantum Junctions (KJs) on map \\\"${currentMapTemplateName}\\\" for ${consecutiveKJTurnsNeeded} consecutive full turns. KJs are: ${keyJunctionsListString}.\\n2. Command Node Decapitation: Capture AXIOM\\\'s (Cyan forces) Command Node at ${opponentCommandNodeId}. Your CN is ${playerCommandNodeId}.\\n3. Influence Victory: If Turn Limit (${turnLimit}) is reached, win by highest Quantum Influence (Resources + (Sum of Controlled Node Resource Values x 5) + (Sum of Own Unit Costs x 1)).\\nCURRENT GAME STATE: Turn: ${currentTurn} / ${turnLimit}. Your Faction (Red): ${playerName}. Your Resources (QR): ${playerResources}. Current Phase: ${currentPhase}. Active Quantum Fluctuation Event: ${activeEventDescription}.\\nMAP NODES SUMMARY (ID(Type,Owner,Res:QR/turn,Hub:Y/N,Units:[Type(Owner)xCount,...],Conn:[IDs...])): ${nodeSummaryString}\\nYOUR UNITS (UnitID(Type,AtNodeID)): ${playerUnitSummaryString}\\nOPPONENT UNITS (Known - UnitID(Type,AtNodeID)): ${opponentUnitSummaryString}\\nUNIT DEFINITIONS & COSTS (QR): LC:3(2A/2D); SN:4(1A/3D,Special:Bastion); QE:5(1A/1D,Special:PhaseShift/Interference).\\nPHASE-SPECIFIC INSTRUCTIONS: Respond ONLY for CURRENT PHASE: ${currentPhase}. FORMAT: ACTION_TYPE: [details];... | COT: reasoning. Use PASS if no actions.\\nDEPLOY: [UNIT_TYPE,NODE_ID,QTY] (Node must be friendly Hub).\\nATTACK: [FROM_NODE_ID,TO_NODE_ID,UNIT_ID_1,UNIT_ID_2,...] (Attack adjacent non-friendly).\\nMANEUVER: [UNIT_ID,TO_NODE_ID] (Move to adjacent friendly. Attacked/deployed units usually cannot maneuver).\\nSPECIAL_ACTION: [PHASE_SHIFT,UNIT_TO_MOVE_ID,TARGET_NODE_ID,QE_UNIT_ID] OR [INTERFERENCE_PULSE,TARGET_ENEMY_NODE_ID,QE_UNIT_ID].\\nPrioritize KJs. Defend CN. Expand. Use abilities. Adapt.\\nProvide actions for ${currentPhase}:</System>`
        : (currentMapTemplateName: string, consecutiveKJTurnsNeeded: number, keyJunctionsListString: string, opponentCommandNodeId: string, playerCommandNodeId: string, turnLimit: number, currentTurn: number, playerName: string, playerResources: number, currentPhase: GamePhase, activeEventDescription: string, nodeSummaryString: string, playerUnitSummaryString: string, opponentUnitSummaryString: string) => 
            `<System #AXIOM_NoosphericTactician_v1.1>\\nYou are AXIOM, commanding the Cyan forces in \\\"Noospheric Conquest.\\\"\\nObjective: Dominate. Victory: 1. All KJs on map \\\"${currentMapTemplateName}\\\" for ${consecutiveKJTurnsNeeded} turns (KJs: ${keyJunctionsListString}). 2. Capture GEM-Q\\\'s (Red) CN at ${opponentCommandNodeId}. Your CN is ${playerCommandNodeId}. 3. Influence at Turn Limit (${turnLimit}).\\nCURRENT GAME STATE: Turn: ${currentTurn} / ${turnLimit}. Your Faction (Cyan): ${playerName}. QR: ${playerResources}. Phase: ${currentPhase}. Event: ${activeEventDescription}.\\nMAP: ${nodeSummaryString}\\nYOUR UNITS: ${playerUnitSummaryString}\\nOPPONENT UNITS: ${opponentUnitSummaryString}\\nUNITS: LC:3QR(2A/2D); SN:4QR(1A/3D,Special:Bastion); QE:5QR(1A/1D,Special:PhaseShift/Interference).\\nINSTRUCTIONS: Respond ONLY for CURRENT PHASE: ${currentPhase}. FORMAT: ACTION_TYPE: [details];... | COT: reasoning. Use PASS if no actions.\\nDEPLOY: [UNIT_TYPE,NODE_ID,QTY] (Node must be friendly Hub).\\nATTACK: [FROM_NODE_ID,TO_NODE_ID,UNIT_ID_1,...] (Attack adjacent non-friendly).\\nMANEUVER: [UNIT_ID,TO_NODE_ID] (Move to adjacent friendly. Attacked/deployed units usually cannot maneuver).\\nSPECIAL_ACTION: [PHASE_SHIFT,UNIT_TO_MOVE_ID,TARGET_NODE_ID,QE_UNIT_ID] OR [INTERFERENCE_PULSE,TARGET_ENEMY_NODE_ID,QE_UNIT_ID].\\nPrioritize KJs. Defend CN. Expand. Use abilities. Adapt.\\nActions for ${currentPhase}:</System>`;

    const fullPrompt = promptTemplate(
        currentMapTemplateName,
        NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED,
        keyJunctionsListString,
        players[opponentId].commandNodeId,
        playerState.commandNodeId,
        turnLimit,
        currentTurn,
        playerState.name,
        playerState.resources,
        currentPhase,
        activeFluctuationEvent?.resolvedDescription || "None",
        nodeSummaryString,
        playerUnitSummaryString,
        opponentUnitSummaryString
    );

    let aiPassedUltimately = false; 
    try {        
        const apiKey = process.env.GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "actions": {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    "ACTION_TYPE": { "type": "STRING", "enum": ["DEPLOY", "ATTACK", "MANEUVER", "SPECIAL_ACTION", "PASS"] },
                                    "UNIT_TYPE": { "type": "STRING", "enum": ["LC", "SN", "QE"], "nullable": true },
                                    "NODE_ID": { "type": "STRING", "nullable": true }, 
                                    "QUANTITY": { "type": "NUMBER", "nullable": true }, 
                                    "FROM_NODE_ID": { "type": "STRING", "nullable": true }, 
                                    "TO_NODE_ID": { "type": "STRING", "nullable": true }, 
                                    "UNIT_IDS": { "type": "ARRAY", "items": {"type": "STRING"}, "nullable": true }, 
                                    "UNIT_ID": {"type": "STRING", "nullable": true}, 
                                    "ACTION_NAME": { "type": "STRING", "nullable": true }, 
                                    "PERFORMING_UNIT_ID": { "type": "STRING", "nullable": true } 
                                }
                            }
                        },
                        "cot": { "type": "STRING" }
                    },
                    required: ["actions", "cot"]
                }
            }
        };

        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API error: ${response.status} ${errorBody}`);
        }
        const result = await response.json();

        if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0].text) {
            throw new Error("Invalid response structure from Gemini API.");
        }
        
        const {actions: rawActions, cot: parsedCot} = parseAIResponse(result.candidates[0].content.parts[0].text, addLog, currentPhase);


        if (playerId === AI1_ID) setAi1CoT(parsedCot); else setAi2CoT(parsedCot);
        addLog(playerId, `CoT: ${parsedCot?.substring(0,150) || ''}...`, players[playerId].color);


        if (rawActions.length > 0 && rawActions[0].ACTION_TYPE !== 'PASS') {
            const gameActions = rawActions.map((action: any) => {
                // Basic validation for required fields based on ACTION_TYPE
                if (action.ACTION_TYPE === "DEPLOY" && (!action.UNIT_TYPE || !action.NODE_ID || typeof action.QUANTITY !== 'number')) return null;
                if (action.ACTION_TYPE === "ATTACK" && (!action.FROM_NODE_ID || !action.TO_NODE_ID || !action.UNIT_IDS || !Array.isArray(action.UNIT_IDS))) return null;
                if (action.ACTION_TYPE === "MANEUVER" && (!action.UNIT_ID || !action.TO_NODE_ID)) return null;

                switch(action.ACTION_TYPE) { 
                    case "DEPLOY":
                        return { type: 'DEPLOY_UNITS', payload: { playerId, deployments: [{ unitType: action.UNIT_TYPE, nodeId: action.NODE_ID, quantity: action.QUANTITY }] }};
                    case "ATTACK":
                        const attackingUnitIds = action.UNIT_IDS || []; 
                        const attackingUnits = attackingUnitIds.map((id: string) => gameUnits[id]).filter(Boolean) as QuantumUnit[];
                        if (attackingUnits.length === 0 && attackingUnitIds.length > 0) {
                            addLog(SYSTEM_SENDER_NAME, `${playerId} tried to attack with non-existent/invalid units. Attack failed.`, THEME_COLORS.ERROR);
                            return null; 
                        }
                        const defendersInNode = Object.values(gameUnits).filter(u => u.nodeId === action.TO_NODE_ID && u.owner !== playerId);
                        let attackerLossesCount = Math.random() < 0.3 ? Math.min(1, attackingUnits.length) : 0;
                        let defenderLossesCount = Math.random() < 0.5 ? Math.min(1, defendersInNode.length) : 0;
                        const battleReport = {
                            turn: currentGameState.currentTurn, 
                            attacker: playerId, defender: gameNodes[action.TO_NODE_ID].owner as PlayerId, 
                            fromNodeId: action.FROM_NODE_ID, toNodeId: action.TO_NODE_ID,
                            attackingUnitsCommitted: attackingUnits.map(u => ({type: u.type, id: u.id})),
                            defendingUnitsInitial: defendersInNode.map(u => ({type: u.type, id: u.id})),
                            rounds: [{ attackerRolls: [6], defenderRolls: [3], attackerCasualties: attackerLossesCount, defenderCasualties: defenderLossesCount }],
                            outcome: (defendersInNode.length - defenderLossesCount === 0) ? 'attacker_wins' : 'defender_wins',
                            attackerLosses: attackerLossesCount > 0 && attackingUnits.length > 0 ? attackingUnits.slice(0, attackerLossesCount).map(u=>({type: u.type, id: u.id})) : [],
                            defenderLosses: defenderLossesCount > 0 && defendersInNode.length > 0 ? defendersInNode.slice(0, defenderLossesCount).map(u=>({type: u.type, id: u.id})) : [],
                            nodeCaptured: (defendersInNode.length - defenderLossesCount === 0),
                        };
                        return { type: 'DECLARE_ATTACK', payload: { attack: {fromNodeId: action.FROM_NODE_ID, toNodeId: action.TO_NODE_ID, attackingUnits}, battleReport } };
                    case "MANEUVER":
                        return { type: 'MANEUVER_UNITS', payload: { playerId, maneuvers: [{ unitId: action.UNIT_ID, toNodeId: action.TO_NODE_ID }] }};
                    default: return null;
                }
            }).filter(Boolean) as GameAction[];

            if (gameActions.length > 0) {
                gameActions.forEach(ga => dispatch(ga));
            } else { 
                 addLog(playerId, "AI proposed invalid actions or no valid actions found in response. Passing phase.", players[playerId].color);
                 aiPassedUltimately = true;
            }
        } else { 
            addLog(playerId, "Passing phase.", players[playerId].color);
            aiPassedUltimately = true;
        }
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error("Error in AI turn (Gemini API):", errorMessage);
        let logMsg = `${playerId} encountered an API error. Using fallback.`;
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
            logMsg = `${playerId} API Auth Error (${errorMessage.match(/(\d{3})/)?.[0]}). Using fallback. Check console for details: ${errorMessage.substring(0,150)}`;
        } else if (errorMessage.includes("Invalid response structure")) {
            logMsg = `${playerId} API response error. Using fallback. Check console.`;
        }
        addLog(SYSTEM_SENDER_NAME, logMsg, THEME_COLORS.ERROR);
        if (playerId === AI1_ID) setAi1CoT("API Error. Using fallback logic."); else setAi2CoT("API Error. Using fallback logic.");
        aiPassedUltimately = true;
    } finally {
        setIsAiThinking(false);
    }
    return aiPassedUltimately; 
  }, [addLog, parseAIResponse]); 
  
  const toggleAutoPlay = () => { 
    setIsAutoPlaying(prev => {
        if (!prev && gameState.currentPhase === 'GAME_OVER') { 
            const templateName = selectedMapTemplateName;
            dispatch({type: 'START_GAME', payload: {templateName}});
            return true;
        }
        return !prev;
    });
    if (autoPlayIntervalRef.current) {
      clearTimeout(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
     if (battlePopupDisplayTimeoutRef.current) { 
      clearTimeout(battlePopupDisplayTimeoutRef.current);
      battlePopupDisplayTimeoutRef.current = null;
    }
  };
  
  const handleAdvanceManually = async () => { 
      if (gameState.currentPhase === 'GAME_OVER') {
          const templateName = selectedMapTemplateName;
          dispatch({type: 'START_GAME', payload: {templateName}});
          return;
      }
      if (gameState.isBattlePopupVisible) {
          dispatch({type: 'HIDE_BATTLE_POPUP'});
          if (gameState.currentPhase === 'ATTACK') {
             setTimeout(() => dispatch({ type: 'ADVANCE_PHASE' }), 200);
          }
          return;
      }

      let advancePhaseAfterCurrentProcessing = false;

      switch (gameState.currentPhase) {
        case 'FLUCTUATION':
          const randomEventBase = NC_QUANTUM_FLUCTUATION_EVENTS_POOL[Math.floor(Math.random() * NC_QUANTUM_FLUCTUATION_EVENTS_POOL.length)];
          const eventPrompt = `Generate a short, flavorful event description for a sci-fi strategy game event. Event Type: "${randomEventBase.effectType}". Details: ${JSON.stringify(randomEventBase.details)}. Current Turn: ${gameState.currentTurn}. Player: ${gameState.players[gameState.currentPlayerId].name}.`;
          let dynamicDescription = randomEventBase.descriptionTemplate.replace("{playerName}", gameState.players[gameState.currentPlayerId].name); 

          try {
            const apiKey = process.env.GEMINI_API_KEY;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; 
            const payload = { contents: [{ role: "user", parts: [{ text: eventPrompt }] }] };
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) {
                const errorBody = await response.text(); 
                throw new Error(`API error: ${response.status} ${errorBody}`);
            }
            const result = await response.json();
            if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text) {
                 dynamicDescription = result.candidates[0].content.parts[0].text;
            } else {
                console.warn("Could not parse Gemini response for event description, using template.");
            }
          } catch (error) {
            const errorMessage = (error as Error).message;
            console.error("Error fetching dynamic event description:", errorMessage); 
            let logMessage = `Event Gen Error: ${errorMessage.substring(0,100)}. Using template.`;
             if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
                logMessage = `Event Gen API Auth Error (${errorMessage.match(/(\d{3})/)?.[0]}). Using template. Check console.`;
            }
            addLog(SYSTEM_SENDER_NAME, logMessage, THEME_COLORS.ERROR);
          }

          let targetNodeIds: string[] | undefined;
          if (randomEventBase.descriptionTemplate.includes("{targetNodeName}") && !dynamicDescription.includes(gameState.players[gameState.currentPlayerId].name)) { 
            const availableNodes = Object.values(gameState.nodes).filter(n => (randomEventBase.details.targetCriteria === "ANY_CONTROLLED" && n.owner === gameState.currentPlayerId) || (randomEventBase.details.targetCriteria === "ANY"));
            if (availableNodes.length > 0) {
                const targetNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];
                dynamicDescription = dynamicDescription.replace(/{targetNodeName}/g, targetNode.name); 
                targetNodeIds = [targetNode.id];
            } else { dynamicDescription += " (No valid targets found)"; }
          }
          const activeEvent: ActiveQuantumFluctuationEvent = { ...randomEventBase, resolvedDescription: dynamicDescription, targetNodeIds, targetPlayerId: gameState.currentPlayerId, isActiveThisTurn: true, effectApplied: false };
          dispatch({ type: 'SET_ACTIVE_EVENT', payload: activeEvent });
          addLog(EVENT_SENDER_NAME, activeEvent.resolvedDescription, THEME_COLORS.EVENT, <LucideAtom size={14}/>);
          dispatch({ type: 'APPLY_EVENT_EFFECTS_COMPLETE' });
          advancePhaseAfterCurrentProcessing = true;
          break;
        case 'RESOURCE':
          addLog(gameState.currentPlayerId, `Collecting Quantum Resources...`, gameState.players[gameState.currentPlayerId].color, <LucideDollarSign size={14}/>);
          dispatch({ type: 'COLLECT_RESOURCES' });
          advancePhaseAfterCurrentProcessing = true;
          break;
        case 'DEPLOYMENT': 
        case 'ATTACK': 
        case 'MANEUVER':
          const aiEffectivelyPassed = await handleAIPlayerTurn(gameState.currentPlayerId, gameState); 
          if (aiEffectivelyPassed && !gameState.isBattlePopupVisible) {
            advancePhaseAfterCurrentProcessing = true;
          } else if (!aiEffectivelyPassed && !gameState.isBattlePopupVisible) { 
            advancePhaseAfterCurrentProcessing = true;
          }
          break;
        default: break;
      }
      
      if(advancePhaseAfterCurrentProcessing && !gameState.isBattlePopupVisible){ 
          dispatch({ type: 'ADVANCE_PHASE' });
      }
  };

  useEffect(() => {
    if (gameState.currentPhase === 'GAME_OVER' || !isAutoPlaying || isAiThinking) {
      if (isAutoPlaying && gameState.currentPhase === 'GAME_OVER') setIsAutoPlaying(false);
      if (battlePopupDisplayTimeoutRef.current) clearTimeout(battlePopupDisplayTimeoutRef.current);
      return;
    }

    const performStep = async () => { 
      if (gameState.currentPhase === 'GAME_OVER') {
          setIsAutoPlaying(false);
          return;
      }

      if (gameState.isBattlePopupVisible && isAutoPlaying) { 
          if (battlePopupDisplayTimeoutRef.current) clearTimeout(battlePopupDisplayTimeoutRef.current);
          battlePopupDisplayTimeoutRef.current = setTimeout(() => {
              const phaseBeforeHide = gameState.currentPhase; 
              dispatch({type: 'HIDE_BATTLE_POPUP'});
              if (phaseBeforeHide === 'ATTACK') { 
                   dispatch({ type: 'ADVANCE_PHASE' });
              }
          }, 2500); 
          return; 
      }
      
      let advancePhaseAfterCurrentProcessing = false;

      switch (gameState.currentPhase) {
        case 'FLUCTUATION':
          const randomEventBase = NC_QUANTUM_FLUCTUATION_EVENTS_POOL[Math.floor(Math.random() * NC_QUANTUM_FLUCTUATION_EVENTS_POOL.length)];
          const eventPrompt = `Generate a short, flavorful event description for a sci-fi strategy game event. Event Type: "${randomEventBase.effectType}". Details: ${JSON.stringify(randomEventBase.details)}. Current Turn: ${gameState.currentTurn}. Player: ${gameState.players[gameState.currentPlayerId].name}.`;
          let dynamicDescription = randomEventBase.descriptionTemplate.replace("{playerName}", gameState.players[gameState.currentPlayerId].name); 

          try {
            const apiKey = process.env.GEMINI_API_KEY;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; 
            const payload = { contents: [{ role: "user", parts: [{ text: eventPrompt }] }] };
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) {
                const errorBody = await response.text(); 
                throw new Error(`API error: ${response.status} ${errorBody}`);
            }
            const result = await response.json();
            if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text) {
                 dynamicDescription = result.candidates[0].content.parts[0].text;
            } else {
                console.warn("Could not parse Gemini response for event description, using template.");
            }
          } catch (error) {
            const errorMessage = (error as Error).message;
            console.error("Error fetching dynamic event description:", errorMessage); 
            let logMessage = `Event Gen Error: ${errorMessage.substring(0,100)}. Using template.`;
             if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
                logMessage = `Event Gen API Auth Error (${errorMessage.match(/(\d{3})/)?.[0]}). Using template. Check console.`;
            }
            addLog(SYSTEM_SENDER_NAME, logMessage, THEME_COLORS.ERROR);
          }

          let targetNodeIds: string[] | undefined;
          if (randomEventBase.descriptionTemplate.includes("{targetNodeName}") && !dynamicDescription.includes(gameState.players[gameState.currentPlayerId].name)) { 
            const availableNodes = Object.values(gameState.nodes).filter(n => (randomEventBase.details.targetCriteria === "ANY_CONTROLLED" && n.owner === gameState.currentPlayerId) || (randomEventBase.details.targetCriteria === "ANY"));
            if (availableNodes.length > 0) {
                const targetNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];
                dynamicDescription = dynamicDescription.replace(/{targetNodeName}/g, targetNode.name); 
                targetNodeIds = [targetNode.id];
            } else { dynamicDescription += " (No valid targets found)"; }
          }
          const activeEvent: ActiveQuantumFluctuationEvent = { ...randomEventBase, resolvedDescription: dynamicDescription, targetNodeIds, targetPlayerId: gameState.currentPlayerId, isActiveThisTurn: true, effectApplied: false };
          dispatch({ type: 'SET_ACTIVE_EVENT', payload: activeEvent });
          addLog(EVENT_SENDER_NAME, activeEvent.resolvedDescription, THEME_COLORS.EVENT, <LucideAtom size={14}/>);
          dispatch({ type: 'APPLY_EVENT_EFFECTS_COMPLETE' });
          advancePhaseAfterCurrentProcessing = true;
          break;
        case 'RESOURCE':
          addLog(gameState.currentPlayerId, `Collecting Quantum Resources...`, gameState.players[gameState.currentPlayerId].color, <LucideDollarSign size={14}/>);
          dispatch({ type: 'COLLECT_RESOURCES' });
          advancePhaseAfterCurrentProcessing = true;
          break;
        case 'DEPLOYMENT': 
        case 'ATTACK': 
        case 'MANEUVER':
          const aiEffectivelyPassed = await handleAIPlayerTurn(gameState.currentPlayerId, gameState); 
          if (aiEffectivelyPassed && !gameState.isBattlePopupVisible) {
            advancePhaseAfterCurrentProcessing = true;
          } else if (!aiEffectivelyPassed && !gameState.isBattlePopupVisible) { 
            advancePhaseAfterCurrentProcessing = true;
          }
          break;
        default: break;
      }
      
      if(advancePhaseAfterCurrentProcessing && !gameState.isBattlePopupVisible){ 
          dispatch({ type: 'ADVANCE_PHASE' });
      }
    };
    
    autoPlayIntervalRef.current = setTimeout(performStep, 1800); 

    return () => {
      if (autoPlayIntervalRef.current) clearTimeout(autoPlayIntervalRef.current);
      if (battlePopupDisplayTimeoutRef.current) clearTimeout(battlePopupDisplayTimeoutRef.current);
    };
  }, [gameState.currentPhase, gameState.currentPlayerId, gameState.isBattlePopupVisible, isAutoPlaying, isAiThinking, gameState, handleAIPlayerTurn, addLog]); 

  useEffect(() => {
    if (gameState.currentPhase !== 'GAME_OVER' && gameState.turnStartTime) {
      turnTimerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - gameState.turnStartTime!;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setDisplayedTurnTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    } else if (gameState.currentPhase === 'GAME_OVER' && turnTimerIntervalRef.current) {
      clearInterval(turnTimerIntervalRef.current);
      turnTimerIntervalRef.current = null;
      setDisplayedTurnTime("00:00");
    }
    return () => {
      if (turnTimerIntervalRef.current) clearInterval(turnTimerIntervalRef.current);
    };
  }, [gameState.currentPhase, gameState.turnStartTime]);

  useEffect(() => {
    if (gameState.turnDurations.length > 0) {
      const totalDuration = gameState.turnDurations.reduce((sum, duration) => sum + duration, 0);
      const avgDuration = totalDuration / gameState.turnDurations.length;
      const minutes = Math.floor(avgDuration / 60000);
      const seconds = Math.floor((avgDuration % 60000) / 1000);
      setAverageTurnTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else {
      setAverageTurnTime("00:00");
    }
  }, [gameState.turnDurations]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-green-400 font-mono p-2 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div className={`${THEME_COLORS.BG_PANEL} border ${THEME_COLORS.BORDER_BASE} p-3 rounded shadow-md`}>
          <h2 className={`text-lg font-bold ${THEME_COLORS.TEXT_HEADING} mb-2 flex items-center`}><LucideGlobe size={20} className="mr-2"/>Noospheric Conflict</h2>
          <p className="text-sm mb-1"><strong className={THEME_COLORS.TEXT_HEADING}>Turn:</strong> {gameState.currentTurn} / {NOOSPHERIC_CONQUEST_TURN_LIMIT}</p>
          <p className="text-sm mb-1"><strong className={THEME_COLORS.TEXT_HEADING}>Phase:</strong> {gameState.currentPhase.replace('_', ' ').toUpperCase()}</p>
          <p className="text-sm mb-1"><strong className={THEME_COLORS.TEXT_HEADING}>Current Player:</strong> <span className={gameState.players[gameState.currentPlayerId].color}>{gameState.players[gameState.currentPlayerId].name}</span></p>
          <p className="text-sm mb-1"><strong className={THEME_COLORS.TEXT_HEADING}>Turn Time:</strong> {displayedTurnTime}</p>
          <p className="text-sm mb-1"><strong className={THEME_COLORS.TEXT_HEADING}>Avg Turn Time:</strong> {averageTurnTime}</p>
          <p className="text-sm mb-1"><strong className={THEME_COLORS.TEXT_HEADING}>KJ Controlled:</strong>
            {Object.keys(gameState.players[AI1_ID].controlledKeyJunctionsTurns).length > 0 || Object.keys(gameState.players[AI2_ID].controlledKeyJunctionsTurns).length > 0 ?
            gameState.keyJunctionsOnMap.map(kjId => {
                const p1Turns = gameState.players[AI1_ID].controlledKeyJunctionsTurns[kjId] || 0;
                const p2Turns = gameState.players[AI2_ID].controlledKeyJunctionsTurns[kjId] || 0;
                const owner = gameState.nodes[kjId]?.owner;
                const ownerColor = owner === AI1_ID ? THEME_COLORS.AI1.text : owner === AI2_ID ? THEME_COLORS.AI2.text : THEME_COLORS.NEUTRAL.text;
                return <span key={kjId} className={`ml-1 ${ownerColor}`}>{kjId}: {owner === AI1_ID ? `R(${p1Turns})` : owner === AI2_ID ? `C(${p2Turns})` : 'N'}</span>;
            }) : <span className={THEME_COLORS.TEXT_MUTED}>None</span>
            }
          </p>

          <div className="mt-2 pt-2 border-t border-gray-700">
            <h3 className={`font-semibold ${THEME_COLORS.TEXT_HEADING} mb-1`}>Factions:</h3>
            <p className="text-sm"><strong className={THEME_COLORS.AI1.text}>GEM-Q (Red):</strong> QR {gameState.players[AI1_ID].resources} | Units {Object.values(gameState.units).filter(u => u.owner === AI1_ID).length}</p>
            <p className="text-sm"><strong className={THEME_COLORS.AI2.text}>AXIOM (Cyan):</strong> QR {gameState.players[AI2_ID].resources} | Units {Object.values(gameState.units).filter(u => u.owner === AI2_ID).length}</p>
          </div>
          <div className="flex space-x-2 mt-4">
            <button
              onClick={toggleAutoPlay}
              className={`px-4 py-2 rounded-md transition-colors text-black font-semibold text-sm
                         ${isAutoPlaying ? `${THEME_COLORS.AI2.bg} hover:opacity-80` : `${THEME_COLORS.AI1.bg} hover:opacity-80`}`}>
              {isAutoPlaying ? 'Pause Simulation' : gameState.currentPhase === 'GAME_OVER' ? 'Restart Simulation' : 'Start Simulation'}
            </button>
            {!isAutoPlaying && (
              <button
                onClick={handleAdvanceManually}
                className={`px-4 py-2 rounded-md ${THEME_COLORS.NEUTRAL.bg} border ${THEME_COLORS.NEUTRAL.border} text-white hover:opacity-80 transition-colors font-semibold text-sm`}>
                {gameState.currentPhase === 'GAME_OVER' ? 'New Game' : 'Advance Phase'}
              </button>
            )}
             <button onClick={() => setIsInfoScreenVisible(true)} className={`px-3 py-2 rounded-md ${THEME_COLORS.NEUTRAL.bg} border ${THEME_COLORS.NEUTRAL.border} text-white hover:opacity-80 transition-colors font-semibold text-sm`} aria-label="Info">
                <LucideInfo size={16}/>
            </button>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col space-y-2">
          <QuantumGambitMapDisplay gameState={gameState} onNodeClick={handleNodeClick} selectedNodeId={gameState.selectedNodeId} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-grow">
            <CoTDisplay title="GEM-Q" cot={ai1CoT} isLoading={isAiThinking && gameState.currentPlayerId === AI1_ID} playerNameColor={THEME_COLORS.AI1.text} />
            <CoTDisplay title="AXIOM" cot={ai2CoT} isLoading={isAiThinking && gameState.currentPlayerId === AI2_ID} playerNameColor={THEME_COLORS.AI2.text} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-64 md:h-80">
        <div className="flex flex-col space-y-2">
          <MiniMapDisplay gameState={gameState} onNodeClick={handleNodeClick} selectedNodeId={gameState.selectedNodeId} />
          <NodeInfoPanel gameState={gameState} selectedNodeId={gameState.selectedNodeId} />
        </div>
        <div className={`${THEME_COLORS.BG_PANEL} border ${THEME_COLORS.BORDER_BASE} p-3 rounded shadow-md col-span-2 flex flex-col`}>
          <h3 className={`text-sm font-semibold ${THEME_COLORS.TEXT_HEADING} border-b ${THEME_COLORS.BORDER_STRONG} pb-1 mb-2 flex items-center`}><LucideScrollText size={16} className="mr-2"/>Game Log</h3>
          <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2">
            {gameState.gameLog.slice().reverse().map((log, index) => (
              <div key={log.id} className={`text-xs mb-1 ${log.color} flex items-start`}>
                <span className="mr-2 text-gray-500 text-[9px]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                {log.icon && <span className="mr-1 flex-shrink-0 text-gray-400" style={{marginTop: '2px'}}>{log.icon}</span>}
                <span className="break-words"><strong>{log.sender}:</strong> {log.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {gameState.isBattlePopupVisible && <BattlePopup report={gameState.battleReport} onClose={() => dispatch({type: 'HIDE_BATTLE_POPUP'})} gameState={gameState} />}
      {isInfoScreenVisible && <InfoScreenPopup onClose={() => setIsInfoScreenVisible(false)} />}

    </div>
  );
};
