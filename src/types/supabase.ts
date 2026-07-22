export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          website: string | null;
          industry: string | null;
          size: string | null;
          country: string | null;
          city: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          website?: string | null;
          industry?: string | null;
          size?: string | null;
          country?: string | null;
          city?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          website?: string | null;
          industry?: string | null;
          size?: string | null;
          country?: string | null;
          city?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      cv_versions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          cv_version_id: string;
          position: string;
          job_url: string | null;
          location: string | null;
          work_mode: Database["public"]["Enums"]["work_mode"] | null;
          employment_type:
            | Database["public"]["Enums"]["employment_type"]
            | null;
          source: Database["public"]["Enums"]["application_source"] | null;
          salary_min: number | null;
          salary_max: number | null;
          currency: string;
          application_date: string | null;
          current_status: Database["public"]["Enums"]["application_status"];
          response_date: string | null;
          offer_salary: number | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          cv_version_id: string;
          position: string;
          job_url?: string | null;
          location?: string | null;
          work_mode?: Database["public"]["Enums"]["work_mode"] | null;
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null;
          source?: Database["public"]["Enums"]["application_source"] | null;
          salary_min?: number | null;
          salary_max?: number | null;
          currency?: string;
          application_date?: string | null;
          current_status?: Database["public"]["Enums"]["application_status"];
          response_date?: string | null;
          offer_salary?: number | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          cv_version_id?: string;
          position?: string;
          job_url?: string | null;
          location?: string | null;
          work_mode?: Database["public"]["Enums"]["work_mode"] | null;
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null;
          source?: Database["public"]["Enums"]["application_source"] | null;
          salary_min?: number | null;
          salary_max?: number | null;
          currency?: string;
          application_date?: string | null;
          current_status?: Database["public"]["Enums"]["application_status"];
          response_date?: string | null;
          offer_salary?: number | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      application_status_history: {
        Row: {
          id: string;
          application_id: string;
          previous_status: Database["public"]["Enums"]["application_status"] | null;
          new_status: Database["public"]["Enums"]["application_status"];
          changed_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null;
          new_status: Database["public"]["Enums"]["application_status"];
          changed_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null;
          new_status?: Database["public"]["Enums"]["application_status"];
          changed_at?: string;
          created_by?: string;
        };
        Relationships: [];
      };
      application_notes: {
        Row: {
          id: string;
          application_id: string;
          content: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          application_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          application_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: Database["public"]["Enums"]["subscription_plan"];
          status: Database["public"]["Enums"]["subscription_status"] | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: Database["public"]["Enums"]["subscription_plan"];
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: Database["public"]["Enums"]["subscription_plan"];
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interview_feedback: {
        Row: {
          id: string;
          application_status_history_id: string;
          user_id: string;
          rating: number | null;
          format: Database["public"]["Enums"]["interview_format"] | null;
          notes: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          application_status_history_id: string;
          user_id: string;
          rating?: number | null;
          format?: Database["public"]["Enums"]["interview_format"] | null;
          notes: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          application_status_history_id?: string;
          user_id?: string;
          rating?: number | null;
          format?: Database["public"]["Enums"]["interview_format"] | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      dashboard_metrics: {
        Row: {
          user_id: string;
          wishlist_count: number;
          applied_count: number;
          recruiter_contact_count: number;
          hr_interview_count: number;
          technical_interview_count: number;
          final_interview_count: number;
          offer_count: number;
          accepted_count: number;
          rejected_count: number;
          total_count: number;
        };
        Relationships: [];
      };
      company_statistics: {
        Row: {
          user_id: string;
          id: string;
          name: string;
          wishlist_count: number;
          applied_count: number;
          recruiter_contact_count: number;
          hr_interview_count: number;
          technical_interview_count: number;
          final_interview_count: number;
          offer_count: number;
          accepted_count: number;
          rejected_count: number;
          total_count: number;
        };
        Relationships: [];
      };
      cv_statistics: {
        Row: {
          user_id: string;
          id: string;
          name: string;
          wishlist_count: number;
          applied_count: number;
          recruiter_contact_count: number;
          hr_interview_count: number;
          technical_interview_count: number;
          final_interview_count: number;
          offer_count: number;
          accepted_count: number;
          rejected_count: number;
          total_count: number;
        };
        Relationships: [];
      };
      monthly_statistics: {
        Row: {
          user_id: string;
          id: string;
          name: string;
          wishlist_count: number;
          applied_count: number;
          recruiter_contact_count: number;
          hr_interview_count: number;
          technical_interview_count: number;
          final_interview_count: number;
          offer_count: number;
          accepted_count: number;
          rejected_count: number;
          total_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_application_with_genesis: {
        Args: {
          p_user_id: string;
          p_company_id: string;
          p_cv_version_id: string;
          p_position: string;
          p_application_date: string | null;
          p_job_url: string | null;
          p_location: string | null;
          p_work_mode: Database["public"]["Enums"]["work_mode"] | null;
          p_employment_type:
            | Database["public"]["Enums"]["employment_type"]
            | null;
          p_source: Database["public"]["Enums"]["application_source"] | null;
          p_salary_min: number | null;
          p_salary_max: number | null;
          p_currency: string;
        };
        Returns: Database["public"]["Tables"]["applications"]["Row"];
      };
      transition_application_status: {
        Args: {
          p_user_id: string;
          p_application_id: string;
          p_previous_status: Database["public"]["Enums"]["application_status"];
          p_new_status: Database["public"]["Enums"]["application_status"];
          p_application_date: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      work_mode: "Remote" | "Hybrid" | "On Site";
      employment_type:
        | "Full Time"
        | "Part Time"
        | "Internship"
        | "Contract"
        | "Freelance";
      application_status:
        | "Wishlist"
        | "Applied"
        | "Recruiter Contact"
        | "HR Interview"
        | "Technical Interview"
        | "Final Interview"
        | "Offer"
        | "Accepted"
        | "Rejected";
      application_source:
        | "LinkedIn"
        | "Indeed"
        | "Referral"
        | "Company Website"
        | "Recruiter"
        | "Other";
      subscription_plan: "free" | "pro";
      subscription_status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused";
      interview_format:
        | "Phone"
        | "Video"
        | "On-site"
        | "Technical"
        | "Behavioral";
    };
    CompositeTypes: Record<never, never>;
  };
};
