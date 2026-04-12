const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminSessions.tsx', 'utf-8');

if (!code.includes('import { motion, AnimatePresence }')) {
  code = code.replace(
    'import { format } from "date-fns";',
    'import { format } from "date-fns";\nimport { motion, AnimatePresence } from "framer-motion";'
  );
}

const startIdx = code.lastIndexOf('  return (');
if (startIdx === -1) {
  console.error("Could not find start index");
  process.exit(1);
}

const beautifulReturn = `  return (
    <AdminDashboardLayout title="Sessions Management" subtitle="Manage and moderate student session requests">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />

        <div className="relative z-10 space-y-8">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Sessions Overview
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Monitor schedule, manage bookings and export records
              </motion.p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">Export Data</span>
              <Button size="sm" variant="outline" disabled={loading || filtered.length === 0 || isExporting} onClick={handleExportPDF} className="h-10 px-3 rounded-xl bg-background/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-colors shadow-sm" title="Export PDF">
                <img src="/pdf-icon.png" alt="PDF" className="w-[24px] h-[24px] mr-2" onError={(e) => e.currentTarget.style.display = 'none'} />
                PDF {isExporting && '...'}
              </Button>
              <Button size="sm" variant="outline" disabled={loading || filtered.length === 0 || isExporting} onClick={handleExportExcel} className="h-10 px-3 rounded-xl bg-background/50 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-500 transition-colors shadow-sm" title="Export Excel">
                <img src="/excel-icon.png" alt="Excel" className="w-[24px] h-[24px] mr-2" onError={(e) => e.currentTarget.style.display = 'none'} />
                Excel
              </Button>
              <Button size="sm" variant="outline" disabled={loading || filtered.length === 0 || isExporting} onClick={handleExportWord} className="h-10 px-3 rounded-xl bg-background/50 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-500 transition-colors shadow-sm" title="Export Word">
                <img src="/word-icon.png" alt="Word" className="w-[24px] h-[24px] mr-2" onError={(e) => e.currentTarget.style.display = 'none'} />
                Word
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject, student or teacher..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10 bg-background/50 border-white/20 focus:border-primary rounded-xl w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[150px] bg-background/50 border-white/20 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glassmorphism-dialog border-white/10 rounded-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input type="date" className="bg-background/50 border-white/20 rounded-xl flex-1" onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }} />
                <span className="text-muted-foreground font-semibold px-1">to</span>
                <Input type="date" className="bg-background/50 border-white/20 rounded-xl flex-1" onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }} />
              </div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm overflow-hidden min-h-[400px]">
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full absolute bg-primary/20 animate-ping" />
                    <Calendar className="w-8 h-8 text-primary relative z-10 animate-bounce" />
                    <p className="mt-4 font-medium animate-pulse">Loading sessions...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <Search className="w-10 h-10 text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-lg font-medium">No sessions found</p>
                    <p className="text-sm mt-1">Try adjusting your search criteria or date filters</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {paged.map((s, i) => (
                        <motion.div 
                          key={s.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-5 border border-border/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-all shadow-sm group"
                        >
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                                {s.session_type === 'online' ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className="font-bold text-lg text-foreground/90 truncate">{s.subject}</p>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-medium mt-1">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" /> {format(new Date(s.session_date), 'MMM d, yyyy')}
                                  </span>
                                  <span className="text-foreground/20">•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> {s.start_time.slice(0,5)}
                                  </span>
                                  <span className="text-foreground/20">•</span>
                                  <span className="uppercase tracking-wider text-xs font-bold pt-0.5">
                                    {s.session_type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4 pt-2 pl-[3.25rem]">
                              <div className="flex items-center gap-1.5 text-sm bg-muted/40 px-2 py-1 rounded-md">
                                <User className="w-3.5 h-3.5 text-blue-500" />
                                <span className="font-semibold text-foreground/80">Student:</span> 
                                <span className="text-muted-foreground">{s.student?.full_name || s.student_id}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm bg-muted/40 px-2 py-1 rounded-md">
                                <User className="w-3.5 h-3.5 text-purple-500" />
                                <span className="font-semibold text-foreground/80">Teacher:</span> 
                                <span className="text-muted-foreground">{s.teacher?.full_name || s.teacher_id}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 pl-[3.25rem] md:pl-0">
                            <Badge className={\`px-3 py-1 text-sm font-semibold \${
                              s.status === 'confirmed' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                              s.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' :
                              s.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' :
                              'bg-destructive/10 text-destructive border-destructive/20'
                            }\`}>
                              {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                            </Badge>

                            <Select value={s.status} onValueChange={(v) => handleChangeStatus(s.id, v)}>
                              <SelectTrigger className="w-[140px] bg-background/50 rounded-xl h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="glassmorphism-dialog rounded-xl">
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => setSelectedSession(s)} className="h-9 w-9 rounded-lg bg-background/50 hover:bg-primary/10 hover:text-primary transition-colors">
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(s.id)} className="h-9 w-9 rounded-lg bg-background/50 hover:bg-destructive/10 hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border/50">
                      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Showing <span className="text-foreground">{Math.min((page-1)*pageSize+1, filtered.length)}</span> to <span className="text-foreground">{Math.min(page*pageSize, filtered.length)}</span> of <span className="text-foreground">{filtered.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="rounded-xl px-4 hover:bg-primary/10 hover:text-primary border-white/20">Prev</Button>
                        <div className="text-sm font-semibold px-3 py-1 rounded-lg bg-muted text-foreground">Page {page} of {totalPages}</div>
                        <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="rounded-xl px-4 hover:bg-primary/10 hover:text-primary border-white/20">Next</Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* View Modal */}
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="glassmorphism-dialog border-white/10 rounded-2xl overflow-hidden max-w-lg shadow-2xl">
            <DialogHeader className="bg-muted/30 p-6 border-b border-border/50">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Session Details
              </DialogTitle>
              <DialogDescription />
            </DialogHeader>
            {selectedSession && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground/90">{selectedSession.subject}</h3>
                  <p className="text-sm font-medium text-primary mt-1">
                    {format(new Date(selectedSession.session_date), 'MMMM d, yyyy')} at {selectedSession.start_time.slice(0,5)}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Student</p>
                    <p className="font-bold text-foreground/90 truncate">{selectedSession.student?.full_name || selectedSession.student_id}</p>
                    <p className="text-sm text-foreground/60 truncate" title={selectedSession.student?.email}>{selectedSession.student?.email}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Teacher</p>
                    <p className="font-bold text-foreground/90 truncate">{selectedSession.teacher?.full_name || selectedSession.teacher_id}</p>
                    <p className="text-sm text-foreground/60 truncate" title={selectedSession.teacher?.email}>{selectedSession.teacher?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
                   <div>
                     <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Type</p>
                     <p className="font-medium flex items-center gap-1.5 mt-1">
                       {selectedSession.session_type === 'online' ? <Video className="w-4 h-4 text-purple-500" /> : <MapPin className="w-4 h-4 text-emerald-500" />}
                       <span className="capitalize">{selectedSession.session_type}</span>
                     </p>
                   </div>
                   <div>
                     <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Status</p>
                     <p className="font-medium mt-1 capitalize">{selectedSession.status}</p>
                   </div>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <Button onClick={() => setSelectedSession(null)} className="rounded-xl px-6">Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTargetId} onOpenChange={() => !isDeleting && setDeleteTargetId(null)}>
          <AlertDialogContent className="glassmorphism-dialog border-white/10 rounded-2xl">
            <AlertDialogHeader className="mb-2">
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Delete session?
              </AlertDialogTitle>
              <DialogDescription>
                This action cannot be undone. Are you sure you want to permanently delete this session from the records?
              </DialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-md" onClick={() => deleteTargetId && handleDelete(deleteTargetId)} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Yes, Delete Session'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminDashboardLayout>
  );
}`;

code = code.substring(0, startIdx) + beautifulReturn;
fs.writeFileSync('src/pages/admin/AdminSessions.tsx', code);
console.log('done updating Sessions');
