import React, { useState } from 'react';
import { Check, Sparkles, Zap, Shield, Globe, MessageSquare, Bot, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface PaymentPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function PaymentPage({ onBack, onSuccess }: PaymentPageProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('pro');

  const handleSubscribe = async () => {
    if (!auth.currentUser) return;
    setIsProcessing(true);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        subscription: 'pro',
        updatedAt: new Date()
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to upgrade:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: '$0',
      description: 'Perfect for getting started',
      features: [
        '50 messages total',
        'Access to Thinking AI',
        'Standard AI response speed',
        'Basic web search',
        'No Image/Video generation'
      ],
      buttonText: 'Current Plan',
      disabled: true
    },
    {
      id: 'pro',
      name: 'Axion Pro',
      price: '₹199',
      period: '/month',
      description: 'For power users who want more',
      features: [
        'Unlimited messages',
        'Access to Thinking AI',
        'Priority AI response speed',
        'Advanced Maps & Search',
        'Image & Video generation',
        'Early access to new features'
      ],
      buttonText: 'Upgrade to Pro',
      popular: true
    }
  ];

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Chat</span>
        </button>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Choose Your Plan</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            Unlock the full potential of Axion with our Pro plan. Get unlimited access to all features and priority support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "relative p-8 rounded-3xl border-2 transition-all",
                plan.popular 
                  ? "bg-white dark:bg-zinc-900 border-emerald-500 shadow-xl shadow-emerald-500/10" 
                  : "bg-zinc-100/50 dark:bg-zinc-900/50 border-transparent"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{plan.name}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-zinc-900 dark:text-zinc-100">{plan.price}</span>
                  {plan.period && <span className="text-zinc-500 dark:text-zinc-400">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => plan.id === 'pro' && handleSubscribe()}
                disabled={plan.disabled || isProcessing}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                  plan.id === 'pro'
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-default"
                )}
              >
                {isProcessing && plan.id === 'pro' ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  plan.buttonText
                )}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <Shield size={24} />
            </div>
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">Secure Payments</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Your payment information is encrypted and secure.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <Globe size={24} />
            </div>
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">Global Access</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Use Axion from anywhere in the world.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <Sparkles size={24} />
            </div>
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">AI Excellence</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Powered by the latest and greatest AI models.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
