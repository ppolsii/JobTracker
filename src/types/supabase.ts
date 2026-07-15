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
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
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
    };
    CompositeTypes: Record<never, never>;
  };
};
