import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { ProfilePage } from './components/ProfilePage';
import { PaymentPage } from './components/PaymentPage';
import { ChatSession } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogIn, Sparkles, Loader2, Menu, Sun, Moon, User as UserIcon } from 'lucide-react';
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
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              subscription: 'free',
              messageCount: 0,
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
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sess = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
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
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center p-4"
            >
              <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 sm:p-10 border border-zinc-200 dark:border-zinc-800 text-center space-y-8 transition-colors">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto">
                  <Sparkles size={32} className="sm:w-10 sm:h-10" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">Axion</h1>
                  <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">Sign in to start your intelligent conversation</p>
                </div>
                <button
                  onClick={() => loginWithGoogle()}
                  className="w-full flex items-center justify-center gap-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl py-4 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg shadow-zinc-200 dark:shadow-none"
                >
                  <LogIn size={20} />
                  Continue with Account
                </button>
                <div className="pt-2 flex items-center justify-center">
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500">
                  By continuing, you agree to our terms of service and privacy policy.
                </p>
              </div>
            </motion.div>
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
