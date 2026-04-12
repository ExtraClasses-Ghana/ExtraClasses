import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Edit2, Trash2, Megaphone, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface NewsTicker {
  id: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminNewsTicker() {
  const [tickers, setTickers] = useState<NewsTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [animationStyle, setAnimationStyle] = useState<"upward" | "marquee">("upward");

  const { toast } = useToast();

  useEffect(() => {
    fetchTickers();
  }, []);

  const fetchTickers = async () => {
    try {
      const [tickersRes, settingsRes] = await Promise.all([
        supabase
          .from("news_tickers")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("system_settings")
          .select("value")
          .eq("key", "ticker_animation_style")
          .single()
      ]);

      if (tickersRes.error) throw tickersRes.error;
      if (tickersRes.data) setTickers(tickersRes.data as NewsTicker[]);
      
      if (settingsRes.data && settingsRes.data.value) {
        setAnimationStyle(settingsRes.data.value as "upward" | "marquee");
      }
    } catch (error: any) {
      console.error("Error fetching tickers:", error);
      toast({
        title: "Error",
        description: "Failed to load news tickers.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newContent.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("news_tickers")
        .insert([{ content: newContent.trim(), is_active: false }])
        .select()
        .single();

      if (error) throw error;

      setTickers([data as NewsTicker, ...tickers]);
      setNewContent("");
      toast({
        title: "Success",
        description: "News ticker created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create news ticker.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<NewsTicker>) => {
    try {
      const { data, error } = await supabase
        .from("news_tickers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setTickers(tickers.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      
      if (updates.is_active !== undefined) {
        toast({
          title: updates.is_active ? "Ticker Activated" : "Ticker Deactivated",
          description: "Status successfully updated.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update ticker.",
        variant: "destructive",
      });
      // Revert optimism if needed
      fetchTickers();
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    
    await handleUpdate(editingId, { content: editContent.trim() });
    setEditingId(null);
    setEditContent("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ticker?")) return;
    
    try {
      const { error } = await supabase
        .from("news_tickers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTickers(tickers.filter((t) => t.id !== id));
      toast({
        title: "Success",
        description: "Ticker deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete ticker.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAnimationStyle = async (style: "upward" | "marquee") => {
    setAnimationStyle(style);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          key: "ticker_animation_style",
          value: style,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      
      toast({
        title: "Animation Style Updated",
        description: `Ticker animation set to ${style === "upward" ? "Upward Fade" : "Scrolling Marquee"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update animation style.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminDashboardLayout title="News Tickers" subtitle="Manage announcement banners across the platform">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        
        <div className="relative z-10 space-y-8 max-w-5xl">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30">
                  <Megaphone className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  News Tickers
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Create and manage the scrolling alerts that appear at the top of the frontend.
              </motion.p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg md:col-span-2">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Input 
                    placeholder="Enter new announcement text..." 
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="bg-background/50 rounded-xl h-12"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                  />
                  <Button 
                    onClick={handleCreate} 
                    disabled={submitting || !newContent.trim()}
                    className="h-12 px-6 rounded-xl gap-2 whitespace-nowrap"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Ticker
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col gap-3">
                  <Label className="text-sm font-semibold">Animation Style</Label>
                  <div className="flex items-center gap-3 bg-background/50 p-2 rounded-xl border border-white/10">
                    <Button 
                      variant={animationStyle === "upward" ? "default" : "ghost"}
                      size="sm"
                      className="flex-1 rounded-lg"
                      onClick={() => handleUpdateAnimationStyle("upward")}
                    >
                      Upward
                    </Button>
                    <Button 
                      variant={animationStyle === "marquee" ? "default" : "ghost"}
                      size="sm"
                      className="flex-1 rounded-lg"
                      onClick={() => handleUpdateAnimationStyle("marquee")}
                    >
                      Marquee
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
             <div className="flex justify-center p-12">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
             </div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {tickers.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center p-12 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xl"
                  >
                    <p className="text-muted-foreground">No news tickers found. Create one above to get started.</p>
                  </motion.div>
                ) : (
                  tickers.map((ticker) => (
                    <motion.div
                      key={ticker.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-6 rounded-xl border backdrop-blur-xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-colors ${
                        ticker.is_active 
                        ? 'bg-blue-500/10 border-blue-500/30' 
                        : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex-1 w-full space-y-2">
                        {editingId === ticker.id ? (
                           <div className="flex gap-2">
                             <Input 
                               value={editContent}
                               onChange={(e) => setEditContent(e.target.value)}
                               className="bg-background"
                               autoFocus
                               onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                             />
                             <Button onClick={handleSaveEdit} size="icon" variant="default">
                               <Check className="w-4 h-4" />
                             </Button>
                             <Button onClick={() => setEditingId(null)} size="icon" variant="outline">
                               <Plus className="w-4 h-4 rotate-45" />
                             </Button>
                           </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <p className="font-medium text-lg text-foreground">
                                {ticker.content}
                              </p>
                              {ticker.is_active && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                  Live
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Created {new Date(ticker.created_at).toLocaleDateString()}
                            </p>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-end">
                        <div className="flex items-center gap-2 mr-2">
                          <Label htmlFor={`active-${ticker.id}`} className="text-sm font-medium cursor-pointer">
                            Active
                          </Label>
                          <Switch 
                            id={`active-${ticker.id}`}
                            checked={ticker.is_active}
                            onCheckedChange={(checked) => handleUpdate(ticker.id, { is_active: checked })}
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9"
                            onClick={() => {
                              setEditingId(ticker.id);
                              setEditContent(ticker.content);
                            }}
                            disabled={editingId === ticker.id}
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-9 w-9 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                            onClick={() => handleDelete(ticker.id)}
                            disabled={editingId === ticker.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
