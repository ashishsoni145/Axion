import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Lock, Loader2, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SimulatedCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  planName: string;
  price: string;
}

export function SimulatedCheckout({ isOpen, onClose, onSuccess, planName, price }: SimulatedCheckoutProps) {
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: ''
  });

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    
    // Simulate high-end payment processing
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setStep('success');
    await new Promise(resolve => setTimeout(resolve, 1500));
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                <ShieldCheck size={20} />
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">Axion Secure Pay</span>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
              <X size={20} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 'form' && (
              <motion.form 
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handlePayment} 
                className="space-y-6"
              >
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{planName}</span>
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{price}</span>
                  </div>
                  <p className="text-xs text-zinc-400">Billed monthly. Cancel anytime.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 ml-1">Cardholder Name</label>
                    <input
                      required
                      type="text"
                      placeholder="John Doe"
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 ml-1">Card Number</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl py-3 px-4 pl-11 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                        value={formData.cardNumber}
                        onChange={e => setFormData({...formData, cardNumber: e.target.value})}
                      />
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 ml-1">Expiry</label>
                      <input
                        required
                        type="text"
                        placeholder="MM/YY"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                        value={formData.expiry}
                        onChange={e => setFormData({...formData, expiry: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500 ml-1">CVC</label>
                      <input
                        required
                        type="text"
                        placeholder="123"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                        value={formData.cvc}
                        onChange={e => setFormData({...formData, cvc: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xl shadow-zinc-200 dark:shadow-none"
                >
                  <Lock size={16} />
                  Pay {price}
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                  <ShieldCheck size={12} />
                  Bank-level Security
                </div>
              </motion.form>
            )}

            {step === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="py-12 flex flex-col items-center justify-center space-y-6"
              >
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-zinc-100 dark:border-zinc-800 rounded-full" />
                  <div className="absolute inset-0 w-20 h-20 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Verifying Transaction</h3>
                  <p className="text-sm text-zinc-500">Connecting to secure gateway...</p>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 size={40} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Payment Successful</h3>
                  <p className="text-sm text-zinc-500">Welcome to Axion Pro</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
