import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselConfig {
  id: string;
  title: string;
  media_url: string;
  media_type: "image" | "video";
  link_url: string | null;
}

export function AdCarousel() {
  const [items, setItems] = useState<CarouselConfig[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    fetchActiveItems();

    const channel = supabase
      .channel('public:carousels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carousels' }, () => {
        fetchActiveItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveItems = async () => {
    try {
      const { data, error } = await supabase
        .from('carousels')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching carousels:", error);
        return;
      }
      setItems(data as CarouselConfig[]);
      setCurrentIndex(0);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(interval);
  }, [items.length, currentIndex]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] rounded-2xl overflow-hidden bg-black/5 shadow-2xl group">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
            className="absolute inset-0 w-full h-full"
          >
            {currentItem.link_url ? (
              <a href={currentItem.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer">
                <MediaContent item={currentItem} />
              </a>
            ) : (
              <MediaContent item={currentItem} />
            )}
          </motion.div>
        </AnimatePresence>

        {items.length > 1 && (
          <>
            <button 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={handlePrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={handleNext}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentIndex ? "bg-white w-6" : "bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MediaContent({ item }: { item: CarouselConfig }) {
  if (item.media_type === "video") {
    return (
      <video 
        src={item.media_url} 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <img 
      src={item.media_url} 
      alt={item.title} 
      className="w-full h-full object-cover"
    />
  );
}
