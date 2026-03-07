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
import { Loader2, Plus, Trash2, Edit2, ArrowUp, ArrowDown } from 'lucide-react';

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
      title="Education Levels" 
      subtitle="Manage education levels and categories for teachers and students"
    >
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Education Levels</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage education levels that appear throughout the platform
            </p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Level
          </Button>
        </div>

        {/* Error State */}
        {errorMsg && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-destructive mb-2">Failed to Load Education Levels</h4>
                  <p className="text-sm text-destructive/80">{errorMsg}</p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Quick Fix - Run this SQL in your Supabase Dashboard:</h5>
                  <div className="bg-background p-3 rounded border text-xs font-mono overflow-x-auto">
                    {`-- Create the education_levels table first
CREATE TABLE IF NOT EXISTS public.education_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "public select education levels" ON public.education_levels;
DROP POLICY IF EXISTS "admins manage education levels" ON public.education_levels;

-- Allow public read access
CREATE POLICY "public select education levels" ON public.education_levels
  FOR SELECT USING (true);

-- Allow admin full access
CREATE POLICY "admins manage education levels" ON public.education_levels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Insert sample data (only if table is empty)
INSERT INTO public.education_levels (name, slug, description, position)
SELECT * FROM (VALUES
  ('Basic Education', 'basic-education', 'Primary education', 1),
  ('Junior High School', 'junior-high-school', 'JHS level', 2),
  ('Senior High School', 'senior-high-school', 'SHS level', 3)
) AS v(name, slug, description, position)
WHERE NOT EXISTS (SELECT 1 FROM public.education_levels LIMIT 1);`}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(`-- Create the education_levels table first
CREATE TABLE IF NOT EXISTS public.education_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "public select education levels" ON public.education_levels;
DROP POLICY IF EXISTS "admins manage education levels" ON public.education_levels;

-- Allow public read access
CREATE POLICY "public select education levels" ON public.education_levels
  FOR SELECT USING (true);

-- Allow admin full access
CREATE POLICY "admins manage education levels" ON public.education_levels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Insert sample data (only if table is empty)
INSERT INTO public.education_levels (name, slug, description, position)
SELECT * FROM (VALUES
  ('Basic Education', 'basic-education', 'Primary education', 1),
  ('Junior High School', 'junior-high-school', 'JHS level', 2),
  ('Senior High School', 'senior-high-school', 'SHS level', 3)
) AS v(name, slug, description, position)
WHERE NOT EXISTS (SELECT 1 FROM public.education_levels LIMIT 1);`);
                        toast({ title: 'Copied', description: 'Complete table creation SQL copied to clipboard' });
                      }}
                      variant="outline" 
                      size="sm"
                    >
                      Copy Complete SQL
                    </Button>
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(`-- Complete table recreation (if table exists but is corrupted)
DROP TABLE IF EXISTS public.education_levels CASCADE;

CREATE TABLE public.education_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public select education levels" ON public.education_levels
  FOR SELECT USING (true);

CREATE POLICY "admins manage education levels" ON public.education_levels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

INSERT INTO public.education_levels (name, slug, description, position) VALUES
('Basic Education', 'basic-education', 'Primary education', 1),
('Junior High School', 'junior-high-school', 'JHS level', 2),
('Senior High School', 'senior-high-school', 'SHS level', 3);`);
                        toast({ title: 'Copied', description: 'Table recreation SQL copied to clipboard' });
                      }}
                      variant="outline" 
                      size="sm"
                    >
                      Copy Recreate SQL
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={fetchLevels} 
                    variant="outline" 
                    size="sm"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !errorMsg && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !errorMsg && levels.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Education Levels Yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Create your first education level to get started
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Level
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Education Levels Grid */}
        {!loading && levels.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {levels.map((level) => (
              <Card key={level.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground break-words">
                        {level.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Slug: {level.slug}
                      </p>
                    </div>

                    {/* Description */}
                    {level.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {level.description}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>
                        {level.created_at ? new Date(level.created_at).toLocaleDateString() : ''}
                      </span>
                      <span className="font-medium bg-primary/10 px-2 py-1 rounded">
                        Order: {level.position || 0}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(level)}
                          className="flex-1 flex items-center justify-center gap-1"
                          disabled={isSaving}
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setConfirmDeleteId(level.id)}
                          className="flex items-center justify-center gap-1"
                          disabled={isSaving}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Reorder Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveUp(level.id)}
                          className="flex-1 flex items-center justify-center gap-1"
                          disabled={isSaving || levels.findIndex(l => l.id === level.id) === 0}
                          title="Move up in order"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveDown(level.id)}
                          className="flex-1 flex items-center justify-center gap-1"
                          disabled={isSaving || levels.findIndex(l => l.id === level.id) === levels.length - 1}
                          title="Move down in order"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Education Level</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., High School, University"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this education level"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={isSaving || !newName.trim()}
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Education Level</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., High School, University"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Brief description of this education level"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={isSaving || !editName.trim()}
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Education Level?</AlertDialogTitle>
            </AlertDialogHeader>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The education level will be permanently deleted.
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteId) {
                    handleDelete(confirmDeleteId);
                  }
                }}
                disabled={isSaving}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminDashboardLayout>
  );
}
