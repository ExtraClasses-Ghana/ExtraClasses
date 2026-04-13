import { useEffect, useState, useMemo } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  GraduationCap, 
  CheckCircle, 
  Clock, 
  XCircle,
  Star,
  Eye,
  Ban,
  AlertTriangle,
  RotateCcw,
  Trash2,
  RefreshCw,
  Users,
  Loader2,
  Wallet,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } from "docx";
import { motion, AnimatePresence } from "framer-motion";

interface Teacher {
  user_id: string;
  verification_status: string | null;
  is_verified: boolean;
  subjects: string[];
  hourly_rate: number;
  rating: number;
  total_sessions: number;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    region: string | null;
    status: string;
    status_reason: string | null;
    status_updated_at?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export default function AdminTeachers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [recentPublished, setRecentPublished] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: "suspend" | "block" | "restore" | "delete" | null;
    teacher: Teacher | null;
  }>({ open: false, type: null, teacher: null });
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Wallet Modal State
  const [walletModal, setWalletModal] = useState<{
    open: boolean;
    teacher: Teacher | null;
    amount: string;
    reason: string;
    type: "credit" | "debit";
    balance: number | null;
  }>({ open: false, teacher: null, amount: "", reason: "", type: "credit", balance: null });
  const [walletLoading, setWalletLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();

    const teacherChannel = supabase
      .channel("admin_teachers_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_profiles" },
        () => fetchTeachers()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchTeachers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(teacherChannel);
    };
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data: teacherProfiles, error } = await supabase
        .from("teacher_profiles")
        .select("user_id, verification_status, is_verified, subjects, hourly_rate, rating, total_sessions, created_at, updated_at");

      if (error) throw error;

      const teachersWithProfiles = await Promise.all(
        (teacherProfiles || []).map(async (teacher) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, avatar_url, region, status, status_reason, status_updated_at")
            .eq("user_id", teacher.user_id)
            .maybeSingle();

          return { ...teacher, profile };
        })
      );

      setTeachers(teachersWithProfiles as unknown as Teacher[]);

      // Compute recent published/verified teachers
      const published = (teachersWithProfiles as unknown as Teacher[])
        .filter(t => t.verification_status === 'verified' || t.is_verified)
        .sort((a, b) => {
          const ad = new Date(a.updated_at || a.profile?.status_updated_at || a.created_at || 0).getTime();
          const bd = new Date(b.updated_at || b.profile?.status_updated_at || b.created_at || 0).getTime();
          return bd - ad;
        })
        .slice(0, 4);

      setRecentPublished(published as Teacher[]);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountAction = async () => {
    if (!actionModal.teacher || !actionModal.type) return;

    setActionLoading(true);
    try {
      if (actionModal.type === "delete") {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        let functionFailed = false;
        try {
          // @ts-ignore - RPC not yet in generated types
          const { error: rpcError } = await supabase.rpc("delete_user_account", {
            target_user_id: actionModal.teacher.user_id
          });
          if (rpcError) throw rpcError;
        } catch (e) {
          console.warn("RPC delete failed, falling back to direct db delete", e);
          functionFailed = true;
        }

        if (functionFailed) {
          // Fallback: Delete related records so the teacher is removed from the platform
          const { error: tErr } = await supabase.from("teacher_profiles").delete().eq("user_id", actionModal.teacher.user_id);
          const { error: pErr } = await supabase.from("profiles").delete().eq("user_id", actionModal.teacher.user_id);
          if (tErr) throw tErr;
          if (pErr) throw pErr;
        }

        toast({
          title: "Success",
          description: "Teacher account has been deleted",
        });
      } else {
        const newStatus = actionModal.type === "restore" ? "active" : actionModal.type === "suspend" ? "suspended" : "blocked";
        
        const { error } = await supabase
          .from("profiles")
          .update({
            status: newStatus,
            status_reason: actionModal.type === "restore" ? null : actionReason,
            status_updated_at: new Date().toISOString(),
            status_updated_by: user?.id,
          })
          .eq("user_id", actionModal.teacher.user_id);

        if (error) throw error;

        await supabase.from("admin_notifications").insert({
          type: `teacher_${actionModal.type}ed`,
          title: `Teacher Account ${actionModal.type === "restore" ? "Restored" : actionModal.type === "suspend" ? "Suspended" : "Blocked"}`,
          message: `${actionModal.teacher.profile?.full_name}'s account has been ${actionModal.type === "restore" ? "restored" : actionModal.type === "suspend" ? "suspended" : "blocked"}. Reason: ${actionReason || "N/A"}`,
          related_user_id: actionModal.teacher.user_id,
        });

        toast({
          title: "Success",
          description: `Teacher account has been ${actionModal.type === "restore" ? "restored" : actionModal.type === "suspend" ? "suspended" : "blocked"}`,
        });
      }

      setActionModal({ open: false, type: null, teacher: null });
      setActionReason("");
      fetchTeachers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update account status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchTeacherBalance = async (teacherId: string) => {
    try {
      const { data: completedSessions } = await supabase
        .from("sessions")
        .select("amount")
        .eq("teacher_id", teacherId)
        .eq("status", "completed");

      const totalRevenue = (completedSessions || []).reduce((sum, s) => sum + Number(s.amount), 0);

      const { data: withdrawals } = await supabase
        .from("teacher_withdrawals" as any)
        .select("amount")
        .eq("teacher_id", teacherId)
        .in("status", ["paid", "processing", "withdrawing", "pending"]);

      const totalWithdrawn = (withdrawals || []).reduce((sum, w: any) => sum + Number(w.amount), 0);
      
      const { data: adjustments } = await supabase
        .from("admin_wallet_adjustments")
        .select("amount")
        .eq("teacher_id", teacherId);
      
      const totalAdjustments = (adjustments || []).reduce((sum, a) => sum + Number(a.amount), 0);

      return Math.max(0, totalRevenue + totalAdjustments - totalWithdrawn);
    } catch (error) {
      console.error(error);
      return 0;
    }
  };

  const handleOpenWalletModal = async (teacher: Teacher) => {
    setWalletModal({ open: true, teacher, amount: "", reason: "", type: "credit", balance: null });
    const balance = await fetchTeacherBalance(teacher.user_id);
    setWalletModal(prev => ({ ...prev, balance }));
  };

  const handleWalletSubmit = async () => {
    if (!walletModal.teacher || !walletModal.amount || !walletModal.reason) return;
    
    setWalletLoading(true);
    try {
      let adjAmount = Number(walletModal.amount);
      if (walletModal.type === "debit") {
        adjAmount = -Math.abs(adjAmount);
      } else {
        adjAmount = Math.abs(adjAmount);
      }

      const { error } = await supabase.from("admin_wallet_adjustments").insert({
        teacher_id: walletModal.teacher.user_id,
        admin_id: user?.id,
        amount: adjAmount,
        reason: walletModal.reason
      });

      if (error) throw error;

      await supabase.from("admin_notifications").insert({
        type: "wallet_adjustment",
        title: `Wallet ${walletModal.type === 'credit' ? 'Credited' : 'Debited'}`,
        message: `Admin has ${walletModal.type === 'credit' ? 'credited' : 'debited'} GH₵${Math.abs(adjAmount)} to your wallet. Reason: ${walletModal.reason}`,
        related_user_id: walletModal.teacher.user_id,
      });

      toast({
        title: "Success",
        description: `Successfully ${walletModal.type === 'credit' ? 'credited' : 'debited'} the teacher's wallet.`,
      });

      setWalletModal({ open: false, teacher: null, amount: "", reason: "", type: "credit", balance: null });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to adjust wallet.",
        variant: "destructive"
      });
    } finally {
      setWalletLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute stats
  const stats = useMemo(() => {
    return {
      total: teachers.length,
      verified: teachers.filter(t => t.is_verified || t.verification_status === 'verified').length,
      pending: teachers.filter(t => t.verification_status === 'pending' || t.verification_status === 'in_review').length,
      suspended: teachers.filter(t => t.profile?.status === 'suspended' || t.profile?.status === 'blocked').length
    };
  }, [teachers]);

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (isVerified) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500 shadow-sm">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (status === "pending" || status === "in_review") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500 shadow-sm">
          <Clock className="w-3 h-3 mr-1" />
          {status === "in_review" ? "Processing" : "Pending"}
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="destructive" className="shadow-sm">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="shadow-sm">
        Unverified
      </Badge>
    );
  };

  const getAccountStatusBadge = (status: string | undefined) => {
    if (status === "suspended") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Suspended
        </Badge>
      );
    }
    if (status === "blocked") {
      return (
        <Badge variant="destructive">
          <Ban className="w-3 h-3 mr-1" />
          Blocked
        </Badge>
      );
    }
    return null;
  };

  const getCommonExportData = () => {
    return filteredTeachers.map(teacher => ({
        Name: teacher.profile?.full_name || 'Anonymous',
        Email: teacher.profile?.email || 'N/A',
        Region: teacher.profile?.region || 'N/A',
        Subjects: teacher.subjects?.join(', ') || 'N/A',
        Rate: "GH₵" + (teacher.hourly_rate || 0) + "/hr",
        Rating: teacher.rating?.toString() || '0',
        Status: teacher.verification_status,
        Verified: teacher.is_verified ? 'Yes' : 'No'
    }));
  };

  const handleExportPDF = async () => {
    try {
      if (filteredTeachers.length === 0) return;
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(41, 128, 185);
      doc.text("ExtraClasses Ghana", 14, 20);
      doc.setFontSize(16);
      doc.setTextColor(60, 60, 60);
      doc.text("Teachers Export Report", 14, 30);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Generated on: " + new Date().toLocaleString(), 14, 38);

      const tableData = getCommonExportData();
      const headers = Object.keys(tableData[0] || {});
      const rows = tableData.map(obj => Object.values(obj));

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 }
      });

      doc.save("teachers-export-" + new Date().toISOString().split('T')[0] + ".pdf");
      toast({ title: 'Success', description: 'Teachers exported as PDF' });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  const handleExportExcel = async () => {
    try {
      if (filteredTeachers.length === 0) return;
      const ws = XLSX.utils.json_to_sheet(getCommonExportData());
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Teachers");
      XLSX.writeFile(wb, "teachers-export-" + new Date().toISOString().split('T')[0] + ".xlsx");
      toast({ title: 'Success', description: 'Teachers exported as Excel' });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Failed to export Excel', variant: 'destructive' });
    }
  };

  const handleExportWord = async () => {
    try {
      const data = getCommonExportData();
      if (data.length === 0) return;
      const headers = Object.keys(data[0]);

      const docxTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: headers.map(header => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
              shading: { fill: "f2f2f2" }
            }))
          }),
          ...data.map(row => new TableRow({
            children: Object.values(row).map(value => new TableCell({
              children: [new Paragraph({ text: String(value) })]
            }))
          }))
        ]
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: "ExtraClasses Ghana - Teachers Export Report", bold: true, size: 32 })] }),
            new Paragraph({ text: "Generated on: " + new Date().toLocaleString(), spacing: { after: 400 } }),
            docxTable
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "teachers-export-" + new Date().toISOString().split('T')[0] + ".docx";
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Success', description: 'Teachers exported as Word document' });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Failed to export Word document', variant: 'destructive' });
    }
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
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Teacher Overview
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                View, manage, and export data for all registered educators across the platform.
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true);
                  fetchTeachers();
                }}
                disabled={loading}
                className="h-12 px-6 rounded-xl shadow-md gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/20"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Syncing..." : "Sync Data"}
              </Button>
            </motion.div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="p-6 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none">Total</Badge>
                </div>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground mt-1">Registered Teachers</p>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="p-6 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-none">Verified</Badge>
                </div>
                <div className="text-3xl font-bold">{stats.verified}</div>
                <p className="text-sm text-muted-foreground mt-1">Approved & Listed</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="p-6 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none">Pending</Badge>
                </div>
                <div className="text-3xl font-bold">{stats.pending}</div>
                <p className="text-sm text-muted-foreground mt-1">Awaiting Review</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="p-6 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 border-none">Suspended</Badge>
                </div>
                <div className="text-3xl font-bold">{stats.suspended}</div>
                <p className="text-sm text-muted-foreground mt-1">Action Required</p>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Main Table Area */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap p-4 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 shadow-sm">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-background/50 border-white/20 shadow-inner rounded-xl"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    title="Export PDF"
                    disabled={loading || filteredTeachers.length === 0}
                    onClick={() => handleExportPDF()}
                    className="h-11 w-11 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 border-white/20"
                  >
                    <img src="/pdf-icon.png" alt="PDF" className="w-5 h-5 opacity-80" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    title="Export Excel"
                    disabled={loading || filteredTeachers.length === 0}
                    onClick={() => handleExportExcel()}
                    className="h-11 w-11 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 border-white/20"
                  >
                    <img src="/excel-icon.png" alt="Excel" className="w-5 h-5 opacity-80" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    title="Export Word"
                    disabled={loading || filteredTeachers.length === 0}
                    onClick={() => handleExportWord()}
                    className="h-11 w-11 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 border-white/20"
                  >
                    <img src="/word-icon.png" alt="Word" className="w-5 h-5 opacity-80" />
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                ) : filteredTeachers.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4 border border-border">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium text-foreground">No teachers found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/20">
                          <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground">Educator</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground hidden md:table-cell">Area</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground hidden lg:table-cell">Rate/Rating</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground">Status</th>
                          <th className="text-right py-4 px-6 font-semibold text-sm text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        <AnimatePresence>
                          {filteredTeachers.map((teacher, i) => (
                            <motion.tr 
                              key={teacher.user_id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="hover:bg-muted/10 transition-colors"
                            >
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shrink-0 overflow-hidden">
                                    {teacher.profile?.avatar_url ? (
                                      <img src={teacher.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <GraduationCap className="w-5 h-5 text-primary" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-foreground">{teacher.profile?.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{teacher.profile?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6 hidden md:table-cell">
                                <Badge variant="secondary" className="font-normal bg-background/50">{teacher.profile?.region || "-"}</Badge>
                              </td>
                              <td className="py-4 px-6 hidden lg:table-cell">
                                <p className="font-medium">GH₵{teacher.hourly_rate || 0}/hr</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span>{teacher.rating || 'New'}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex flex-col gap-1.5 items-start">
                                  {getStatusBadge(teacher.verification_status || "pending", teacher.is_verified || false)}
                                  {getAccountStatusBadge(teacher.profile?.status)}
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/50 dark:hover:bg-white/10 text-primary" onClick={() => handleOpenWalletModal(teacher)} title="Manage Wallet">
                                    <Wallet className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/50 dark:hover:bg-white/10" asChild>
                                    <Link to={`/teacher/${teacher.user_id}`}>
                                      <Eye className="w-4 h-4" />
                                    </Link>
                                  </Button>
                                  
                                  {teacher.profile?.status === "blocked" || teacher.profile?.status === "suspended" ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setActionModal({ open: true, type: "restore", teacher })}
                                      className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                                      title="Restore Account"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setActionModal({ open: true, type: "suspend", teacher })}
                                        className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                        title="Suspend"
                                      >
                                        <AlertTriangle className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setActionModal({ open: true, type: "block", teacher })}
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Block"
                                      >
                                        <Ban className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setActionModal({ open: true, type: "delete", teacher })}
                                    className="h-8 w-8 text-destructive hover:text-destructive/80 opacity-50 hover:opacity-100"
                                    title="Delete completely"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar (Recently Verified) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/10 shadow-sm">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
                  <Star className="w-5 h-5 text-primary" />
                  Recently Verified
                </h3>
                
                {recentPublished.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">None recently</p>
                ) : (
                  <div className="space-y-4">
                    {recentPublished.map((t, i) => (
                      <motion.div 
                        key={t.user_id} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 border border-white/20 dark:border-white/5 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {t.profile?.avatar_url ? (
                            <img src={t.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <GraduationCap className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link to={`/teacher/${t.user_id}`} className="font-medium text-sm hover:text-primary transition-colors truncate block">
                            {t.profile?.full_name || 'Teacher'}
                          </Link>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Approved</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Modal */}
        <Dialog open={actionModal.open} onOpenChange={(open) => !open && setActionModal({ open: false, type: null, teacher: null })}>
          <DialogContent className="sm:max-w-[425px] glassmorphism-dialog border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className={`absolute top-0 right-0 w-full h-1 bg-gradient-to-r ${actionModal.type === 'restore' ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'}`} />
            <DialogHeader className="pt-4">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {actionModal.type === "restore" ? (
                  <><RotateCcw className="w-5 h-5 text-green-500" /> Restore Account</>
                ) : actionModal.type === "suspend" ? (
                  <><AlertTriangle className="w-5 h-5 text-amber-500" /> Suspend Account</>
                ) : actionModal.type === "delete" ? (
                  <><Trash2 className="w-5 h-5 text-destructive" /> Delete Account</>
                ) : (
                  <><Ban className="w-5 h-5 text-destructive" /> Block Account</>
                )}
              </DialogTitle>
              <DialogDescription className="pt-2">
                {actionModal.type === "restore" 
                  ? "Restore " + actionModal.teacher?.profile?.full_name + "'s account to active status. They will be visible again."
                  : actionModal.type === "suspend" 
                    ? "Temporarily suspend " + actionModal.teacher?.profile?.full_name + "'s account. They won't be able to receive bookings."
                    : actionModal.type === "delete"
                      ? "Permanently delete " + actionModal.teacher?.profile?.full_name + "'s account and all associated data. This action cannot be undone."
                      : "Permanently block " + actionModal.teacher?.profile?.full_name + "'s account. This action can be reversed later."
                }
              </DialogDescription>
            </DialogHeader>
            
            {actionModal.type !== "restore" && actionModal.type !== "delete" && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reason" className="font-semibold">Reason for {actionModal.type === "suspend" ? "suspension" : "blocking"}</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter the reason to be saved in logs..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="min-h-[100px] bg-background/50 border-white/20 rounded-xl resize-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button variant="ghost" className="rounded-xl" onClick={() => setActionModal({ open: false, type: null, teacher: null })}>
                Cancel
              </Button>
              <Button
                onClick={handleAccountAction}
                disabled={actionLoading || (actionModal.type !== "restore" && actionModal.type !== "delete" && !actionReason.trim())}
                variant={actionModal.type === "restore" ? "default" : "destructive"}
                className={`rounded-xl px-6 shadow-md ${actionModal.type === 'restore' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {actionModal.type === "restore" ? "Restore Account" : actionModal.type === "suspend" ? "Suspend Account" : actionModal.type === "delete" ? "Delete Account" : "Block Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Wallet Adjustment Modal */}
        <Dialog open={walletModal.open} onOpenChange={(open) => !open && setWalletModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-[425px] glassmorphism-dialog border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className={`absolute top-0 right-0 w-full h-1 bg-gradient-to-r ${walletModal.type === 'credit' ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'}`} />
            <DialogHeader className="pt-4">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Wallet className="w-6 h-6 text-primary" /> Manage Wallet
              </DialogTitle>
              <DialogDescription className="pt-1">
                Adjust revenue for {walletModal.teacher?.profile?.full_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between border border-border/50">
                <span className="text-sm font-medium text-muted-foreground">Available Balance:</span>
                {walletModal.balance === null ? (
                   <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                   <span className="text-lg font-bold">GH₵ {walletModal.balance.toFixed(2)}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={walletModal.type === 'credit' ? 'default' : 'outline'}
                  onClick={() => setWalletModal(prev => ({ ...prev, type: 'credit' }))}
                  className={`rounded-xl ${walletModal.type === 'credit' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  <TrendingUp className="w-4 h-4 mr-2" /> Credit
                </Button>
                <Button 
                  variant={walletModal.type === 'debit' ? 'default' : 'outline'}
                  onClick={() => setWalletModal(prev => ({ ...prev, type: 'debit' }))}
                  className={`rounded-xl ${walletModal.type === 'debit' ? 'bg-red-600 hover:bg-red-700 text-white border-0' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                >
                  <TrendingDown className="w-4 h-4 mr-2" /> Debit
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Amount (GH₵)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={walletModal.amount} 
                  onChange={(e) => setWalletModal(prev => ({...prev, amount: e.target.value}))}
                  className="rounded-xl h-12 text-lg"
                />
                {walletModal.type === 'debit' && walletModal.balance !== null && Number(walletModal.amount) > walletModal.balance && (
                  <p className="text-xs text-red-500 font-medium mt-1">Warning: Amount exceeds available balance.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reason / Reference</Label>
                <Input 
                  placeholder="e.g. Disputed session #1234, Bonus" 
                  value={walletModal.reason} 
                  onChange={(e) => setWalletModal(prev => ({...prev, reason: e.target.value}))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" className="rounded-xl" onClick={() => setWalletModal(prev => ({ ...prev, open: false }))}>Cancel</Button>
              <Button 
                onClick={handleWalletSubmit} 
                disabled={walletLoading || !walletModal.amount || !walletModal.reason || Number(walletModal.amount) <= 0}
                className="rounded-xl px-6"
              >
                {walletLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm {walletModal.type === 'credit' ? 'Credit' : 'Debit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminDashboardLayout>
  );
}

