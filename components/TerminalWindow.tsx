
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, AppMode } from '../types'; 
import { SYSTEM_SENDER_NAME, AI1_NAME, USER_INTERVENTION_SENDER_NAME, FACILITATOR_SENDER_NAME, USER_PROMPT_MESSAGE, INITIAL_START_PROMPT_MESSAGE } from '../constants';

interface TerminalWindowProps {
  title: string;
  messages: ChatMessage[];
  className?: string;
  isTypingActive?: boolean; 
  activeTypingMessageId?: string | null;
  onTypingComplete?: (messageId: string) => void;
  isPromptingUser?: boolean;
  userInputValue?: string;
  onUserInputChange?: (value: string) => void;
  onUserPromptSubmit?: () => void;
  isAwaitingInitialStart?: boolean;
  initialStartPromptMessageText?: string; 
  initialStartInputValue?: string; 
  onInitialStartInputChange?: (value: string) => void; 
  onInitialStartSubmit?: () => void; 
  typingSpeed: number;
  isUniverseSimActivePhase2?: boolean;
  universeSimInputValue?: string;
  onUniverseSimInputChange?: (value: string) => void;
  onUniverseSimInputSubmit?: () => void;
  currentMode: AppMode;
  commandHistory: string[]; 
  onCommandHistoryNavigation: (direction: 'up' | 'down', inputType: 'initial' | 'prompt' | 'universeSim' | 'chimera') => void; 
  isAppAiProcessing?: boolean;
  appProcessingAiName?: string | null;
  isAwaitingChimeraContinuation?: boolean;
  storyWeaverHeaderContent?: React.ReactNode; // Added prop
}

