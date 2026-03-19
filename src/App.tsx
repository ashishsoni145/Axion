import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { ProfilePage } from './components/ProfilePage';
import { PaymentPage } from './components/PaymentPage';
import { ChatSession } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sparkles, Loader2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'profile' | 'payment'>('chat');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              subscription: 'free',
              messageCount: 0,
              imageCount: 0,
              preferences: {
                notifications: true,
                language: 'English',
                publicProfile: false,
                dataTraining: true
              }
            });
          } else {
            await updateDoc(userRef, {
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Error updating user profile:", error);
        }
      }
      setUser(user);
      setIsAuthReady(true);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSessionId(null);
      return;
    }

    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sess = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as ChatSession));
      sess.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis() || Date.now();
        const timeB = b.updatedAt?.toMillis() || Date.now();
        return timeB - timeA;
      });
      setSessions(sess);
      
      // Auto-select first session if none selected
      if (sess.length > 0 && !currentSessionId) {
        setCurrentSessionId(sess[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    });

    return () => unsubscribe();
  }, [user]);

  const handleNewChat = async () => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        title: 'New Conversation',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setCurrentSessionId(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sessions', id));
      if (currentSessionId === id) {
        setCurrentSessionId(sessions.find(s => s.id !== id)?.id || null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${id}`);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center transition-colors", isDarkMode ? "bg-zinc-950" : "bg-zinc-50")}>
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={cn("h-[100dvh] flex overflow-hidden font-sans transition-colors", isDarkMode ? "bg-zinc-950" : "bg-zinc-50")}>
        <AnimatePresence mode="wait">
          {!user ? (
            <AuthPage 
              isDarkMode={isDarkMode} 
              onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
            />
          ) : (
            <motion.div
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex h-full min-w-0"
            >
              <Sidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={(id) => {
                  setCurrentSessionId(id);
                  setIsSidebarOpen(false);
                }}
                onNewChat={() => {
                  handleNewChat();
                  setIsSidebarOpen(false);
                }}
                onDeleteSession={handleDeleteSession}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onOpenProfile={() => {
                  setView('profile');
                  setIsSidebarOpen(false);
                }}
                onUpgrade={() => {
                  setView('payment');
                  setIsSidebarOpen(false);
                }}
              />
              <main className="flex-1 h-full relative flex flex-col min-w-0">
                {view === 'profile' ? (
                  <ProfilePage 
                    onBack={() => setView('chat')} 
                    isDarkMode={isDarkMode}
                    onUpgrade={() => setView('payment')}
                  />
                ) : view === 'payment' ? (
                  <PaymentPage 
                    onBack={() => setView('chat')}
                    onSuccess={() => setView('chat')}
                  />
                ) : currentSessionId ? (
                  <ChatInterface 
                    sessionId={currentSessionId} 
                    isDarkMode={isDarkMode}
                    onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                    onUpgrade={() => setView('payment')}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-white dark:bg-zinc-950">
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="lg:hidden absolute top-4 left-4 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                    >
                      <Menu size={24} />
                    </button>
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                      <Sparkles size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No active session</h3>
                      <p className="text-zinc-500 dark:text-zinc-400">Start a new chat to begin your journey with Axion.</p>
                    </div>
                    <button
                      onClick={handleNewChat}
                      className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
                    >
                      Start New Chat
                    </button>
                  </div>
                )}
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
