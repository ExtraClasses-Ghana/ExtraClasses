-- ExtraClass: Enable Message Deletion and Realtime Reading Receipts
-- Users must be able to securely clear their chat history, which was prohibited by restrictive RLS

DO $$ 
BEGIN
    -- 1. Grant Users UPDATE access to messages they sent or received (ex. marking as read)
    DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
    CREATE POLICY "Users can update their messages" 
    ON public.messages 
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

    -- 2. Grant Users DELETE access to messages they sent or received (for 'Clear Chat' action)
    DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;
    CREATE POLICY "Users can delete their messages" 
    ON public.messages 
    FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
END $$;
