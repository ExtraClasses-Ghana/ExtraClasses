import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Ticker {
  id: string;
  content: string;
  is_active: boolean;
}

export function NewsTicker() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationStyle, setAnimationStyle] = useState<"upward" | "marquee">("upward");

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
    if (tickers.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tickers.length);
    }, 5000); // Change ticker every 5 seconds

    return () => clearInterval(interval);
  }, [tickers.length]);

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

  if (tickers.length === 0) return null;

  const marqueeText = tickers.map(t => t.content).join("   •   ");

  return (
    <div className="bg-primary text-primary-foreground py-2 px-4 shadow-md relative z-[60] text-center overflow-hidden h-10 flex items-center justify-center">
      {animationStyle === "marquee" ? (
        <div className="w-full h-full flex items-center overflow-hidden">
          <motion.div
            className="whitespace-nowrap inline-block text-sm font-medium tracking-wide"
            animate={{ x: ["-100vw", "100vw"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: Math.max(15, tickers.length * 8)
            }}
          >
            {marqueeText}
          </motion.div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="text-sm font-medium tracking-wide w-full"
          >
            {tickers[currentIndex].content}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
