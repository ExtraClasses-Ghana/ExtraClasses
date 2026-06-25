import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Play, Pause, ChevronLeft, ChevronRight, X } from "lucide-react";

interface Ticker {
  id: string;
  content: string;
  is_active: boolean;
}

export function NewsTicker() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationStyle, setAnimationStyle] = useState<"upward" | "marquee">("upward");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("news_ticker_dismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetchActiveTickers();
    fetchAnimationStyle();

    const tickerChannel = supabase
      .channel('public:news_tickers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_tickers' }, () => {
        fetchActiveTickers();
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('public:system_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: `key=eq.ticker_animation_style` }, (payload) => {
        if (payload.new && 'value' in payload.new) {
          setAnimationStyle(payload.new.value as "upward" | "marquee");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tickerChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const fetchAnimationStyle = async () => {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'ticker_animation_style').single();
      if (data?.value) setAnimationStyle(data.value as "upward" | "marquee");
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (tickers.length <= 1 || !isPlaying || animationStyle === "marquee") return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tickers.length);
    }, 5000); // Change ticker every 5 seconds

    return () => clearInterval(interval);
  }, [tickers.length, isPlaying, animationStyle]);

  const fetchActiveTickers = async () => {
    try {
      const { data, error } = await supabase
        .from('news_tickers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching tickers:", error);
        return;
      }

      setTickers(data as Ticker[]);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Failed to fetch active tickers:", error);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + tickers.length) % tickers.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % tickers.length);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("news_ticker_dismissed", "true");
    } catch (err) {
      console.error(err);
    }
  };

  if (tickers.length === 0 || isDismissed) return null;

  const marqueeStyle = `
    @keyframes ticker-marquee {
      0% { transform: translate3d(0, 0, 0); }
      100% { transform: translate3d(-50%, 0, 0); }
    }
    .animate-ticker-marquee {
      display: flex;
      width: max-content;
      animation: ticker-marquee var(--duration, 25s) linear infinite;
    }
    .animate-ticker-marquee:hover {
      animation-play-state: paused;
    }
  `;

  const duration = `${Math.max(15, tickers.length * 8)}s`;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="relative w-full overflow-hidden bg-gradient-to-r from-primary via-primary/95 to-[#1a385f] text-primary-foreground shadow-sm z-[60] flex items-center justify-between px-3 sm:px-6 h-9 sm:h-10 border-b border-white/5"
        >
          <style>{marqueeStyle}</style>
          
          {/* Animated gradient bottom border */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-secondary via-gold to-accent opacity-90" />

          {/* Left section: Animated Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <div className="flex items-center gap-1 bg-secondary/15 text-secondary border border-secondary/30 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
              <Megaphone className="w-3 h-3 animate-bounce" style={{ animationDuration: '3s' }} />
              <span className="hidden sm:inline">Announcements</span>
              <span className="sm:hidden">Latest</span>
            </div>
          </div>

          {/* Middle section: Ticker Content */}
          <div className="flex-1 overflow-hidden mx-4 flex items-center h-full">
            {animationStyle === "marquee" ? (
              <div className="w-full overflow-hidden relative flex items-center">
                <div 
                  className="animate-ticker-marquee flex whitespace-nowrap gap-12 text-xs sm:text-sm font-medium tracking-wide pr-12"
                  style={{ '--duration': duration } as React.CSSProperties}
                >
                  {/* First set */}
                  {tickers.map((t, idx) => (
                    <span key={`first-${t.id || idx}`} className="flex items-center gap-2">
                      <span className="text-secondary font-bold">•</span> {t.content}
                    </span>
                  ))}
                  {/* Second set for seamless looping */}
                  {tickers.map((t, idx) => (
                    <span key={`second-${t.id || idx}`} className="flex items-center gap-2">
                      <span className="text-secondary font-bold">•</span> {t.content}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center"
                onMouseEnter={() => setIsPlaying(false)}
                onMouseLeave={() => setIsPlaying(true)}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="text-xs sm:text-sm font-medium tracking-wide w-full text-center truncate cursor-pointer hover:text-secondary transition-colors duration-200"
                  >
                    {tickers[currentIndex].content}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right section: Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {animationStyle !== "marquee" && (
              <div className="hidden sm:flex items-center gap-0.5 border-r border-white/10 pr-1.5 sm:pr-2">
                <button 
                  onClick={handlePrev}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
                  title="Previous"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button 
                  onClick={handleTogglePlay}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
                <button 
                  onClick={handleNext}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
                  title="Next"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
            <button 
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
