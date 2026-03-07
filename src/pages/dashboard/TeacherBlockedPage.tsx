import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TeacherBlockedPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const reason = profile?.status_reason || "Your account has been blocked by an administrator.";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-10 w-10 shrink-0" />
            <div>
              <CardTitle className="text-xl">Account blocked</CardTitle>
              <CardDescription>
                You do not have access to the teacher dashboard.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Reason</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{reason}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            If you believe this is an error, please contact support.
          </p>
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <img src="/signin-icon.png" alt="Sign out" className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
