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
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

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
  reporter?: { full_name: string; email: string };
  reported_user?: { full_name: string; email: string };
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
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Clock className="w-5 h-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Eye className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.investigating}</p>
                  <p className="text-sm text-muted-foreground">Investigating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Complaints List */}
        <Card>
          <CardHeader>
            <CardTitle>Complaints ({filteredComplaints.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading complaints...</div>
            ) : filteredComplaints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {complaints.length === 0 ? "No complaints reported yet" : "No complaints match your filters"}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="p-4 border rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {getTypeBadge(complaint.complaint_type)}
                          {getStatusBadge(complaint.status)}
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">
                          {complaint.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Reporter: {complaint.reporter?.full_name || "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Reported: {complaint.reported_user?.full_name || "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(complaint.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setResolutionNotes(complaint.resolution_notes || "");
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Complaint</DialogTitle>
            <DialogDescription>
              Investigate the complaint and take appropriate action
            </DialogDescription>
          </DialogHeader>

          {selectedComplaint && (
            <div className="space-y-6">
              {/* Complaint Details */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {getTypeBadge(selectedComplaint.complaint_type)}
                  {getStatusBadge(selectedComplaint.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground mb-1">Reporter</p>
                      <p className="font-medium">{selectedComplaint.reporter?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedComplaint.reporter?.email}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground mb-1">Reported User</p>
                      <p className="font-medium">{selectedComplaint.reported_user?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedComplaint.reported_user?.email}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="p-3 bg-muted rounded-lg text-sm">{selectedComplaint.description}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Reported: {format(new Date(selectedComplaint.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              {/* Resolution Notes */}
              {selectedComplaint.status === "pending" || selectedComplaint.status === "investigating" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Resolution Notes</label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Add notes about the investigation and resolution..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleResolve("dismissed")}
                      disabled={isResolving}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Dismiss
                    </Button>
                    <Button
                      onClick={() => handleResolve("resolved")}
                      disabled={isResolving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Resolve
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Resolution Notes</p>
                  <p className="text-sm">{selectedComplaint.resolution_notes || "No notes provided"}</p>
                  {selectedComplaint.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Resolved on {format(new Date(selectedComplaint.resolved_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}
