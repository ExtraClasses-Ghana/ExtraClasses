import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface WelcomeOverlayProps {
  userName: string;
  role: string;
}

export function WelcomeOverlay({ userName, role }: WelcomeOverlayProps) {
  const [show, setShow] = useState(false);
  const [step1Text, setStep1Text] = useState("");
  const [step2Text, setStep2Text] = useState("");
  const [showRole, setShowRole] = useState(false);

  const firstName = userName.split(' ')[0] || userName;
  const welcomeStr = "Welcome back,";
  const nameStr = `${firstName}!`;

  useEffect(() => {
    const key = `welcome_shown_${role}`;
    const hasSeenWelcome = sessionStorage.getItem(key);
    
    if (!hasSeenWelcome) {
      setShow(true);
      sessionStorage.setItem(key, 'true');
      
      // snappier 2.2 second overall duration
      const timer = setTimeout(() => setShow(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [role]);

  // Typing effect logic
  useEffect(() => {
    if (!show) return;

    setStep1Text("");
    setStep2Text("");
    setShowRole(false);

    let index1 = 0;
    const interval1 = setInterval(() => {
      if (index1 < welcomeStr.length) {
        setStep1Text(welcomeStr.substring(0, index1 + 1));
        index1++;
      } else {
        clearInterval(interval1);
        
        let index2 = 0;
        const interval2 = setInterval(() => {
          if (index2 < nameStr.length) {
            setStep2Text(nameStr.substring(0, index2 + 1));
            index2++;
          } else {
            clearInterval(interval2);
            setShowRole(true);
          }
        }, 50); // Fast typing speed (50ms per character)
      }
    }, 45); // Snappy typing speed (45ms per character)

    return () => {
      clearInterval(interval1);
    };
  }, [show, welcomeStr, nameStr]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl overflow-hidden"
        >
          {/* Animated Ambient background lights */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0.3 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 2.2, ease: "easeOut" }}
              className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-secondary/10 rounded-full blur-[120px]"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0.3 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 2.2, ease: "easeOut", delay: 0.1 }}
              className="absolute bottom-1/4 right-1/4 w-[60vw] h-[60vw] bg-accent/10 rounded-full blur-[140px]"
            />
          </div>

          {/* Centered Premium Glassmorphism Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 150 }}
            className="relative z-10 p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-md max-w-lg w-[90%] text-center shadow-[0_0_50px_rgba(96,165,250,0.15)] flex flex-col items-center"
          >
            {/* Spinning/pulsing logo badge */}
            <div className="relative mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-secondary to-gold flex items-center justify-center shadow-lg shadow-secondary/20 text-white"
              >
                <Sparkles className="w-8 h-8 animate-pulse text-white" />
              </motion.div>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-secondary to-gold blur opacity-30 animate-pulse -z-10" />
            </div>

            {/* Step 1: Welcome message typing */}
            <h1 className="text-xl sm:text-2xl font-display font-medium text-white/70 mb-1 min-h-[32px] flex items-center">
              {step1Text}
              {step1Text && !step2Text && (
                <span className="inline-block w-[2px] h-[20px] bg-secondary ml-1 animate-pulse" />
              )}
            </h1>

            {/* Step 2: First Name typing in large colorful gradient */}
            <h2 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight min-h-[72px] bg-gradient-to-r from-secondary via-gold to-accent bg-clip-text text-transparent pb-2 flex items-center justify-center">
              {step2Text}
              {step2Text && step2Text.length < nameStr.length && (
                <span className="inline-block w-[3px] h-[40px] bg-gold ml-1 animate-pulse" />
              )}
            </h2>

            {/* Step 3: Role indicator fades in */}
            <div className="min-h-[40px] flex items-center justify-center">
              <AnimatePresence>
                {showRole && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="h-[1px] w-12 bg-white/20" />
                    <span className="text-[10px] sm:text-xs font-semibold tracking-[0.3em] text-white/40 uppercase mt-1">
                      {role} Dashboard
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

