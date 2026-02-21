import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CredentialDeleteWarningProps {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  documentType: string;
  isDeleting?: boolean;
}

export function CredentialDeleteWarning({
  isOpen,
  onConfirm,
  onCancel,
  documentType,
  isDeleting = false,
}: CredentialDeleteWarningProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="border-destructive/50 bg-destructive/5">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
            <AlertDialogTitle className="text-destructive text-xl">
              WARNING: Delete Credential
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base mt-4">
            <div className="space-y-3 text-foreground">
              <p className="font-semibold">
                Deleting required credentials may lead to immediate account suspension and removal from teacher listings.
              </p>
              <p>
                This action:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                <li>Cannot be undone</li>
                <li>Will be permanently logged</li>
                <li>May trigger account review by administrators</li>
                <li>Could result in loss of teaching access</li>
              </ul>
              <p className="font-semibold mt-4">
                Are you absolutely sure you want to delete your {documentType.replace(/_/g, " ")} credential?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isDeleting} className="sm:mr-2">
            Keep Credential
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete Credential"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
