
-- Video sessions table for WebRTC signaling and session management
CREATE TABLE public.video_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  room_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  teacher_joined BOOLEAN DEFAULT false,
  student_joined BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Signaling messages for WebRTC offer/answer/ICE exchange
CREATE TABLE public.video_signaling (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_session_id UUID REFERENCES public.video_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('offer', 'answer', 'ice-candidate', 'join', 'leave', 'chat')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_signaling ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_sessions: only teacher/student of the booking session can access
CREATE POLICY "Session participants can view video sessions"
  ON public.video_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = video_sessions.session_id
      AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())
    )
  );

CREATE POLICY "Session participants can insert video sessions"
  ON public.video_sessions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
      AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())
    )
  );

CREATE POLICY "Session participants can update video sessions"
  ON public.video_sessions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = video_sessions.session_id
      AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())
    )
  );

-- RLS policies for video_signaling
CREATE POLICY "Session participants can view signaling"
  ON public.video_signaling FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.video_sessions vs
      JOIN public.sessions s ON s.id = vs.session_id
      WHERE vs.id = video_signaling.video_session_id
      AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())
    )
  );

CREATE POLICY "Session participants can send signaling"
  ON public.video_signaling FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.video_sessions vs
      JOIN public.sessions s ON s.id = vs.session_id
      WHERE vs.id = video_session_id
      AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid())
    )
  );

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_signaling;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_sessions;

-- Trigger for updated_at
CREATE TRIGGER update_video_sessions_updated_at
  BEFORE UPDATE ON public.video_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for quick lookups
CREATE INDEX idx_video_sessions_session_id ON public.video_sessions(session_id);
CREATE INDEX idx_video_sessions_room_code ON public.video_sessions(room_code);
CREATE INDEX idx_video_signaling_video_session ON public.video_signaling(video_session_id);
