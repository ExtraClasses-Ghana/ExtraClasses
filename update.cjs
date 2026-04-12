const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminStudents.tsx', 'utf-8');

// Add imports
code = code.replace(
  'import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } from "docx";',
  'import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } from "docx";\nimport { motion, AnimatePresence } from "framer-motion";\nimport { Loader2 } from "lucide-react";'
);

// We need to replace the exact return block
const startIdx = code.indexOf('  return (\n    <AdminDashboardLayout');

const beautifulReturn = `  return (
    <AdminDashboardLayout
      title="All Students"
      subtitle="View authenticated students in realtime and manage accounts"
    >
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />

        <div className="relative z-10 space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm h-full">
                <CardHeader className="border-b border-border/50 bg-muted/20">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Student Registration Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {registrationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={registrationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" opacity={0.1} />
                        <XAxis dataKey="month" stroke="#8884d8" />
                        <YAxis stroke="#8884d8" />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '8px', border: 'none', color: '#fff' }} />
                        <Bar dataKey="registrations" fill="currentColor" className="text-primary" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No registration data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="h-full">
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm h-full">
                <CardHeader className="border-b border-border/50 bg-muted/20">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Recent Registrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {recentRegistrations.length > 0 ? (
                    <div className="space-y-4">
                      {recentRegistrations.slice(0, 5).map((student, i) => (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + (i * 0.1) }} key={student.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                          <button onClick={() => setImageModalUrl(student.profile?.avatar_url || null)} className="rounded-full overflow-hidden p-0 ring-2 ring-primary/20 hover:ring-primary transition-all">
                            <Avatar className="w-10 h-10 cursor-pointer">
                              <AvatarImage src={student.profile?.avatar_url || ""} />
                              <AvatarFallback className="bg-primary/20 text-primary font-bold">{student.profile?.full_name?.charAt(0) || "S"}</AvatarFallback>
                            </Avatar>
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-foreground/90">{student.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(student.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      {recentRegistrations.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center mt-4 bg-muted/30 p-2 rounded-lg">
                          +{recentRegistrations.length - 5} more registrations
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent registrations</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{students.length}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center ring-1 ring-green-500/30">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {students.filter(s => s.profile?.status === "active").length}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center ring-1 ring-amber-500/30">
                      <AlertTriangle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {students.filter(s => s.profile?.status === "suspended").length}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suspended</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center ring-1 ring-red-500/30">
                      <Ban className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {students.filter(s => s.profile?.status === "blocked").length}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blocked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
                      <UserPlus className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {students.filter(s => s.profile?.status === "pending" || !s.profile?.status).length}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending</p>
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
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-white/20 focus:border-primary rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              className="w-full md:w-auto bg-background/50 border-white/20 hover:bg-primary/10 rounded-xl shadow-sm"
              onClick={() => {
                setLoading(true);
                fetchStudents();
                fetchRegistrationAnalytics();
              }}
              disabled={loading}
            >
              <RefreshCw className={\`w-4 h-4 mr-2 \${loading ? 'animate-spin text-primary' : ''}\`} />
              {loading ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/30">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle>Authenticated Students ({filteredStudents.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">Export</span>
                    <Button size="sm" variant="outline" disabled={loading || filteredStudents.length === 0} onClick={() => handleExportPDF()} className="h-9 w-9 p-0 rounded-lg bg-background/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-colors" title="Export PDF">
                      <img src="/pdf-icon.png" alt="PDF" className="w-[20px] h-[20px]" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </Button>
                    <Button size="sm" variant="outline" disabled={loading || filteredStudents.length === 0} onClick={() => handleExportExcel()} className="h-9 w-9 p-0 rounded-lg bg-background/50 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-500 transition-colors" title="Export Excel">
                      <img src="/excel-icon.png" alt="Excel" className="w-[20px] h-[20px]" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </Button>
                    <Button size="sm" variant="outline" disabled={loading || filteredStudents.length === 0} onClick={() => handleExportWord()} className="h-9 w-9 p-0 rounded-lg bg-background/50 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-500 transition-colors" title="Export Word">
                      <img src="/word-icon.png" alt="Word" className="w-[20px] h-[20px]" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-primary opacity-50" />
                    </div>
                    <p className="text-lg font-medium">No students found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border/50">
                        <tr>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Student</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Region</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Sessions</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Total Spent</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Status</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Joined</th>
                          <th className="text-right py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {filteredStudents.map((student, i) => (
                            <motion.tr 
                              key={student.user_id} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ delay: i * 0.02 }}
                              className="group border-b border-border/40 hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
                            >
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <button onClick={() => setImageModalUrl(student.profile?.avatar_url || null)} className="rounded-full overflow-hidden p-0 ring-2 ring-primary/10 group-hover:ring-primary/40 transition-all">
                                    <Avatar className="w-10 h-10 cursor-pointer">
                                      <AvatarImage src={student.profile?.avatar_url || ""} />
                                      <AvatarFallback className="bg-primary/20 text-primary font-bold">{student.profile?.full_name?.charAt(0) || "S"}</AvatarFallback>
                                    </Avatar>
                                  </button>
                                  <div>
                                    <p className="font-semibold text-foreground/90">{student.profile?.full_name || "Anonymous User"}</p>
                                    <p className="text-xs text-muted-foreground">{student.profile?.email}</p>
                                    {student.profile?.phone && (
                                      <p className="text-xs text-muted-foreground">{student.profile.phone}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-sm text-muted-foreground font-medium">
                                {student.profile?.region || "-"}
                              </td>
                              <td className="py-4 px-6">
                                <div className="inline-flex items-center justify-center min-w-[2rem] h-8 rounded-md bg-muted/50 text-foreground font-semibold px-2">
                                  {student.sessionCount}
                                </div>
                              </td>
                              <td className="py-4 px-6 font-medium text-primary">
                                GH₵{student.totalSpent.toLocaleString()}
                              </td>
                              <td className="py-4 px-6">
                                {getAccountStatusBadge(student.profile?.status)}
                              </td>
                              <td className="py-4 px-6 text-sm text-muted-foreground font-medium">
                                {new Date(student.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-50 text-base group-hover:opacity-100 transition-opacity">
                                  {student.profile?.email && (
                                    <Button variant="ghost" size="icon" asChild title="Email student" className="h-9 w-9 rounded-lg bg-background/50 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30">
                                      <a href={\`mailto:\${student.profile.email}\`}>
                                        <Mail className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  )}
                                  {student.profile?.status === "blocked" || student.profile?.status === "suspended" ? (
                                    <Button variant="ghost" size="icon" onClick={() => setActionModal({ open: true, type: "restore", student })} className="h-9 w-9 rounded-lg bg-background/50 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30" title="Restore Account">
                                      <RotateCcw className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="icon" onClick={() => setActionModal({ open: true, type: "suspend", student })} className="h-9 w-9 rounded-lg bg-background/50 hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30" title="Suspend Account">
                                        <AlertTriangle className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => setActionModal({ open: true, type: "block", student })} className="h-9 w-9 rounded-lg bg-background/50 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30" title="Block Account">
                                        <Ban className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                  <Button variant="ghost" size="icon" onClick={() => setActionModal({ open: true, type: "delete", student })} className="h-9 w-9 rounded-lg bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" title="Delete Data">
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
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Dialog open={actionModal.open} onOpenChange={(open) => { if (!open) { setActionModal({ open: false, type: null, student: null }); setActionReason(""); }}}>
          <DialogContent className="glassmorphism-dialog border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {actionModal.type === "restore" && <RotateCcw className="w-5 h-5 text-green-500" />}
                {actionModal.type === "suspend" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {actionModal.type === "delete" && <Trash2 className="w-5 h-5 text-destructive" />}
                {actionModal.type === "block" && <Ban className="w-5 h-5 text-red-500" />}
                {actionModal.type === "restore" ? "Restore Account" : actionModal.type === "suspend" ? "Suspend Account" : actionModal.type === "delete" ? "Delete Account" : "Block Account"}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {actionModal.type === "restore" && \`Are you sure you want to restore \${actionModal.student?.profile?.full_name}'s account? They will regain full access to the platform.\`}
                {actionModal.type === "suspend" && \`Are you sure you want to temporarily suspend \${actionModal.student?.profile?.full_name}'s account?\`}
                {actionModal.type === "delete" && \`Are you sure you want to completely delete \${actionModal.student?.profile?.full_name}'s account? This action cannot be undone and will remove all their data from the platform.\`}
                {actionModal.type === "block" && \`Are you sure you want to permanently block \${actionModal.student?.profile?.full_name}'s account?\`}
              </DialogDescription>
            </DialogHeader>

            {actionModal.type !== "restore" && actionModal.type !== "delete" && (
              <div className="my-4">
                <Label htmlFor="reason" className="font-semibold text-foreground/80">Reason (Optional)</Label>
                <Textarea id="reason" placeholder={\`Reason for \${actionModal.type}ing account...\`} value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="mt-2 bg-background/50 border-white/20 focus:border-primary rounded-xl resize-none" rows={3} />
              </div>
            )}

            <DialogFooter className="mt-6 pt-6 border-t border-border/50">
              <Button variant="ghost" onClick={() => setActionModal({ open: false, type: null, student: null })} className="rounded-xl px-6">Cancel</Button>
              <Button onClick={handleAccountAction} disabled={actionLoading} variant={actionModal.type === "restore" ? "default" : "destructive"} className="rounded-xl px-6 font-semibold shadow-md">
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {actionLoading ? "Processing..." : actionModal.type === "restore" ? "Restore Account" : actionModal.type === "suspend" ? "Suspend Account" : actionModal.type === "delete" ? "Delete Account" : "Block Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!imageModalUrl} onOpenChange={(open) => { if (!open) setImageModalUrl(null); }}>
          <DialogContent className="glassmorphism-dialog border-white/10 rounded-2xl overflow-hidden p-0 max-w-3xl">
            <DialogHeader className="p-6 border-b border-border/50 bg-background/40">
              <DialogTitle className="text-xl font-bold">Profile Image</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm min-h-[300px]">
              {imageModalUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageModalUrl} alt="Profile" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xl" />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <Users className="w-12 h-12 opacity-30 mb-2" />
                  No image available
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminDashboardLayout>
  );
}
`;

code = code.substring(0, startIdx) + beautifulReturn;
fs.writeFileSync('src/pages/admin/AdminStudents.tsx', code);
console.log('done');
