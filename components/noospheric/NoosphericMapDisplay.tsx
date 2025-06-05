
import React from 'react';
import { NoosphericNodeData, NoosphericPlayerId, NoosphericGameState, NoosphericPhase } from '../../types';

interface NoosphericMapDisplayProps {
  nodes: NoosphericNodeData[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  factionColors: {
    'GEM-Q': string;
    'AXIOM': string;
    'NEUTRAL': string;
    'KJ_NEUTRAL': string;
  };
  isLoadingAI: NoosphericPlayerId | null;
  activePlayer: NoosphericPlayerId;
  gameState: NoosphericGameState; 
}

const NODE_RADIUS = 3.0;      
const KJ_NODE_RADIUS = 3.5;
const CN_NODE_RADIUS = 3.5;

const CONNECTION_COLOR = "rgba(100, 100, 120, 0.6)";
const CONNECTION_STROKE_WIDTH = "0.2"; 

const NODE_STROKE_WIDTH = 0.3;  
const CN_STROKE_WIDTH = 0.5;
const KJ_STROKE_WIDTH = 0.5;

const REGION_NAME_FONT_SIZE = "2.2px"; 
const CN_KJ_TEXT_FONT_SIZE = "2.8px";
const NODE_TEXT_FONT_SIZE = "2.2px";
const UNIT_COUNT_FONT_SIZE = "2.6px"; // For unit count inside circle


const NoosphericMapDisplay: React.FC<NoosphericMapDisplayProps> = ({
  nodes,
  onNodeClick,
  selectedNodeId,
  factionColors,
  isLoadingAI,
  activePlayer,
  gameState, 
}) => {
  if (!nodes || nodes.length === 0) {
    return <div className="text-center p-4">Loading map data...</div>;
  }

  const dataPointsX = nodes.map(n => n.x);
  const dataPointsY = nodes.map(n => n.y);
  const minDataX = Math.min(...dataPointsX);
  const maxDataX = Math.max(...dataPointsX);
  const minDataY = Math.min(...dataPointsY);
  const maxDataY = Math.max(...dataPointsY);

  const PADDING_CONTENT_MULTIPLIER = 1.8; // Reduced from 3.0
  const PADDING_CONTENT = Math.max(KJ_NODE_RADIUS, CN_NODE_RADIUS) * PADDING_CONTENT_MULTIPLIER; 

  const viewBoxX = minDataX - PADDING_CONTENT;
  const viewBoxY = minDataY - PADDING_CONTENT;
  const contentWidthWithPadding = (maxDataX - minDataX) + 2 * PADDING_CONTENT;
  const contentHeightWithPadding = (maxDataY - minDataY) + 2 * PADDING_CONTENT;
  
  const finalViewBoxWidth = Math.max(contentWidthWithPadding, 100); 
  const finalViewBoxHeight = Math.max(contentHeightWithPadding, 75);


  return (
    <svg
        preserveAspectRatio="xMidYMid meet"
        viewBox={`${viewBoxX} ${viewBoxY} ${finalViewBoxWidth} ${finalViewBoxHeight}`}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-labelledby="map-title"
        role="graphics-document"
    >
      <title id="map-title">Noospheric Conquest Game Map</title>
      
      {/* Render Connections */}
      {nodes.map(node =>
        node.connections.map(connId => {
          const targetNode = nodes.find(n => n.id === connId);
          if (targetNode && node.id < targetNode.id) {
            return (
              <line
                key={`${node.id}-${connId}`}
                x1={node.x}
                y1={node.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={CONNECTION_COLOR}
                strokeWidth={CONNECTION_STROKE_WIDTH}
              />
            );
          }
          return null;
        })
      )}

      {/* Render Nodes */}
      {nodes.map(node => {
        const isKJ = node.isKJ;
        const isCN = node.isCN;
        let radius = NODE_RADIUS;
        if (isKJ) radius = KJ_NODE_RADIUS;
        if (isCN) radius = CN_NODE_RADIUS;

        const effectiveOwner = node.owner;
        let nodeFillColor = "black";
        let strokeColor = factionColors['NEUTRAL'];
        let labelColorForOutline = factionColors['NEUTRAL']; 

        if (effectiveOwner === 'GEM-Q') {
          strokeColor = factionColors['GEM-Q'];
          labelColorForOutline = factionColors['GEM-Q'];
        } else if (effectiveOwner === 'AXIOM') {
          strokeColor = factionColors['AXIOM'];
          labelColorForOutline = factionColors['AXIOM'];
        }
        
        if (isKJ && effectiveOwner === 'NEUTRAL') { 
          strokeColor = factionColors['KJ_NEUTRAL'];
        } else if (isKJ && effectiveOwner !== 'NEUTRAL') { 
             strokeColor = effectiveOwner === 'GEM-Q' ? factionColors['GEM-Q'] : factionColors['AXIOM'];
        }
        
        const isSelected = node.id === selectedNodeId;
        const isBlinking = isLoadingAI === effectiveOwner || (isLoadingAI === null && activePlayer === effectiveOwner && currentPhaseAllowsBlinking(gameState.currentPhase));
        const totalUnits = (node.standardUnits || 0) + (node.evolvedUnits || 0);
        const regionNameTextYOffset = radius + parseFloat(REGION_NAME_FONT_SIZE.replace('px','')) * 0.9; // Ensure parseFloat for calculations

        let internalTextFillColor = 'white'; 
        if (node.evolvedUnits > 0) {
            // Use a direct hex color for evolved units. Bright fuchsia for pure evolved, standard purple otherwise.
            internalTextFillColor = (node.standardUnits === 0) ? '#d946ef' : '#a855f7'; // #a855f7 is a purple-600
        } else if (isKJ) {
            internalTextFillColor = factionColors['KJ_NEUTRAL'];
        } else if (node.owner !== 'NEUTRAL') {
            internalTextFillColor = effectiveOwner === 'GEM-Q' ? factionColors['GEM-Q'] : factionColors['AXIOM'];
        }
        

        return (
          <g
            key={node.id}
            onClick={() => onNodeClick(node.id)}
            className="cursor-pointer group focus:outline-none"
            role="button"
            aria-label={`Node ${node.label}, ${node.regionName}, Owner: ${node.owner}, Standard Units: ${node.standardUnits}, Evolved Units: ${node.evolvedUnits}`}
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && onNodeClick(node.id)}
          >
            {node.isHubActive && (
              <circle
                cx={node.x}
                cy={node.y}
                r={radius + 0.6} 
                fill="none"
                stroke={effectiveOwner === 'GEM-Q' ? factionColors['GEM-Q'] : effectiveOwner === 'AXIOM' ? factionColors['AXIOM'] : factionColors['KJ_NEUTRAL']}
                strokeWidth={0.3}
                strokeDasharray="0.5 0.5"
                className="animate-pulse opacity-80" 
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={radius}
              fill={nodeFillColor}
              stroke={isSelected ? "white" : strokeColor}
              strokeWidth={isKJ ? KJ_STROKE_WIDTH : isCN ? CN_STROKE_WIDTH : NODE_STROKE_WIDTH}
              className={`${isBlinking && !node.isHubActive ? 'animate-pulse opacity-70' : 'opacity-100'} group-hover:opacity-80 group-focus:opacity-80 transition-opacity duration-300`}
            />
            {/* Unit Count */}
            <text
              x={node.x}
              y={node.y - radius * 0.05} 
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={UNIT_COUNT_FONT_SIZE}
              fontWeight="bold"
              fill={internalTextFillColor} 
              className="pointer-events-none select-none"
            >
              {totalUnits}
            </text>
            {/* Node Label (GC_ID, CN, or KJ) */}
            <text
              x={node.x}
              y={node.y + radius * 0.65} 
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isKJ || isCN ? `${parseFloat(CN_KJ_TEXT_FONT_SIZE.replace('px','')) * 0.65}px` : `${parseFloat(NODE_TEXT_FONT_SIZE.replace('px','')) * 0.75}px`} 
              fontWeight="bold"
              fill={node.isKJ ? factionColors['KJ_NEUTRAL'] : (node.owner !== 'NEUTRAL' ? (effectiveOwner === 'GEM-Q' ? factionColors['GEM-Q'] : factionColors['AXIOM']) : 'white')}
              className="pointer-events-none select-none opacity-80"
            >
              {node.label}
            </text>
            
            {/* Region Name (External Label) */}
            <text
                x={node.x}
                y={node.y + regionNameTextYOffset}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize={REGION_NAME_FONT_SIZE}
                fill={labelColorForOutline} 
                className="pointer-events-none select-none group-hover:font-semibold"
            >
                {node.regionName}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const currentPhaseAllowsBlinking = (phase: NoosphericPhase) => {
    return phase === 'MANEUVER' || phase === 'COMBAT';
};


export default NoosphericMapDisplay;
