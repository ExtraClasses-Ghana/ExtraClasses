import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DeviceTestPanel } from "@/components/video/DeviceTestPanel";
import { VideoCallInterface } from "@/components/video/VideoCallInterface";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, BookOpen, Video, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";

type CallPhase = "loading" | "waiting-room" | "device-test" | "in-call" | "ended" | "error";

interface SessionDetails {
  id: string;
  subject: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  teacher_id: string;
  student_id: string;
}

export default function VideoCall() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<CallPhase>("loading");
  const [videoSessionId, setVideoSessionId] = useState("");
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [partnerAvatar, setPartnerAvatar] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && roomCode) loadSession();
  }, [user, roomCode]);

  const loadSession = async () => {
    try {
      // Find video session by room code
      const { data: videoSession, error: vsError } = await (supabase
        .from("video_sessions") as any)
        .select("*")
        .eq("room_code", roomCode)
        .maybeSingle();

      if (vsError) throw vsError;
      if (!videoSession) {
        setError("Session not found. Please check your link.");
        setPhase("error");
        return;
      }

      if (videoSession.status === "ended") {
        setPhase("ended");
        return;
      }

      setVideoSessionId(videoSession.id);

      // Fetch the booking session details
      const { data: sessionData, error: sError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", videoSession.session_id)
        .single();

      if (sError) throw sError;
      setSession(sessionData);

      const teacherMode = user!.id === sessionData.teacher_id;
      setIsTeacher(teacherMode);

      // Fetch partner profile
      const partnerId = teacherMode ? sessionData.student_id : sessionData.teacher_id;
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", partnerId)
        .maybeSingle();

      setPartnerName(partnerProfile?.full_name || "Participant");
      setPartnerAvatar(partnerProfile?.avatar_url || "");

      setPhase("waiting-room");
    } catch (err: any) {
      console.error("Error loading video session:", err);
      setError(err.message || "Failed to load session");
      setPhase("error");
    }
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-display font-bold mb-2">Unable to Join</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-display font-bold mb-2">Session Ended</h2>
            <p className="text-muted-foreground mb-6">This video session has concluded.</p>
            <Button onClick={() => navigate(isTeacher ? "/dashboard/teacher/sessions" : "/dashboard/student/history")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "waiting-room") {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-display font-bold">Video Session</h1>
            <p className="text-muted-foreground">Get ready for your lesson</p>
          </div>

          {/* Session info card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={partnerAvatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {partnerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{partnerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {isTeacher ? "Student" : "Teacher"}
                  </p>
                </div>
                <Badge className="bg-accent/10 text-accent">
                  <Video className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              </div>
              {session && (
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {session.subject}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {session.duration_minutes} min
                  </span>
                  <span>
                    {format(new Date(session.session_date), "MMM d, yyyy")} at {session.start_time.slice(0, 5)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device test */}
          <Card>
            <CardContent className="p-6">
              <DeviceTestPanel
                onReady={async () => {
                  // Update join status
                  const updateField = isTeacher ? { teacher_joined: true } : { student_joined: true };
                  await (supabase.from("video_sessions") as any)
                    .update({ ...updateField, status: "active", started_at: new Date().toISOString() })
                    .eq("id", videoSessionId);
                  setPhase("in-call");
                }}
                onCancel={() => navigate(-1)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // In-call phase
  return (
    <div className="h-screen bg-background p-2">
      <VideoCallInterface
        videoSessionId={videoSessionId}
        sessionId={session!.id}
        userId={user!.id}
        isTeacher={isTeacher}
        partnerName={partnerName}
        subject={session!.subject}
        durationMinutes={session!.duration_minutes}
        onEnd={() => setPhase("ended")}
      />
    </div>
  );
}
