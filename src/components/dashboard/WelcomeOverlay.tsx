import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeOverlayProps {
  userName: string;
  role: string;
}

export function WelcomeOverlay({ userName, role }: WelcomeOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = `welcome_shown_${role}`;
    const hasSeenWelcome = sessionStorage.getItem(key);
    
    if (!hasSeenWelcome) {
      setShow(true);
      sessionStorage.setItem(key, 'true');
      const timer = setTimeout(() => setShow(false), 3500); // 3.5s total animation
      return () => clearTimeout(timer);
    }
  }, [role]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-2xl overflow-hidden"
        >
          {/* Animated Background Blobs */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] bg-blue-500/30 rounded-full blur-[100px] mix-blend-screen"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 3, ease: "easeOut", delay: 0.2 }}
            className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-purple-500/30 rounded-full blur-[120px] mix-blend-screen"
          />

          <div className="relative z-10 text-center px-4">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8, type: "spring", stiffness: 100 }}
              className="inline-block"
            >
              <div className="mb-6 flex justify-center">
                <motion.div
                  initial={{ rotate: -90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.8, type: "spring", bounce: 0.5 }}
                  className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20"
                >
                  <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain filter drop-shadow-lg brightness-0 invert" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </motion.div>
              </div>

              <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight mb-2">
                Welcome back,
              </h1>
              <motion.h2
                initial={{ opacity: 0, backgroundPosition: "200% center" }}
                animate={{ opacity: 1, backgroundPosition: "0% center" }}
                transition={{ delay: 1, duration: 1.5 }}
                className="text-5xl md:text-7xl font-display font-extrabold pb-2"
                style={{
                  backgroundImage: "linear-gradient(to right, #60a5fa, #c084fc, #60a5fa)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                {userName.split(' ')[0]}
              </motion.h2>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.2, duration: 1 }}
                className="h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mt-8 opacity-50 mx-auto max-w-[200px]"
              />
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="text-white/60 font-medium uppercase tracking-[0.3em] mt-4 text-sm"
              >
                {role} Dashboard
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
