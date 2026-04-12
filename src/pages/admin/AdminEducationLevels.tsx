import { useEffect, useState, useCallback } from 'react';
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Edit2, ArrowUp, ArrowDown, GraduationCap, BookOpen, Clock, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EducationLevel {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at?: string;
  position?: number;
}

export default function AdminEducationLevels() {
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Edit state
  const [editing, setEditing] = useState<EducationLevel | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

  const fetchLevels = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('education_levels')
        .select('id, name, slug, description, created_at, position')
        .order('position', { ascending: true });
      
      if (error) {
        console.error('Supabase error:', error);
        setLevels([]);
        setErrorMsg(error.message || 'Failed to fetch education levels. The table may not exist yet.');
        return;
      }
      setLevels(data || []);
    } catch (err) {
      console.error('Failed to load education levels', err);
      const m = err instanceof Error ? err.message : String(err);
      setErrorMsg(m);
      toast({ 
        title: 'Error', 
        description: `Could not load education levels: ${m}`, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { 
    fetchLevels(); 
  }, [fetchLevels]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ 
        title: 'Validation', 
        description: 'Education level name is required', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setIsSaving(true);
      const slug = newName.trim().toLowerCase().replace(/\s+/g, '-');
      const nextPosition = Math.max(0, ...levels.map(l => l.position || 0)) + 1;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('education_levels')
        .insert([{
          name: newName.trim(),
          slug,
          description: newDescription.trim() || null,
          position: nextPosition
        }]);

      if (error) throw error;
      
      setNewName('');
      setNewDescription('');
      setIsDialogOpen(false);
      await fetchLevels();
      toast({ 
        title: 'Success', 
        description: 'Education level created successfully' 
      });
    } catch (err) {
      console.error('Create error', err);
      const m = err instanceof Error ? err.message : String(err);
      toast({ 
        title: 'Error', 
        description: `Could not create education level: ${m}`, 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !editName.trim()) {
      toast({ 
        title: 'Validation', 
        description: 'Education level name is required', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setIsSaving(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('education_levels')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null
        })
        .eq('id', editing.id);

      if (error) throw error;
      
      setIsEditDialogOpen(false);
      setEditing(null);
      await fetchLevels();
      toast({ 
        title: 'Success', 
        description: 'Education level updated successfully' 
      });
    } catch (err) {
      console.error('Update error', err);
      const m = err instanceof Error ? err.message : String(err);
      toast({ 
        title: 'Error', 
        description: `Could not update education level: ${m}`, 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsSaving(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('education_levels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setConfirmDeleteId(null);
      await fetchLevels();
      toast({ 
        title: 'Success', 
        description: 'Education level deleted successfully' 
      });
    } catch (err) {
      console.error('Delete error', err);
      const m = err instanceof Error ? err.message : String(err);
      toast({ 
        title: 'Error', 
        description: `Could not delete education level: ${m}`, 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveUp = async (id: string) => {
    const idx = levels.findIndex(l => l.id === id);
    if (idx <= 0) return;

    const current = levels[idx];
    const previous = levels[idx - 1];

    try {
      setIsSaving(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('education_levels')
        .update({ position: previous.position })
        .eq('id', current.id);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('education_levels')
        .update({ position: current.position })
        .eq('id', previous.id);
      
      await fetchLevels();
    } catch (err) {
      console.error('Move up error', err);
      toast({ 
        title: 'Error', 
        description: 'Could not reorder items', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveDown = async (id: string) => {
    const idx = levels.findIndex(l => l.id === id);
    if (idx < 0 || idx >= levels.length - 1) return;

    const current = levels[idx];
    const next = levels[idx + 1];

    try {
      setIsSaving(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('education_levels')
        .update({ position: next.position })
        .eq('id', current.id);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('education_levels')
        .update({ position: current.position })
        .eq('id', next.id);
      
      await fetchLevels();
    } catch (err) {
      console.error('Move down error', err);
      toast({ 
        title: 'Error', 
        description: 'Could not reorder items', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (level: EducationLevel) => {
    setEditing(level);
    setEditName(level.name);
    setEditDescription(level.description || '');
    setIsEditDialogOpen(true);
  };

  return (
    <AdminDashboardLayout 
      title="" 
      subtitle=""
    >
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        {/* Background elements for Premium Glassmorphic feel */}
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />

        <div className="relative z-10 space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Education Levels
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Manage the educational hierarchy syncing to Auth and the Find Teachers directory.
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="h-12 px-6 rounded-xl shadow-lg hover:shadow-primary/25 transition-all gap-2 bg-gradient-to-br from-primary to-primary/80"
              >
                <Plus className="w-5 h-5" />
                Add New Level
              </Button>
            </motion.div>
          </div>

          {/* Error State */}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 backdrop-blur-md">
                <div className="space-y-4">
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold text-destructive mb-2 text-lg">
                      <Activity className="w-5 h-5" />
                      Failed to Load Education Levels
                    </h4>
                    <p className="text-destructive/80">{errorMsg}</p>
                  </div>
                  
                  <div className="bg-background/50 p-4 rounded-xl border border-destructive/10">
                    <h5 className="font-medium mb-2 text-sm">Quick Fix - Run this SQL in your Supabase Dashboard:</h5>
                    <div className="bg-black/5 dark:bg-black/40 p-4 rounded-lg border border-border/50 text-xs font-mono overflow-x-auto whitespace-pre">
                      {`CREATE TABLE IF NOT EXISTS public.education_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);`}
                    </div>
                  </div>

                  <Button onClick={fetchLevels} variant="outline" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Retry Connection
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && !errorMsg && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
              </div>
              <p className="text-muted-foreground animate-pulse font-medium">Syncing database...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !errorMsg && levels.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 ring-1 ring-primary/20 shadow-inner">
                  <Plus className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">No Education Levels Yet</h3>
                <p className="text-muted-foreground max-w-sm mb-8">
                  Get started by defining the education hierarchy. This data dynamically powers teacher onboarding and search filters.
                </p>
                <Button onClick={() => setIsDialogOpen(true)} size="lg" className="rounded-xl shadow-lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Level
                </Button>
              </div>
            </motion.div>
          )}

          {/* Education Levels Grid (Modern Cards) */}
          {!loading && levels.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {levels.map((level, i) => (
                  <motion.div
                    key={level.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <div className="group relative flex flex-col justify-between h-full p-6 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                      {/* Decorative Background gradient */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full transition-transform duration-500 group-hover:scale-150" />
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-foreground break-words leading-tight">
                                {level.name}
                              </h3>
                              <Badge variant="secondary" className="mt-1 text-[10px] font-mono tracking-wider opacity-70">
                                /{level.slug}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {level.description && (
                          <p className="text-sm text-foreground/70 mb-6 line-clamp-3 leading-relaxed">
                            {level.description}
                          </p>
                        )}
                      </div>

                      <div className="relative z-10 mt-auto pt-6">
                        <div className="flex items-center justify-between text-xs text-muted-foreground/80 mb-4 px-1">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {level.created_at ? new Date(level.created_at).toLocaleDateString() : 'New'}
                          </div>
                          <div className="font-semibold px-2.5 py-1 rounded-md bg-muted/50 border border-border/50">
                            Order: {level.position || 0}
                          </div>
                        </div>

                        {/* Modern Action Bar */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditDialog(level)}
                            className="flex-1 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10"
                            disabled={isSaving}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          
                          <div className="flex items-center gap-1 bg-muted/30 dark:bg-muted/10 rounded-md p-1 border border-border/30">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-background shadow-sm"
                              onClick={() => handleMoveUp(level.id)}
                              disabled={isSaving || i === 0}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-background shadow-sm"
                              onClick={() => handleMoveDown(level.id)}
                              disabled={isSaving || i === levels.length - 1}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>

                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-10 w-10 shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => setConfirmDeleteId(level.id)}
                            disabled={isSaving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Create Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl overflow-hidden glassmorphism-dialog border-white/10 shadow-2xl">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary to-blue-600" />
              <DialogHeader className="pt-4 px-2">
                <DialogTitle className="text-2xl font-display font-bold">Add Education Level</DialogTitle>
                <p className="text-sm text-muted-foreground">Add a new tier to the global education platform</p>
              </DialogHeader>
              <div className="space-y-6 py-4 px-2">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold">Track Name *</Label>
                  <Input
                    id="name"
                    className="h-12 rounded-xl bg-background/50 border-white/20 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    placeholder="e.g., High School, University"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="description"
                    className="rounded-xl min-h-[100px] bg-background/50 border-white/20 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/50"
                    placeholder="Brief description to help teachers and students"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="px-2 pb-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={isSaving || !newName.trim()}
                  className="rounded-xl px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Track
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl overflow-hidden glassmorphism-dialog border-white/10 shadow-2xl">
               <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary to-blue-600" />
              <DialogHeader className="pt-4 px-2">
                <DialogTitle className="text-2xl font-display font-bold">Edit Level</DialogTitle>
                <p className="text-sm text-muted-foreground">Modify the details of this education track</p>
              </DialogHeader>
              <div className="space-y-6 py-4 px-2">
                <div className="space-y-3">
                  <Label htmlFor="edit-name" className="text-sm font-semibold">Name *</Label>
                  <Input
                    id="edit-name"
                    className="h-12 rounded-xl bg-background/50 border-white/20 focus:ring-primary/20 transition-all"
                    placeholder="e.g., High School, University"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-description" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="edit-description"
                    className="rounded-xl min-h-[100px] bg-background/50 border-white/20 focus:ring-primary/20 transition-all resize-none"
                    placeholder="Brief description of this education level"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="px-2 pb-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSaving}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdate}
                  disabled={isSaving || !editName.trim()}
                  className="rounded-xl px-8"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit2 className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => {
            if (!open) setConfirmDeleteId(null);
          }}>
            <AlertDialogContent className="rounded-3xl border-white/10 shadow-2xl glassmorphism-dialog overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600" />
              <AlertDialogHeader className="pt-4">
                <AlertDialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  Delete Track?
                </AlertDialogTitle>
              </AlertDialogHeader>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                This action is permanent and cannot be undone. Are you absolutely sure you want to remove this education level from the entire platform? It may affect existing users.
              </p>
              <AlertDialogFooter className="mt-8 gap-3 sm:gap-2">
                <AlertDialogCancel className="rounded-xl" disabled={isSaving}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
                  disabled={isSaving}
                  className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-lg"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Yes, Delete Level
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
// Add a simple Badge component fallback directly since it's not imported
const Badge = ({ children, className, variant = 'default' }: any) => {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
};

