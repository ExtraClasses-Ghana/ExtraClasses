import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Image as ImageIcon, Video, ArrowUp, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface CarouselItem {
  id: string;
  title: string;
  media_url: string;
  media_type: "image" | "video";
  link_url: string | null;
  is_active: boolean;
  order_index: number;
}

export default function AdminCarousel() {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [title, setTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [linkUrl, setLinkUrl] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("carousels")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setItems(data as CarouselItem[]);
    } catch (error: any) {
      console.error("Error fetching carousels:", error);
      toast({
        title: "Error",
        description: "Failed to load carousels.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Title is required.", variant: "destructive" });
      return;
    }
    if (!mediaUrl.trim() && !file) {
      toast({ title: "Error", description: "You must provide an image/video URL or upload a file.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    let finalMediaUrl = mediaUrl.trim();

    try {
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("carousels")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("carousels")
          .getPublicUrl(fileName);

        finalMediaUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from("carousels")
        .insert([{ 
          title: title.trim(), 
          media_url: finalMediaUrl,
          media_type: mediaType,
          link_url: linkUrl.trim() || null,
          is_active: true,
          order_index: items.length
        }])
        .select()
        .single();

      if (error) throw error;

      setItems([...items, data as CarouselItem]);
      setTitle("");
      setMediaUrl("");
      setFile(null);
      setLinkUrl("");
      
      toast({ title: "Success", description: "Carousel item added." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create. (Did you create the 'carousels' storage bucket?)", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<CarouselItem>) => {
    try {
      const { error } = await supabase.from("carousels").update(updates).eq("id", id);
      if (error) throw error;

      setItems(items.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      
      if (updates.is_active !== undefined) {
        toast({ title: updates.is_active ? "Activated" : "Deactivated", description: "Status updated." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update item.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this carousel item?")) return;
    try {
      const { error } = await supabase.from("carousels").delete().eq("id", id);
      if (error) throw error;
      setItems(items.filter((t) => t.id !== id));
      toast({ title: "Success", description: "Item deleted." });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    }
  };

  const swapOrder = async (index: number, direction: -1 | 1) => {
    const newItems = [...items];
    const targetItem = newItems[index];
    const swapItem = newItems[index + direction];

    if (!swapItem) return;

    const targetOrder = targetItem.order_index;
    const swapOrder = swapItem.order_index;

    try {
      await supabase.from('carousels').update({ order_index: swapOrder }).eq('id', targetItem.id);
      await supabase.from('carousels').update({ order_index: targetOrder }).eq('id', swapItem.id);
      
      targetItem.order_index = swapOrder;
      swapItem.order_index = targetOrder;
      
      newItems[index] = swapItem;
      newItems[index + direction] = targetItem;
      setItems(newItems);
    } catch(e) {
      toast({ title: "Error", description: "Failed to reorder items.", variant: "destructive" });
    }
  };

  return (
    <AdminDashboardLayout title="Ad Carousels" subtitle="Manage homepage hero advertisements and flyers">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        
        <div className="relative z-10 space-y-8 max-w-5xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-purple-500/20 ring-1 ring-purple-500/30">
                  <ImageIcon className="w-6 h-6 text-purple-500" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Home Carousels
                </h2>
              </motion.div>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground ml-16">
                Add, arrange, and deploy images or videos to the main carousel on the homepage.
              </motion.p>
            </div>
          </div>

          <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Summer Discount Promo" />
                </div>
                <div className="space-y-2">
                  <Label>Media Type</Label>
                  <div className="flex bg-background/50 p-1 rounded-xl border border-white/10 h-10">
                    <Button variant={mediaType === 'image' ? 'default' : 'ghost'} size="sm" className="flex-1" onClick={() => setMediaType('image')}>Image</Button>
                    <Button variant={mediaType === 'video' ? 'default' : 'ghost'} size="sm" className="flex-1" onClick={() => setMediaType('video')}>Video</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Upload File (from device)</Label>
                  <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept="image/*,video/*" />
                </div>
                <div className="space-y-2">
                  <Label>OR Media URL</Label>
                  <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} disabled={!!file} placeholder="https://example.com/image.jpg" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Link/Destination URL (Optional)</Label>
                  <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Where should users go when they click this? (e.g. https://...)" />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={submitting || !title.trim() || (!mediaUrl.trim() && !file)} className="mt-4 w-full h-12 bg-purple-600 hover:bg-purple-700">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} {file ? "Upload & Add Item" : "Add Item"}
              </Button>
            </CardContent>
          </Card>

          {loading ? (
             <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {items.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-12 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-muted-foreground">No carousels found. Add some above.</p>
                  </motion.div>
                ) : (
                  items.map((item, index) => (
                    <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`p-4 rounded-xl border backdrop-blur-xl flex flex-col md:flex-row gap-4 justify-between items-center transition-colors ${item.is_active ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'}`}>
                      <div className="w-32 h-20 rounded-lg overflow-hidden bg-black/20 shrink-0 border border-white/10 relative group">
                        {item.media_type === 'video' ? (
                          <div className="flex items-center justify-center w-full h-full bg-black/40"><Video className="w-8 h-8 text-white/50" /></div>
                        ) : (
                          <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => swapOrder(index, -1)} disabled={index === 0}><ArrowUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => swapOrder(index, 1)} disabled={index === items.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      
                      <div className="flex-1 w-full text-center md:text-left">
                         <h3 className="font-semibold text-lg">{item.title}</h3>
                         {item.link_url && <a href={item.link_url} className="text-xs text-blue-400 hover:underline inline-block truncate max-w-[200px]">{item.link_url}</a>}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <Switch checked={item.is_active} onCheckedChange={(c) => handleUpdate(item.id, { is_active: c })} />
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
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
