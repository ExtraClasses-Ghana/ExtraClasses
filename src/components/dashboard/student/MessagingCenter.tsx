import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  Search,
  UserPlus,
  Loader2,
  Wifi,
  WifiOff
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatWindow } from "@/components/dashboard/ChatWindow";
import { CallModal } from "@/components/dashboard/CallModal";
import { ChatSettingsModal } from "@/components/dashboard/ChatSettingsModal";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  isTyping: boolean;
}

interface TeacherSearchResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  subjects: string[];
}

const EMOJI_LIST = [
  "😀", "😂", "😊", "😍", "🤩", "😎", "🤗", "🤔", "😅", "😢",
  "😡", "👍", "👎", "❤️", "🔥", "⭐", "🎉", "💯", "🙏", "👋",
  "✅", "📚", "✏️", "📝", "🎓", "💡", "⏰", "📅", "🏆", "👏"
];

export function MessagingCenter() {
  const { user, role } = useAuth();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingStatus, setTypingStatus] = useState<{ [key: string]: boolean }>({});
  const [onlineStatus, setOnlineStatus] = useState<{ [key: string]: boolean }>({});
  const [blockedByMe, setBlockedByMe] = useState<Set<string>>(new Set());
  const [blockedByThem, setBlockedByThem] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Call and settings state
  const [showCallModal, setShowCallModal] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video">("voice");

  // Teacher search state
  const [showTeacherSearch, setShowTeacherSearch] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [teacherResults, setTeacherResults] = useState<TeacherSearchResult[]>([]);
  const [searchingTeachers, setSearchingTeachers] = useState(false);

  useEffect(() => {
    if (user) {
      // Set user online status
      updateUserOnlineStatus(true);
      fetchConversations();
      fetchBlockedUsers();
      
      // Setup all subscriptions
      const cleanups = [
        subscribeToMessages(),
        subscribeToTyping(),
        subscribeToOnlineStatus(),
        subscribeToMessageUpdates()
      ];
      
      // Cleanup on unmount
      return () => {
        updateUserOnlineStatus(false);
        cleanups.forEach(cleanup => cleanup?.());
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const updateUserOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;
    try {
      await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen: new Date().toISOString()
        }, { onConflict: "user_id" });
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const TTL_MS = 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - TTL_MS).toISOString();

      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .gt("created_at", cutoff)
        .order("created_at", { ascending: false });

      if (messagesData) {
        const conversationsMap = new Map<string, Message[]>();
        
        messagesData.forEach(msg => {
          const partnerId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
          if (!conversationsMap.has(partnerId)) {
            conversationsMap.set(partnerId, []);
          }
          conversationsMap.get(partnerId)!.push(msg);
        });

        const convos: Conversation[] = await Promise.all(
          Array.from(conversationsMap.entries()).map(async ([partnerId, msgs]) => {
            // Skip conversations where either party has blocked the other
            if (blockedByMe.has(partnerId) || blockedByThem.has(partnerId)) {
              return null as any;
            }
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", partnerId)
              .maybeSingle();

            const unreadCount = msgs.filter(m => 
              m.receiver_id === user?.id && !m.is_read
            ).length;

            return {
              partnerId,
              partnerName: profile?.full_name || "Unknown",
              partnerAvatar: profile?.avatar_url,
              lastMessage: msgs[0].content,
              lastMessageTime: msgs[0].created_at,
              unreadCount,
              isOnline: onlineStatus[partnerId] || false,
              isTyping: typingStatus[partnerId] || false
            };
          })
        );

        // Filter out nulls from blocked conversations
        const filtered = convos.filter(Boolean) as Conversation[];

        setConversations(filtered);

        if (filtered.length > 0 && !selectedConversation) {
          setSelectedConversation(filtered[0].partnerId);
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

    const fetchBlockedUsers = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("user_blocks")
          .select("user_id, blocked_user_id")
          .or(`user_id.eq.${user.id},blocked_user_id.eq.${user.id}`);

        const blockedMe = new Set<string>();
        const blockedBy = new Set<string>();

        (data || []).forEach((row: any) => {
          if (row.user_id === user.id) {
            blockedMe.add(row.blocked_user_id);
          } else if (row.blocked_user_id === user.id) {
            blockedBy.add(row.user_id);
          }
        });

        setBlockedByMe(blockedMe);
        setBlockedByThem(blockedBy);
      } catch (error) {
        console.error("Error fetching blocked users:", error);
      }
    };

  const fetchMessages = async (partnerId: string) => {
    const TTL_MS = 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - TTL_MS).toISOString();

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user?.id})`)
      .gt("created_at", cutoff)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
      
      // Mark messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", partnerId)
        .eq("receiver_id", user?.id);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === user?.id || newMsg.receiver_id === user?.id) {
            // If the new message belongs to the currently open conversation, append it
            if (
              selectedConversation &&
              (newMsg.sender_id === selectedConversation || newMsg.receiver_id === selectedConversation)
            ) {
              setMessages(prev => [...prev, newMsg]);

              // If the new message was sent TO the current user and chat is open, mark it read
              if (newMsg.receiver_id === user?.id && newMsg.sender_id === selectedConversation) {
                supabase
                  .from("messages")
                  .update({ is_read: true })
                  .eq("id", newMsg.id)
                  .catch(console.error);
              }
            }

            // Refresh conversation list metadata
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Subscribe to message read status updates
  const subscribeToMessageUpdates = () => {
    const channel = supabase
      .channel("message_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMsg.id ? { ...msg, is_read: updatedMsg.is_read } : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Subscribe to typing indicators
  const subscribeToTyping = () => {
    const channel = supabase
      .channel("typing_indicators")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "typing_indicators"
        },
        (payload) => {
          const typing = payload.new as any;
          if (typing.receiver_id === user?.id) {
            setTypingStatus(prev => ({
              ...prev,
              [typing.sender_id]: true
            }));
            
            // Auto-clear typing indicator after 3 seconds
            setTimeout(() => {
              setTypingStatus(prev => ({
                ...prev,
                [typing.sender_id]: false
              }));
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Subscribe to online status
  const subscribeToOnlineStatus = () => {
    const channel = supabase
      .channel("online_status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence"
        },
        (payload) => {
          const presence = payload.new as any;
          if (presence.user_id !== user?.id) {
            setOnlineStatus(prev => ({
              ...prev,
              [presence.user_id]: presence.is_online
            }));
            
            // Update conversations with new online status
            setConversations(prev =>
              prev.map(conv =>
                conv.partnerId === presence.user_id
                  ? { ...conv, isOnline: presence.is_online }
                  : conv
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const TTL_MS = 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

    const { error } = await supabase
      .from("messages")
      .insert({
        sender_id: user?.id,
        receiver_id: selectedConversation,
        content: newMessage.trim(),
        expires_at: expiresAt
      });

    if (!error) {
      setNewMessage("");
      inputRef.current?.focus();
      // Clear typing indicator
      await supabase
        .from("typing_indicators")
        .delete()
        .eq("sender_id", user?.id)
        .eq("receiver_id", selectedConversation);
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (!selectedConversation) return;

    // Send typing indicator
    if (text.trim().length > 0) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Insert typing indicator
      supabase
        .from("typing_indicators")
        .insert({
          sender_id: user?.id,
          receiver_id: selectedConversation
        })
        .then(() => {
          // Clear after 3 seconds
          typingTimeoutRef.current = setTimeout(() => {
            supabase
              .from("typing_indicators")
              .delete()
              .eq("sender_id", user?.id)
              .eq("receiver_id", selectedConversation)
              .catch(console.error);
          }, 3000);
        })
        .catch(console.error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleStartCall = () => {
    setCallType("voice");
    setShowCallModal(true);
  };

  const handleStartVideoCall = () => {
    setCallType("video");
    setShowVideoCallModal(true);
  };

  const handleClearChat = async (partnerId?: string) => {
    if (!user || !partnerId) return;
    try {
      await supabase
        .from("messages")
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`);

      if (selectedConversation === partnerId) {
        setMessages([]);
        setSelectedConversation(null);
      }

      fetchConversations();
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  const handleBlockUser = async (partnerId?: string) => {
    if (!user || !partnerId) return;
    try {
      // Insert block record; ignore conflict if exists
      await supabase
        .from("user_blocks")
        .upsert({ user_id: user.id, blocked_user_id: partnerId }, { onConflict: "user_id,blocked_user_id" });

      // Remove conversation locally
      setConversations(prev => prev.filter(c => c.partnerId !== partnerId));
      if (selectedConversation === partnerId) setSelectedConversation(null);

      // Refresh blocked lists
      fetchBlockedUsers();
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const handleOpenSettings = () => {
    setShowChatSettings(true);
  };

  // Search teachers to start a new conversation
  const searchTeachers = async (query: string) => {
    setTeacherSearchQuery(query);
    if (query.trim().length < 2) {
      setTeacherResults([]);
      return;
    }

    setSearchingTeachers(true);
    try {
      // Search for verified teachers by name
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .ilike("full_name", `%${query}%`)
        .neq("user_id", user?.id)
        .limit(10);

      if (profiles) {
        // Filter to only verified teachers
        const { data: teacherProfiles } = await supabase
          .from("teacher_profiles")
          .select("user_id, subjects")
          // Accept either textual verification_status or boolean is_verified flag
          .or("verification_status.eq.verified,is_verified.eq.true")
          .in("user_id", profiles.map(p => p.user_id));

        const teacherUserIds = new Set(teacherProfiles?.map(tp => tp.user_id) || []);
        
        const results: TeacherSearchResult[] = profiles
          .filter(p => teacherUserIds.has(p.user_id))
          .map(p => ({
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            subjects: teacherProfiles?.find(tp => tp.user_id === p.user_id)?.subjects || [],
          }));

        setTeacherResults(results);
      }
    } catch (error) {
      console.error("Error searching teachers:", error);
    } finally {
      setSearchingTeachers(false);
    }
  };

  const startConversation = (teacherId: string) => {
    setSelectedConversation(teacherId);
    setShowTeacherSearch(false);
    setTeacherSearchQuery("");
    setTeacherResults([]);
    
    // Check if conversation already exists, if not it will show empty chat
    const existing = conversations.find(c => c.partnerId === teacherId);
    if (!existing) {
      // Add a temporary conversation entry
      const result = teacherResults.find(t => t.user_id === teacherId);
      if (result) {
        setConversations(prev => [{
          partnerId: teacherId,
          partnerName: result.full_name,
          partnerAvatar: result.avatar_url,
          lastMessage: "",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0
        }, ...prev]);
      }
    }
  };

  const selectedPartner = conversations.find(c => c.partnerId === selectedConversation);

  const filteredConversations = conversations.filter(c =>
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isStudent = role === "student";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Messages
          </h1>
          <p className="text-muted-foreground mt-1">
            Chat with your teachers and students
          </p>
        </div>
        {isStudent && (
          <Button onClick={() => setShowTeacherSearch(true)} variant="outline">
            <UserPlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        )}
      </div>

      {/* Teacher Search Dialog */}
      <Dialog open={showTeacherSearch} onOpenChange={setShowTeacherSearch}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Find a Teacher to Chat With</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search teachers by name..."
                className="pl-9"
                value={teacherSearchQuery}
                onChange={(e) => searchTeachers(e.target.value)}
                autoFocus
              />
            </div>
            <ScrollArea className="max-h-[300px]">
              {searchingTeachers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : teacherResults.length === 0 && teacherSearchQuery.length >= 2 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No verified teachers found matching "{teacherSearchQuery}"
                </p>
              ) : (
                <div className="space-y-1">
                  {teacherResults.map((teacher) => (
                    <button
                      key={teacher.user_id}
                      onClick={() => startConversation(teacher.user_id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <Avatar>
                        <AvatarImage src={teacher.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {teacher.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{teacher.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {teacher.subjects.slice(0, 3).join(", ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {teacherSearchQuery.length < 2 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Type at least 2 characters to search
                </p>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Conversations List */}
        {(!isMobile || !selectedConversation) && (
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search conversations..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-340px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    {isStudent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowTeacherSearch(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Start a Chat
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((convo) => (
                      <button
                        key={convo.partnerId}
                        onClick={() => setSelectedConversation(convo.partnerId)}
                        className={`w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left ${
                          selectedConversation === convo.partnerId ? "bg-muted" : ""
                        }`}
                      >
                        <Avatar>
                          <AvatarImage src={convo.partnerAvatar || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {convo.partnerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{convo.partnerName}</p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(convo.lastMessageTime), "h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {convo.lastMessage}
                          </p>
                        </div>
                        {convo.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center">
                            {convo.unreadCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Chat Area - New WhatsApp Style */}
        {(!isMobile || selectedConversation) && (
          <Card className="lg:col-span-2 flex flex-col overflow-hidden">
            <ChatWindow
              messages={messages}
              loading={loading}
              currentUserId={user?.id}
              partner={selectedPartner ? {
                partnerId: selectedPartner.partnerId,
                partnerName: selectedPartner.partnerName,
                partnerAvatar: selectedPartner.partnerAvatar
              } : undefined}
              newMessage={newMessage}
              onMessageChange={handleTyping}
              onSendMessage={sendMessage}
              onClose={() => setSelectedConversation(null)}
              onCall={handleStartCall}
              onVideoCall={handleStartVideoCall}
                onOpenSettings={handleOpenSettings}
                onClearChat={() => handleClearChat(selectedPartner?.partnerId)}
                onBlockUser={() => handleBlockUser(selectedPartner?.partnerId)}
              onAddEmoji={addEmoji}
              isPartnerOnline={selectedPartner?.isOnline || false}
              isPartnerTyping={selectedPartner?.isTyping || false}
            />
          </Card>
        )}
      </div>

      {/* Call Modals */}
      {selectedPartner && (
        <>
          <CallModal
            isOpen={showCallModal}
            onClose={() => setShowCallModal(false)}
            partnerId={selectedPartner.partnerId}
            partnerName={selectedPartner.partnerName}
            partnerAvatar={selectedPartner.partnerAvatar}
            isVideoCall={false}
          />
          <CallModal
            isOpen={showVideoCallModal}
            onClose={() => setShowVideoCallModal(false)}
            partnerId={selectedPartner.partnerId}
            partnerName={selectedPartner.partnerName}
            partnerAvatar={selectedPartner.partnerAvatar}
            isVideoCall={true}
          />
          <ChatSettingsModal
            isOpen={showChatSettings}
            onClose={() => setShowChatSettings(false)}
            partnerName={selectedPartner.partnerName}
            onClearChat={() => handleClearChat(selectedPartner?.partnerId)}
            onBlockUser={() => handleBlockUser(selectedPartner?.partnerId)}
          />
        </>
      )}
    </div>
  );
}
