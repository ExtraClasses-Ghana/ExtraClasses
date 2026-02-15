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

interface Subject {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  topics: string[];
  teacher_count: number;
  is_active: boolean;
  created_at: string;
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
      setSubjects(data || []);
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
    setEditingSubject(null);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setDescription(subject.description || "");
    setIcon(subject.icon || "");
    setTopics(subject.topics?.join(", ") || "");
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
    <AdminDashboardLayout title="Subjects Management" subtitle="Manage subject categories and topics">
      <div className="space-y-6">
        {/* Action Button */}
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSubject ? "Edit Subject" : "Add New Subject"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Subject Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Mathematics"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the subject"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon">Icon Name</Label>
                  <Input
                    id="icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="e.g., Calculator, BookOpen"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use Lucide icon names like: Calculator, FlaskConical, BookOpen, Globe2
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topics">Topics (comma-separated)</Label>
                  <Textarea
                    id="topics"
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    placeholder="Algebra, Geometry, Calculus, Statistics"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingSubject ? "Update" : "Add Subject"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subjects.length}</p>
                  <p className="text-sm text-muted-foreground">Total Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subjects.filter(s => s.is_active).length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {subjects.reduce((sum, s) => sum + s.teacher_count, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Teachers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subjects Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subjects found. Add your first subject to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Topics</TableHead>
                      <TableHead>Teachers</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">
                          {subject.name}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {subject.description || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {subject.topics?.slice(0, 2).map((topic) => (
                              <Badge key={topic} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                            {subject.topics?.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{subject.topics.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{subject.teacher_count}</TableCell>
                        <TableCell>
                          <Switch
                            checked={subject.is_active}
                            onCheckedChange={() => toggleActive(subject.id, subject.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(subject)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(subject.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
