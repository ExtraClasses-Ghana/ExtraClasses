import { useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdminStudents, useStudentActions, AdminStudent } from "@/hooks/useStudentActions";
import { toast } from "sonner";
import {
  MessageSquare,
  Ban,
  Pause,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
} from "lucide-react";

export default function AdminStudentsManagement() {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const { students, loading, error } = useAdminStudents(100, 0, filterStatus);
  const {
    suspendStudent,
    unsuspendStudent,
    blockStudent,
    unblockStudent,
    deleteStudent,
    messageStudent,
    loading: actionLoading,
    error: actionError,
  } = useStudentActions();

  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [actionType, setActionType] = useState<
    "message" | "suspend" | "block" | "delete" | "unsuspend" | "unblock" | null
  >(null);
  const [actionReason, setActionReason] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  const handleAction = async () => {
    if (!selectedStudent) return;

    let result;
    switch (actionType) {
      case "message":
        result = await messageStudent(selectedStudent.user_id, actionReason);
        break;
      case "suspend":
        result = await suspendStudent(selectedStudent.user_id, actionReason);
        break;
      case "unsuspend":
        result = await unsuspendStudent(selectedStudent.user_id);
        break;
      case "block":
        result = await blockStudent(selectedStudent.user_id, actionReason);
        break;
      case "unblock":
        result = await unblockStudent(selectedStudent.user_id);
        break;
      case "delete":
        result = await deleteStudent(selectedStudent.user_id, actionReason);
        break;
    }

    if (result?.success) {
      setShowDialog(false);
      setActionReason("");
      setSelectedStudent(null);
      setActionType(null);
      // Re-fetch students or update local state
      window.location.reload();
    }
  };

  const handleOpenDialog = (
    student: AdminStudent,
    type: "message" | "suspend" | "block" | "delete" | "unsuspend" | "unblock"
  ) => {
    setSelectedStudent(student);
    setActionType(type);
    setShowDialog(true);
  };

  const getStatusBadge = (student: AdminStudent) => {
    if (student.is_blocked) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
          <Ban className="w-3 h-3" /> Blocked
        </span>
      );
    }
    if (student.is_suspended) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
          <Pause className="w-3 h-3" /> Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
        <CheckCircle className="w-3 h-3" /> Active
      </span>
    );
  };

  const getDialogTitle = () => {
    switch (actionType) {
      case "message":
        return "Send Message to Student";
      case "suspend":
        return "Suspend Student Account";
      case "unsuspend":
        return "Unsuspend Student Account";
      case "block":
        return "Block Student Account";
      case "unblock":
        return "Unblock Student Account";
      case "delete":
        return "Delete Student Account";
      default:
        return "";
    }
  };

  const getDialogDescription = () => {
    switch (actionType) {
      case "message":
        return "Send a message to this student. Enter your message below.";
      case "suspend":
        return "This will suspend the student's account. They will not be able to book sessions.";
      case "unsuspend":
        return "This will restore the student's account access.";
      case "block":
        return "This will block the student permanently. They will not be able to access the platform.";
      case "unblock":
        return "This will remove the block from the student's account.";
      case "delete":
        return "This will permanently delete the student's account and all associated data.";
      default:
        return "";
    }
  };

  const handleExportPDF = async () => {
    try {
      // Simple CSV export for now
      const csvData = students.map(student => ({
        Name: student.full_name,
        Email: student.email,
        EducationLevel: student.education_level || '',
        Status: student.is_blocked ? 'Blocked' : student.is_suspended ? 'Suspended' : 'Active',
        TotalSessions: student.total_sessions,
        TotalSpent: student.total_spent,
        LastActive: student.last_active ? new Date(student.last_active).toLocaleDateString() : 'Never'
      }));
      
      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Success', { description: 'Students exported as CSV' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export Failed', { description: 'Failed to export students' });
    }
  };

  const handleExportExcel = async () => {
    // For now, same as PDF
    await handleExportPDF();
  };

  const handleExportWord = async () => {
    // For now, same as PDF
    await handleExportPDF();
  };

  return (
    <AdminDashboardLayout title="Student Management" subtitle="Manage student accounts and actions">
      {/* Errors */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Error loading students</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Action failed</p>
          <p className="text-sm">{actionError.message}</p>
        </div>
      )}

      {/* Filter Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterStatus || ""} onValueChange={(value) => setFilterStatus(value || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Students</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-foreground">{students.length}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-lg">Students</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Export:</span>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || students.length === 0}
                onClick={() => handleExportPDF()}
                className="gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md p-2"
              >
                <img src="/pdf-icon.png" alt="PDF" className="w-[50px] h-[50px]" />
                PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || students.length === 0}
                onClick={() => handleExportExcel()}
                className="gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md p-2"
              >
                <img src="/excel-icon.png" alt="Excel" className="w-[50px] h-[50px]" />
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || students.length === 0}
                onClick={() => handleExportWord()}
                className="gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md p-2"
              >
                <img src="/word-icon.png" alt="Word" className="w-[50px] h-[50px]" />
                Word
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Education Level</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Sessions</th>
                    <th className="text-right py-3 px-4">Spent</th>
                    <th className="text-left py-3 px-4">Last Active</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.user_id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{student.full_name}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{student.email}</td>
                      <td className="py-3 px-4 text-sm">{student.education_level || "N/A"}</td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(student)}</td>
                      <td className="py-3 px-4 text-right text-sm">{student.total_sessions}</td>
                      <td className="py-3 px-4 text-right text-sm">
                        GH₵{student.total_spent.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {student.last_active ? new Date(student.last_active).toLocaleDateString() : "Never"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end flex-wrap">
                          <button
                            onClick={() => handleOpenDialog(student, "message")}
                            disabled={actionLoading}
                            className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors disabled:opacity-50"
                            title="Message"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {!student.is_suspended ? (
                            <button
                              onClick={() => handleOpenDialog(student, "suspend")}
                              disabled={actionLoading}
                              className="p-1 hover:bg-yellow-100 text-yellow-600 rounded transition-colors disabled:opacity-50"
                              title="Suspend"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenDialog(student, "unsuspend")}
                              disabled={actionLoading}
                              className="p-1 hover:bg-green-100 text-green-600 rounded transition-colors disabled:opacity-50"
                              title="Unsuspend"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {!student.is_blocked ? (
                            <button
                              onClick={() => handleOpenDialog(student, "block")}
                              disabled={actionLoading}
                              className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50"
                              title="Block"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenDialog(student, "unblock")}
                              disabled={actionLoading}
                              className="p-1 hover:bg-green-100 text-green-600 rounded transition-colors disabled:opacity-50"
                              title="Unblock"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenDialog(student, "delete")}
                            disabled={actionLoading}
                            className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDialogTitle()}</AlertDialogTitle>
            <AlertDialogDescription>{getDialogDescription()}</AlertDialogDescription>
          </AlertDialogHeader>

          {selectedStudent && (
            <div className="py-4">
              <p className="text-sm font-medium mb-1">Student: {selectedStudent.full_name}</p>
              <p className="text-sm text-muted-foreground mb-4">{selectedStudent.email}</p>

              {["message", "suspend", "block", "delete"].includes(actionType || "") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {actionType === "message" ? "Message" : "Reason"}
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={
                      actionType === "message"
                        ? "Enter your message..."
                        : "Enter reason for this action..."
                    }
                    className="w-full p-2 border rounded text-sm min-h-24"
                  />
                </div>
              )}

              {actionType === "delete" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 mt-4">
                  <p className="font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Warning: This action cannot be undone!
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={actionLoading}
              className={actionType === "delete" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {actionLoading ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  );
}
