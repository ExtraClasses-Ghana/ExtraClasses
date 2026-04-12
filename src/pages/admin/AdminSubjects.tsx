import { useState, useEffect } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  BookOpen, 
  Pencil, 
  Trash2,
  Loader2,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEducationLevels } from "@/hooks/useEducationLevel";
import { motion, AnimatePresence } from "framer-motion";

interface Subject {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  topics: string[];
  teacher_count: number;
  is_active: boolean;
  created_at: string;
  education_level: string | null;
  education_sub_category: string | null;
}

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [topics, setTopics] = useState("");
  const { levels: educationLevels, loading: loadingLevels } = useEducationLevels();
  const [educationLevel, setEducationLevel] = useState<string>("");

  useEffect(() => {
    if (!educationLevel && educationLevels.length > 0) {
      setEducationLevel(educationLevels[0].name);
    }
  }, [educationLevels, educationLevel]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      if (error) throw error;
      setSubjects((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIcon("");
    setTopics("");
    setEducationLevel(educationLevels.length > 0 ? educationLevels[0].name : "");
    setEditingSubject(null);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setDescription(subject.description || "");
    setIcon(subject.icon || "");
    setTopics(subject.topics?.join(", ") || "");
    setEducationLevel(subject.education_level || (educationLevels.length > 0 ? educationLevels[0].name : ""));
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const topicsArray = topics
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const subjectData = {
        name,
        description: description || null,
        icon: icon || null,
        topics: topicsArray,
        is_active: true,
        education_level: educationLevel || (educationLevels.length > 0 ? educationLevels[0].name : ""),
        education_sub_category: null,
      };

      if (editingSubject) {
        const { error } = await supabase
          .from("subjects")
          .update(subjectData)
          .eq("id", editingSubject.id);

        if (error) throw error;
        toast({ title: "Subject updated successfully" });
      } else {
        const { error } = await supabase
          .from("subjects")
          .insert([subjectData]);

        if (error) throw error;
        toast({ title: "Subject added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Subject deleted successfully" });
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("subjects")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AdminDashboardLayout title="" subtitle="">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        
        <div className="relative z-10 space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Subject Management
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Organize learning materials systematically across different subjects
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4 items-center"
            >
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl shadow-md gap-2" size="lg">
                    <Plus className="w-5 h-5" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl glassmorphism-dialog border-white/10 rounded-2xl overflow-hidden shadow-2xl p-0">
                  <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-primary to-blue-600" />
                  <div className="p-6">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-primary" />
                        {editingSubject ? "Edit Subject" : "Add New Subject"}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-foreground/80 font-semibold">Subject Name *</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., Mathematics"
                          required
                          className="bg-background/50 border-white/20 focus:border-primary rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground/80 font-semibold">Education Level *</Label>
                        <Select value={educationLevel} onValueChange={setEducationLevel}>
                          <SelectTrigger className="bg-background/50 border-white/20 rounded-xl h-11">
                            <SelectValue placeholder="Select education level" />
                          </SelectTrigger>
                          <SelectContent className="glassmorphism border-white/10">
                            {educationLevels.map((level) => (
                              <SelectItem key={level.id} value={level.name} className="rounded-lg">
                                {level.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-foreground/80 font-semibold">Description</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Brief description matching course material"
                          rows={3}
                          className="bg-background/50 border-white/20 focus:border-primary rounded-xl resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="icon" className="text-foreground/80 font-semibold">Icon</Label>
                        <Input
                          id="icon"
                          value={icon}
                          onChange={(e) => setIcon(e.target.value)}
                          placeholder="Lucide icon name (Calc, Atom, Globe)"
                          className="bg-background/50 border-white/20 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="topics" className="text-foreground/80 font-semibold">Topics (comma-separated)</Label>
                        <Textarea
                          id="topics"
                          value={topics}
                          onChange={(e) => setTopics(e.target.value)}
                          placeholder="Algebra, Geometry, Calculus"
                          rows={2}
                          className="bg-background/50 border-white/20 focus:border-primary rounded-xl resize-none"
                        />
                      </div>

                      <div className="flex gap-3 pt-6 mt-6 border-t border-border/50">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => { setIsDialogOpen(false); resetForm(); }}
                          className="flex-1 rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-[2] rounded-xl shadow-md" disabled={saving}>
                          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          {editingSubject ? "Save Changes" : "Create Subject"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm overflow-hidden group hover:bg-white/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Subjects</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{subjects.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm overflow-hidden group hover:bg-white/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-green-500/10 ring-1 ring-green-500/20 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Elements</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{subjects.filter(s => s.is_active).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm overflow-hidden group hover:bg-white/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20 group-hover:scale-110 transition-transform">
                      <Users className="w-7 h-7 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Teachers</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {subjects.reduce((sum, s) => sum + s.teacher_count, 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm">
              <CardHeader className="border-b border-border/50 bg-muted/30">
                <CardTitle className="font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  All Authorized Subjects
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-primary opacity-50" />
                    </div>
                    <p className="text-lg font-medium">No subjects allocated.</p>
                    <p className="text-sm opacity-80 mt-1">Populate subjects to enhance the education core.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold px-6">Subject</TableHead>
                          <TableHead className="font-semibold">Level</TableHead>
                          <TableHead className="font-semibold">Topics</TableHead>
                          <TableHead className="font-semibold text-center">Tutors</TableHead>
                          <TableHead className="font-semibold text-center">Status</TableHead>
                          <TableHead className="font-semibold text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {subjects.map((subject, index) => (
                            <motion.tr
                              key={subject.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ delay: index * 0.03 }}
                              className="group hover:bg-white/40 dark:hover:bg-white/5 transition-colors border-b border-border/40"
                            >
                              <TableCell className="font-medium px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm border border-primary/20">
                                    {subject.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-base text-foreground font-semibold">{subject.name}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={subject.description || ""}>
                                      {subject.description || "No description provided"}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-background/50 border-primary/30 text-primary uppercase text-[10px] tracking-wide font-bold">
                                  {subject.education_level || "Any"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                  {subject.topics?.slice(0, 2).map((topic) => (
                                    <Badge key={topic} className="bg-secondary/20 text-secondary-foreground border-secondary/30 hover:bg-secondary/30 text-xs shadow-none">
                                      {topic}
                                    </Badge>
                                  ))}
                                  {subject.topics?.length > 2 && (
                                    <Badge variant="outline" className="bg-background/50 border-border/50 text-xs text-muted-foreground shadow-none">
                                      +{subject.topics.length - 2} more
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="inline-flex items-center justify-center min-w-[2rem] h-8 rounded-md bg-muted/50 text-foreground font-semibold px-2">
                                  {subject.teacher_count}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={subject.is_active}
                                  onCheckedChange={() => toggleActive(subject.id, subject.is_active)}
                                  className="data-[state=checked]:bg-green-500 shadow-sm"
                                />
                              </TableCell>
                              <TableCell className="text-right px-6">
                                <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEdit(subject)}
                                    className="h-9 w-9 rounded-lg bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDelete(subject.id)}
                                    className="h-9 w-9 rounded-lg bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
