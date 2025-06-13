
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MatrixSettings, AppMode, InterventionTarget, ThemeName, ControlsPanelProps, ApiKeySource,
  LyriaPrompt, LiveMusicGenerationConfig, LyriaPlaybackState, LyriaSessionBackup
} from '../types';
import {
  AI1_NAME, AI2_NAME, MIN_TYPING_SPEED_MS, MAX_TYPING_SPEED_MS, DEFAULT_TYPING_SPEED_MS,
  THEMES, AVAILABLE_MODELS, IMAGEN_MODEL_NAME
} from '../constants';
import RotatingGlobe from './RotatingGlobe';
import LyriaModal from './LyriaModal'; 
import LyriaSaveLoadModal from './LyriaSaveLoadModal';
import { GoogleGenAI, LiveMusicSession, LiveMusicServerMessage, Scale } from '@google/genai';

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success'; fullWidth?: boolean }> = ({ children, className, variant = 'primary', fullWidth = false, ...props }) => {
  const baseStyle = "px-3 py-2 border-2 rounded-sm focus:outline-none focus-ring-primary transition-all duration-150 ease-in-out uppercase text-xs tracking-wider font-semibold";
  let variantStyle = "";
  switch(variant) {
    case 'primary':
      variantStyle = "bg-[var(--color-bg-button-primary)] border-[var(--color-border-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] text-[var(--color-text-button-primary)] hover:shadow-lg hover:shadow-[var(--color-shadow-base)]/50";
      break;
    case 'secondary':
      variantStyle = "bg-[var(--color-bg-button-secondary)] border-[var(--color-border-button-secondary)] hover:bg-[var(--color-bg-button-secondary-hover)] text-[var(--color-text-button-secondary)] hover:shadow-md hover:shadow-[var(--color-shadow-base)]/30";
      break;
    case 'danger':
      variantStyle = "bg-red-600 border-red-700 hover:bg-red-700 text-white hover:shadow-lg hover:shadow-red-500/50";
      break;
    case 'success':
       variantStyle = "bg-green-600 border-green-700 hover:bg-green-700 text-white hover:shadow-lg hover:shadow-green-500/50";
      break;
  }
  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button className={`${baseStyle} ${variantStyle} ${widthStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Audio decoding utilities (adapted from prompt-dj/utils.ts)
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeLyriaAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 48000,
  numChannels: number = 2
): Promise<AudioBuffer> {
  console.log('[Lyria] Decoding audio data chunk, length:', data.length);
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate,
  );

  const dataInt16 = new Int16Array(data.buffer);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }

  if (numChannels === 0) { 
    buffer.copyToChannel(dataFloat32, 0);
  } else { 
    for (let i = 0; i < numChannels; i++) {
      const channelData = new Float32Array(dataFloat32.length / numChannels);
      for (let j = 0; j < channelData.length; j++) {
        channelData[j] = dataFloat32[j * numChannels + i];
      }
      buffer.copyToChannel(channelData, i);
    }
  }
  console.log('[Lyria] Audio data decoded into AudioBuffer.');
  return buffer;
}


export const LYRIA_PROMPT_COLORS = ["#9900ff", "#5200ff", "#ff25f6", "#2af6de", "#ffdd28", "#3dffab", "#f05a05", "#04f100"]; // Added more colors
const LYRIA_MODEL_NAME = 'lyria-realtime-exp';
export const MAX_LYRIA_PROMPTS = 6; // Increased prompt limit

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  matrixSettings,
  onMatrixSettingsChange,
  onCopyChat,
  onExportTXT,
  onExportMD,
  onBackupChat,
  onLoadChat,
  activeApiKeySource,
  initialCustomKeyValue,
  apiKeyMissingError,
  isEmergencyStopActive,
  onEmergencyStopToggle,
  onSaveCustomApiKey,
  onClearCustomApiKey,
  globalSelectedModelId,
  onGlobalModelChange,
  currentMode,
  onModeChange,
  activeTheme,
  onThemeChange,
  onOpenInfoModal,
  onSendUserIntervention,
  currentTypingSpeed,
  onTypingSpeedChange,
  onCompleteCurrentMessage,
  isAIsTyping,
  activeAIName,
}) => {
  const [showInterventionInput, setShowInterventionInput] = useState(false);
  const [interventionText, setInterventionText] = useState("");
  const [interventionTarget, setInterventionTarget] = useState<InterventionTarget>('CHAT_FLOW');
  const [showApiKeyManagement, setShowApiKeyManagement] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customApiKeyInput, setCustomApiKeyInput] = useState('');

  // Lyria State
  const [isLyriaModalOpen, setIsLyriaModalOpen] = useState(false); 
  const [isLyriaSaveLoadModalOpen, setIsLyriaSaveLoadModalOpen] = useState(false);
  const [lyriaPrompts, setLyriaPrompts] = useState<LyriaPrompt[]>([]);
  const [lyriaConfig, setLyriaConfig] = useState<LiveMusicGenerationConfig>({ temperature: 1.1, topK: 40, guidance: 4.0 });
  const [lyriaPlaybackState, setLyriaPlaybackState] = useState<LyriaPlaybackState>('stopped');
  const lyriaSessionRef = useRef<LiveMusicSession | null>(null);
  const lyriaSessionErrorRef = useRef<boolean>(false);
  const lyriaAudioContextRef = useRef<AudioContext | null>(null);
  const lyriaOutputNodeRef = useRef<GainNode | null>(null);
  const lyriaNextChunkStartTimeRef = useRef<number>(0);
  const [lyriaStatusMessage, setLyriaStatusMessage] = useState<string>("Ready.");
  const lyriaAiInstanceRef = useRef<GoogleGenAI | null>(null);
  const lyriaBufferTime = 2;
  const presetPromptAddedRef = useRef(false);


  useEffect(() => {
    setCustomApiKeyInput(initialCustomKeyValue);
  }, [initialCustomKeyValue]);

  const throttledSetLyriaPrompts = useCallback(
    throttle(async () => {
      if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
        const promptsToSend = lyriaPrompts.filter(p => p.text.trim() && p.weight > 0);
        console.log("[Lyria] Throttled: Setting weighted prompts:", JSON.stringify(promptsToSend));
        
        const wasPlaying = lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading';
        if (wasPlaying) {
          lyriaSessionRef.current?.pause();
          setLyriaStatusMessage("Applying prompt changes...");
          console.log("[Lyria] Music paused for prompt update.");
          // Give a moment for pause to take effect if needed, though often not required for config changes
          await new Promise(resolve => setTimeout(resolve, 50)); 
        }

        try {
          await lyriaSessionRef.current.setWeightedPrompts({ weightedPrompts: promptsToSend });
          setLyriaStatusMessage("Prompts updated.");
          console.log("[Lyria] Prompts successfully updated.");

          if (wasPlaying && lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
            lyriaSessionRef.current?.play();
            setLyriaStatusMessage("Music playing with new prompts.");
            console.log("[Lyria] Music resumed after prompt update.");
          }
        } catch (e) {
          console.error("[Lyria] Error setting Lyria prompts:", e);
          setLyriaStatusMessage(`Error updating prompts: ${e instanceof Error ? e.message : "Unknown"}`);
          lyriaSessionErrorRef.current = true;
          setLyriaPlaybackState('error');
        }
      } else {
         console.log("[Lyria] Throttled: Skipping setWeightedPrompts - session not active or errored.", {hasSession: !!lyriaSessionRef.current, hasError: lyriaSessionErrorRef.current});
      }
    }, 300),
    [lyriaPrompts, lyriaPlaybackState] 
  );

  const connectToLyriaSession = useCallback(async () => {
    if (!lyriaAiInstanceRef.current) {
        setLyriaStatusMessage("Error: Lyria AI not initialized (check API key).");
        console.error("[Lyria] connectToLyriaSession called but Lyria AI instance is null.");
        setLyriaPlaybackState('error');
        lyriaSessionErrorRef.current = true;
        return;
    }
    
    setLyriaStatusMessage("Connecting to Lyria session...");
    lyriaSessionErrorRef.current = false;
    console.log("[Lyria] Attempting to connect to Lyria session...");

    if (!lyriaAudioContextRef.current) {
      lyriaAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
      console.log("[Lyria] AudioContext created. Sample rate:", lyriaAudioContextRef.current.sampleRate);
    }
    if (lyriaAudioContextRef.current.state === 'suspended') {
      console.log("[Lyria] AudioContext is suspended, attempting to resume...");
      await lyriaAudioContextRef.current.resume();
      console.log("[Lyria] AudioContext resumed. State:", lyriaAudioContextRef.current.state);
    }
    if (!lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
        lyriaOutputNodeRef.current = lyriaAudioContextRef.current.createGain();
        lyriaOutputNodeRef.current.connect(lyriaAudioContextRef.current.destination);
        console.log("[Lyria] GainNode created and connected to destination.");
    }

    try {
      console.log("[Lyria] Calling ai.live.music.connect with model:", LYRIA_MODEL_NAME, "and musicGenerationConfig:", lyriaConfig);
      lyriaSessionRef.current = await lyriaAiInstanceRef.current.live.music.connect({
        model: LYRIA_MODEL_NAME,
        config: { musicGenerationConfig: lyriaConfig },
        callbacks: {
          onmessage: async (e: LiveMusicServerMessage) => {
            console.log('[Lyria] Received server message:', JSON.stringify(e, null, 2));
            if (e.setupComplete) {
                console.log("[Lyria] SetupComplete received from server.");
                setLyriaStatusMessage("Lyria session connected.");
                if (lyriaPrompts.length > 0) {
                    console.log("[Lyria] Sending initial prompts after setupComplete.");
                    // Don't auto-play here, just ensure prompts are sent if session is being established
                    // The play action will come from user interaction or explicit call after API update.
                    throttledSetLyriaPrompts();
                }
            }
            if (e.serverContent?.audioChunks?.[0]?.data) {
              setLyriaPlaybackState(currentLocalPlaybackState => {
                if (currentLocalPlaybackState === 'paused' || currentLocalPlaybackState === 'stopped' || lyriaSessionErrorRef.current) {
                  console.log(`[Lyria] Audio chunk received but playback is ${currentLocalPlaybackState} or session error. Ignoring.`);
                  return currentLocalPlaybackState;
                }
                if (!lyriaAudioContextRef.current || !lyriaOutputNodeRef.current) {
                  console.error("[Lyria] AudioContext or OutputNode is null during audio chunk processing.");
                  lyriaSessionErrorRef.current = true; 
                  return 'error';
                }

                const audioData = decodeBase64(e.serverContent!.audioChunks![0].data);
                decodeLyriaAudioData(audioData, lyriaAudioContextRef.current!).then(audioBuffer => {
                  const source = lyriaAudioContextRef.current!.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(lyriaOutputNodeRef.current!);
                  const currentTime = lyriaAudioContextRef.current!.currentTime;
                  
                  let nextStartTime = lyriaNextChunkStartTimeRef.current;
                   if (nextStartTime === 0 && (currentLocalPlaybackState === 'loading' || currentLocalPlaybackState === 'playing') && !lyriaSessionErrorRef.current ) { 
                     nextStartTime = currentTime + lyriaBufferTime;
                     console.log("[Lyria] First audio chunk processed, scheduling with buffer time.");
                  }

                  if (nextStartTime < currentTime) {
                    console.warn(`[Lyria] Audio buffer underrun! Next start time ${nextStartTime} is less than current time ${currentTime}. Resetting start time.`);
                    setLyriaStatusMessage("Audio buffer underrun, reloading...");
                    lyriaNextChunkStartTimeRef.current = currentTime; 
                    nextStartTime = currentTime;
                  }
                  source.start(nextStartTime);
                  console.log(`[Lyria] Scheduled audio chunk to play at: ${nextStartTime}. Buffer duration: ${audioBuffer.duration}`);
                  lyriaNextChunkStartTimeRef.current = nextStartTime + audioBuffer.duration;

                }).catch(decodeError => {
                    console.error("[Lyria] Error decoding audio data:", decodeError);
                    setLyriaStatusMessage("Error: Could not decode audio.");
                    lyriaSessionErrorRef.current = true;
                    setLyriaPlaybackState('error'); 
                });

                if (currentLocalPlaybackState === 'loading' && !lyriaSessionErrorRef.current) {
                   setLyriaStatusMessage("Music playing.");
                   return 'playing';
                }
                return currentLocalPlaybackState;
              });

            } else if ((e as any).error) {
                console.error("[Lyria] Server error message in onmessage:", (e as any).error);
                setLyriaStatusMessage(`Lyria Error: ${(e as any).error.message || 'Unknown server error'}`);
                setLyriaPlaybackState('error');
                lyriaSessionErrorRef.current = true;
            }
          },
          onerror: (errEvent: Event) => {
            const err = errEvent as any;
            console.error("[Lyria] Connection onerror triggered:", err);
            setLyriaStatusMessage(`Lyria connection error: ${err.message || 'Unknown. Check console.'}`);
            setLyriaPlaybackState('error');
            lyriaSessionRef.current = null;
            lyriaSessionErrorRef.current = true;
          },
          onclose: (closeEvent: CloseEvent) => {
            setLyriaPlaybackState(prevStateAtClose => {
                console.warn(`[Lyria] Connection onclose. Code: ${closeEvent.code}, Reason: "${closeEvent.reason}", WasClean: ${closeEvent.wasClean}. State AT CLOSE: ${prevStateAtClose}`);
                setLyriaStatusMessage("Lyria connection closed.");
                const newState = prevStateAtClose === 'error' ? 'error' : 'stopped';
                if (newState === 'stopped') {
                  lyriaNextChunkStartTimeRef.current = 0; 
                }
                lyriaSessionRef.current = null;
                lyriaSessionErrorRef.current = true; // Mark as errored/closed until reconnected
                return newState;
            });
          },
        },
      });
      console.log("[Lyria] live.music.connect call completed.");
    } catch (error) {
      console.error("[Lyria] Failed to connect to Lyria session (outer catch):", error);
      setLyriaStatusMessage(`Failed to connect: ${error instanceof Error ? error.message : "Unknown error"}`);
      setLyriaPlaybackState('error');
      lyriaSessionErrorRef.current = true;
    }
  }, [lyriaConfig, lyriaPrompts, throttledSetLyriaPrompts]); 

  const handleLyriaPlayPause = useCallback(async () => {
    console.log(`[Lyria] handleLyriaPlayPause called. Current state: ${lyriaPlaybackState}`);
    if (!lyriaAiInstanceRef.current) {
        setLyriaStatusMessage("Error: Lyria AI not initialized (check API key).");
        console.error("[Lyria] Play/Pause clicked but Lyria AI instance is null.");
        return;
    }

    if (lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading') {
      console.log("[Lyria] Pausing music.");
      lyriaSessionRef.current?.pause();
      setLyriaPlaybackState('paused');
      setLyriaStatusMessage("Music paused.");
      if (lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
          lyriaOutputNodeRef.current.gain.linearRampToValueAtTime(0, lyriaAudioContextRef.current.currentTime + 0.1);
      }
      lyriaNextChunkStartTimeRef.current = 0;
    } else { 
      setLyriaPlaybackState('loading');
      setLyriaStatusMessage("Attempting to play/resume music...");
      console.log("[Lyria] Attempting to play/resume music.");

      if (!lyriaSessionRef.current || lyriaSessionErrorRef.current) { // If no session or session was errored/closed
        console.log("[Lyria] No active session or session was in error/closed state. Attempting to connect...");
        await connectToLyriaSession(); 
        // connectToLyriaSession's onmessage for setupComplete will handle sending prompts.
        // If connection is successful and user wants to play, they might need to click play again
        // OR we can attempt to play immediately after successful connection here.
        // For now, let connectToLyriaSession establish it, then user can press play.
        // If the API kicks off audio on connect after prompt setting, that's handled by onmessage.
         if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
            // If connect was successful, now try to play
            lyriaSessionRef.current.play();
             if (lyriaAudioContextRef.current && lyriaAudioContextRef.current.state === 'suspended') {
              await lyriaAudioContextRef.current.resume();
            }
            if (lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
                lyriaOutputNodeRef.current.gain.linearRampToValueAtTime(1, lyriaAudioContextRef.current.currentTime + 0.1);
            }
            // setLyriaPlaybackState('loading'); // It's already loading
            setLyriaStatusMessage("Music playing...");
         } else if (!lyriaSessionRef.current || lyriaSessionErrorRef.current) {
            setLyriaPlaybackState('error');
            setLyriaStatusMessage("Error: Could not start Lyria session.");
         }
      } else if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) { // Session exists and is not in error
        console.log(`[Lyria] Session exists. Calling play().`);
        lyriaSessionRef.current.play(); 
        if (lyriaAudioContextRef.current && lyriaAudioContextRef.current.state === 'suspended') {
          console.log("[Lyria] AudioContext suspended, resuming for play.");
          await lyriaAudioContextRef.current.resume();
        }
        if (lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
            lyriaOutputNodeRef.current.gain.linearRampToValueAtTime(1, lyriaAudioContextRef.current.currentTime + 0.1);
        }
        // setLyriaPlaybackState('loading'); // Already loading
        setLyriaStatusMessage("Music playing...");
      }
    }
  }, [lyriaPlaybackState, connectToLyriaSession]);

  useEffect(() => {
    let keyToUse: string | undefined = undefined;
    let keySourceForLog: string = 'unknown';

    if (activeApiKeySource === 'custom' && initialCustomKeyValue) {
        keyToUse = initialCustomKeyValue;
        keySourceForLog = 'custom';
    } else if (activeApiKeySource === 'environment' && process.env.API_KEY) {
        keyToUse = process.env.API_KEY;
        keySourceForLog = 'environment';
    }
    
    if (keyToUse && !apiKeyMissingError) {
        if (!lyriaAiInstanceRef.current) { 
            try {
                console.log(`[Lyria] Initializing GoogleGenAI for Lyria with API version 'v1alpha' using key from: ${keySourceForLog}.`);
                lyriaAiInstanceRef.current = new GoogleGenAI({ apiKey: keyToUse, apiVersion: 'v1alpha' });
                console.log("[Lyria] Lyria AI Instance Initialized successfully.");
                setLyriaStatusMessage("Lyria AI Ready.");
            } catch (e) {
                console.error("[Lyria] Failed to initialize GoogleGenAI for Lyria:", e);
                setLyriaStatusMessage("Error: Failed to init Lyria AI.");
                lyriaAiInstanceRef.current = null;
            }
        }
    } else {
        console.warn("[Lyria] Lyria AI Instance NOT initialized - No valid API key available.");
        lyriaAiInstanceRef.current = null;
        if (isLyriaModalOpen) { 
           setLyriaStatusMessage("Error: Lyria requires an active API key.");
        }
    }
  }, [activeApiKeySource, initialCustomKeyValue, apiKeyMissingError, isLyriaModalOpen]);


  useEffect(() => {
    if (isLyriaModalOpen && !presetPromptAddedRef.current && lyriaPrompts.length === 0 && lyriaAiInstanceRef.current) {
      const defaultPromptId = `lyria-prompt-default-${Date.now()}`;
      setLyriaPrompts([
        {
          promptId: defaultPromptId,
          text: "post-rock full band",
          weight: 1.0, // Changed default weight to 1.0
          color: LYRIA_PROMPT_COLORS[0] || "#9900ff",
        },
      ]);
      presetPromptAddedRef.current = true;
      console.log("[Lyria] Set default preset prompt: post-rock full band, weight 1.0.");
    }
    if (!isLyriaModalOpen) { 
      presetPromptAddedRef.current = false; 
    }
  }, [isLyriaModalOpen, lyriaPrompts]);


  const throttledSetLyriaConfig = useCallback(
    throttle(async () => {
        if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
            console.log("[Lyria] Throttled: Setting music generation config:", lyriaConfig);
            const wasPlaying = lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading';
            if (wasPlaying) {
                lyriaSessionRef.current?.pause();
                setLyriaStatusMessage("Applying config changes...");
                console.log("[Lyria] Music paused for config update.");
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            try {
                await lyriaSessionRef.current.setMusicGenerationConfig({ musicGenerationConfig: lyriaConfig });
                setLyriaStatusMessage("Music config updated.");
                console.log("[Lyria] Music config successfully updated.");
                 if (wasPlaying && lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
                    lyriaSessionRef.current?.play();
                    setLyriaStatusMessage("Music playing with new config.");
                    console.log("[Lyria] Music resumed after config update.");
                }
            } catch (e) {
                console.error("[Lyria] Error setting Lyria music config:", e);
                setLyriaStatusMessage(`Error updating config: ${e instanceof Error ? e.message : "Unknown"}`);
                lyriaSessionErrorRef.current = true;
                setLyriaPlaybackState('error');
            }
        } else {
            console.log("[Lyria] Throttled: Skipping setMusicGenerationConfig - session not active or errored.", {hasSession: !!lyriaSessionRef.current, hasError: lyriaSessionErrorRef.current});
        }
    }, 300),
    [lyriaConfig, lyriaPlaybackState]
  );

  const handleLyriaResetContext = async () => {
    console.log("[Lyria] handleLyriaResetContext called.");
    if (!lyriaSessionRef.current) {
        setLyriaStatusMessage("No active Lyria session to reset.");
        console.log("[Lyria] Reset context called but no active session.");
        return;
    }

    const wasPlayingOrLoading = lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading';

    lyriaSessionRef.current?.pause();
    setLyriaPlaybackState('paused'); 
    setLyriaStatusMessage("Resetting Lyria context...");
    lyriaNextChunkStartTimeRef.current = 0; 

    lyriaSessionRef.current?.resetContext();
    // Reset config to defaults, then re-apply prompts to ensure fresh start
    const defaultConfig = { temperature: 1.1, topK: 40, guidance: 4.0 };
    setLyriaConfig(defaultConfig);
    
    // Apply config first
    if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
      try {
        await lyriaSessionRef.current.setMusicGenerationConfig({ musicGenerationConfig: defaultConfig });
        console.log("[Lyria] Default config applied during reset.");
      } catch (e) { console.error("[Lyria] Error applying default config during reset:", e); }
    }
    
    // Then re-apply current prompts
    if (lyriaPrompts.length > 0 && lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
      const promptsToSend = lyriaPrompts.filter(p => p.text.trim() && p.weight > 0);
      try {
        await lyriaSessionRef.current.setWeightedPrompts({ weightedPrompts: promptsToSend });
        console.log("[Lyria] Prompts re-applied after reset.");
      } catch (e) { console.error("[Lyria] Error re-applying prompts after reset:", e); }
    }
    

    setLyriaStatusMessage("Lyria context reset. Settings reverted.");
    console.log("[Lyria] Context reset. Config reverted. Prompts resent.");

    if (wasPlayingOrLoading && lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
        console.log("[Lyria] Attempting to play after context reset.");
        setLyriaPlaybackState('loading');
        lyriaSessionRef.current.play(); // Try to play immediately
        if (lyriaAudioContextRef.current && lyriaAudioContextRef.current.state === 'suspended') {
            lyriaAudioContextRef.current.resume();
        }
        if (lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
            lyriaOutputNodeRef.current.gain.linearRampToValueAtTime(1, lyriaAudioContextRef.current.currentTime + 0.1);
        }
        setLyriaStatusMessage("Music playing after reset.");
    } else if (wasPlayingOrLoading && (!lyriaSessionRef.current || lyriaSessionErrorRef.current)) {
        console.log("[Lyria] Session became invalid during reset, cannot auto-play.");
        setLyriaPlaybackState('stopped'); // Or 'error' if appropriate
    }
  };


  const handleAddLyriaPrompt = () => {
    if (lyriaPrompts.length < MAX_LYRIA_PROMPTS) {
      const newPromptId = `lyria-prompt-${Date.now()}`;
      const usedColors = lyriaPrompts.map(p => p.color);
      const availableColors = LYRIA_PROMPT_COLORS.filter(c => !usedColors.includes(c));
      const newColor = availableColors.length > 0 ? availableColors[0] : LYRIA_PROMPT_COLORS[lyriaPrompts.length % LYRIA_PROMPT_COLORS.length];
      setLyriaPrompts([...lyriaPrompts, { promptId: newPromptId, text: "", weight: 1.0, color: newColor }]); // Default weight 1.0
      console.log("[Lyria] Added new prompt. ID:", newPromptId);
    } else {
      setLyriaStatusMessage(`Max ${MAX_LYRIA_PROMPTS} prompts reached.`);
      console.log("[Lyria] Max prompts reached.");
    }
  };

  const handleRemoveLyriaPrompt = (promptId: string) => {
    setLyriaPrompts(lyriaPrompts.filter(p => p.promptId !== promptId));
    console.log("[Lyria] Removed prompt. ID:", promptId);
  };

  const handleLyriaPromptTextChange = (promptId: string, newText: string) => {
    setLyriaPrompts(lyriaPrompts.map(p => p.promptId === promptId ? { ...p, text: newText } : p));
  };

  const handleLyriaPromptWeightChange = (promptId: string, newWeight: number) => {
    setLyriaPrompts(lyriaPrompts.map(p => p.promptId === promptId ? { ...p, weight: newWeight } : p));
  };

  useEffect(() => {
    if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
      console.log("[Lyria] Prompts changed, triggering throttledSetLyriaPrompts.");
      throttledSetLyriaPrompts();
    }
  }, [lyriaPrompts, throttledSetLyriaPrompts]);

  useEffect(() => {
    if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
        console.log("[Lyria] Config changed, triggering throttledSetLyriaConfig.");
        throttledSetLyriaConfig();
    }
  }, [lyriaConfig, throttledSetLyriaConfig]);

  const handleLyriaConfigChange = (key: keyof LiveMusicGenerationConfig, value: any) => {
    let processedValue = value;
    if (key === 'temperature' || key === 'guidance') {
        processedValue = parseFloat(value);
    } else if (key === 'topK' || key === 'seed' || key === 'bpm') {
        processedValue = value === '' || value === null ? undefined : parseInt(value, 10);
        if (isNaN(processedValue as number)) processedValue = undefined;
    }
    console.log(`[Lyria] Config change: ${key} = ${processedValue}`);
    setLyriaConfig(prev => ({ ...prev, [key]: processedValue }));
  };

  const handleSaveLyriaSettings = () => {
    const backupData: LyriaSessionBackup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      prompts: lyriaPrompts,
      config: lyriaConfig,
    };
    const jsonData = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    a.download = `lyria_settings_${timestamp}.json`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLyriaStatusMessage("Lyria settings saved.");
  };

  const handleLoadLyriaSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const backupData = JSON.parse(result) as LyriaSessionBackup;
          
          if (backupData.prompts && Array.isArray(backupData.prompts) && backupData.config && typeof backupData.config === 'object') {
            setLyriaPrompts(backupData.prompts.slice(0, MAX_LYRIA_PROMPTS)); // Ensure not too many prompts
            setLyriaConfig(backupData.config);
            setLyriaStatusMessage("Lyria settings loaded. Applying...");
            // Effects for lyriaPrompts and lyriaConfig will trigger throttled updates
            if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
                setTimeout(() => { // Give state a moment to update before trying to apply
                    throttledSetLyriaPrompts();
                    throttledSetLyriaConfig();
                },100);
            }
          } else {
            throw new Error("Invalid Lyria settings file format.");
          }
        } catch (error: any) {
          console.error("Error loading Lyria settings:", error);
          setLyriaStatusMessage(`Error loading settings: ${error.message || 'Unknown error'}`);
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset file input
    }
  };

  const enabledAppModes = Object.values(AppMode);

  const handleLoadFileClick = () => fileInputRef.current?.click();
  const getApiKeyStatusMessage = () => {
    if (apiKeyMissingError) return { text: "API Key Missing!", color: "text-[var(--color-error)]" };
    switch (activeApiKeySource) {
      case 'custom': return { text: "Custom Key Active", color: "text-[var(--color-system-message)]" };
      case 'environment': return { text: "Env Key Active", color: "text-[var(--color-info)]" };
      default: return { text: "No Key Set", color: "text-[var(--color-error)]" };
    }
  };
  const apiKeyStatus = getApiKeyStatusMessage();

  return (
    <aside className="w-full md:w-1/3 lg:max-w-xs bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-base)] shadow-xl shadow-[var(--color-shadow-base)]/50 p-3 flex flex-col space-y-3 overflow-y-auto log-display">
      <div className="flex-shrink-0">
        <RotatingGlobe />
      </div>

      <div className="control-group space-y-1">
        <label htmlFor="modeSelect" className="text-xs font-medium text-[var(--color-text-heading)]">Current Mode:</label>
        <select
          id="modeSelect"
          value={currentMode}
          onChange={(e) => onModeChange(e.target.value as AppMode)}
          className="w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-2 rounded-sm focus-ring-accent text-sm"
        >
          {enabledAppModes.map(mode => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </div>

      <Button onClick={onOpenInfoModal} variant="secondary" fullWidth className="text-xs !py-1.5">Mode Info</Button>
      <Button
        onClick={onEmergencyStopToggle}
        variant={isEmergencyStopActive ? 'success' : 'danger'}
        fullWidth
        className="font-bold text-sm !py-2.5"
      >
        {isEmergencyStopActive ? 'RESUME AI' : 'STOP AI'}
      </Button>

       {currentMode !== AppMode.UNIVERSE_SIM_EXE &&
        currentMode !== AppMode.CHESS_SIM_EXE &&
        currentMode !== AppMode.NOOSPHERIC_CONQUEST_EXE &&
        currentMode !== AppMode.STORY_WEAVER_EXE &&
        currentMode !== AppMode.CHIMERA_EXE && (
        <div className="control-group space-y-1">
          <Button onClick={() => setShowInterventionInput(!showInterventionInput)} variant="secondary" fullWidth>
            User Intervention
          </Button>
          {showInterventionInput && (
            <div className="p-2 border border-[var(--color-border-input)] rounded-sm bg-[var(--color-bg-input)] space-y-1">
              <textarea
                value={interventionText}
                onChange={(e) => setInterventionText(e.target.value)}
                rows={3}
                className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1.5 rounded-sm focus-ring-accent text-xs placeholder-[var(--color-text-placeholder)]"
                placeholder="Type your intervention..."
              />
              <select
                value={interventionTarget}
                onChange={(e) => setInterventionTarget(e.target.value as InterventionTarget)}
                className="w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1.5 rounded-sm focus-ring-accent text-xs"
              >
                <option value="CHAT_FLOW">Inject into Chat Flow</option>
                <option value="AI1">Send to {AI1_NAME} (Next Turn)</option>
                <option value="AI2">Send to {AI2_NAME} (Next Turn)</option>
              </select>
              <Button onClick={() => { if (interventionText.trim()) { onSendUserIntervention(interventionText, interventionTarget); setInterventionText(""); setShowInterventionInput(false);}}} variant="primary" fullWidth className="text-xs">Send</Button>
            </div>
          )}
        </div>
      )}

       {onGlobalModelChange && (
         <div className="control-group space-y-1">
          <label htmlFor="globalModelSelect" className="text-xs font-medium text-[var(--color-text-heading)]">Global AI Model:</label>
          <select
            id="globalModelSelect"
            value={globalSelectedModelId || ''}
            onChange={(e) => onGlobalModelChange(e.target.value)}
            className="w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-2 rounded-sm focus-ring-accent text-sm"
            aria-label="Select global AI model"
          >
            {AVAILABLE_MODELS.filter(m => m.id !== IMAGEN_MODEL_NAME).map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="control-group space-y-1">
        <Button onClick={() => setShowApiKeyManagement(!showApiKeyManagement)} variant="secondary" fullWidth>
          API Key Management
        </Button>
        {showApiKeyManagement && (
          <div className="p-2 border border-[var(--color-border-input)] rounded-sm bg-[var(--color-bg-input)] space-y-1.5">
            <label htmlFor="customApiKeyInput" className="text-xs text-[var(--color-text-muted)]">Custom Gemini API Key:</label>
            <input
              type="password"
              id="customApiKeyInput"
              value={customApiKeyInput}
              onChange={(e) => setCustomApiKeyInput(e.target.value)}
              className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1.5 rounded-sm focus-ring-accent text-xs"
              placeholder="Enter custom API Key..."
            />
            <div className="grid grid-cols-2 gap-1">
              <Button onClick={() => onSaveCustomApiKey(customApiKeyInput)} variant="success" className="text-xs !py-1">Save Key</Button>
              <Button onClick={() => { onClearCustomApiKey(); setCustomApiKeyInput(""); }} variant="danger" className="text-xs !py-1">Clear Key</Button>
            </div>
            <p className={`text-center text-xs mt-1 ${apiKeyStatus.color} font-semibold`}>Status: {apiKeyStatus.text}</p>
            {apiKeyMissingError && <p className="text-center text-xs text-[var(--color-error)]">(Check env or enter custom key)</p>}
          </div>
        )}
      </div>

      <div className="control-group space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Button onClick={() => setIsLyriaModalOpen(true)} variant="secondary" className="flex-grow">
            Lyria Music Controls
          </Button>
          <button
            onClick={() => handleLyriaPlayPause()} 
            disabled={!lyriaAiInstanceRef.current || isEmergencyStopActive || (lyriaSessionErrorRef.current && (lyriaPlaybackState === 'loading' || lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'error'))}
            className="p-2 bg-[var(--color-bg-button-primary)] rounded-full hover:bg-[var(--color-bg-button-primary-hover)] disabled:opacity-50 flex-shrink-0"
            title={lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading' ? "Pause Music" : "Play Music"}
          >
            {lyriaPlaybackState === 'loading' ? (
                <svg className="w-5 h-5 text-[var(--color-text-button-primary)] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : lyriaPlaybackState === 'playing' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[var(--color-text-button-primary)]"><path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[var(--color-text-button-primary)]"><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" /></svg>
            )}
          </button>
           <button
              onClick={handleLyriaResetContext}
              disabled={!lyriaSessionRef.current || lyriaPlaybackState === 'stopped' || lyriaSessionErrorRef.current || isEmergencyStopActive}
              className="p-2 bg-[var(--color-bg-button-secondary)] rounded-full hover:bg-[var(--color-bg-button-secondary-hover)] disabled:opacity-50 flex-shrink-0"
              title="Reset Music Context"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-text-button-secondary)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
            </button>
        </div>
         <p className={`text-center text-xs mt-1 ${lyriaPlaybackState === 'error' ? 'text-[var(--color-error)]' : 'text-[var(--color-info)]'}`}>
            Lyria: {lyriaStatusMessage}
        </p>
      </div>
      
      {isLyriaModalOpen && (
        <LyriaModal
          isOpen={isLyriaModalOpen}
          onClose={() => setIsLyriaModalOpen(false)}
          prompts={lyriaPrompts}
          config={lyriaConfig}
          onAddPrompt={handleAddLyriaPrompt}
          onRemovePrompt={handleRemoveLyriaPrompt}
          onPromptTextChange={handleLyriaPromptTextChange}
          onPromptWeightChange={handleLyriaPromptWeightChange}
          onConfigChange={handleLyriaConfigChange}
          maxPrompts={MAX_LYRIA_PROMPTS}
          promptColors={LYRIA_PROMPT_COLORS}
          statusMessage={lyriaStatusMessage}
          onPlayPauseClick={handleLyriaPlayPause}
          currentPlaybackState={lyriaPlaybackState}
          isLyriaReady={!!lyriaAiInstanceRef.current && !lyriaSessionErrorRef.current && !isEmergencyStopActive}
          onOpenSaveLoadModal={() => setIsLyriaSaveLoadModalOpen(true)}
        />
      )}

      {isLyriaSaveLoadModalOpen && (
        <LyriaSaveLoadModal
          isOpen={isLyriaSaveLoadModalOpen}
          onClose={() => setIsLyriaSaveLoadModalOpen(false)}
          onSave={handleSaveLyriaSettings}
          onLoad={handleLoadLyriaSettings}
        />
      )}


      <div className="control-group space-y-1">
        <h4 className="text-xs font-medium text-[var(--color-text-heading)]">Display &amp; Effects:</h4>
        <div className="flex items-center justify-between">
          <label htmlFor="themeSelect" className="text-xs text-[var(--color-text-muted)]">Theme:</label>
          <select id="themeSelect" value={activeTheme} onChange={(e) => onThemeChange(e.target.value as ThemeName)} className="w-auto max-w-[60%] bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1 rounded-sm focus-ring-accent text-xs">
            {Object.keys(THEMES).map(themeKey => (<option key={themeKey} value={themeKey}>{THEMES[themeKey as ThemeName].name}</option>))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="typingSpeed" className="text-xs text-[var(--color-text-muted)]">Typing Speed (ms):</label>
          <input type="number" id="typingSpeed" value={currentTypingSpeed} onChange={(e) => onTypingSpeedChange(Math.max(MIN_TYPING_SPEED_MS, Math.min(MAX_TYPING_SPEED_MS, parseInt(e.target.value, 10))))} min={MIN_TYPING_SPEED_MS} max={MAX_TYPING_SPEED_MS} step="5" className="w-20 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1 rounded-sm focus-ring-accent text-xs"/>
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="glitchEffect" className="text-xs text-[var(--color-text-muted)]">Matrix Glitch:</label>
          <input type="checkbox" id="glitchEffect" checked={matrixSettings.glitchEffect} onChange={(e) => onMatrixSettingsChange('glitchEffect', e.target.checked)} className="toggle toggle-xs toggle-success bg-[var(--color-accent-400)] focus-ring-accent" />
        </div>
        <Button onClick={onCompleteCurrentMessage} variant="secondary" fullWidth className="text-xs !py-1">Complete Typing</Button>
      </div>

      <div className="control-group space-y-1">
        <h4 className="text-xs font-medium text-[var(--color-text-heading)]">Conversation Data:</h4>
        <div className="grid grid-cols-2 gap-1">
          <Button onClick={onCopyChat} variant="secondary" className="text-xs !py-1">Copy</Button>
          <Button onClick={onExportTXT} variant="secondary" className="text-xs !py-1">.TXT</Button>
          <Button onClick={onExportMD} variant="secondary" className="text-xs !py-1">.MD</Button>
          <Button onClick={onBackupChat} variant="secondary" className="text-xs !py-1">Backup Session</Button>
        </div>
        <Button onClick={handleLoadFileClick} variant="secondary" fullWidth className="text-xs !py-1.5">Load Session (.json)</Button>
        <input type="file" ref={fileInputRef} onChange={onLoadChat} className="hidden" accept=".json"/>
      </div>

      <div className="mt-auto pt-2 border-t border-[var(--color-border-strong)] text-center">
        <p className="text-xs text-[var(--color-text-muted)]">Status: {isAIsTyping ? `${activeAIName || 'AI'} is processing...` : "Idle"}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] opacity-70">Powered by Gemini API. UI v1.11.0</p>
      </div>
    </aside>
  );
};

function throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>): ReturnType<T> | undefined => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (remaining <= 0) {
      lastCall = now;
      return func(...args);
    } else {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func(...args);
      }, remaining);
    }
  }) as T;
}
export default ControlsPanel;
