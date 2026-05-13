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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          monthly_limit: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          created_at: string
          exam_date: string
          id: string
          location: string | null
          notes: string | null
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          exam_date: string
          id?: string
          location?: string | null
          notes?: string | null
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          exam_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          name: string
          note: string | null
          occurred_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          id?: string
          name: string
          note?: string | null
          occurred_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          occurred_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          session_type: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_minutes: number
          id?: string
          notes?: string | null
          session_type?: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          session_type?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_items: {
        Row: {
          created_at: string
          id: string
          name: string
          purchased: boolean
          quantity: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          purchased?: boolean
          quantity?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          purchased?: boolean
          quantity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habits: {
        Row: {
          active: boolean
          created_at: string
          current_streak: number
          id: string
          last_completed_at: string | null
          name: string
          target_per_week: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_streak?: number
          id?: string
          last_completed_at?: string | null
          name: string
          target_per_week?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_streak?: number
          id?: string
          last_completed_at?: string | null
          name?: string
          target_per_week?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          created_at: string
          id: string
          name: string
          note: string | null
          received_at: string
          recurring: boolean
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          name: string
          note?: string | null
          received_at?: string
          recurring?: boolean
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          received_at?: string
          recurring?: boolean
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          calories: number | null
          carbs_g: number | null
          cooked: boolean
          created_at: string
          day_of_week: number
          description: string | null
          estimated_cost: number | null
          fat_g: number | null
          id: string
          ingredients: Json
          meal_type: string
          name: string
          prep_minutes: number | null
          prep_tip: string | null
          protein_g: number | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          cooked?: boolean
          created_at?: string
          day_of_week: number
          description?: string | null
          estimated_cost?: number | null
          fat_g?: number | null
          id?: string
          ingredients?: Json
          meal_type?: string
          name: string
          prep_minutes?: number | null
          prep_tip?: string | null
          protein_g?: number | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          cooked?: boolean
          created_at?: string
          day_of_week?: number
          description?: string | null
          estimated_cost?: number | null
          fat_g?: number | null
          id?: string
          ingredients?: Json
          meal_type?: string
          name?: string
          prep_minutes?: number | null
          prep_tip?: string | null
          protein_g?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number
          carbs_g: number
          consumed_at: string
          created_at: string
          fat_g: number
          id: string
          meal_type: string
          name: string
          protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          consumed_at?: string
          created_at?: string
          fat_g?: number
          id?: string
          meal_type?: string
          name: string
          protein_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          consumed_at?: string
          created_at?: string
          fat_g?: number
          id?: string
          meal_type?: string
          name?: string
          protein_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          category: string
          created_at: string
          ends_at: string
          id: string
          location: string | null
          notes: string | null
          starts_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          ends_at: string
          id?: string
          location?: string | null
          notes?: string | null
          starts_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          ends_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_blocks: {
        Row: {
          created_at: string
          duration_minutes: number
          exam_id: string | null
          id: string
          notes: string | null
          scheduled_end: string
          scheduled_start: string
          status: string
          subject_id: string | null
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          exam_id?: string | null
          id?: string
          notes?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          subject_id?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          exam_id?: string | null
          id?: string
          notes?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          subject_id?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_blocks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_blocks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          started_at: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          notes?: string | null
          started_at?: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          started_at?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string | null
          color: string
          created_at: string
          id: string
          instructor: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          color?: string
          created_at?: string
          id?: string
          instructor?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          color?: string
          created_at?: string
          id?: string
          instructor?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          course: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          id: string
          priority: string
          status: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string
          status?: string
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string
          status?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          age: number | null
          availability: Json | null
          avatar_url: string | null
          chronotype: string | null
          created_at: string
          focus_style: string | null
          full_name: string | null
          goals: Json
          id: string
          major: string | null
          monthly_budget: number | null
          nutrition_goals: string | null
          nutrition_preference: string | null
          onboarding_completed: boolean
          planning_style: string | null
          sleep_time: string | null
          student_status: string | null
          study_goals: string | null
          university: string | null
          updated_at: string
          wake_time: string | null
        }
        Insert: {
          age?: number | null
          availability?: Json | null
          avatar_url?: string | null
          chronotype?: string | null
          created_at?: string
          focus_style?: string | null
          full_name?: string | null
          goals?: Json
          id: string
          major?: string | null
          monthly_budget?: number | null
          nutrition_goals?: string | null
          nutrition_preference?: string | null
          onboarding_completed?: boolean
          planning_style?: string | null
          sleep_time?: string | null
          student_status?: string | null
          study_goals?: string | null
          university?: string | null
          updated_at?: string
          wake_time?: string | null
        }
        Update: {
          age?: number | null
          availability?: Json | null
          avatar_url?: string | null
          chronotype?: string | null
          created_at?: string
          focus_style?: string | null
          full_name?: string | null
          goals?: Json
          id?: string
          major?: string | null
          monthly_budget?: number | null
          nutrition_goals?: string | null
          nutrition_preference?: string | null
          onboarding_completed?: boolean
          planning_style?: string | null
          sleep_time?: string | null
          student_status?: string | null
          study_goals?: string | null
          university?: string | null
          updated_at?: string
          wake_time?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
