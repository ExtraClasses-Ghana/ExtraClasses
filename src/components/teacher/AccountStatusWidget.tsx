import { AlertTriangle, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountStatus } from "@/hooks/useTeacherAccountStatus";
import { cn } from "@/lib/utils";

interface AccountStatusWidgetProps {
  status: AccountStatus;
  onReupload?: () => void;
}

const iconMap = {
  CheckCircle: CheckCircle,
  XCircle: XCircle,
  AlertTriangle: AlertTriangle,
  AlertCircle: AlertCircle,
};

const colorStyles = {
  green: {
    background: "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-900 dark:text-green-100",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  },
  yellow: {
    background: "bg-yellow-50 dark:bg-yellow-950",
    border: "border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-900 dark:text-yellow-100",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  },
  red: {
    background: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-900 dark:text-red-100",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  },
};

export function AccountStatusWidget({ status, onReupload }: AccountStatusWidgetProps) {
  const Icon = iconMap[status.icon as keyof typeof iconMap] || CheckCircle;
  const colorStyle = colorStyles[status.color as keyof typeof colorStyles] || colorStyles.yellow;

  const getStatusTitle = () => {
    switch (status.status) {
      case "active":
        return "Active";
      case "pending_verification":
        return "Pending Verification";
      case "suspended":
        return "Suspended";
      case "rejected":
        return "Verification Failed";
      default:
        return "Unknown";
    }
  };

  return (
    <Card className={cn(colorStyle.background, "border-2", colorStyle.border)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Icon className={cn("w-6 h-6", {
            "text-green-600 dark:text-green-400": status.color === "green",
            "text-yellow-600 dark:text-yellow-400": status.color === "yellow",
            "text-red-600 dark:text-red-400": status.color === "red",
          })} />
          <span className={colorStyle.text}>Account Status: {getStatusTitle()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={cn("text-sm", colorStyle.text)}>
          {status.message}
        </p>

        {(status.status === "suspended" || status.status === "rejected") && (
          <div className="space-y-2">
            {status.reason && (
              <div className={cn("p-3 rounded-lg", colorStyle.badge, "text-sm")}>
                <strong>Reason:</strong> {status.reason}
              </div>
            )}
            {status.status === "rejected" && onReupload && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReupload}
                className={colorStyle.text}
              >
                Re-upload Documents
              </Button>
            )}
            {status.status === "suspended" && (
              <Button size="sm" variant="outline" disabled className={colorStyle.text}>
                Contact Support
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
