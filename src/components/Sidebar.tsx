import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, LogOut, User as UserIcon, Trash2, X, Edit2, Check, Brain, Zap, ArrowLeft, Download } from 'lucide-react';
import { ChatSession } from '../types';
import { cn } from '../lib/utils';
import { auth, logout, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onOpenProfile: () => void;
  onUpgrade: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ sessions, currentSessionId, onSelectSession, onNewChat, onDeleteSession, onOpenProfile, onUpgrade, isOpen, onClose }: SidebarProps) {
  const user = auth.currentUser;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showMemories, setShowMemories] = useState(false);
  const [memories, setMemories] = useState<{ id: string, fact: string }[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'memories'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setMemories(snapshot.docs.map(doc => ({ id: doc.id, fact: doc.data().fact })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/memories`);
    });
  }, [user]);

  const handleDeleteMemory = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'memories', id));
    } catch (error) {
      console.error("Error deleting memory:", error);
    }
  };

  const handleStartEdit = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'sessions', id), {
        title: editTitle.trim()
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating session title:", error);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 w-[280px] sm:w-80 bg-zinc-900 text-zinc-100 flex flex-col border-r border-zinc-800 z-50 transition-transform duration-300 lg:relative lg:translate-x-0 min-w-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 flex items-center justify-between gap-2">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors text-sm font-medium border border-zinc-700/50"
          >
            <Plus size={18} />
            New Chat
          </button>
          
          <button
            onClick={() => setShowMemories(!showMemories)}
            className={cn(
              "p-3 rounded-xl transition-all border",
              showMemories 
                ? "bg-purple-900/40 text-purple-400 border-purple-500/50" 
                : "bg-zinc-800 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700"
            )}
            title="Memory Bank"
          >
            <Brain size={18} />
          </button>
          
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {showMemories ? (
          <div className="space-y-4 p-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400">Memory Bank</h3>
              <span className="text-[10px] bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">
                {memories.length} facts
              </span>
            </div>
            {memories.length === 0 ? (
              <p className="text-xs text-zinc-500 px-2 italic">Axion hasn't saved any long-term memories yet. As you chat, it will learn about you!</p>
            ) : (
              memories.map((mem) => (
                <div key={mem.id} className="group relative bg-zinc-800/30 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 hover:border-purple-500/30 transition-all">
                  {mem.fact}
                  <button
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all text-sm",
                currentSessionId === session.id 
                  ? "bg-zinc-800 text-white" 
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
              onClick={() => onSelectSession(session.id)}
            >
              <MessageSquare size={16} className="shrink-0" />
              {editingId === session.id ? (
                <input
                  autoFocus
                  className="bg-zinc-700 text-white px-2 py-1 rounded border border-emerald-500 outline-none flex-1 min-w-0"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(session.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => handleSaveEdit(session.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate flex-1">{session.title}</span>
              )}
              
              <div className="flex items-center gap-1 opacity-100 transition-opacity">
                {editingId === session.id ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit(session.id);
                    }}
                    className="p-1.5 hover:bg-zinc-700 rounded-lg text-emerald-500 hover:text-emerald-400 transition-colors"
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(session);
                      }}
                      className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-blue-400 transition-colors"
                      title="Rename"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-zinc-800 space-y-4">
        {userProfile?.subscription !== 'pro' && (
          <button 
            onClick={onUpgrade}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-orange-900/20 group"
          >
            <div className="flex items-center gap-2">
              <Zap size={14} className="fill-white" />
              <span>Upgrade to Pro</span>
            </div>
            <ArrowLeft size={14} className="rotate-180 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
        
        <button 
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 px-2 py-3 hover:bg-zinc-800 rounded-xl transition-colors group text-left"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full group-hover:ring-2 group-hover:ring-emerald-500 transition-all" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
              <UserIcon size={16} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-emerald-400 transition-colors">{user?.displayName || 'User'}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>
          <div className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors" onClick={(e) => {
            e.stopPropagation();
            logout();
          }}>
            <LogOut size={18} />
          </div>
        </button>
      </div>
    </div>
  </>
);
}
