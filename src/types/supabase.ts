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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      application_notes: {
        Row: {
          application_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_at: string
          created_by: string
          id: string
          new_status: Database["public"]["Enums"]["application_status"]
          previous_status:
            | Database["public"]["Enums"]["application_status"]
            | null
        }
        Insert: {
          application_id: string
          changed_at?: string
          created_by: string
          id?: string
          new_status: Database["public"]["Enums"]["application_status"]
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
        }
        Update: {
          application_id?: string
          changed_at?: string
          created_by?: string
          id?: string
          new_status?: Database["public"]["Enums"]["application_status"]
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          application_date: string | null
          company_id: string
          created_at: string
          currency: string
          current_status: Database["public"]["Enums"]["application_status"]
          cv_version_id: string
          deleted_at: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          id: string
          job_url: string | null
          location: string | null
          offer_salary: number | null
          position: string
          rejection_reason: string | null
          response_date: string | null
          salary_max: number | null
          salary_min: number | null
          source: Database["public"]["Enums"]["application_source"] | null
          updated_at: string
          user_id: string
          work_mode: Database["public"]["Enums"]["work_mode"] | null
        }
        Insert: {
          application_date?: string | null
          company_id: string
          created_at?: string
          currency?: string
          current_status?: Database["public"]["Enums"]["application_status"]
          cv_version_id: string
          deleted_at?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          id?: string
          job_url?: string | null
          location?: string | null
          offer_salary?: number | null
          position: string
          rejection_reason?: string | null
          response_date?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source?: Database["public"]["Enums"]["application_source"] | null
          updated_at?: string
          user_id: string
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Update: {
          application_date?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          current_status?: Database["public"]["Enums"]["application_status"]
          cv_version_id?: string
          deleted_at?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          id?: string
          job_url?: string | null
          location?: string | null
          offer_salary?: number | null
          position?: string
          rejection_reason?: string | null
          response_date?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source?: Database["public"]["Enums"]["application_source"] | null
          updated_at?: string
          user_id?: string
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_company_owner_fk"
            columns: ["company_id", "user_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "applications_cv_version_owner_fk"
            columns: ["cv_version_id", "user_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          application_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          event_date: string
          id: string
          title: string
          type: Database["public"]["Enums"]["calendar_event_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          title: string
          type?: Database["public"]["Enums"]["calendar_event_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["calendar_event_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          id: string
          industry: string | null
          name: string
          size: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          industry?: string | null
          name: string
          size?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          size?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_versions: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          name: string
          updated_at: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          name: string
          updated_at?: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          name?: string
          updated_at?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          metric: Database["public"]["Enums"]["goal_metric"]
          period: Database["public"]["Enums"]["goal_period"]
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metric: Database["public"]["Enums"]["goal_metric"]
          period: Database["public"]["Enums"]["goal_period"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_value: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metric?: Database["public"]["Enums"]["goal_metric"]
          period?: Database["public"]["Enums"]["goal_period"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_feedback: {
        Row: {
          application_status_history_id: string
          created_at: string
          deleted_at: string | null
          format: Database["public"]["Enums"]["interview_format"] | null
          id: string
          notes: string
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_status_history_id: string
          created_at?: string
          deleted_at?: string | null
          format?: Database["public"]["Enums"]["interview_format"] | null
          id?: string
          notes: string
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_status_history_id?: string
          created_at?: string
          deleted_at?: string | null
          format?: Database["public"]["Enums"]["interview_format"] | null
          id?: string
          notes?: string
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_feedback_application_status_history_id_fkey"
            columns: ["application_status_history_id"]
            isOneToOne: false
            referencedRelation: "application_status_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_states: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          notification_key: string
          status: Database["public"]["Enums"]["notification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          notification_key: string
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          notification_key?: string
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval:
            | Database["public"]["Enums"]["subscription_billing_interval"]
            | null
          cancel_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          latest_invoice_id: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?:
            | Database["public"]["Enums"]["subscription_billing_interval"]
            | null
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          latest_invoice_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?:
            | Database["public"]["Enums"]["subscription_billing_interval"]
            | null
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          latest_invoice_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      company_statistics: {
        Row: {
          accepted_count: number | null
          applied_count: number | null
          final_interview_count: number | null
          hr_interview_count: number | null
          id: string | null
          name: string | null
          offer_count: number | null
          recruiter_contact_count: number | null
          rejected_count: number | null
          technical_interview_count: number | null
          total_count: number | null
          user_id: string | null
          wishlist_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_company_owner_fk"
            columns: ["id", "user_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_statistics: {
        Row: {
          accepted_count: number | null
          applied_count: number | null
          final_interview_count: number | null
          hr_interview_count: number | null
          id: string | null
          name: string | null
          offer_count: number | null
          recruiter_contact_count: number | null
          rejected_count: number | null
          technical_interview_count: number | null
          total_count: number | null
          user_id: string | null
          wishlist_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_cv_version_owner_fk"
            columns: ["id", "user_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_metrics: {
        Row: {
          accepted_count: number | null
          applied_count: number | null
          final_interview_count: number | null
          hr_interview_count: number | null
          offer_count: number | null
          recruiter_contact_count: number | null
          rejected_count: number | null
          technical_interview_count: number | null
          total_count: number | null
          user_id: string | null
          wishlist_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_statistics: {
        Row: {
          accepted_count: number | null
          applied_count: number | null
          final_interview_count: number | null
          hr_interview_count: number | null
          id: string | null
          name: string | null
          offer_count: number | null
          recruiter_contact_count: number | null
          rejected_count: number | null
          technical_interview_count: number | null
          total_count: number | null
          user_id: string | null
          wishlist_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_application_with_genesis: {
        Args: {
          p_application_date: string
          p_company_id: string
          p_currency: string
          p_cv_version_id: string
          p_employment_type: Database["public"]["Enums"]["employment_type"]
          p_job_url: string
          p_location: string
          p_position: string
          p_salary_max: number
          p_salary_min: number
          p_source: Database["public"]["Enums"]["application_source"]
          p_user_id: string
          p_work_mode: Database["public"]["Enums"]["work_mode"]
        }
        Returns: {
          application_date: string | null
          company_id: string
          created_at: string
          currency: string
          current_status: Database["public"]["Enums"]["application_status"]
          cv_version_id: string
          deleted_at: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          id: string
          job_url: string | null
          location: string | null
          offer_salary: number | null
          position: string
          rejection_reason: string | null
          response_date: string | null
          salary_max: number | null
          salary_min: number | null
          source: Database["public"]["Enums"]["application_source"] | null
          updated_at: string
          user_id: string
          work_mode: Database["public"]["Enums"]["work_mode"] | null
        }
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_application_status: {
        Args: {
          p_application_date: string
          p_application_id: string
          p_new_status: Database["public"]["Enums"]["application_status"]
          p_previous_status: Database["public"]["Enums"]["application_status"]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      application_source:
        | "LinkedIn"
        | "Indeed"
        | "Referral"
        | "Company Website"
        | "Recruiter"
        | "Other"
      application_status:
        | "Wishlist"
        | "Applied"
        | "Recruiter Contact"
        | "HR Interview"
        | "Technical Interview"
        | "Final Interview"
        | "Offer"
        | "Accepted"
        | "Rejected"
      calendar_event_type: "reminder" | "custom"
      employment_type:
        | "Full Time"
        | "Part Time"
        | "Internship"
        | "Contract"
        | "Freelance"
      goal_metric:
        | "applications"
        | "interviews"
        | "offers"
        | "recruiter_contacts"
      goal_period: "weekly" | "monthly" | "quarterly" | "yearly" | "total"
      goal_status: "active" | "paused" | "archived"
      interview_format:
        | "Phone"
        | "Video"
        | "On-site"
        | "Technical"
        | "Behavioral"
      notification_status: "unread" | "read" | "archived"
      subscription_billing_interval: "month" | "year"
      subscription_plan: "free" | "pro"
      subscription_status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused"
      work_mode: "Remote" | "Hybrid" | "On Site"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      application_source: [
        "LinkedIn",
        "Indeed",
        "Referral",
        "Company Website",
        "Recruiter",
        "Other",
      ],
      application_status: [
        "Wishlist",
        "Applied",
        "Recruiter Contact",
        "HR Interview",
        "Technical Interview",
        "Final Interview",
        "Offer",
        "Accepted",
        "Rejected",
      ],
      calendar_event_type: ["reminder", "custom"],
      employment_type: [
        "Full Time",
        "Part Time",
        "Internship",
        "Contract",
        "Freelance",
      ],
      goal_metric: [
        "applications",
        "interviews",
        "offers",
        "recruiter_contacts",
      ],
      goal_period: ["weekly", "monthly", "quarterly", "yearly", "total"],
      goal_status: ["active", "paused", "archived"],
      interview_format: [
        "Phone",
        "Video",
        "On-site",
        "Technical",
        "Behavioral",
      ],
      notification_status: ["unread", "read", "archived"],
      subscription_billing_interval: ["month", "year"],
      subscription_plan: ["free", "pro"],
      subscription_status: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
      work_mode: ["Remote", "Hybrid", "On Site"],
    },
  },
} as const
