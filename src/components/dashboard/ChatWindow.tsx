import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send,
  Phone,
  Video,
  MoreVertical,
  Smile,
  ArrowLeft,
  Loader2,
  MapPin,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Partner {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
}

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string | undefined;
  partner: Partner | undefined;
  newMessage: string;
  onMessageChange: (msg: string) => void;
  onSendMessage: () => void;
  onClose?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onOpenSettings?: () => void;
  onClearChat?: () => void;
  onBlockUser?: () => void;
  onAddEmoji: (emoji: string) => void;
  isPartnerTyping?: boolean;
  isPartnerOnline?: boolean;
}

const EMOJI_LIST = [
  "😀", "😂", "😊", "😍", "🤩", "😎", "🤗", "🤔", "😅", "😢",
  "😡", "👍", "👎", "❤️", "🔥", "⭐", "🎉", "💯", "🙏", "👋",
  "✅", "📚", "✏️", "📝", "🎓", "💡", "⏰", "📅", "🏆", "👏"
];

export function ChatWindow({
  messages,
  loading,
  currentUserId,
  partner,
  newMessage,
  onMessageChange,
  onSendMessage,
  onClose,
  onCall,
  onVideoCall,
  onOpenSettings,
  onClearChat,
  onBlockUser,
  onAddEmoji,
  isPartnerTyping = false,
  isPartnerOnline = false
}: ChatWindowProps) {
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleAddEmoji = (emoji: string) => {
    onAddEmoji(emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  if (!partner) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-muted-foreground text-lg">Select a conversation to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden">
      {/* Chat Header - WhatsApp Style */}
      <div className="bg-gradient-to-r from-primary/95 to-primary/80 text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary/20 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-primary-foreground/30">
            <AvatarImage src={partner.partnerAvatar || ""} />
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-bold">
              {partner.partnerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg truncate">{partner.partnerName}</h3>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              <p className="text-sm text-primary-foreground/80">
                {isPartnerTyping ? (
                  <span className="italic">typing...</span>
                ) : isPartnerOnline ? (
                  "Online"
                ) : (
                  "Offline"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCall}
            className="text-primary-foreground hover:bg-primary/20"
            title="Start call"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onVideoCall}
            className="text-primary-foreground hover:bg-primary/20"
            title="Start video call"
          >
            <Video className="w-5 h-5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary/20"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={onOpenSettings}
                >
                  Chat Settings
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={onClearChat}
                >
                  Clear Chat
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={onBlockUser}
                >
                  Block User
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full py-12 text-center">
              <div>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            <>
              {/* Date Separator for first message */}
              {messages.length > 0 && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {format(new Date(messages[0].created_at), "MMMM d, yyyy")}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, index) => {
                const isOwn = msg.sender_id === currentUserId;
                const prevMsg = messages[index - 1];
                const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    {!isOwn && showAvatar ? (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={partner.partnerAvatar || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {partner.partnerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : !isOwn ? (
                      <div className="w-8 flex-shrink-0" />
                    ) : null}

                    <div
                      className={`max-w-[65%] px-4 py-2.5 rounded-2xl break-words ${
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-none shadow-sm"
                          : "bg-muted text-foreground rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <div className={`text-xs mt-1 flex items-center gap-1 ${
                        isOwn 
                          ? "text-primary-foreground/70" 
                          : "text-muted-foreground"
                      }`}>
                        <span>{format(new Date(msg.created_at), "h:mm a")}</span>
                        {isOwn && msg.is_read && (
                          <span className="text-primary-foreground/80">✓✓</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - WhatsApp Style */}
      <div className="border-t bg-background p-3 space-y-2">
        <div className="flex items-end gap-2">
          {/* Emoji Picker */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex-shrink-0 hover:bg-muted"
              >
                <Smile className="w-5 h-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" side="top" align="start">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddEmoji(emoji)}
                    className="h-10 text-2xl hover:bg-muted rounded transition-colors flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Message Input */}
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 rounded-full bg-muted border-0"
          />

          {/* Send Button */}
          <Button
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            className="flex-shrink-0 rounded-full bg-primary hover:bg-primary/90"
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
