
import React, { useState, useRef } from 'react';
import { MatrixSettings, AppMode, InterventionTarget, ThemeName } from '../types';
import { AI1_NAME, AI2_NAME, MIN_TYPING_SPEED_MS, MAX_TYPING_SPEED_MS, DEFAULT_TYPING_SPEED_MS, UNIVERSE_SIM_PANEL_PLACEHOLDER_TEXT, THEMES } from '../constants';
import RotatingGlobe from './RotatingGlobe'; 

interface ControlsPanelProps {
  matrixSettings: MatrixSettings;
  onMatrixSettingsChange: <K extends keyof MatrixSettings>(key: K, value: MatrixSettings[K]) => void;
  onCopyChat: () => void;
  onExportTXT: () => void;
  onExportMD: () => void;
  onBackupChat: () => void;
  onLoadChat: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isAIsTyping: boolean;
  activeAIName: string | null; 
  currentMode: AppMode;
  onModeChange: (newMode: AppMode) => void;
  onSendUserIntervention: (text: string, target: InterventionTarget) => void;
  currentTypingSpeed: number;
  onTypingSpeedChange: (speed: number) => void;
  onCompleteCurrentMessage: () => void;
  activeTheme: ThemeName;
  onThemeChange: (themeName: ThemeName) => void;
  onOpenInfoModal: () => void;
}

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; fullWidth?: boolean }> = ({ children, className, variant = 'primary', fullWidth = false, ...props }) => {
  const baseStyle = "px-3 py-2 border-2 rounded-sm focus:outline-none focus-ring-primary transition-all duration-150 ease-in-out uppercase text-xs tracking-wider font-semibold";
  const primaryStyle = "bg-[var(--color-bg-button-primary)] border-[var(--color-border-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] text-[var(--color-text-button-primary)] hover:shadow-lg hover:shadow-[var(--color-shadow-base)]/50";
  const secondaryStyle = "bg-[var(--color-bg-button-secondary)] border-[var(--color-border-button-secondary)] hover:bg-[var(--color-bg-button-secondary-hover)] text-[var(--color-text-button-secondary)] hover:shadow-md hover:shadow-[var(--color-shadow-base)]/30";
  const widthStyle = fullWidth ? "w-full" : "";
  
  return (
    <button className={`${baseStyle} ${variant === 'primary' ? primaryStyle : secondaryStyle} ${widthStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  matrixSettings,
  onMatrixSettingsChange,
  onCopyChat,
  onExportTXT,
  onExportMD,
  onBackupChat,
  onLoadChat,
  isAIsTyping,
  activeAIName,
  currentMode,
  onModeChange,
  onSendUserIntervention,
  currentTypingSpeed,
  onTypingSpeedChange,
  onCompleteCurrentMessage,
  activeTheme,
  onThemeChange,
  onOpenInfoModal,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [userInterventionText, setUserInterventionText] = useState("");
  const [interventionTarget, setInterventionTarget] = useState<InterventionTarget>('CHAT_FLOW');
  const [isEffectsDrawerOpen, setIsEffectsDrawerOpen] = useState(false);
  const drawerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleInterventionSendClick = () => {
    if (userInterventionText.trim() && 
        currentMode !== AppMode.UNIVERSE_SIM_EXE && 
        currentMode !== AppMode.CHESS_SIM_EXE && 
        currentMode !== AppMode.NOOSPHERIC_CONQUEST_EXE &&
        currentMode !== AppMode.STORY_WEAVER_EXE
       ) {
      onSendUserIntervention(userInterventionText.trim(), interventionTarget);
      setUserInterventionText("");
    }
  };

  const handleInterventionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleInterventionSendClick();
    }
  };

  const handleMouseEnterDisplayEffects = () => {
    if (drawerTimeoutRef.current) {
      clearTimeout(drawerTimeoutRef.current);
      drawerTimeoutRef.current = null;
    }
    setIsEffectsDrawerOpen(true);
  };

  const handleMouseLeaveDisplayEffects = () => {
    drawerTimeoutRef.current = setTimeout(() => {
      setIsEffectsDrawerOpen(false);
    }, 150); // Delay in ms
  };


  const awaitingResponseText = currentMode === AppMode.UNIVERSE_SIM_EXE || currentMode === AppMode.STORY_WEAVER_EXE
    ? `Awaiting response from ${currentMode === AppMode.STORY_WEAVER_EXE ? "Story Weaver" : AI1_NAME}...` 
    : (activeAIName ? `Awaiting response from ${activeAIName}...` : "AI Awaiting Response...");

  const isAIToAIMode = currentMode !== AppMode.UNIVERSE_SIM_EXE && 
                       currentMode !== AppMode.CHESS_SIM_EXE && 
                       currentMode !== AppMode.NOOSPHERIC_CONQUEST_EXE &&
                       currentMode !== AppMode.STORY_WEAVER_EXE;
  
  const showUserInterventionPanel = currentMode !== AppMode.UNIVERSE_SIM_EXE && 
                                    currentMode !== AppMode.CHESS_SIM_EXE && 
                                    currentMode !== AppMode.NOOSPHERIC_CONQUEST_EXE &&
                                    currentMode !== AppMode.STORY_WEAVER_EXE;


  return (
    <aside 
      className={`fixed top-0 right-0 h-full bg-[var(--color-bg-panel)] border-l-2 border-[var(--color-border-base)] shadow-2xl shadow-[var(--color-shadow-base)]/40 text-[var(--color-text-base)] z-20 w-72 md:w-80`} 
      id="control-panel" 
      aria-label="Controls Panel"
    >
      <div className="p-4 space-y-4 overflow-y-auto h-full">
        <div className="flex justify-between items-center border-b border-[var(--color-border-strong)] pb-2">
          <h3 className="text-lg font-bold text-[var(--color-text-heading)] tracking-wider">SYSTEM INTERFACE</h3>
          <button 
            onClick={onOpenInfoModal} 
            title="About Current Mode"
            className="p-1.5 rounded-full hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
            aria-label="Show information about the current simulation mode"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent-300)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </button>
        </div>


        {isAIsTyping && (
           <div className="text-center text-[var(--color-system-message)] animate-pulse p-2 border border-[var(--color-system-message)] rounded-sm bg-[var(--color-system-message)] bg-opacity-20">
             {awaitingResponseText}
           </div>
        )}
        
        <div className="control-group space-y-1">
          <label htmlFor="appModeSelect" className="block text-sm font-medium text-[var(--color-text-heading)]">Interaction Mode</label>
          <select
            id="appModeSelect"
            value={currentMode}
            onChange={(e) => onModeChange(e.target.value as AppMode)}
            className="w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-2 rounded-sm focus-ring-accent text-xs"
          >
            {Object.values(AppMode).map(mode => (
              <option 
                key={mode} 
                value={mode}
                disabled={
                  (mode === AppMode.UNIVERSE_SIM_EXE && currentMode === AppMode.UNIVERSE_SIM_EXE) ||
                  (mode === AppMode.CHESS_SIM_EXE && currentMode === AppMode.CHESS_SIM_EXE) ||
                  (mode === AppMode.NOOSPHERIC_CONQUEST_EXE && currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE) ||
                  (mode === AppMode.STORY_WEAVER_EXE && currentMode === AppMode.STORY_WEAVER_EXE)
                }
              >
                {mode}
              </option>
            ))}
          </select>
        </div>
        <hr className="border-[var(--color-border-strong)] opacity-50 my-2"/>

        { (currentMode === AppMode.UNIVERSE_SIM_EXE || 
           currentMode === AppMode.CHESS_SIM_EXE || 
           currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE ||
           currentMode === AppMode.STORY_WEAVER_EXE) ? (
          <div className="control-group space-y-2 text-center p-3 border border-dashed border-[var(--color-border-strong)] rounded-md">
            <h4 className="text-md font-semibold text-[var(--color-text-heading)]">
              {currentMode === AppMode.UNIVERSE_SIM_EXE ? "GEODESIC SYSTEMS" : 
               currentMode === AppMode.CHESS_SIM_EXE ? "CHESS SIMULATION ACTIVE" :
               currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE ? "NOOSPHERIC CONQUEST ACTIVE" :
               "STORY WEAVER ACTIVE"}
            </h4>
            {currentMode === AppMode.UNIVERSE_SIM_EXE && <RotatingGlobe />}
            <p className="text-xs text-[var(--color-text-muted)] italic mt-1">
              {currentMode === AppMode.UNIVERSE_SIM_EXE ? UNIVERSE_SIM_PANEL_PLACEHOLDER_TEXT :
               currentMode === AppMode.CHESS_SIM_EXE ? "Chess game controls are in the main view." :
               currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE ? "Noospheric Conquest controls are in the main view." :
               "Story Weaver interaction is via the main terminal."}
            </p>
            {(currentMode === AppMode.UNIVERSE_SIM_EXE || currentMode === AppMode.STORY_WEAVER_EXE) && 
             <p className="text-xs text-[var(--color-prompt-message)] mt-1">Input commands/dialogue directly into the terminal.</p>}
          </div>
        ) : ( // For other modes that might use the intervention panel
          <div className="control-group space-y-1">
            <h4 className="text-md font-semibold text-[var(--color-text-heading)]">User Intervention</h4>
            <textarea
              value={userInterventionText}
              onChange={(e) => setUserInterventionText(e.target.value)}
              onKeyDown={handleInterventionKeyDown}
              placeholder="Inject text into the AI dialogue..."
              rows={2}
              className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-2 rounded-sm focus-ring-accent text-xs placeholder-[var(--color-text-placeholder)]"
              aria-label="User intervention input"
            />
            {isAIToAIMode && (
              <div className="space-y-1 mt-1">
                <label className="block text-xs font-medium text-[var(--color-text-heading)]">Target:</label>
                <div className="flex space-x-3 text-xs">
                  {(['CHAT_FLOW', 'AI1', 'AI2'] as InterventionTarget[]).map(targetValue => (
                    <label key={targetValue} className="flex items-center space-x-1 cursor-pointer text-[var(--color-text-muted)]">
                      <input
                        type="radio"
                        name="interventionTarget"
                        value={targetValue}
                        checked={interventionTarget === targetValue}
                        onChange={() => setInterventionTarget(targetValue)}
                        className="form-radio h-3 w-3 text-[var(--color-primary-500)] bg-[var(--color-bg-input)] border-[var(--color-border-input)] focus-ring-primary accent-[var(--color-primary-500)]"
                      />
                      <span>{targetValue === 'AI1' ? AI1_NAME : targetValue === 'AI2' ? AI2_NAME : 'Chat Flow'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button 
              onClick={handleInterventionSendClick} 
              variant="primary" 
              fullWidth
              disabled={!userInterventionText.trim() || isAIsTyping}
              className="mt-1"
            >
              Send Intervention
            </Button>
            <p className="text-xs text-[var(--color-text-muted)] italic mt-1">Use this to subtly influence the AI dialogue.</p>
          </div>
        )}
        <hr className="border-[var(--color-border-strong)] opacity-50 my-2"/>

        <div className="control-group space-y-1.5">
          <h4 className="text-md font-semibold text-[var(--color-text-heading)]">Conversation</h4>
          <Button onClick={onCopyChat} variant="secondary" fullWidth>Copy Chat</Button>
          <div className="grid grid-cols-2 gap-1.5">
            <Button onClick={onExportTXT} variant="secondary">Export .TXT</Button>
            <Button onClick={onExportMD} variant="secondary">Export .MD</Button>
          </div>
          <Button onClick={onBackupChat} variant="secondary" fullWidth>Backup (Save .JSON)</Button>
          <Button onClick={handleLoadClick} variant="secondary" fullWidth>Load Backup (.JSON)</Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={onLoadChat}
            className="hidden"
            aria-label="Load chat backup file"
          />
        </div>
        
        <hr className="border-[var(--color-border-strong)] opacity-50 my-2"/>
        
        <div 
          className="control-group relative"
          onMouseEnter={handleMouseEnterDisplayEffects}
          onMouseLeave={handleMouseLeaveDisplayEffects}
        >
          <h4 className="text-md font-semibold text-[var(--color-text-heading)] cursor-pointer pb-1">
            Display &amp; Effects {isEffectsDrawerOpen ? '▼' : '▶'}
          </h4>
          {isEffectsDrawerOpen && (
            <div 
              className="absolute left-0 right-0 mt-1 p-3 bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-base)] rounded-md shadow-xl z-30 space-y-2"
              onMouseEnter={handleMouseEnterDisplayEffects} 
              onMouseLeave={handleMouseLeaveDisplayEffects} 
            >
              <Button 
                onClick={onCompleteCurrentMessage} 
                variant="secondary" 
                fullWidth 
                disabled={!isAIsTyping}
              >
                Complete Message
              </Button>
              
              <div>
                <label htmlFor="themeSelect" className="block text-sm font-medium text-[var(--color-text-heading)]">Theme</label>
                <select
                  id="themeSelect"
                  value={activeTheme}
                  onChange={(e) => onThemeChange(e.target.value as ThemeName)}
                  className="w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-2 rounded-sm focus-ring-accent text-xs mt-0.5"
                >
                  {Object.keys(THEMES).map(themeKey => (
                    <option key={themeKey} value={themeKey}>{THEMES[themeKey as ThemeName].name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="typingSpeedSlider" className="block text-sm font-medium text-[var(--color-text-heading)]">Text Typing Speed</label>
                <input
                  type="range"
                  id="typingSpeedSlider"
                  min={MIN_TYPING_SPEED_MS}
                  max={MAX_TYPING_SPEED_MS}
                  value={currentTypingSpeed}
                  onChange={(e) => onTypingSpeedChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-[var(--color-bg-input)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary-500)] mt-0.5"
                />
                <small className="text-xs text-[var(--color-text-muted)] block">Current: {currentTypingSpeed}ms delay</small>
              </div>
            
              <label className="flex items-center space-x-2 text-sm cursor-pointer text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={matrixSettings.glitchEffect}
                  onChange={(e) => onMatrixSettingsChange('glitchEffect', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-[var(--color-primary-500)] bg-[var(--color-bg-input)] border-[var(--color-border-input)] rounded focus-ring-primary accent-[var(--color-primary-500)]"
                />
                <span>Enable Matrix Glitch Effects</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm cursor-pointer text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={matrixSettings.isPaused}
                  onChange={(e) => onMatrixSettingsChange('isPaused', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-[var(--color-primary-500)] bg-[var(--color-bg-input)] border-[var(--color-border-input)] rounded focus-ring-primary accent-[var(--color-primary-500)]"
                />
                <span>Pause Matrix</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ControlsPanel;
