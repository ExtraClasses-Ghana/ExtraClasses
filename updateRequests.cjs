const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminRequests.tsx', 'utf-8');

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
    <AdminDashboardLayout title="Requests" subtitle="Manage user contact messages and inquiries">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />

        <div className="relative z-10 space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30 relative">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  {messages.filter(m => m.status === 'unread').length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                  )}
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  User Requests
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Manage contact messages and inquiries from users
              </motion.p>
            </div>
            
            <div className="flex bg-muted/50 p-3 rounded-xl border border-white/10">
              <div className="px-4 border-r border-border/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-foreground/90">{messages.length}</p>
              </div>
              <div className="px-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unread</p>
                <p className="text-xl font-bold text-destructive">{messages.filter(m => m.status === 'unread').length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Messages List */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.2 }}
              className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2"
            >
              {messages.length === 0 ? (
                <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm h-64">
                  <CardContent className="flex flex-col items-center justify-center h-full">
                    <MessageSquare className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground/80 mb-1">No messages yet</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Messages from the contact form will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <AnimatePresence>
                  {messages.map((message, i) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card
                        className={\`cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md border-white/20 shadow-sm \${
                          selectedMessage?.id === message.id 
                            ? 'bg-primary/5 dark:bg-primary/10 ring-2 ring-primary border-primary/30 transform scale-[1.02]' 
                            : 'bg-white/40 dark:bg-black/20 backdrop-blur-xl hover:bg-white/60 dark:hover:bg-white/5'
                        }\`}
                        onClick={() => setSelectedMessage(message)}
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0 pr-3">
                              <h3 className={\`font-bold truncate text-lg \${message.status === 'unread' ? 'text-foreground' : 'text-foreground/80'}\`}>
                                {message.name}
                              </h3>
                              <a
                                href={\`mailto:\${message.email}\`}
                                className="text-xs text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1.5 mt-1 bg-primary/10 px-2 py-0.5 rounded-md truncate max-w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {message.email}
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-2">
                              {getStatusBadge(message.status)}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                {getStatusIcon(message.status)}
                                {format(new Date(message.created_at), 'MMM dd')}
                              </div>
                            </div>
                          </div>
                          <h4 className="font-semibold text-sm text-foreground/90 mb-2">{message.subject}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {message.message}
                          </p>
                          {message.category && (
                            <Badge variant="outline" className="mt-3 text-[10px] uppercase tracking-wider font-bold border-white/20 bg-background/50">
                              {message.category}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </motion.div>

            {/* Message Details */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              {selectedMessage ? (
                <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-lg sticky top-6 h-fit max-h-[800px] flex flex-col overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30 p-6 flex-shrink-0">
                    <CardTitle className="flex items-center justify-between text-xl">
                      <span className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Message Details
                      </span>
                      {getStatusBadge(selectedMessage.status)}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-6 p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-sm">
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">From</Label>
                        <p className="font-bold text-base mt-1 text-foreground/90">{selectedMessage.name}</p>
                        <a
                          href={\`mailto:\${selectedMessage.email}\`}
                          className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1.5 mt-1"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {selectedMessage.email}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-sm flex flex-col justify-center">
                         <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Received</Label>
                         <p className="text-sm font-semibold mt-1">
                           {format(new Date(selectedMessage.created_at), 'PPP')}
                         </p>
                         <p className="text-xs text-muted-foreground mt-0.5">
                           {format(new Date(selectedMessage.created_at), 'p')}
                         </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground ml-1">Subject</Label>
                        <div className="mt-1 p-3 bg-muted/40 border border-white/10 rounded-xl">
                          <p className="font-semibold text-foreground/90">{selectedMessage.subject}</p>
                        </div>
                      </div>

                      {selectedMessage.category && (
                        <div>
                          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground ml-1">Category</Label>
                          <div className="mt-1">
                            <Badge className="bg-primary/10 text-primary border-primary/20">{selectedMessage.category}</Badge>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground ml-1">Message</Label>
                        <div className="mt-1 p-4 sm:p-6 bg-white/5 border border-white/10 shadow-inner rounded-xl">
                          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-foreground/90">{selectedMessage.message}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-border/50">
                      <Label htmlFor="admin-notes" className="text-sm font-bold flex items-center gap-2 text-foreground/80">
                        <MessageSquare className="w-4 h-4" />
                        Admin Notes
                      </Label>
                      <Textarea
                        id="admin-notes"
                        placeholder="Add notes about this investigation, resolution, or follow-up action..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={4}
                        className="bg-background/50 border-white/20 focus:border-primary rounded-xl resize-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 pt-4">
                      {selectedMessage.status !== 'read' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMessageStatus(selectedMessage.id, 'read')}
                          disabled={updating}
                          className="rounded-xl flex-1 sm:flex-none border-white/20 bg-background/50 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Mark as Read
                        </Button>
                      )}

                      {selectedMessage.status !== 'responded' && (
                        <Button
                          size="sm"
                          onClick={() => updateMessageStatus(selectedMessage.id, 'responded')}
                          disabled={updating}
                          className="rounded-xl flex-1 sm:flex-none bg-green-600 hover:bg-green-700 shadow-md"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Responded
                        </Button>
                      )}

                      {selectedMessage.status !== 'archived' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMessageStatus(selectedMessage.id, 'archived')}
                          disabled={updating}
                          className="rounded-xl flex-1 sm:flex-none border-white/20 bg-background/50 hover:bg-secondary/10 transition-colors"
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Archive Thread
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl flex-1 sm:flex-none ml-auto text-destructive border-white/20 bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                        onClick={() => setDeleteConfirmId(selectedMessage.id)}
                        disabled={updating || deletingId === selectedMessage.id}
                      >
                        {deletingId === selectedMessage.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Delete Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm h-full min-h-[400px]">
                  <CardContent className="flex flex-col items-center justify-center py-20 h-full text-center">
                    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6 ring-1 ring-white/10">
                      <MessageSquare className="w-10 h-10 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground/80 mb-2">Select a message</h3>
                    <p className="text-muted-foreground max-w-md">
                      Click on any message from the list to view its full contents, add notes, and manage its status.
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="glassmorphism-dialog border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete message?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user contact message and all associated admin notes. This action cannot be undone. Are you absolutely sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={!!deletingId} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-md"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMessage(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              disabled={!!deletingId}
            >
              Yes, Delete Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  );
}`;

code = code.substring(0, startIdx) + beautifulReturn;
fs.writeFileSync('src/pages/admin/AdminRequests.tsx', code);
console.log('done updating Requests');
