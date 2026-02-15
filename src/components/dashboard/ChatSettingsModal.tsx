import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Bell,
  Lock,
  Trash2,
} from "lucide-react";

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerName: string;
  onMuteNotifications?: () => void;
  onClearChat?: () => void;
  onBlockUser?: () => void;
}

export function ChatSettingsModal({
  isOpen,
  onClose,
  partnerName,
  onMuteNotifications,
  onClearChat,
  onBlockUser,
}: ChatSettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
          <DialogDescription>
            Manage your conversation with {partnerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => {
              onMuteNotifications?.();
              onClose();
            }}
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">Mute Notifications</p>
              <p className="text-xs text-muted-foreground">
                Disable notifications for this chat
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 text-destructive hover:text-destructive"
            onClick={() => {
              onClearChat?.();
              onClose();
            }}
          >
            <Trash2 className="w-5 h-5" />
            <div className="text-left">
              <p className="font-medium">Clear Chat</p>
              <p className="text-xs text-muted-foreground">
                Delete all messages with {partnerName}
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 text-destructive hover:text-destructive"
            onClick={() => {
              onBlockUser?.();
              onClose();
            }}
          >
            <AlertCircle className="w-5 h-5" />
            <div className="text-left">
              <p className="font-medium">Block {partnerName}</p>
              <p className="text-xs text-muted-foreground">
                Prevent them from messaging you
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
