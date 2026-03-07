export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_entity_id: string | null
          related_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_entity_id?: string | null
          related_user_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_entity_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          complaint_type: string
          created_at: string
          description: string
          id: string
          reported_user_id: string
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          complaint_type: string
          created_at?: string
          description: string
          id?: string
          reported_user_id: string
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          complaint_type?: string
          created_at?: string
          description?: string
          id?: string
          reported_user_id?: string
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_materials: {
        Row: {
          created_at: string
          description: string | null
          downloads: number | null
          file_url: string | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          level: string | null
          price: number | null
          rating: number | null
          subject_id: string | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          downloads?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          level?: string | null
          price?: number | null
          rating?: number | null
          subject_id?: string | null
          thumbnail_url?: string | null
          title: string
          type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          downloads?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          level?: string | null
          price?: number | null
          rating?: number | null
          subject_id?: string | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_teachers: {
        Row: {
          created_at: string
          id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payer_id: string
          payment_method: string | null
          session_id: string
          status: string
          transaction_ref: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payer_id: string
          payment_method?: string | null
          session_id: string
          status?: string
          transaction_ref?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payer_id?: string
          payment_method?: string | null
          session_id?: string
          status?: string
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          region: string | null
          status: string | null
          status_reason: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          region?: string | null
          status?: string | null
          status_reason?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          region?: string | null
          status?: string | null
          status_reason?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          session_id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          session_id: string
          student_id: string
          teacher_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          session_id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          amount: number
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          platform_fee: number | null
          session_date: string
          session_type: string
          start_time: string
          status: string
          student_id: string
          subject: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          platform_fee?: number | null
          session_date: string
          session_type?: string
          start_time: string
          status?: string
          student_id: string
          subject: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          platform_fee?: number | null
          session_date?: string
          session_type?: string
          start_time?: string
          status?: string
          student_id?: string
          subject?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          teacher_count: number | null
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          teacher_count?: number | null
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          teacher_count?: number | null
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          achievements: string[] | null
          availability: Json | null
          bio: string | null
          created_at: string
          experience_years: number | null
          hourly_rate: number | null
          id: string
          is_verified: boolean | null
          languages: string[] | null
          onboarding_completed: boolean | null
          qualifications: string[] | null
          rating: number | null
          subjects: string[] | null
          teaching_mode: string | null
          total_earnings: number | null
          total_reviews: number | null
          total_sessions: number | null
          total_students: number | null
          updated_at: string
          user_id: string
          verification_status: string | null
        }
        Insert: {
          achievements?: string[] | null
          availability?: Json | null
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_verified?: boolean | null
          languages?: string[] | null
          onboarding_completed?: boolean | null
          qualifications?: string[] | null
          rating?: number | null
          subjects?: string[] | null
          teaching_mode?: string | null
          total_earnings?: number | null
          total_reviews?: number | null
          total_sessions?: number | null
          total_students?: number | null
          updated_at?: string
          user_id: string
          verification_status?: string | null
        }
        Update: {
          achievements?: string[] | null
          availability?: Json | null
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_verified?: boolean | null
          languages?: string[] | null
          onboarding_completed?: boolean | null
          qualifications?: string[] | null
          rating?: number | null
          subjects?: string[] | null
          teaching_mode?: string | null
          total_earnings?: number | null
          total_reviews?: number | null
          total_sessions?: number | null
          total_students?: number | null
          updated_at?: string
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_type: string
          file_name: string
          file_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          room_code: string
          session_id: string
          started_at: string | null
          status: string
          student_joined: boolean | null
          teacher_joined: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          room_code?: string
          session_id: string
          started_at?: string | null
          status?: string
          student_joined?: boolean | null
          teacher_joined?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          room_code?: string
          session_id?: string
          started_at?: string | null
          status?: string
          student_joined?: boolean | null
          teacher_joined?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_signaling: {
        Row: {
          created_at: string
          id: string
          message_type: string
          payload: Json
          sender_id: string
          video_session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_type: string
          payload: Json
          sender_id: string
          video_session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_type?: string
          payload?: Json
          sender_id?: string
          video_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_signaling_video_session_id_fkey"
            columns: ["video_session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          category: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          responded_at: string | null
          responded_by: string | null
          status: "unread" | "read" | "responded" | "archived"
          subject: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          responded_at?: string | null
          responded_by?: string | null
          status?: "unread" | "read" | "responded" | "archived"
          subject: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: "unread" | "read" | "responded" | "archived"
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_active_sessions: {
        Args: Record<string, never>
        Returns: number
      }
      get_dashboard_completed_sessions: {
        Args: Record<string, never>
        Returns: number
      }
      get_dashboard_index_stats: {
        Args: Record<string, never>
        Returns: Array<{
          index_name: string
          table_name: string
          idx_scan: number
          idx_tup_read: number
          idx_tup_fetch: number
        }>
      }
      get_dashboard_new_students_this_week: {
        Args: Record<string, never>
        Returns: number
      }
      get_dashboard_new_students_today: {
        Args: Record<string, never>
        Returns: number
      }
      get_dashboard_pending_verifications: {
        Args: Record<string, never>
        Returns: number
      }
      get_dashboard_stats: {
        Args: Record<string, never>
        Returns: Database["public"]["CompositeTypes"]["dashboard_stats"]
      }
      get_dashboard_stats_admin: {
        Args: Record<string, never>
        Returns: Database["public"]["CompositeTypes"]["dashboard_stats"]
      }
      get_dashboard_total_revenue: {
        Args: Record<string, never>
        Returns: number
      }
      get_dashboard_total_students: {
        Args: Record<string, never>
        Returns: number
      }
      get_dashboard_total_teachers: {
        Args: Record<string, never>
        Returns: number
      }
      get_platform_performance_insights: {
        Args: Record<string, never>
        Returns: Array<{
          metric_name: string
          metric_value: string
          metric_type: string
        }>
      }
      get_revenue_trends_admin: {
        Args: {
          period: string
          days_or_weeks_or_months: number
        }
        Returns: Array<{
          trend_label: string
          revenue: number
          session_count: number
          avg_session_value: number
        }>
      }
      get_revenue_trends_daily: {
        Args: { days_back?: number }
        Returns: Array<{
          trend_date: string
          revenue: number
          session_count: number
          avg_session_value: number
        }>
      }
      get_revenue_trends_monthly: {
        Args: { months_back?: number }
        Returns: Array<{
          year: number
          month: number
          month_name: string
          revenue: number
          session_count: number
          avg_session_value: number
        }>
      }
      get_revenue_trends_weekly: {
        Args: { weeks_back?: number }
        Returns: Array<{
          year: number
          week: number
          revenue: number
          session_count: number
          avg_session_value: number
        }>
      }
      get_student_demographics_admin: {
        Args: Record<string, never>
        Returns: Array<{
          education_level: string | null
          student_count: number
          new_students_today: number
          new_students_week: number
        }>
      }
      get_subject_distribution_admin: {
        Args: Record<string, never>
        Returns: Array<{
          subject_name: string
          teacher_count: number
          avg_hourly_rate: number
          total_revenue: number
          completed_sessions: number
        }>
      }
      get_subject_teacher_distribution: {
        Args: Record<string, never>
        Returns: Array<{
          subject_name: string
          teacher_count: number
          avg_hourly_rate: number
          total_revenue: number
          completed_sessions: number
        }>
      }
      get_teachers_by_subject: {
        Args: { subject_name?: string | null }
        Returns: Array<{
          subject: string
          teacher_id: string
          teacher_name: string
          hourly_rate: number
          total_sessions: number
          total_earnings: number
          rating: number
        }>
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      suspend_student_admin: {
        Args: {
          target_user_id: string
          suspension_reason?: string
        }
        Returns: Json
      }
      unsuspend_student_admin: {
        Args: { target_user_id: string }
        Returns: Json
      }
      block_student_admin: {
        Args: {
          target_user_id: string
          block_reason?: string
        }
        Returns: Json
      }
      unblock_student_admin: {
        Args: { target_user_id: string }
        Returns: Json
      }
      delete_student_account_admin: {
        Args: {
          target_user_id: string
          reason?: string
        }
        Returns: Json
      }
      get_admin_students_list: {
        Args: {
          limit_count?: number
          offset_count?: number
          filter_status?: string | null
        }
        Returns: Array<{
          user_id: string
          full_name: string
          email: string
          education_level: string | null
          is_suspended: boolean
          is_blocked: boolean
          suspension_reason: string | null
          block_reason: string | null
          suspension_date: string | null
          block_date: string | null
          created_at: string
          total_sessions: number
          total_spent: number
          last_active: string | null
        }>
      }
      get_admin_withdrawals_list: {
        Args: {
          limit_count?: number
          offset_count?: number
          filter_status?: string | null
          filter_method?: string | null
        }
        Returns: Array<{
          withdrawal_id: string
          teacher_id: string
          teacher_name: string
          teacher_email: string
          amount: number
          currency: string
          status: string
          method: string
          payment_method: string | null
          mobile_network: string | null
          bank_name: string | null
          account_number: string | null
          admin_notes: string | null
          rejection_reason: string | null
          created_at: string
          approved_at: string | null
          rejected_at: string | null
          completed_at: string | null
          transaction_count: number
          last_transaction_type: string | null
          last_transaction_at: string | null
        }>
      }
      approve_withdrawal: {
        Args: {
          withdrawal_id: string
          approval_notes?: string | null
        }
        Returns: Json
      }
      reject_withdrawal: {
        Args: {
          withdrawal_id: string
          rejection_reason: string
        }
        Returns: Json
      }
      process_withdrawal: {
        Args: {
          withdrawal_id: string
          payment_gateway?: string | null
          reference_number?: string | null
        }
        Returns: Json
      }
      complete_withdrawal: {
        Args: {
          withdrawal_id: string
          external_reference?: string | null
        }
        Returns: Json
      }
      get_admin_withdrawal_notifications: {
        Args: {
          admin_id?: string | null
          limit_count?: number
          offset_count?: number
        }
        Returns: Array<{
          notification_id: string
          withdrawal_id: string
          teacher_name: string
          amount: number
          currency: string
          notification_type: string
          title: string
          message: string
          is_read: boolean
          created_at: string
        }>
      }
      mark_notification_read: {
        Args: {
          notification_id: string
        }
        Returns: Json
      }
      get_withdrawal_statistics: {
        Args: Record<string, never>
        Returns: Array<{
          total_pending: number
          total_approved: number
          total_rejected: number
          total_completed: number
          total_amount: number
          average_amount: number
          pending_count: number
          approved_count: number
          rejected_count: number
          completed_count: number
        }>
      }
      get_withdrawal_trends: {
        Args: {
          days_back?: number
        }
        Returns: Array<{
          date: string
          pending_count: number
          approved_count: number
          rejected_count: number
          completed_count: number
          total_amount: number
        }>
      }
      get_watermark_settings: {
        Args: Record<string, never>
        Returns: Array<{
          watermark_enabled: boolean
          watermark_type: string
          watermark_logo_url: string | null
          watermark_logo_opacity: number
          watermark_text: string
          watermark_position: string
          watermark_scale: number
          footer_enabled: boolean
          footer_text: string
          header_enabled: boolean
          header_text: string | null
          page_numbers_enabled: boolean
          compression_enabled: boolean
          compression_quality: number
        }>
      }
      update_watermark_settings: {
        Args: {
          p_watermark_enabled?: boolean
          p_watermark_type?: string
          p_watermark_logo_url?: string
          p_watermark_logo_opacity?: number
          p_watermark_text?: string
          p_watermark_position?: string
          p_watermark_scale?: number
          p_footer_enabled?: boolean
          p_footer_text?: string
          p_compression_quality?: number
        }
        Returns: Json
      }
      log_pdf_export: {
        Args: {
          p_document_type: string
          p_document_name: string
          p_export_method: string
          p_file_size?: number
          p_watermark_applied?: boolean
          p_encryption_applied?: boolean
          p_metadata?: Json
        }
        Returns: Json
      }
      create_password_reset_token: {
        Args: {
          p_email: string
          p_token_validity_hours?: number
        }
        Returns: Json
      }
      validate_password_reset_token: {
        Args: {
          p_token: string
        }
        Returns: Json
      }
      use_password_reset_token: {
        Args: {
          p_token: string
          p_new_password: string
        }
        Returns: Json
      }
      cleanup_expired_password_reset_tokens: {
        Args: Record<string, never>
        Returns: Json
      }
      get_password_reset_status: {
        Args: {
          p_email: string
        }
        Returns: Json
      }
      log_password_reset_audit: {
        Args: {
          p_action: string
          p_email: string
          p_user_id?: string
          p_result?: string
          p_error_reason?: string
        }
        Returns: void
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
    }
    CompositeTypes: {
      dashboard_stats: {
        total_teachers: number | null
        total_students: number | null
        new_students_today: number | null
        new_students_this_week: number | null
        total_revenue: number | null
        active_sessions: number | null
        completed_sessions: number | null
        pending_verifications: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher", "admin"],
    },
  },
} as const
