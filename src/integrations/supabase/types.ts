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
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
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