const TerminalWindow: React.FC<TerminalWindowProps> = ({ 
  title, 
  messages, 
  className = "",
  isTypingActive = false, // This prop indicates if the typing animation should be active for activeTypingMessageId
  activeTypingMessageId = null,
  onTypingComplete,
  isPromptingUser = false,
  userInputValue = "",
  onUserInputChange,
  onUserPromptSubmit,
  isAwaitingInitialStart = false, 
  initialStartPromptMessageText = INITIAL_START_PROMPT_MESSAGE, 
  initialStartInputValue = "",
  onInitialStartInputChange,
  onInitialStartSubmit,
  typingSpeed,
  isUniverseSimActivePhase2 = false,
  universeSimInputValue = "",
  onUniverseSimInputChange,
  onUniverseSimInputSubmit,
  currentMode,
  commandHistory,
  onCommandHistoryNavigation,
  isAppAiProcessing,      // New: Global AI processing state
  appProcessingAiName,    // New: Name of AI globally processing
  isAwaitingChimeraContinuation, // Specific for Chimera mode
  storyWeaverHeaderContent // Destructured prop
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const regularInputRef = useRef<HTMLInputElement>(null); 
  const initialStartInputRef = useRef<HTMLInputElement>(null); 
  const universeSimInputRef = useRef<HTMLInputElement>(null);
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([]);
  const [fullyTypedMessages, setFullyTypedMessages] = useState<Set<string>>(new Set());
  const currentTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const lastProcessedMessageCount = useRef(0);


  useEffect(() => {
    setDisplayedMessages(prevDisplayed => {
      const existingMap = new Map(prevDisplayed.map(m => [m.id, m]));
      
      const newDisplayed = messages.map(appMsg => {
        const existing = existingMap.get(appMsg.id);
        if (existing) {
          if (fullyTypedMessages.has(appMsg.id) && existing.text !== appMsg.text) {
            return { ...existing, text: appMsg.text }; 
          }
          return existing; 
        }
        return { ...appMsg, text: "" };
      });
      return newDisplayed.filter(ndm => messages.some(am => am.id === ndm.id));
    });
  }, [messages]); 


  useEffect(() => {
    if (currentTypingTimeoutRef.current) {
      clearTimeout(currentTypingTimeoutRef.current);
      currentTypingTimeoutRef.current = null;
    }

    if (isTypingActive && activeTypingMessageId) {
      const messageToType = messages.find(msg => msg.id === activeTypingMessageId);
      const currentDisplayedMessage = displayedMessages.find(dm => dm.id === activeTypingMessageId);

      if (messageToType && currentDisplayedMessage && !fullyTypedMessages.has(messageToType.id)) {
        let charIndex = currentDisplayedMessage.text.length || 0;
        
        const typeChar = () => {
          if (charIndex < messageToType.text.length) {
            setDisplayedMessages(prev => 
              prev.map(m => 
                m.id === messageToType.id ? { ...m, text: messageToType.text.substring(0, charIndex + 1) } : m
              )
            );
            charIndex++;
            currentTypingTimeoutRef.current = setTimeout(typeChar, typingSpeed);
          } else {
            setFullyTypedMessages(prev => new Set(prev).add(messageToType.id));
            if (onTypingComplete) { 
              onTypingComplete(messageToType.id);
            }
          }
        };

        if (currentDisplayedMessage.text.length < messageToType.text.length) {
           currentTypingTimeoutRef.current = setTimeout(typeChar, typingSpeed);
        } else if (!fullyTypedMessages.has(messageToType.id)) { 
            setFullyTypedMessages(prev => new Set(prev).add(messageToType.id));
            if (onTypingComplete) {
              onTypingComplete(messageToType.id);
            }
        }
      }
    } else if (!isTypingActive) {
      let displayNeedsUpdate = false;
      const newFullyTyped = new Set(fullyTypedMessages);

      const updatedDisplayedMessages = displayedMessages.map(dispMsg => {
        const correspondingAppMsg = messages.find(m => m.id === dispMsg.id);
        if (correspondingAppMsg) {
          if (dispMsg.id !== activeTypingMessageId && dispMsg.text !== correspondingAppMsg.text) {
            displayNeedsUpdate = true;
            newFullyTyped.add(correspondingAppMsg.id);
            return { ...dispMsg, text: correspondingAppMsg.text };
          }
          if (dispMsg.text !== correspondingAppMsg.text && !fullyTypedMessages.has(correspondingAppMsg.id)) {
             displayNeedsUpdate = true;
             newFullyTyped.add(correspondingAppMsg.id);
             return { ...dispMsg, text: correspondingAppMsg.text };
          }
          if (dispMsg.text === correspondingAppMsg.text && !newFullyTyped.has(correspondingAppMsg.id)) {
            newFullyTyped.add(correspondingAppMsg.id);
          }
        }
        return dispMsg;
      });

      if (displayNeedsUpdate) {
        setDisplayedMessages(updatedDisplayedMessages);
      }
      if (newFullyTyped.size !== fullyTypedMessages.size) {
        setFullyTypedMessages(newFullyTyped);
      }
    }
    
    return () => {
      if (currentTypingTimeoutRef.current) {
        clearTimeout(currentTypingTimeoutRef.current);
      }
    };
  }, [messages, isTypingActive, activeTypingMessageId, displayedMessages, fullyTypedMessages, onTypingComplete, typingSpeed]);

  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = contentElement;
        const threshold = 30; 
        if (scrollHeight - scrollTop - clientHeight > threshold) {
            setIsUserScrolledUp(true);
        } else {
            setIsUserScrolledUp(false);
        }
    };
    contentElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => contentElement.removeEventListener('scroll', handleScroll);
  }, []);


  useEffect(() => {
    if (contentRef.current) {
      const newMessagesArrived = messages.length > lastProcessedMessageCount.current;
      if (!isUserScrolledUp || newMessagesArrived) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
        if(newMessagesArrived) setIsUserScrolledUp(false); 
      }
      lastProcessedMessageCount.current = messages.length;
    }
  }, [displayedMessages, isPromptingUser, isAwaitingInitialStart, isUniverseSimActivePhase2, isUserScrolledUp, messages.length]); 

  useEffect(() => {
    if (isUniverseSimActivePhase2 && universeSimInputRef.current) {
      universeSimInputRef.current.focus();
    } else if (isAwaitingInitialStart && initialStartInputRef.current) {
      initialStartInputRef.current.focus();
    } else if (isPromptingUser && regularInputRef.current) {
      regularInputRef.current.focus();
    }
  }, [isPromptingUser, isAwaitingInitialStart, isUniverseSimActivePhase2]);

  const handleRegularInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onUserPromptSubmit) {
      onUserPromptSubmit();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      onCommandHistoryNavigation('up', 'prompt');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onCommandHistoryNavigation('down', 'prompt');
    }
  };

  const handleInitialStartKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onInitialStartSubmit) {
      onInitialStartSubmit();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      onCommandHistoryNavigation('up', 'initial');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onCommandHistoryNavigation('down', 'initial');
    }
  };

  const handleUniverseSimInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onUniverseSimInputSubmit) {
      onUniverseSimInputSubmit();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      onCommandHistoryNavigation('up', 'universeSim');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onCommandHistoryNavigation('down', 'universeSim');
    }
  };

  const renderFormattedMessage = (text: string) => {
    return text.split('\n').map((line, index) => (
        <span key={index} className="block whitespace-pre-wrap break-words">
            {line.length > 0 ? line : ' '}
        </span>
    ));
  };
  
  const getSenderPrefix = (sender: string) => {
    if (sender === SYSTEM_SENDER_NAME || sender === USER_INTERVENTION_SENDER_NAME || sender === FACILITATOR_SENDER_NAME) {
        return "";
    }
    const lastDispMessage = displayedMessages.length > 0 ? displayedMessages[displayedMessages.length-1] : null;
    if (sender === AI1_NAME && currentMode === AppMode.UNIVERSE_SIM_EXE && isUniverseSimActivePhase2 && lastDispMessage?.text.trim().endsWith("world_sim>")) {
        return "";
    }
    return `${sender}:~$ `;
  }

  const getMessageColorClass = (msg: ChatMessage) => {
    if (msg.color) return msg.color; 
    if (msg.sender === SYSTEM_SENDER_NAME) return 'text-[var(--color-system-message)]';
    if (msg.sender === USER_INTERVENTION_SENDER_NAME) return 'text-[var(--color-user-intervention)]';
    if (msg.sender === FACILITATOR_SENDER_NAME) return 'text-[var(--color-facilitator)]';
    return 'text-[var(--color-text-muted)]'; 
  };

  const typingMessageDetails = (isTypingActive && activeTypingMessageId) ? displayedMessages.find(msg => msg.id === activeTypingMessageId) : null;
  const senderOfTypingMessage = typingMessageDetails?.sender;
  
  const originalMessageBeingTyped = messages.find(m => m.id === activeTypingMessageId);
  const isCurrentlyMidTyping = isTypingActive && activeTypingMessageId && senderOfTypingMessage &&
                              !fullyTypedMessages.has(activeTypingMessageId) &&
                              typingMessageDetails && originalMessageBeingTyped &&
                              typingMessageDetails.text.length < originalMessageBeingTyped.text.length;

  let statusMessageElement = null;
  if (isAppAiProcessing && appProcessingAiName && !isCurrentlyMidTyping) {
      statusMessageElement = <span className="text-xs text-[var(--color-accent-400)] animate-pulse">{appProcessingAiName} is processing...</span>;
  } else if (isTypingActive && activeTypingMessageId && senderOfTypingMessage && !fullyTypedMessages.has(activeTypingMessageId)) {
      let showTypingIndicator = !isPromptingUser && !isAwaitingInitialStart && !isUniverseSimActivePhase2;
      if (currentMode === AppMode.CHIMERA_EXE && isAwaitingChimeraContinuation) {
          showTypingIndicator = false;
      }
      if (showTypingIndicator) {
           statusMessageElement = <span className="text-xs text-[var(--color-accent-300)] animate-pulse">{senderOfTypingMessage} is typing...</span>;
      }
  }

  return (
    <section
      className={`bg-[var(--color-bg-terminal)] border-2 border-[var(--color-border-base)] shadow-lg shadow-[var(--color-shadow-base)]/30 flex flex-col overflow-hidden ${className}`}
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-label={title}
      tabIndex={0}
    >
      <header className="window-header bg-[var(--color-primary-600)] bg-opacity-60 text-[var(--color-text-heading)] p-2 border-b-2 border-[var(--color-border-base)] flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wider uppercase">{title}</h2>
        <div className="flex items-center space-x-2">
          {statusMessageElement}
          {currentMode === AppMode.STORY_WEAVER_EXE && storyWeaverHeaderContent && (
            <div className="story-weaver-header-actions">
              {storyWeaverHeaderContent}
            </div>
          )}
        </div>
      </header>
      <div
        ref={contentRef}
        className="window-content p-3 text-sm overflow-y-auto h-full log-display flex-grow flex flex-col text-[var(--color-text-base)]" 
      >
        <div className="flex-grow">
            {displayedMessages.map((msg) => (
              <div key={msg.id} className={`mb-0.5 ${getMessageColorClass(msg)} ${msg.sender === SYSTEM_SENDER_NAME ? 'italic' : ''}`}>
                {(msg.sender !== SYSTEM_SENDER_NAME && msg.sender !== FACILITATOR_SENDER_NAME && msg.sender !== USER_INTERVENTION_SENDER_NAME) && (
                  <strong className={`${getMessageColorClass(msg)} font-semibold`}>{getSenderPrefix(msg.sender)}</strong>
                )}
                 {msg.sender === SYSTEM_SENDER_NAME && msg.text.startsWith("USER:") && (
                    <strong className={`${getMessageColorClass(msg)} font-semibold`}></strong>
                )}
                <span>{renderFormattedMessage(msg.text)}</span>
              </div>
            ))}
        </div>

        {isAwaitingInitialStart && ( 
          <div className="mt-auto pt-2 border-t-2 border-[var(--color-primary-700)] border-dashed">
            <p className="text-[var(--color-prompt-message)] mb-1">{initialStartPromptMessageText}</p>
            <div className="flex items-center">
              <span className="text-[var(--color-accent-400)] mr-2">{`USER:~/$`}</span>
              <input
                ref={initialStartInputRef}
                type="text"
                value={initialStartInputValue}
                onChange={(e) => onInitialStartInputChange && onInitialStartInputChange(e.target.value)}
                onKeyDown={handleInitialStartKeyDown}
                className="bg-transparent text-[var(--color-accent-300)] border-0 focus:ring-0 focus:outline-none flex-grow p-0 m-0 placeholder-[var(--color-text-placeholder)]"
                aria-label="Initial simulation start input"
                autoFocus
              />
            </div>
          </div>
        )}
        {isPromptingUser && !isAwaitingInitialStart && !isUniverseSimActivePhase2 && ( 
          <div className="mt-auto pt-2 border-t-2 border-[var(--color-primary-700)] border-dashed">
            <p className="text-[var(--color-prompt-message)] mb-1">{USER_PROMPT_MESSAGE}</p>
            <div className="flex items-center">
              <span className="text-[var(--color-accent-400)] mr-2">{`USER:~/$`}</span>
              <input
                ref={regularInputRef}
                type="text"
                value={userInputValue}
                onChange={(e) => onUserInputChange && onUserInputChange(e.target.value)}
                onKeyDown={handleRegularInputKeyDown}
                className="bg-transparent text-[var(--color-accent-300)] border-0 focus:ring-0 focus:outline-none flex-grow p-0 m-0 placeholder-[var(--color-text-placeholder)]"
                aria-label="User input for prompt"
                autoFocus
              />
            </div>
          </div>
        )}
        {isUniverseSimActivePhase2 && !isAwaitingInitialStart && currentMode === AppMode.UNIVERSE_SIM_EXE && (
          <div className="mt-auto pt-2 border-t-2 border-[var(--color-primary-700)] border-dashed">
            <div className="flex items-center">
              <span className="text-[var(--color-accent-400)] mr-1">{`world_sim>`}</span> 
              <input
                ref={universeSimInputRef}
                type="text"
                value={universeSimInputValue}
                onChange={(e) => onUniverseSimInputChange && onUniverseSimInputChange(e.target.value)}
                onKeyDown={handleUniverseSimInputKeyDown}
                className="bg-transparent text-[var(--color-accent-300)] border-0 focus:ring-0 focus:outline-none flex-grow p-0 m-0 placeholder-[var(--color-text-placeholder)]"
                aria-label="Universe simulator command input"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TerminalWindow;
