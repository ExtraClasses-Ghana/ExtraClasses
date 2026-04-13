import { useState, useEffect } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  MessageSquare,
  User,
  Calendar,
  Filter,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Complaint {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  complaint_type: string;
  description: string;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  reporter?: { full_name: string; email: string } | null;
  reported_user?: { full_name: string; email: string } | null;
}

export default function AdminComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data: complaintsData, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user details for each complaint
      const complaintsWithUsers = await Promise.all(
        (complaintsData || []).map(async (complaint) => {
          const [reporterRes, reportedRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", complaint.reporter_id)
              .single(),
            supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", complaint.reported_user_id)
              .single(),
          ]);

          return {
            ...complaint,
            reporter: reporterRes.data,
            reported_user: reportedRes.data,
          };
        })
      );

      setComplaints(complaintsWithUsers);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (status: "resolved" | "dismissed") => {
    if (!selectedComplaint || !user) return;

    setIsResolving(true);
    try {
      const { error } = await supabase
        .from("complaints")
        .update({
          status,
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", selectedComplaint.id);

      if (error) throw error;

      toast.success(`Complaint ${status === "resolved" ? "resolved" : "dismissed"} successfully`);
      setSelectedComplaint(null);
      setResolutionNotes("");
      fetchComplaints();
    } catch (error) {
      console.error("Error resolving complaint:", error);
      toast.error("Failed to update complaint");
    } finally {
      setIsResolving(false);
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("complaints").delete().eq("id", id);
      if (error) throw error;
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      if (selectedComplaint?.id === id) setSelectedComplaint(null);
      toast.success("Complaint deleted");
    } catch (err) {
      console.error("Error deleting complaint:", err);
      toast.error("Failed to delete complaint");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "investigating":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Eye className="w-3 h-3 mr-1" /> Investigating</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Resolved</Badge>;
      case "dismissed":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="w-3 h-3 mr-1" /> Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      harassment: "bg-red-50 text-red-700 border-red-200",
      fraud: "bg-orange-50 text-orange-700 border-orange-200",
      inappropriate: "bg-purple-50 text-purple-700 border-purple-200",
      spam: "bg-yellow-50 text-yellow-700 border-yellow-200",
      other: "bg-gray-50 text-gray-700 border-gray-200",
    };
    return (
      <Badge variant="outline" className={colors[type] || colors.other}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch = 
      complaint.reporter?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.reported_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || complaint.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === "pending").length,
    investigating: complaints.filter(c => c.status === "investigating").length,
    resolved: complaints.filter(c => c.status === "resolved").length,
  };

  return (
    <AdminDashboardLayout title="Complaints Management" subtitle="Review, investigate, and resolve user complaints">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />

        <div className="relative z-10 space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-destructive/20 ring-1 ring-destructive/30">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Complaints Management
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Review, investigate, and resolve user complaints
              </motion.p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="p-3 rounded-xl bg-muted ring-1 ring-white/20 shrink-0">
                      <AlertTriangle className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-3xl font-bold text-foreground/90">{stats.total}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="p-3 rounded-xl bg-yellow-500/20 ring-1 ring-yellow-500/30 shrink-0">
                      <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-3xl font-bold text-foreground/90">{stats.pending}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30 shrink-0">
                      <Eye className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-3xl font-bold text-foreground/90">{stats.investigating}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Investigating</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="p-3 rounded-xl bg-green-500/20 ring-1 ring-green-500/30 shrink-0">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-3xl font-bold text-foreground/90">{stats.resolved}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Resolved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-white/20 focus:border-primary rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-background/50 border-white/20 rounded-xl">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="glassmorphism-dialog border-white/10 rounded-xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/30">
                <CardTitle>Complaints ({filteredComplaints.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Clock className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : filteredComplaints.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-primary opacity-50" />
                    </div>
                    <p className="text-lg font-medium">No complaints found</p>
                    <p className="text-sm text-muted-foreground mt-1">Platform is operating smoothly.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {filteredComplaints.map((complaint, i) => (
                        <motion.div
                          key={complaint.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 transition-colors shadow-sm group"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                {getTypeBadge(complaint.complaint_type)}
                                {getStatusBadge(complaint.status)}
                              </div>
                              <p className="text-sm text-foreground/90 font-medium line-clamp-2 max-w-3xl">
                                {complaint.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2">
                                <span className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50">
                                  <User className="w-3 h-3" />
                                  Reporter: {complaint.reporter?.full_name || "Unknown"}
                                </span>
                                <span className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50">
                                  <User className="w-3 h-3 text-destructive" />
                                  Reported: {complaint.reported_user?.full_name || "Unknown"}
                                </span>
                                <span className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(complaint.created_at), "MMM d, yyyy")}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 rounded-lg bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                                onClick={() => {
                                  setSelectedComplaint(complaint);
                                  setResolutionNotes(complaint.resolution_notes || "");
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Review
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                onClick={() => setDeleteConfirmId(complaint.id)}
                                disabled={deletingId === complaint.id}
                                title="Delete Complaint"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Review Modal */}
      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="glassmorphism-dialog border-white/10 rounded-2xl overflow-hidden max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <DialogHeader className="bg-muted/30 p-6 border-b border-border/50">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Review Complaint
            </DialogTitle>
            <DialogDescription>
              Investigate the complaint and take appropriate action
            </DialogDescription>
          </DialogHeader>

          {selectedComplaint && (
            <div className="space-y-6 p-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {getTypeBadge(selectedComplaint.complaint_type)}
                  {getStatusBadge(selectedComplaint.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Reporter</p>
                      <p className="font-bold text-foreground/90">{selectedComplaint.reporter?.full_name}</p>
                      <p className="text-sm text-foreground/60">{selectedComplaint.reporter?.email}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-destructive/5 border-destructive/20">
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase tracking-wider font-semibold text-destructive/80 mb-1">Reported User</p>
                      <p className="font-bold text-foreground/90">{selectedComplaint.reported_user?.full_name}</p>
                      <p className="text-sm text-foreground/60">{selectedComplaint.reported_user?.email}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Description</p>
                  <p className="p-4 bg-white/5 border border-white/10 rounded-xl text-sm font-medium leading-relaxed shadow-inner">
                    {selectedComplaint.description}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Reported: {format(new Date(selectedComplaint.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              {selectedComplaint.status === "pending" || selectedComplaint.status === "investigating" ? (
                <div className="space-y-4 mt-6 border-t border-border/50 pt-6">
                  <div>
                    <label className="text-sm font-bold text-foreground/80">Resolution Notes</label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Add notes about the investigation and resolution..."
                      rows={4}
                      className="mt-2 bg-background/50 border-white/20 focus:border-primary rounded-xl resize-none"
                    />
                  </div>

                  <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleResolve("dismissed")}
                      disabled={isResolving}
                      className="rounded-xl border-white/20 bg-background/50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Dismiss Request
                    </Button>
                    <Button
                      onClick={() => handleResolve("resolved")}
                      disabled={isResolving}
                      className="rounded-xl bg-green-600 hover:bg-green-700 shadow-md"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Resolve Issue
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="p-5 bg-muted/40 rounded-xl mt-6 border border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Resolution Notes</p>
                  <p className="text-sm font-medium">{selectedComplaint.resolution_notes || "No notes provided"}</p>
                  {selectedComplaint.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-3 font-semibold uppercase tracking-wider">
                      Resolved on {format(new Date(selectedComplaint.resolved_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation (Styled) */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => !deletingId && setDeleteConfirmId(null)}>
        <AlertDialogContent className="glassmorphism-dialog border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete complaint?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the complaint from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={!!deletingId} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => deleteConfirmId && handleDeleteComplaint(deleteConfirmId)}
              disabled={!!deletingId}
            >
              {deletingId ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  );
}