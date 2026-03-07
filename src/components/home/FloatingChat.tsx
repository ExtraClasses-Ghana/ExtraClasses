import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialLink {
  name: string;
  icon: string;
  url: string;
  color: string;
}

const FloatingChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const socialLinks: SocialLink[] = [
    {
      name: 'Email',
      icon: '/email-icon.png',
      url: 'mailto:extraclassesghana@outlook.com',
      color: 'hover:bg-red-500'
    },
    {
      name: 'LinkedIn',
      icon: '/linkedin-icon.png',
      url: 'https://linkedin.com/company/extraclasses',
      color: 'hover:bg-blue-600'
    },
    {
      name: 'WhatsApp',
      icon: '/whatsapp-icon.png',
      url: 'https://wa.me/0596352632',
      color: 'hover:bg-green-500'
    },
    {
      name: 'X (Twitter)',
      icon: '/x-icon.png',
      url: 'https://twitter.com/extraclasses',
      color: 'hover:bg-gray-800'
    },
    {
      name: 'Instagram',
      icon: '/instagram-icon.png',
      url: 'https://instagram.com/extraclasses',
      color: 'hover:bg-pink-500'
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node) && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const containerVariants = {
    closed: {
      scale: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        staggerDirection: -1
      }
    },
    open: {
      scale: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        staggerDirection: 1
      }
    }
  };

  const itemVariants = {
    closed: {
      y: 20,
      opacity: 0,
      scale: 0.8
    },
    open: {
      y: 0,
      opacity: 1,
      scale: 1
    }
  };

  return (
    <div ref={chatRef} className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 mb-4"
          >
            <motion.div
              variants={containerVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="flex flex-col gap-4"
            >
              {socialLinks.map((link, index) => (
                <motion.a
                  key={link.name}
                  variants={itemVariants}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-lg border-2 border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-105 ${link.color} group min-w-[160px]`}
                  whileHover={{
                    scale: 1.05,
                    x: -5,
                    transition: { duration: 0.3 }
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img
                    src={link.icon}
                    alt={link.name}
                    className="w-8 h-8 group-hover:brightness-0 group-hover:invert transition-all duration-300 flex-shrink-0"
                  />
                  <span className="text-gray-700 font-medium group-hover:text-white transition-colors duration-300 text-sm">
                    {link.name}
                  </span>
                </motion.a>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        drag
        dragMomentum={false}
        dragConstraints={{
          left: -window.innerWidth + 80,
          right: 0,
          top: -window.innerHeight + 80,
          bottom: 0
        }}
        onClick={toggleChat}
        className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 group relative overflow-hidden cursor-move"
        whileHover={{
          scale: 1.05,
          rotate: [0, -3, 3, 0],
          transition: { duration: 0.3 }
        }}
        whileTap={{ scale: 0.95 }}
        whileDrag={{ scale: 1.1, rotate: 0 }}
        animate={isOpen ? { rotate: 45 } : { rotate: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={false}
          animate={isOpen ? { scale: 1.2 } : { scale: 1 }}
        />

        <motion.img
          src="/chat-floating-icon.png"
          alt="Chat"
          className="w-9 h-9 relative z-10 filter brightness-0 invert"
          animate={isOpen ? { rotate: -45 } : { rotate: 0 }}
          transition={{ duration: 0.3 }}
        />

        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/30"
          animate={isOpen ? { scale: 1.2, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>

      <motion.div
        className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        initial={{ opacity: 0, y: 10 }}
        whileHover={{ opacity: 1, y: 0 }}
      >
        Live Socials
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </motion.div>
    </div>
  );
};

export default FloatingChat;