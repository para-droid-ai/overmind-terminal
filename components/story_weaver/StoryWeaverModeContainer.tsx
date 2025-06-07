
import React from 'react';
import { ChatMessage, ImageSnapshot, SenderName, AppMode } from '../../types'; // Adjusted path
import TerminalWindow from '../TerminalWindow';
import ImageSnapshotDisplay from './ImageSnapshotDisplay';

interface StoryWeaverModeContainerProps {
  genAI: any; // GoogleGenAI instance passed from App.tsx, actual type from @google/genai
  messages: ChatMessage[];
  addMessageToHistory: (sender: SenderName | string, text: string, color?: string, isUser?: boolean, makeActiveTyping?: boolean) => string;
  isLoadingAI: boolean;
  activeTypingMessageId: string | null;
  onTypingComplete: (messageId: string) => void;
  typingSpeed: number;
  commandHistory: string[];
  onCommandHistoryNavigation: (direction: 'up' | 'down', inputType: 'initial' | 'prompt' | 'universeSim') => void;
  userPromptInput: string;
  onUserPromptInputChange: (value: string) => void;
  onUserPromptSubmit: () => void;
  snapshots: ImageSnapshot[];
  isGeneratingImage: boolean;
}

const IMAGE_GEN_COMMAND_REGEX = /\[GENERATE_IMAGE:\s*([^\]]+)\]/im;

const StoryWeaverModeContainer: React.FC<StoryWeaverModeContainerProps> = (props) => {
  const {
    messages,
    isLoadingAI,
    activeTypingMessageId,
    onTypingComplete,
    snapshots,
    isGeneratingImage,
  } = props;

  // Clean messages for display in TerminalWindow by removing the image generation command
  const cleanMessagesForDisplay = messages.map(msg => ({
    ...msg,
    text: msg.text.replace(IMAGE_GEN_COMMAND_REGEX, '').trim(),
  })).filter(m => m.text.length > 0 || m.sender === "USER"); // Keep user messages even if empty after trim, filter out AI messages that become empty

  return (
    <div className="flex flex-col md:flex-row h-full w-full gap-4 p-4">
      <div className="w-full md:w-2/3 h-full min-h-0 flex flex-col"> {/* Added flex flex-col here */}
        <TerminalWindow
          title="STORY WEAVER"
          messages={cleanMessagesForDisplay}
          isTypingActive={isLoadingAI}
          activeTypingMessageId={activeTypingMessageId}
          onTypingComplete={onTypingComplete}
          typingSpeed={props.typingSpeed}
          isPromptingUser={!isLoadingAI} // Prompt when AI is not typing
          userInputValue={props.userPromptInput}
          onUserInputChange={props.onUserPromptInputChange}
          onUserPromptSubmit={props.onUserPromptSubmit}
          currentMode={AppMode.STORY_WEAVER_EXE}
          commandHistory={props.commandHistory}
          onCommandHistoryNavigation={props.onCommandHistoryNavigation}
          className="h-full w-full" // Ensure TerminalWindow tries to fill its parent
        />
      </div>
      <div className="w-full md:w-1/3 h-full">
        <ImageSnapshotDisplay snapshots={snapshots} isGenerating={isGeneratingImage} />
      </div>
    </div>
  );
};

export default StoryWeaverModeContainer;