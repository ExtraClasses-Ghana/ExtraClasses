-- Create user_presence table for online status tracking
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT typing_unique UNIQUE (sender_id, receiver_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_user_presence_is_online ON user_presence(is_online);
CREATE INDEX idx_typing_indicators_sender ON typing_indicators(sender_id);
CREATE INDEX idx_typing_indicators_receiver ON typing_indicators(receiver_id);

-- Enable RLS on tables
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presence
CREATE POLICY "Users can view all online statuses" ON user_presence
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own online status" ON user_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own online status" ON user_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for typing_indicators
CREATE POLICY "Users can view typing indicators" ON typing_indicators
  FOR SELECT USING (receiver_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY "Users can insert typing indicators" ON typing_indicators
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their typing indicators" ON typing_indicators
  FOR DELETE USING (auth.uid() = sender_id);

-- Auto-cleanup old typing indicators (older than 5 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE created_at < now() - interval '5 seconds';
END;
$$ LANGUAGE plpgsql;

-- Run cleanup periodically (would need pg_cron extension, but we'll handle it client-side for now)
