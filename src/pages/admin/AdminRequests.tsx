import { useState, useEffect } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  Archive,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  category: string | null;
  message: string;
  status: 'unread' | 'read' | 'responded' | 'archived';
  admin_notes: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminRequests() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_messages'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchMessages(); // Refetch messages when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: ContactMessage['status']) => {
    setUpdating(true);
    try {
      const updateData: {
        status: ContactMessage['status'];
        updated_at: string;
        admin_notes?: string;
        responded_at?: string;
      } = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'responded') {
        updateData.admin_notes = adminNotes;
        updateData.responded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('contact_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) throw error;

      toast.success(`Message marked as ${status}`);
      setSelectedMessage(null);
      setAdminNotes("");
      // fetchMessages(); // Removed - real-time subscription will handle updates
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: ContactMessage['status']) => {
    const variants = {
      unread: { variant: "destructive" as const, label: "Unread" },
      read: { variant: "default" as const, label: "Read" },
      responded: { variant: "secondary" as const, label: "Responded" },
      archived: { variant: "outline" as const, label: "Archived" }
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: ContactMessage['status']) => {
    switch (status) {
      case 'unread':
        return <Mail className="w-4 h-4" />;
      case 'read':
        return <Eye className="w-4 h-4" />;
      case 'responded':
        return <CheckCircle className="w-4 h-4" />;
      case 'archived':
        return <Archive className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <AdminDashboardLayout title="Requests" subtitle="Loading user requests...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout title="Requests" subtitle="Manage user contact messages and inquiries">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Requests</h1>
            <p className="text-muted-foreground">
              Manage contact messages and inquiries from users
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Total: {messages.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Unread: {messages.filter(m => m.status === 'unread').length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-2 space-y-4">
            {messages.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                  <p className="text-muted-foreground text-center">
                    User messages from the contact form will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              messages.map((message) => (
                <Card
                  key={message.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedMessage?.id === message.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{message.name}</h3>
                          {getStatusBadge(message.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{message.email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {getStatusIcon(message.status)}
                        <Clock className="w-3 h-3" />
                        {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                    <h4 className="font-medium mb-1">{message.subject}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.message}
                    </p>
                    {message.category && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {message.category}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Message Details */}
          <div className="space-y-4">
            {selectedMessage ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Message Details
                    {getStatusBadge(selectedMessage.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">From</Label>
                    <p className="text-sm">{selectedMessage.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedMessage.email}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Subject</Label>
                    <p className="text-sm">{selectedMessage.subject}</p>
                  </div>

                  {selectedMessage.category && (
                    <div>
                      <Label className="text-sm font-medium">Category</Label>
                      <p className="text-sm">{selectedMessage.category}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium">Message</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Received</Label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedMessage.created_at), 'PPP p')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-notes">Admin Notes</Label>
                    <Textarea
                      id="admin-notes"
                      placeholder="Add notes about this message..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedMessage.status !== 'read' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateMessageStatus(selectedMessage.id, 'read')}
                        disabled={updating}
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
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a message</h3>
                  <p className="text-muted-foreground text-center">
                    Click on any message to view details and manage it
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}