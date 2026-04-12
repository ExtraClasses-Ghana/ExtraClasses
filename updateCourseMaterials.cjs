const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminCourseMaterials.tsx', 'utf-8');

if (!code.includes('import { motion, AnimatePresence }')) {
  code = code.replace(
    'import { useToast } from "@/hooks/use-toast";',
    'import { useToast } from "@/hooks/use-toast";\nimport { motion, AnimatePresence } from "framer-motion";'
  );
}

const startIdx = code.indexOf('  return (\n    <AdminDashboardLayout');
if (startIdx === -1) {
  console.error("Could not find start index");
  process.exit(1);
}

const beautifulReturn = `  return (
    <AdminDashboardLayout title="Course Materials" subtitle="Manage study materials and videos">
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
                <div className="p-3 rounded-xl bg-primary/20 ring-1 ring-primary/30">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Course Materials
                </h2>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground ml-16"
              >
                Manage study materials and videos
              </motion.p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-lg hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Material
                </Button>
              </DialogTrigger>
              <DialogContent className="glassmorphism-dialog border-white/10 rounded-2xl overflow-hidden shadow-2xl max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">
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
                      className="bg-background/50 border-white/20 focus:border-primary rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="bg-background/50 border-white/20 focus:border-primary rounded-xl resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="bg-background/50 border-white/20 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-white/10 glassmorphism-dialog">
                          <SelectItem value="PDF">PDF</SelectItem>
                          <SelectItem value="Video">Video</SelectItem>
                          <SelectItem value="Document">Document</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Level</Label>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger className="bg-background/50 border-white/20 rounded-xl">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-white/10 glassmorphism-dialog">
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
                      <SelectTrigger className="bg-background/50 border-white/20 rounded-xl">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-white/10 glassmorphism-dialog max-h-[200px]">
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
                      className="bg-background/50 border-white/20 focus:border-primary rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isFree"
                        checked={isFree}
                        onCheckedChange={setIsFree}
                      />
                      <Label htmlFor="isFree" className="cursor-pointer">Free Material</Label>
                    </div>

                    {!isFree && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="price">Price (GH₵)</Label>
                        <Input
                          id="price"
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-24 bg-background/50 border-white/20 focus:border-primary rounded-xl"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-border/50">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      className="flex-1 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 rounded-xl shadow-md" disabled={uploading}>
                      {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingMaterial ? "Update" : "Add Material"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30 shrink-0">
                      <FileText className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-3xl font-bold text-foreground/90">{materials.filter(m => m.type === "PDF").length}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">PDF Docs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="p-3 rounded-xl bg-purple-500/20 ring-1 ring-purple-500/30 shrink-0">
                      <Video className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-3xl font-bold text-foreground/90">{materials.filter(m => m.type === "Video").length}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Videos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="p-3 rounded-xl bg-green-500/20 ring-1 ring-green-500/30 shrink-0">
                      <Download className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-3xl font-bold text-foreground/90">
                        {materials.reduce((sum, m) => sum + m.downloads, 0).toLocaleString()}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Downloads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
              <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.02] transition-transform h-full">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/30 shrink-0">
                      <Star className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-3xl font-bold text-foreground/90">{materials.filter(m => m.is_free).length}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Free Items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/30">
                <CardTitle>All Materials</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-primary opacity-50" />
                    </div>
                    <p className="text-lg font-medium">No materials found</p>
                    <p className="text-sm text-muted-foreground mt-1">Add your first material to get started</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border/50">
                        <tr>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Title</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Type</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Subject</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Level</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Price</th>
                          <th className="text-center py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Downloads</th>
                          <th className="text-center py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Active</th>
                          <th className="text-right py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {materials.map((material, i) => (
                            <motion.tr 
                              key={material.id} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ delay: i * 0.03 }}
                              className="group border-b border-border/40 hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
                            >
                              <td className="py-4 px-6 font-medium text-foreground/90 max-w-[200px] truncate">
                                {material.title}
                              </td>
                              <td className="py-4 px-6">
                                <Badge variant="outline" className={\`border-white/20 \${material.type === "Video" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}\`}>
                                  {material.type === "Video" ? (
                                    <Video className="w-3 h-3 mr-1" />
                                  ) : (
                                    <FileText className="w-3 h-3 mr-1" />
                                  )}
                                  {material.type}
                                </Badge>
                              </td>
                              <td className="py-4 px-6 text-sm text-foreground/80">{getSubjectName(material.subject_id)}</td>
                              <td className="py-4 px-6 text-sm text-muted-foreground">{material.level || "—"}</td>
                              <td className="py-4 px-6 font-medium">
                                {material.is_free ? (
                                  <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-none hover:bg-green-500/30">Free</Badge>
                                ) : (
                                  <span className="text-primary font-bold">GH₵{material.price}</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-center text-sm font-semibold text-foreground/80">
                                {material.downloads.toLocaleString()}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <Switch
                                  checked={material.is_active}
                                  onCheckedChange={() => toggleActive(material.id, material.is_active)}
                                  className="mx-auto"
                                />
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(material)} className="h-9 w-9 rounded-lg bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30" title="Edit Material">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(material.id)} className="h-9 w-9 rounded-lg bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" title="Delete Material">
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
      </div>
    </AdminDashboardLayout>
  );
}`;

code = code.substring(0, startIdx) + beautifulReturn;
fs.writeFileSync('src/pages/admin/AdminCourseMaterials.tsx', code);
console.log('done updating Course Materials');
