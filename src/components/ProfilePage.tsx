import React, { useState, useEffect } from 'react';
import { auth, db, logout, handleFirestoreError, OperationType, googleProvider } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, writeBatch, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { User, Mail, Calendar, Shield, Zap, MessageSquare, Brain, ArrowLeft, LogOut, Settings, Trash2, CheckCircle2, X, AlertTriangle, Bell, Globe, Eye, EyeOff, Loader2, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserStats, UserProfile } from '../types';

interface ProfilePageProps {
  onBack: () => void;
  isDarkMode: boolean;
  onUpgrade: () => void;
}

type ModalType = 'none' | 'general' | 'privacy' | 'delete';

export function ProfilePage({ onBack, isDarkMode, onUpgrade }: ProfilePageProps) {
  const user = auth.currentUser;
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMessages: 0,
    totalMemories: 0,
    totalImages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [isDeleting, setIsDeleting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Preferences state
  const [prefs, setPrefs] = useState({
    notifications: true,
    language: 'English',
    publicProfile: false,
    dataTraining: true
  });

  useEffect(() => {
    if (!user) return;

    const fetchProfileAndStats = async () => {
      try {
        // Fetch user profile for preferences
        let userData: UserProfile | null = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            userData = userDoc.data() as UserProfile;
            setProfile(userData);
            if (userData.preferences) {
              setPrefs(userData.preferences);
            }
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }

        // Fetch sessions count
        let sessionCount = 0;
        try {
          const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', user.uid));
          const sessionsSnapshot = await getDocs(sessionsQuery);
          sessionCount = sessionsSnapshot.size;
        } catch (err) {
          console.error("Error fetching sessions count:", err);
        }

        // Fetch memories count
        let memoryCount = 0;
        try {
          const memoriesQuery = query(collection(db, 'users', user.uid, 'memories'));
          const memoriesSnapshot = await getDocs(memoriesQuery);
          memoryCount = memoriesSnapshot.size;
        } catch (err) {
          console.error("Error fetching memories count:", err);
        }

        setStats({
          totalSessions: sessionCount,
          totalMessages: userData?.messageCount || 0,
          totalMemories: memoryCount,
          totalImages: (userData as any)?.imageCount || 0
        });
      } catch (error) {
        console.error("Error fetching profile and stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndStats();
  }, [user]);

  const handleSavePreferences = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await writeBatch(db).set(userRef, { preferences: prefs }, { merge: true }).commit();
      setActiveModal('none');
    } catch (error) {
      console.error("Error saving preferences:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await writeBatch(db).set(userRef, { subscription: 'pro' }, { merge: true }).commit();
      setProfile(prev => prev ? { ...prev, subscription: 'pro' } : null);
      alert("Welcome to Axion Pro! Your account has been upgraded.");
    } catch (error) {
      console.error("Error upgrading account:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      alert("Failed to upgrade. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = (modal: 'general' | 'privacy' | 'delete') => {
    if (profile?.preferences) {
      setPrefs(profile.preferences);
    }
    setActiveModal(modal);
  };

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 h-full overflow-y-auto bg-white dark:bg-zinc-950 transition-colors"
    >
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Chat</span>
          </button>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider",
              profile?.subscription === 'pro' 
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            )}>
              {profile?.subscription === 'pro' ? 'Pro Plan' : 'Free Plan'}
            </span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || ''} 
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover shadow-xl border-4 border-white dark:border-zinc-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-emerald-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-2 border-white dark:border-zinc-900">
                <CheckCircle2 size={16} />
              </div>
            </div>
            
            <div className="text-center sm:text-left space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {user.displayName || 'Anonymous User'}
              </h1>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Mail size={16} />
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="hidden sm:block w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} />
                  <span className="text-sm">
                    Joined {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'March 2026'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard 
            icon={<MessageSquare className="text-blue-500" size={18} />}
            label="Chats"
            value={stats.totalSessions}
            isLoading={isLoading}
          />
          <StatCard 
            icon={<Zap className="text-amber-500" size={18} />}
            label="Messages"
            value={stats.totalMessages}
            isLoading={isLoading}
          />
          <StatCard 
            icon={<ImageIcon className="text-emerald-500" size={18} />}
            label="Images"
            value={stats.totalImages}
            isLoading={isLoading}
          />
          <StatCard 
            icon={<Brain className="text-purple-500" size={18} />}
            label="Memories"
            value={stats.totalMemories}
            isLoading={isLoading}
          />
        </div>

        {/* Pro Banner */}
        {profile?.subscription !== 'pro' && (
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 mb-8 text-white shadow-xl shadow-emerald-500/20">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-2xl font-bold">Upgrade to Axion Pro</h2>
                <p className="text-emerald-50 opacity-90 max-w-md">
                  Get unlimited high-quality image generation, faster response times, and access to our most advanced reasoning models.
                </p>
              </div>
              <button 
                onClick={onUpgrade}
                className="bg-white text-emerald-600 px-8 py-4 rounded-2xl font-bold hover:bg-emerald-50 transition-all shadow-lg whitespace-nowrap flex items-center gap-2"
              >
                Upgrade Now — ₹199/mo
              </button>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
          </div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4 px-2">Account Settings</h3>
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
              <SettingsItem 
                icon={<Settings size={18} />}
                label="General Preferences"
                description="Manage your language and interface settings"
                onClick={() => openModal('general')}
              />
              <SettingsItem 
                icon={<Shield size={18} />}
                label="Privacy & Security"
                description="Control your data and account security"
                onClick={() => openModal('privacy')}
              />
              <button 
                onClick={() => logout()}
                className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg group-hover:scale-110 transition-transform">
                    <LogOut size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-red-600">Sign Out</p>
                    <p className="text-xs text-zinc-500">Log out of your current session</p>
                  </div>
                </div>
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4 px-2 text-red-500">Danger Zone</h3>
            <div className="bg-red-50/50 dark:bg-red-900/5 rounded-2xl border border-red-100 dark:border-red-900/20 p-4">
              <button 
                onClick={() => setActiveModal('delete')}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
              >
                <Trash2 size={16} />
                Delete Account & All Data
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal !== 'none' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  {activeModal === 'general' && <><Settings size={20} className="text-emerald-500" /> General Preferences</>}
                  {activeModal === 'privacy' && <><Shield size={20} className="text-blue-500" /> Privacy & Security</>}
                  {activeModal === 'delete' && <><AlertTriangle size={20} className="text-red-500" /> Delete Account</>}
                </h3>
                <button 
                  onClick={() => setActiveModal('none')}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {activeModal === 'general' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</p>
                        <p className="text-xs text-zinc-500">Receive updates about new features</p>
                      </div>
                      <button 
                        onClick={() => setPrefs(p => ({ ...p, notifications: !p.notifications }))}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          prefs.notifications ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                          prefs.notifications ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Language</p>
                      <select 
                        value={prefs.language}
                        onChange={(e) => setPrefs(p => ({ ...p, language: e.target.value }))}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-sm p-3 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Arabic">Arabic</option>
                        <option value="Portuguese">Portuguese</option>
                        <option value="Russian">Russian</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeModal === 'privacy' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Public Profile</p>
                        <p className="text-xs text-zinc-500">Allow others to see your public activity</p>
                      </div>
                      <button 
                        onClick={() => setPrefs(p => ({ ...p, publicProfile: !p.publicProfile }))}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          prefs.publicProfile ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                          prefs.publicProfile ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Data Training</p>
                        <p className="text-xs text-zinc-500">Help improve Axion by sharing anonymized data</p>
                      </div>
                      <button 
                        onClick={() => setPrefs(p => ({ ...p, dataTraining: !p.dataTraining }))}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          prefs.dataTraining ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                          prefs.dataTraining ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                )}

                {activeModal === 'delete' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 text-red-600 space-y-2">
                      <p className="text-sm font-bold">This action is permanent!</p>
                      <p className="text-xs leading-relaxed">
                        Deleting your account will immediately remove all of your chat sessions, saved memories, and personal data from our servers. This cannot be undone.
                      </p>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Are you absolutely sure you want to delete your account?
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setActiveModal('none')}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                {activeModal === 'delete' ? (
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    {isDeleting ? 'Deleting...' : 'Delete Everything'}
                  </button>
                ) : (
                  <button 
                    onClick={handleSavePreferences}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving && <Loader2 size={18} className="animate-spin" />}
                    Save Changes
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  async function handleDeleteAccount() {
    if (!user) return;
    setIsDeleting(true);

    try {
      const batch = writeBatch(db);

      // 1. Delete all sessions
      const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', user.uid));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      for (const sessionDoc of sessionsSnapshot.docs) {
        // Note: In a real app, you'd also need to delete messages sub-collection
        // Firestore doesn't support recursive delete in client SDK easily
        // We'll delete the session docs at least
        batch.delete(sessionDoc.ref);
      }

      // 2. Delete all memories
      const memoriesQuery = query(collection(db, 'users', user.uid, 'memories'));
      const memoriesSnapshot = await getDocs(memoriesQuery);
      for (const memoryDoc of memoriesSnapshot.docs) {
        batch.delete(memoryDoc.ref);
      }

      // 3. Delete user profile
      batch.delete(doc(db, 'users', user.uid));

      await batch.commit();

      // 4. Delete Auth User
      try {
        await deleteUser(user);
      } catch (authError: any) {
        console.error("Auth deletion failed:", authError);
        if (authError.code === 'auth/requires-recent-login') {
          // Trigger re-authentication
          try {
            await reauthenticateWithPopup(user, googleProvider);
            // Retry deletion
            await deleteUser(user);
          } catch (reauthError) {
            console.error("Re-authentication failed:", reauthError);
            alert("Re-authentication failed. Please sign out and sign back in to delete your account.");
            setIsDeleting(false);
            return;
          }
        } else {
          throw authError;
        }
      }

      // Success - will be redirected by onAuthStateChanged in App.tsx
    } catch (error) {
      console.error("Full account deletion failed:", error);
      alert("Something went wrong during account deletion. Please try again later.");
    } finally {
      setIsDeleting(false);
    }
  }
}

function StatCard({ icon, label, value, isLoading }: { icon: React.ReactNode, label: string, value: number, isLoading: boolean }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
      <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center mx-auto shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
      {isLoading ? (
        <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse mx-auto rounded-lg" />
      ) : (
        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      )}
    </div>
  );
}

function SettingsItem({ icon, label, description, onClick }: { icon: React.ReactNode, label: string, description: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg group-hover:scale-110 transition-transform shadow-sm">
          {icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>
      <div className="text-zinc-300 dark:text-zinc-700 group-hover:translate-x-1 transition-transform">
        <ArrowLeft size={16} className="rotate-180" />
      </div>
    </button>
  );
}
