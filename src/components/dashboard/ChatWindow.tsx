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
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-3 flex items-center justify-between shadow z-10 relative">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-white/40 shadow-sm">
            <AvatarImage src={partner.partnerAvatar || ""} />
            <AvatarFallback className="bg-white/20 text-white font-bold">
              {partner.partnerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg truncate tracking-tight">{partner.partnerName}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${isPartnerOnline ? 'bg-emerald-300 shadow-emerald-400' : 'bg-white/50'}`} />
              <p className="text-xs text-emerald-50 font-medium">
                {isPartnerTyping ? (
                  <span className="italic animate-pulse">typing...</span>
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
        <div className="flex items-center gap-1.5 ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCall}
            className="text-white hover:bg-white/20 rounded-full w-9 h-9"
            title="Start call"
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onVideoCall}
            className="text-white hover:bg-white/20 rounded-full w-9 h-9"
            title="Start video call"
          >
            <Video className="w-4 h-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full w-9 h-9"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 rounded-xl shadow-xl" align="end">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-lg hover:bg-slate-50 text-slate-700"
                  onClick={onOpenSettings}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Chat Settings
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-lg hover:bg-slate-50 text-slate-700"
                  onClick={onClearChat}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Clear Chat
                </Button>
                <div className="h-px bg-slate-100 my-1"></div>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
      <ScrollArea className="flex-1 bg-slate-50 relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23000\" fill-opacity=\"1\" fill-rule=\"evenodd\"%3E%3Ccircle cx=\"3\" cy=\"3\" r=\"3\"/%3E%3Ccircle cx=\"13\" cy=\"13\" r=\"3\"/%3E%3C/g%3E%3C/svg%3E')", backgroundSize: "20px 20px" }}></div>
        <div className="p-4 space-y-4 relative z-10">
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
                <div className="flex justify-center my-4">
                  <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-100 shadow-sm px-4 py-1.5 rounded-full">
                    {format(new Date(messages[0].created_at), "MMMM d, yyyy")}
                  </span>
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
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl break-words relative shadow-sm ${
                        isOwn
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm"
                          : "bg-white text-slate-800 border border-slate-100 rounded-bl-sm"
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed">{msg.content}</p>
                      <div className={`text-[11px] mt-1 flex items-center justify-end gap-1 ${
                        isOwn 
                          ? "text-emerald-50" 
                          : "text-slate-400"
                      }`}>
                        <span>{format(new Date(msg.created_at), "h:mm a")}</span>
                        {isOwn && msg.is_read && (
                          <span className="text-white ml-0.5">✓✓</span>
                        )}
                        {isOwn && !msg.is_read && (
                          <span className="text-white/60 ml-0.5">✓</span>
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
      <div className="bg-white border-t border-slate-100 p-3 sm:p-4 z-10 w-full relative">
        <div className="flex items-end gap-2 sm:gap-3 max-w-full">
          {/* Emoji Picker */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex-shrink-0 hover:bg-slate-100 rounded-full h-11 w-11"
              >
                <Smile className="w-6 h-6 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3 rounded-2xl shadow-xl" side="top" align="start">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddEmoji(emoji)}
                    className="h-10 text-2xl hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Message Input */}
          <div className="flex-1 min-w-0 bg-slate-100 rounded-full flex items-center px-4 border border-transparent focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 px-0 h-11 text-[15px] shadow-none"
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            className="flex-shrink-0 rounded-full h-11 w-11 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30 transition-all p-0 flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
          >
            <Send className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
