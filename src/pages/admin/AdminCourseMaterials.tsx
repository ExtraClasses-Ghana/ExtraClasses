import { useState, useEffect } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText, 
  Video, 
  Download, 
  Star, 
  Pencil, 
  Trash2,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Subject {
  id: string;
  name: string;
}

interface CourseMaterial {
  id: string;
  title: string;
  description: string | null;
  type: string;
  subject_id: string | null;
  level: string | null;
  file_url: string | null;
  is_free: boolean;
  price: number;
  downloads: number;
  rating: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminCourseMaterials() {
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<CourseMaterial | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("PDF");
  const [subjectId, setSubjectId] = useState("");
  const [level, setLevel] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("0");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMaterials();
    fetchSubjects();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("course_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
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

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("PDF");
    setSubjectId("");
    setLevel("");
    setIsFree(true);
    setPrice("0");
    setFile(null);
    setEditingMaterial(null);
  };

  const handleEdit = (material: CourseMaterial) => {
    setEditingMaterial(material);
    setTitle(material.title);
    setDescription(material.description || "");
    setType(material.type);
    setSubjectId(material.subject_id || "");
    setLevel(material.level || "");
    setIsFree(material.is_free);
    setPrice(material.price.toString());
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let fileUrl = editingMaterial?.file_url || null;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("course-materials")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("course-materials")
          .getPublicUrl(fileName);

        fileUrl = urlData.publicUrl;
      }

      const materialData = {
        title,
        description: description || null,
        type,
        subject_id: subjectId || null,
        level: level || null,
        file_url: fileUrl,
        is_free: isFree,
        price: parseFloat(price) || 0,
        is_active: true,
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from("course_materials")
          .update(materialData)
          .eq("id", editingMaterial.id);

        if (error) throw error;
        toast({ title: "Material updated successfully" });
      } else {
        const { error } = await supabase
          .from("course_materials")
          .insert([materialData]);

        if (error) throw error;
        toast({ title: "Material added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMaterials();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      const { error } = await supabase
        .from("course_materials")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Material deleted successfully" });
      fetchMaterials();
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
        .from("course_materials")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      fetchMaterials();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return "—";
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || "Unknown";
  };

  return (
    <AdminDashboardLayout title="Course Materials" subtitle="Manage study materials and videos">
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
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMaterial ? "Edit Material" : "Add New Material"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="Video">Video</SelectItem>
                        <SelectItem value="Document">Document</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JHS">JHS</SelectItem>
                        <SelectItem value="SHS">SHS</SelectItem>
                        <SelectItem value="University">University</SelectItem>
                        <SelectItem value="All Levels">All Levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Upload File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.mp4,.webm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isFree"
                      checked={isFree}
                      onCheckedChange={setIsFree}
                    />
                    <Label htmlFor="isFree">Free Material</Label>
                  </div>

                  {!isFree && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="price">Price (GH₵)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-24"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}
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
                  <Button type="submit" className="flex-1" disabled={uploading}>
                    {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingMaterial ? "Update" : "Add Material"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{materials.filter(m => m.type === "PDF").length}</p>
                  <p className="text-sm text-muted-foreground">PDFs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100">
                  <Video className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{materials.filter(m => m.type === "Video").length}</p>
                  <p className="text-sm text-muted-foreground">Videos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <Download className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {materials.reduce((sum, m) => sum + m.downloads, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Downloads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-100">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{materials.filter(m => m.is_free).length}</p>
                  <p className="text-sm text-muted-foreground">Free Materials</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Materials Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Materials</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No materials found. Add your first material to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {material.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={material.type === "Video" ? "secondary" : "outline"}>
                            {material.type === "Video" ? (
                              <Video className="w-3 h-3 mr-1" />
                            ) : (
                              <FileText className="w-3 h-3 mr-1" />
                            )}
                            {material.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{getSubjectName(material.subject_id)}</TableCell>
                        <TableCell>{material.level || "—"}</TableCell>
                        <TableCell>
                          {material.is_free ? (
                            <Badge className="bg-green-500">Free</Badge>
                          ) : (
                            `GH₵${material.price}`
                          )}
                        </TableCell>
                        <TableCell>{material.downloads.toLocaleString()}</TableCell>
                        <TableCell>
                          <Switch
                            checked={material.is_active}
                            onCheckedChange={() => toggleActive(material.id, material.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(material)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(material.id)}
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
