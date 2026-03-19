import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { User, Bot, Copy, Check, Terminal, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MessageItemProps {
  message: Message;
  onPlayAudio?: (text: string) => void;
  isNew?: boolean;
}

export function MessageItem({ message, isNew }: MessageItemProps) {
  const isModel = message.role === 'model';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [displayedContent, setDisplayedContent] = useState(isModel && isNew ? '' : message.content);

  useEffect(() => {
    if (isModel && isNew && displayedContent !== message.content) {
      let i = 0;
      const speed = 10; // ms per character
      const timer = setInterval(() => {
        setDisplayedContent(message.content.slice(0, i + 1));
        i++;
        if (i >= message.content.length) clearInterval(timer);
      }, speed);
      return () => clearInterval(timer);
    } else {
      setDisplayedContent(message.content);
    }
  }, [message.content, isModel, isNew]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const isTyping = isModel && isNew && displayedContent.length < message.content.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex gap-3 sm:gap-4 p-4 sm:p-6 transition-colors border-b border-zinc-100 dark:border-zinc-800/50",
        isModel ? "bg-zinc-50/50 dark:bg-zinc-900/30" : "bg-white dark:bg-zinc-950"
      )}
    >
      <div className={cn(
        "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
        isModel ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
      )}>
        {isModel ? <Bot size={18} /> : <User size={18} />}
      </div>

      <div className="flex-1 min-w-0 space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {isModel ? 'Axion AI' : 'You'}
          </span>
          <div className="flex items-center gap-1">
            {isModel && message.type === 'text' && (
              <>
                <button
                  onClick={handleCopyMessage}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                  title="Copy full message"
                >
                  {copiedMessage ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed break-words">
          {message.type === 'text' && (
            <div className="markdown-body relative">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({children}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-zinc-900 dark:text-zinc-100">{children}</h1>,
                  h2: ({children}) => <h2 className="text-xl font-bold mt-5 mb-3 text-zinc-900 dark:text-zinc-100">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-bold mt-4 mb-2 text-zinc-900 dark:text-zinc-100">{children}</h3>,
                  p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                  ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                  li: ({children}) => <li className="pl-1">{children}</li>,
                  blockquote: ({children}) => (
                    <blockquote className="border-l-4 border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-900/10 pl-4 py-2 my-4 italic rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  table: ({children}) => (
                    <div className="overflow-x-auto my-6 rounded-xl border border-zinc-200 dark:border-zinc-800 max-w-full">
                      <table className="w-full text-sm text-left border-collapse min-w-[250px]">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({children}) => <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 font-semibold">{children}</thead>,
                  th: ({children}) => <th className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">{children}</th>,
                  td: ({children}) => <td className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50">{children}</td>,
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const lang = match ? match[1] : '';
                    const codeString = String(children).replace(/\n$/, '');
                    
                    if (!inline) {
                      return (
                        <div className="relative group my-6 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
                          <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                              <Terminal size={14} />
                              <span>{lang || 'code'}</span>
                            </div>
                            <button
                              onClick={() => handleCopy(codeString)}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 text-zinc-600 dark:text-zinc-300 rounded-md border border-zinc-200 dark:border-zinc-600 transition-all shadow-sm"
                            >
                              {copiedCode === codeString ? (
                                <>
                                  <Check size={12} className="text-emerald-500" />
                                  <span className="text-emerald-500">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="!bg-zinc-900 !p-4 overflow-x-auto whitespace-pre font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent max-w-full">
                            <code className={cn(className, "text-zinc-100 break-normal")} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <code className={cn(className, "bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded-md text-sm font-mono text-emerald-600 dark:text-emerald-400 border border-zinc-200 dark:border-zinc-700")} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {displayedContent}
              </Markdown>
              {isTyping && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-1.5 h-4 bg-emerald-500 ml-1 align-middle"
                />
              )}
            </div>
          )}

          {message.type === 'image' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-2 overflow-hidden"
            >
              {message.mediaUrl === 'IMAGE_TOO_LARGE' ? (
                <div className="p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    🖼️ Image was too large to store in chat history.
                  </p>
                </div>
              ) : (
                <img 
                  src={message.mediaUrl} 
                  alt={isModel ? "Generated" : "Uploaded"} 
                  className="rounded-2xl max-w-full h-auto shadow-lg border border-zinc-200 dark:border-zinc-800 object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
              {message.content && <p className="text-sm italic text-zinc-500 dark:text-zinc-400 break-words">{message.content}</p>}
            </motion.div>
          )}

          {message.type === 'video' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <video 
                src={message.mediaUrl} 
                controls 
                className="rounded-2xl w-full shadow-lg border border-zinc-200 dark:border-zinc-800"
              />
              {message.content && <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{message.content}</p>}
            </motion.div>
          )}

          {message.type === 'audio' && (
            <div className="space-y-2">
              <audio 
                src={message.mediaUrl} 
                controls 
                className="w-full dark:invert dark:hue-rotate-180"
              />
              {message.content && <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{message.content}</p>}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
