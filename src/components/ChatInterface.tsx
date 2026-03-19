import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Video, Mic, Sparkles, Search, MapPin, Brain, Loader2, Paperclip, X, Moon, Sun, Bot as BotIcon, Menu, Key, Zap } from 'lucide-react';
import { Message, ChatSession, ModelProvider } from '../types';
import { MessageItem } from './MessageItem';
import { generateChatResponse, generateImage, generateVideo, generateSpeech } from '../services/axion';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu } from 'lucide-react';

interface ChatInterfaceProps {
  sessionId: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSidebar?: () => void;
  onUpgrade: () => void;
}

export function ChatInterface({ sessionId, isDarkMode, onToggleDarkMode, onOpenSidebar, onUpgrade }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [memories, setMemories] = useState<{ id: string, fact: string }[]>([]);
  const [attachment, setAttachment] = useState<{ type: 'image' | 'video' | 'audio', file: File, preview: string } | null>(null);
  const [thinkingText, setThinkingText] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<{ title: string, description: string }>({
    title: 'Limit Reached',
    description: "You've used all 50 of your free messages. Upgrade to Axion Pro to continue chatting and unlock all features!"
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) {
      setThinkingText('');
      return;
    }

    const fullText = "Axion is thinking...";
    let index = 0;
    const interval = setInterval(() => {
      setThinkingText(fullText.slice(0, index));
      index = (index + 1) % (fullText.length + 1);
      if (index === 0) {
        // Pause at the end
        clearInterval(interval);
        setTimeout(() => {
          if (isLoading) {
            // Restart animation
            const newInterval = setInterval(() => {
              setThinkingText(fullText.slice(0, index));
              index = (index + 1) % (fullText.length + 1);
            }, 100);
          }
        }, 500);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (!sessionId) return;

    const q = query(
      collection(db, 'sessions', sessionId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `sessions/${sessionId}/messages`);
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' : 
                 file.type.startsWith('audio/') ? 'audio' : null;

    if (!type) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        type: type as any,
        file,
        preview: event.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'memories'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mems = snapshot.docs.map(doc => ({
        id: doc.id,
        fact: doc.data().fact
      }));
      setMemories(mems);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/memories`);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const checkProFeature = (featureName: string) => {
    if (userProfile?.subscription !== 'pro') {
      setUpgradeReason({
        title: 'Pro Feature',
        description: `The ${featureName} feature is only available for Axion Pro users. Upgrade now to unlock advanced AI capabilities!`
      });
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    // Check usage limits for free users
    if (userProfile?.subscription !== 'pro') {
      const count = userProfile?.messageCount || 0;
      if (count >= 50) {
        setUpgradeReason({
          title: 'Limit Reached',
          description: "You've used all 50 of your free messages. Upgrade to Axion Pro to continue chatting and unlock all features!"
        });
        setShowUpgradeModal(true);
        return;
      }
    }

    const userMessageContent = input.trim();
    const currentInput = input;
    const currentAttachment = attachment;
    
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      // 1. Add user message to Firestore
      const userMsgData: any = {
        sessionId,
        userId: auth.currentUser?.uid,
        role: 'user',
        content: userMessageContent || (currentAttachment ? `Uploaded ${currentAttachment.type}` : ''),
        type: currentAttachment ? currentAttachment.type : 'text',
        createdAt: serverTimestamp()
      };
      
      if (currentAttachment) {
        // Check size before saving (Firestore limit is 1MB)
        // Base64 is ~1.37x original size. 1MB base64 is ~700KB original.
        if (currentAttachment.preview.length > 1000000) {
          userMsgData.mediaUrl = "IMAGE_TOO_LARGE";
          userMsgData.content = (userMsgData.content || "") + "\n\n(Note: Attachment was too large to save in history)";
        } else {
          userMsgData.mediaUrl = currentAttachment.preview;
        }
      }
      
      try {
        await addDoc(collection(db, 'sessions', sessionId, 'messages'), userMsgData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `sessions/${sessionId}/messages`);
      }

      // Update session timestamp
      try {
        await updateDoc(doc(db, 'sessions', sessionId), {
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
      }

      // 2. Determine action based on prompt
      let responseText = "";
      let responseType: 'text' | 'image' | 'video' = 'text';
      let mediaUrl = "";

      const lowerPrompt = currentInput.toLowerCase();
      const isImageRequest = /generate.*image|create.*image|draw|make.*image|generate.*picture|create.*picture|show.*image|show.*picture/i.test(lowerPrompt);
      const isVideoRequest = lowerPrompt.includes('generate video') || lowerPrompt.includes('create video');

      if (isImageRequest || isVideoRequest) {
        if (userProfile?.subscription !== 'pro') {
          setUpgradeReason({
            title: 'Pro Feature',
            description: "Image and Video generation are exclusive to Axion Pro users. Upgrade now to bring your ideas to life!"
          });
          setShowUpgradeModal(true);
          setIsLoading(false);
          return;
        }

        if (isImageRequest) {
          // Clean the prompt for the image generator (remove "generate an image of", etc.)
          const cleanPrompt = currentInput
            .replace(/generate.*image\s+of\s+/i, '')
            .replace(/create.*image\s+of\s+/i, '')
            .replace(/draw\s+(a\s+)?/i, '')
            .replace(/make.*image\s+of\s+/i, '')
            .trim();

          mediaUrl = await generateImage(cleanPrompt || currentInput);
          responseText = `Here is the image I generated for: "${cleanPrompt || currentInput}"`;
          responseType = 'image';
        } else {
          mediaUrl = await generateVideo(currentInput);
          responseText = `Here is the video I generated for: "${currentInput}"`;
          responseType = 'video';
        }
      } else {
        const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

        const userContext = memories.map(m => `- ${m.fact}`).join('\n');
        const language = userProfile?.preferences?.language || 'English';

        const response = await generateChatResponse(currentInput, history, {
          useThinking,
          useSearch,
          useMaps,
          location: useMaps ? { latitude: 37.7749, longitude: -122.4194 } : undefined, // Default SF for demo
          attachment: currentAttachment ? {
            mimeType: currentAttachment.file.type,
            data: currentAttachment.preview.split(',')[1]
          } : undefined,
          userContext,
          language
        });
        responseText = response.text;

        // 3. Parse and save memories if present
        const memoryMatches = responseText.match(/\[SAVE_MEMORY:\s*(.*?)\]/g);
        if (memoryMatches && auth.currentUser) {
          for (const match of memoryMatches) {
            const fact = match.replace(/\[SAVE_MEMORY:\s*|\]/g, '').trim();
            if (fact) {
              try {
                await addDoc(collection(db, 'users', auth.currentUser.uid, 'memories'), {
                  userId: auth.currentUser.uid,
                  fact,
                  createdAt: serverTimestamp()
                });
              } catch (error) {
                console.error("Failed to save memory:", error);
              }
            }
          }
          // Clean up response text for the user
          responseText = responseText.replace(/\[SAVE_MEMORY:\s*(.*?)\]/g, '').trim();
        }
      }

      // 4. Add model response to Firestore
      const modelMsgData: any = {
        sessionId,
        userId: auth.currentUser?.uid,
        role: 'model',
        content: responseText,
        type: responseType,
        createdAt: serverTimestamp()
      };
      if (mediaUrl) {
        if (mediaUrl.length > 1000000) {
          modelMsgData.mediaUrl = "IMAGE_TOO_LARGE";
          modelMsgData.content = (modelMsgData.content || "") + "\n\n(Note: Generated image was too large to save in history)";
        } else {
          modelMsgData.mediaUrl = mediaUrl;
        }
      }

      try {
        await addDoc(collection(db, 'sessions', sessionId, 'messages'), modelMsgData);
        
        // Increment message count
        if (auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            messageCount: (userProfile?.messageCount || 0) + 1
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `sessions/${sessionId}/messages`);
      }

    } catch (error: any) {
      console.error("Error sending message:", error);
      
      let errorMessage = "I'm sorry, I encountered an error while processing your request.";
      
      // Check for 429 Quota Exceeded error
      const errorStr = JSON.stringify(error);
      if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('429')) {
        errorMessage = "Axion has reached its temporary usage limit (Quota Exceeded). This usually happens when many users are active at once. Please wait a minute and try again.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }

      // Add error message to chat so user knows what happened
      try {
        await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
          sessionId,
          userId: auth.currentUser?.uid,
          role: 'model',
          content: errorMessage,
          type: 'text',
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to log error message to Firestore:", e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-zinc-950 transition-colors overflow-hidden">
      <div className="h-14 sm:h-16 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-2 sm:px-6 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-1.5 sm:p-2 -ml-1 sm:-ml-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            <Menu size={18} className="sm:w-5 sm:h-5" />
          </button>
          <Sparkles className="text-emerald-500" size={18} />
          <h2 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">Axion</h2>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Moon size={16} className="sm:w-[18px] sm:h-[18px]" />}
          </button>
          <button
            onClick={() => {
              if (checkProFeature('Thinking Mode')) {
                setUseThinking(!useThinking);
              }
            }}
            className={cn(
              "p-1.5 sm:p-2 rounded-lg transition-all flex items-center gap-1 sm:gap-2 text-xs font-medium relative",
              useThinking 
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" 
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            )}
            title="Thinking Mode"
          >
            <Brain size={16} />
            <span className="hidden md:inline">Thinking</span>
            {userProfile?.subscription !== 'pro' && (
              <div className="absolute -top-1 -right-1 bg-amber-500 text-[8px] text-white px-1 rounded-full">PRO</div>
            )}
          </button>
          <button
            onClick={() => setUseSearch(!useSearch)}
            className={cn(
              "p-1.5 sm:p-2 rounded-lg transition-all flex items-center gap-1 sm:gap-2 text-xs font-medium",
              useSearch ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            )}
            title="Search Grounding"
          >
            <Search size={16} />
            <span className="hidden md:inline">Search</span>
          </button>
          <button
            onClick={() => {
              if (checkProFeature('Advanced Maps')) {
                setUseMaps(!useMaps);
              }
            }}
            className={cn(
              "p-1.5 sm:p-2 rounded-lg transition-all flex items-center gap-1 sm:gap-2 text-xs font-medium relative",
              useMaps ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            )}
            title="Maps Grounding"
          >
            <MapPin size={16} />
            <span className="hidden md:inline">Maps</span>
            {userProfile?.subscription !== 'pro' && (
              <div className="absolute -top-1 -right-1 bg-amber-500 text-[8px] text-white px-1 rounded-full">PRO</div>
            )}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-4">
              <Sparkles size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Welcome to Axion Chat</h3>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
              Ask me anything! I can generate images, videos, search the web, and even think deeply about complex problems.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-8 px-4">
              {[
                "Generate an image of a futuristic city",
                "Create a 16:9 video of a sunset on Mars",
                "Explain quantum computing simply",
                "Find best Italian restaurants in SF"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="p-4 text-left text-sm bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            const isModel = msg.role === 'model';
            const createdAt = msg.createdAt?.toMillis?.() || Date.now();
            const isRecent = createdAt > Date.now() - 10000;
            
            return (
              <MessageItem 
                key={msg.id || index} 
                message={msg} 
                isNew={isLast && isModel && isRecent}
              />
            );
          })
        )}
        {isLoading && (
          <div className="flex gap-4 p-6 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BotIcon size={18} className="animate-pulse" />
            </div>
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-sm font-mono">
              {thinkingText}
              <span className="w-1.5 h-4 bg-emerald-500 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-6 border-t border-zinc-100 dark:border-zinc-800">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative w-full">
          {userProfile?.subscription !== 'pro' && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${Math.min(((userProfile?.messageCount || 0) / 50) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                {userProfile?.messageCount || 0} / 50 Free Messages
              </span>
            </div>
          )}
          {attachment && (
            <div className="absolute bottom-full mb-4 left-0 bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {attachment.type === 'image' ? (
                  <img src={attachment.preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    {attachment.type === 'video' ? <Video size={18} /> : <Mic size={18} />}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2 sm:pr-4">
                <p className="text-[10px] sm:text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{attachment.file.name}</p>
                <p className="text-[8px] sm:text-[10px] text-zinc-500 uppercase">{attachment.type}</p>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-1 sm:gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 sm:p-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
            <button
              type="button"
              onClick={() => {
                if (input.trim()) {
                  handleSend();
                } else {
                  setInput('Generate an image of ');
                }
              }}
              className={cn(
                "p-2 text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors",
                (input.toLowerCase().includes('generate image') || input.toLowerCase().includes('create image') || input.toLowerCase().includes('draw')) && "text-emerald-500"
              )}
              title="Generate Image"
            >
              <ImageIcon size={18} className="sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Paperclip size={18} className="sm:w-5 sm:h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,video/*,audio/*"
            />
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Axion..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 py-2 sm:py-3 resize-none max-h-32 min-h-[40px] text-sm sm:text-base"
              rows={1}
            />

            <button
              type="submit"
              disabled={(!input.trim() && !attachment) || isLoading}
              className={cn(
                "p-2 sm:p-3 rounded-xl transition-all",
                (input.trim() || attachment) && !isLoading
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-600"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              )}
            >
              <Send size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
          <p className="text-[9px] sm:text-[10px] text-center text-zinc-400 mt-2 sm:mt-3">
            Axion can make mistakes. Check important info.
          </p>
        </form>
      </div>

      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
                  <Zap size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{upgradeReason.title}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {upgradeReason.description}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowUpgradeModal(false);
                      onUpgrade();
                    }}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
                  >
                    Upgrade to Pro
                  </button>
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="w-full py-4 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Bot({ size, className }: { size: number, className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Sparkles size={size} />
    </div>
  );
}
