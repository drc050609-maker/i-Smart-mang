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
      addresses: {
        Row: {
          city: string | null
          id: number
          state: string | null
          "street 1": string
          "street 2": string | null
          student: number | null
          "zip code": string | null
        }
        Insert: {
          city?: string | null
          id?: number
          state?: string | null
          "street 1": string
          "street 2"?: string | null
          student?: number | null
          "zip code"?: string | null
        }
        Update: {
          city?: string | null
          id?: number
          state?: string | null
          "street 1"?: string
          "street 2"?: string | null
          student?: number | null
          "zip code"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Addresses_student_fkey"
            columns: ["student"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          class_id: number
          class_schedule_id: number | null
          created_at: string
          created_by: string | null
          id: number
          notes: string | null
          session_date: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: number
          updated_at: string
        }
        Insert: {
          class_id: number
          class_schedule_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          notes?: string | null
          session_date: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: number
          updated_at?: string
        }
        Update: {
          class_id?: number
          class_schedule_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          notes?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_class_schedule_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_credit_grants: {
        Row: {
          class_id: number
          created_at: string
          created_by: string | null
          credits: number
          id: number
          reason: string | null
          student_id: number
        }
        Insert: {
          class_id: number
          created_at?: string
          created_by?: string | null
          credits: number
          id?: never
          reason?: string | null
          student_id: number
        }
        Update: {
          class_id?: number
          created_at?: string
          created_by?: string | null
          credits?: number
          id?: never
          reason?: string | null
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_credit_grants_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_credit_grants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_credit_transfers: {
        Row: {
          class_id: number
          created_at: string
          created_by: string | null
          credits: number
          from_student_id: number
          id: number
          reason: string | null
          related_payment_id: number | null
          to_student_id: number | null
          transfer_type: Database["public"]["Enums"]["credit_transfer_type"]
        }
        Insert: {
          class_id: number
          created_at?: string
          created_by?: string | null
          credits: number
          from_student_id: number
          id?: never
          reason?: string | null
          related_payment_id?: number | null
          to_student_id?: number | null
          transfer_type: Database["public"]["Enums"]["credit_transfer_type"]
        }
        Update: {
          class_id?: number
          created_at?: string
          created_by?: string | null
          credits?: number
          from_student_id?: number
          id?: never
          reason?: string | null
          related_payment_id?: number | null
          to_student_id?: number | null
          transfer_type?: Database["public"]["Enums"]["credit_transfer_type"]
        }
        Relationships: [
          {
            foreignKeyName: "class_credit_transfers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_credit_transfers_from_student_id_fkey"
            columns: ["from_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_credit_transfers_related_payment_id_fkey"
            columns: ["related_payment_id"]
            isOneToOne: false
            referencedRelation: "class_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_credit_transfers_to_student_id_fkey"
            columns: ["to_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_credit_writeoffs: {
        Row: {
          class_id: number
          created_at: string
          created_by: string | null
          credits: number
          id: number
          reason: string | null
          student_id: number
        }
        Insert: {
          class_id: number
          created_at?: string
          created_by?: string | null
          credits: number
          id?: never
          reason?: string | null
          student_id: number
        }
        Update: {
          class_id?: number
          created_at?: string
          created_by?: string | null
          credits?: number
          id?: never
          reason?: string | null
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_credit_writeoffs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_credit_writeoffs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_makeup_sessions: {
        Row: {
          class_id: number
          class_schedule_id: number | null
          created_at: string
          created_by: string | null
          credit_cost: number
          id: number
          notes: string | null
          related_attendance_id: number | null
          session_date: string
          student_id: number
        }
        Insert: {
          class_id: number
          class_schedule_id?: number | null
          created_at?: string
          created_by?: string | null
          credit_cost: number
          id?: never
          notes?: string | null
          related_attendance_id?: number | null
          session_date: string
          student_id: number
        }
        Update: {
          class_id?: number
          class_schedule_id?: number | null
          created_at?: string
          created_by?: string | null
          credit_cost?: number
          id?: never
          notes?: string | null
          related_attendance_id?: number | null
          session_date?: string
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_makeup_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_makeup_sessions_class_schedule_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_makeup_sessions_related_attendance_id_fkey"
            columns: ["related_attendance_id"]
            isOneToOne: false
            referencedRelation: "class_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_makeup_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_payments: {
        Row: {
          amount_cents: number
          class_id: number
          created_by: string | null
          credits_applied_at: string | null
          effective_amount_cents: number
          exchanged_for_payment_id: number | null
          id: number
          notes: string | null
          paid_at: string
          payment_plan: Database["public"]["Enums"]["payment_plan"]
          session_count: number
          status: Database["public"]["Enums"]["payment_status"]
          status_changed_at: string | null
          status_changed_by: string | null
          status_notes: string | null
          student_id: number
        }
        Insert: {
          amount_cents: number
          class_id: number
          created_by?: string | null
          credits_applied_at?: string | null
          effective_amount_cents?: number
          exchanged_for_payment_id?: number | null
          id?: never
          notes?: string | null
          paid_at?: string
          payment_plan: Database["public"]["Enums"]["payment_plan"]
          session_count: number
          status?: Database["public"]["Enums"]["payment_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          student_id: number
        }
        Update: {
          amount_cents?: number
          class_id?: number
          created_by?: string | null
          credits_applied_at?: string | null
          effective_amount_cents?: number
          exchanged_for_payment_id?: number | null
          id?: never
          notes?: string | null
          paid_at?: string
          payment_plan?: Database["public"]["Enums"]["payment_plan"]
          session_count?: number
          status?: Database["public"]["Enums"]["payment_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_payments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_payments_exchanged_for_payment_id_fkey"
            columns: ["exchanged_for_payment_id"]
            isOneToOne: false
            referencedRelation: "class_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedule_exceptions: {
        Row: {
          id: number
          is_cancelled: boolean
          original_date: string
          override_date: string
          schedule_end_time: string
          schedule_id: number
          schedule_start_time: string
        }
        Insert: {
          id?: number
          is_cancelled?: boolean
          original_date: string
          override_date: string
          schedule_end_time: string
          schedule_id: number
          schedule_start_time: string
        }
        Update: {
          id?: number
          is_cancelled?: boolean
          original_date?: string
          override_date?: string
          schedule_end_time?: string
          schedule_id?: number
          schedule_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_exceptions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          class_id: number
          id: number
          is_recurring: boolean
          schedule_date: string | null
          schedule_day_of_week: number | null
          schedule_end_time: string
          schedule_start_time: string
        }
        Insert: {
          class_id: number
          id?: number
          is_recurring?: boolean
          schedule_date?: string | null
          schedule_day_of_week?: number | null
          schedule_end_time: string
          schedule_start_time: string
        }
        Update: {
          class_id?: number
          id?: number
          is_recurring?: boolean
          schedule_date?: string | null
          schedule_day_of_week?: number | null
          schedule_end_time?: string
          schedule_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_session_records: {
        Row: {
          class_id: number
          class_schedule_id: number | null
          created_at: string
          created_by: string | null
          id: number
          notes: string | null
          session_date: string
          source: Database["public"]["Enums"]["session_record_source"]
          status: Database["public"]["Enums"]["session_record_status"]
          student_id: number
        }
        Insert: {
          class_id: number
          class_schedule_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          notes?: string | null
          session_date: string
          source: Database["public"]["Enums"]["session_record_source"]
          status: Database["public"]["Enums"]["session_record_status"]
          student_id: number
        }
        Update: {
          class_id?: number
          class_schedule_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          notes?: string | null
          session_date?: string
          source?: Database["public"]["Enums"]["session_record_source"]
          status?: Database["public"]["Enums"]["session_record_status"]
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_session_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_session_records_class_schedule_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_session_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_track: string | null
          duration_minutes: number | null
          id: number
          is_active: boolean
          lesson_type: string | null
          location_id: number | null
          package_20_price_cents: number | null
          package_50_price_cents: number | null
          room_id: number | null
          single_price_cents: number | null
          subject: string
          teacher_id: number | null
        }
        Insert: {
          class_track?: string | null
          duration_minutes?: number | null
          id?: number
          is_active?: boolean
          lesson_type?: string | null
          location_id?: number | null
          package_20_price_cents?: number | null
          package_50_price_cents?: number | null
          room_id?: number | null
          single_price_cents?: number | null
          subject: string
          teacher_id?: number | null
        }
        Update: {
          class_track?: string | null
          duration_minutes?: number | null
          id?: number
          is_active?: boolean
          lesson_type?: string | null
          location_id?: number | null
          package_20_price_cents?: number | null
          package_50_price_cents?: number | null
          room_id?: number | null
          single_price_cents?: number | null
          subject?: string
          teacher_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          "class id": number
          created_date: string | null
          id: number
          is_active: boolean | null
          "student id": number | null
          updated_date: string | null
        }
        Insert: {
          "class id": number
          created_date?: string | null
          id?: number
          is_active?: boolean | null
          "student id"?: number | null
          updated_date?: string | null
        }
        Update: {
          "class id"?: number
          created_date?: string | null
          id?: number
          is_active?: boolean | null
          "student id"?: number | null
          updated_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class id_fkey"
            columns: ["class id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student id_fkey"
            columns: ["student id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media: {
        Row: {
          created_at: string
          event_id: number
          id: number
          media_type: string
          mime_type: string | null
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          event_id: number
          id?: number
          media_type: string
          mime_type?: string | null
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          event_id?: number
          id?: number
          media_type?: string
          mime_type?: string | null
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: number
          title: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: number
          title?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: number
          title?: string | null
        }
        Relationships: []
      }
      lead_children: {
        Row: {
          background: string | null
          converted_at: string | null
          created_at: string
          dob: string | null
          experience: string | null
          first_name: string
          id: number
          last_name: string | null
          lead_id: number
          sort_order: number
          student_id: number | null
        }
        Insert: {
          background?: string | null
          converted_at?: string | null
          created_at?: string
          dob?: string | null
          experience?: string | null
          first_name: string
          id?: never
          last_name?: string | null
          lead_id: number
          sort_order?: number
          student_id?: number | null
        }
        Update: {
          background?: string | null
          converted_at?: string | null
          created_at?: string
          dob?: string | null
          experience?: string | null
          first_name?: string
          id?: never
          last_name?: string | null
          lead_id?: number
          sort_order?: number
          student_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_children_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_children_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          description: string | null
          email: string | null
          id: number
          is_active: boolean
          location: Database["public"]["Enums"]["staff_location"] | null
          needs_future_contact: boolean
          parent_first_name: string
          parent_last_name: string | null
          phone_number: string
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          street_1: string | null
          street_2: string | null
          student_id: number | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: never
          is_active?: boolean
          location?: Database["public"]["Enums"]["staff_location"] | null
          needs_future_contact?: boolean
          parent_first_name: string
          parent_last_name?: string | null
          phone_number: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          street_1?: string | null
          street_2?: string | null
          student_id?: number | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: never
          is_active?: boolean
          location?: Database["public"]["Enums"]["staff_location"] | null
          needs_future_contact?: boolean
          parent_first_name?: string
          parent_last_name?: string | null
          phone_number?: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          street_1?: string | null
          street_2?: string | null
          student_id?: number | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: number
          is_active: boolean
          name: string
          slug: string
          trial_price_cents: number
          trial_teacher_pay_cents: number
        }
        Insert: {
          id?: never
          is_active?: boolean
          name: string
          slug: string
          trial_price_cents?: number
          trial_teacher_pay_cents?: number
        }
        Update: {
          id?: never
          is_active?: boolean
          name?: string
          slug?: string
          trial_price_cents?: number
          trial_teacher_pay_cents?: number
        }
        Relationships: []
      }
      member_accounts: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_active: boolean
          member_type: Database["public"]["Enums"]["member_type"]
          student_id: number | null
          teacher_id: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id: string
          is_active?: boolean
          member_type: Database["public"]["Enums"]["member_type"]
          student_id?: number | null
          teacher_id?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean
          member_type?: Database["public"]["Enums"]["member_type"]
          student_id?: number | null
          teacher_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_accounts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_statement_entries: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          day_of_month: number
          description: string
          entry_type: Database["public"]["Enums"]["statement_entry_type"]
          id: number
          is_active: boolean
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          day_of_month?: number
          description: string
          entry_type?: Database["public"]["Enums"]["statement_entry_type"]
          id?: never
          is_active?: boolean
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          day_of_month?: number
          description?: string
          entry_type?: Database["public"]["Enums"]["statement_entry_type"]
          id?: never
          is_active?: boolean
        }
        Relationships: []
      }
      rooms: {
        Row: {
          class_size: number
          id: number
          location_id: number | null
          room_number: string
        }
        Insert: {
          class_size: number
          id?: number
          location_id?: number | null
          room_number: string
        }
        Update: {
          class_size?: number
          id?: number
          location_id?: number | null
          room_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_accounts: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          location: Database["public"]["Enums"]["staff_location"]
          preferred_language: Database["public"]["Enums"]["staff_language"]
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          location?: Database["public"]["Enums"]["staff_location"]
          preferred_language?: Database["public"]["Enums"]["staff_language"]
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          location?: Database["public"]["Enums"]["staff_location"]
          preferred_language?: Database["public"]["Enums"]["staff_language"]
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: []
      }
      financial_adjustments: {
        Row: {
          adjustment_cents: number
          corrected_amount_cents: number
          created_at: string
          created_by: string | null
          field_name: string
          id: number
          original_amount_cents: number
          reason: string
          source_id: number
          source_kind: Database["public"]["Enums"]["financial_source_kind"]
          statement_entry_id: number | null
        }
        Insert: {
          adjustment_cents: number
          corrected_amount_cents: number
          created_at?: string
          created_by?: string | null
          field_name?: string
          id?: never
          original_amount_cents: number
          reason: string
          source_id: number
          source_kind: Database["public"]["Enums"]["financial_source_kind"]
          statement_entry_id?: number | null
        }
        Update: {
          adjustment_cents?: number
          corrected_amount_cents?: number
          created_at?: string
          created_by?: string | null
          field_name?: string
          id?: never
          original_amount_cents?: number
          reason?: string
          source_id?: number
          source_kind?: Database["public"]["Enums"]["financial_source_kind"]
          statement_entry_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_statement_entry_id_fkey"
            columns: ["statement_entry_id"]
            isOneToOne: false
            referencedRelation: "statement_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_entries: {
        Row: {
          amount_cents: number
          class_payment_id: number | null
          corrects_entry_id: number | null
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_type: Database["public"]["Enums"]["statement_entry_type"]
          financial_adjustment_id: number | null
          id: number
          recurring_statement_entry_id: number | null
          student_purchase_id: number | null
          teacher_paycheck_id: number | null
        }
        Insert: {
          amount_cents: number
          class_payment_id?: number | null
          corrects_entry_id?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          entry_type: Database["public"]["Enums"]["statement_entry_type"]
          financial_adjustment_id?: number | null
          id?: never
          recurring_statement_entry_id?: number | null
          student_purchase_id?: number | null
          teacher_paycheck_id?: number | null
        }
        Update: {
          amount_cents?: number
          class_payment_id?: number | null
          corrects_entry_id?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["statement_entry_type"]
          financial_adjustment_id?: number | null
          id?: never
          recurring_statement_entry_id?: number | null
          student_purchase_id?: number | null
          teacher_paycheck_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "statement_entries_class_payment_id_fkey"
            columns: ["class_payment_id"]
            isOneToOne: false
            referencedRelation: "class_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_entries_recurring_statement_entry_id_fkey"
            columns: ["recurring_statement_entry_id"]
            isOneToOne: false
            referencedRelation: "recurring_statement_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_entries_student_purchase_id_fkey"
            columns: ["student_purchase_id"]
            isOneToOne: false
            referencedRelation: "student_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_entries_teacher_paycheck_id_fkey"
            columns: ["teacher_paycheck_id"]
            isOneToOne: false
            referencedRelation: "teacher_paychecks"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_periods: {
        Row: {
          created_at: string
          created_by: string | null
          month: number
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          month: number
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          month?: number
          year?: number
        }
        Relationships: []
      }
      student_class_balances: {
        Row: {
          absence_count: number
          class_id: number
          id: number
          sessions_remaining: number
          sessions_total: number
          sessions_used: number
          student_id: number
          updated_at: string
        }
        Insert: {
          absence_count?: number
          class_id: number
          id?: never
          sessions_remaining?: number
          sessions_total?: number
          sessions_used?: number
          student_id: number
          updated_at?: string
        }
        Update: {
          absence_count?: number
          class_id?: number
          id?: never
          sessions_remaining?: number
          sessions_total?: number
          sessions_used?: number
          student_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_class_balances_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_balances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_class_history: {
        Row: {
          attendance_status:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          class_attendance_id: number | null
          class_id: number
          class_schedule_id: number | null
          created_at: string
          created_by: string | null
          credits_used: number
          history_type: Database["public"]["Enums"]["student_class_history_type"]
          id: number
          makeup_session_id: number | null
          notes: string | null
          session_date: string
          session_record_id: number | null
          source: Database["public"]["Enums"]["session_record_source"]
          student_id: number
          updated_at: string
        }
        Insert: {
          attendance_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          class_attendance_id?: number | null
          class_id: number
          class_schedule_id?: number | null
          created_at?: string
          created_by?: string | null
          credits_used?: number
          history_type?: Database["public"]["Enums"]["student_class_history_type"]
          id?: never
          makeup_session_id?: number | null
          notes?: string | null
          session_date: string
          session_record_id?: number | null
          source?: Database["public"]["Enums"]["session_record_source"]
          student_id: number
          updated_at?: string
        }
        Update: {
          attendance_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          class_attendance_id?: number | null
          class_id?: number
          class_schedule_id?: number | null
          created_at?: string
          created_by?: string | null
          credits_used?: number
          history_type?: Database["public"]["Enums"]["student_class_history_type"]
          id?: never
          makeup_session_id?: number | null
          notes?: string | null
          session_date?: string
          session_record_id?: number | null
          source?: Database["public"]["Enums"]["session_record_source"]
          student_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_class_history_class_attendance_id_fkey"
            columns: ["class_attendance_id"]
            isOneToOne: false
            referencedRelation: "class_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_history_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_history_class_schedule_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_history_makeup_session_id_fkey"
            columns: ["makeup_session_id"]
            isOneToOne: false
            referencedRelation: "class_makeup_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_history_session_record_id_fkey"
            columns: ["session_record_id"]
            isOneToOne: false
            referencedRelation: "class_session_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          description: string
          effective_amount_cents: number
          id: number
          purchased_at: string
          student_id: number
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          description: string
          effective_amount_cents?: number
          id?: never
          purchased_at?: string
          student_id: number
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          description?: string
          effective_amount_cents?: number
          id?: never
          purchased_at?: string
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_purchases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          dob: string | null
          experience: string | null
          "first name": string
          id: number
          is_active: boolean
          "last name": string | null
          location_id: number | null
          starting_class_credits: number
        }
        Insert: {
          dob?: string | null
          experience?: string | null
          "first name": string
          id?: number
          is_active?: boolean
          "last name"?: string | null
          location_id?: number | null
          starting_class_credits?: number
        }
        Update: {
          dob?: string | null
          experience?: string | null
          "first name"?: string
          id?: number
          is_active?: boolean
          "last name"?: string | null
          location_id?: number | null
          starting_class_credits?: number
        }
        Relationships: [
          {
            foreignKeyName: "students_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_pay_rates: {
        Row: {
          class_id: number
          rate_cents: number
          teacher_id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          class_id: number
          rate_cents: number
          teacher_id: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          class_id?: number
          rate_cents?: number
          teacher_id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_pay_rates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_pay_rates_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_paycheck_lines: {
        Row: {
          class_id: number
          id: number
          line_total_cents: number
          paycheck_id: number
          rate_cents: number
          session_count: number
        }
        Insert: {
          class_id: number
          id?: never
          line_total_cents: number
          paycheck_id: number
          rate_cents: number
          session_count: number
        }
        Update: {
          class_id?: number
          id?: never
          line_total_cents?: number
          paycheck_id?: number
          rate_cents?: number
          session_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_paycheck_lines_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_paycheck_lines_paycheck_id_fkey"
            columns: ["paycheck_id"]
            isOneToOne: false
            referencedRelation: "teacher_paychecks"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_paychecks: {
        Row: {
          created_at: string
          created_by: string | null
          effective_amount_cents: number
          id: number
          month: number
          statement_entry_id: number | null
          teacher_id: number
          total_amount_cents: number
          total_sessions: number
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_amount_cents?: number
          id?: never
          month: number
          statement_entry_id?: number | null
          teacher_id: number
          total_amount_cents: number
          total_sessions: number
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_amount_cents?: number
          id?: never
          month?: number
          statement_entry_id?: number | null
          teacher_id?: number
          total_amount_cents?: number
          total_sessions?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_paychecks_statement_entry_id_fkey"
            columns: ["statement_entry_id"]
            isOneToOne: false
            referencedRelation: "statement_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_paychecks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          dob: string | null
          first_name: string
          id: number
          is_active: boolean
          last_name: string | null
          location_id: number | null
          phone_number: string | null
        }
        Insert: {
          dob?: string | null
          first_name: string
          id?: number
          is_active?: boolean
          last_name?: string | null
          location_id?: number | null
          phone_number?: string | null
        }
        Update: {
          dob?: string | null
          first_name?: string
          id?: number
          is_active?: boolean
          last_name?: string | null
          location_id?: number | null
          phone_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_student_class_credits: {
        Args: { p_class_id: number; p_count: number; p_student_id: number }
        Returns: undefined
      }
      apply_recurring_statement_entries: {
        Args: { p_created_by?: string; p_month: number; p_year: number }
        Returns: undefined
      }
      book_trial_class: {
        Args: {
          p_dob?: string
          p_experience?: string
          p_first_name: string
          p_last_name?: string
          p_parent_email?: string
          p_parent_phone?: string
          p_schedule_date?: string
          p_schedule_start_time?: string
          p_subject?: string
          p_teacher_id?: number
        }
        Returns: {
          class_id: number
          schedule_id: number
          student_id: number
        }[]
      }
      correct_money_source: {
        Args: {
          p_corrected_amount_cents: number
          p_field_name?: string
          p_reason: string
          p_source_id: number
          p_source_kind: Database["public"]["Enums"]["financial_source_kind"]
        }
        Returns: number
      }
      deduct_class_credits: {
        Args: { p_class_id: number; p_count: number; p_student_id: number }
        Returns: undefined
      }
      ensure_statement_period: {
        Args: { p_created_by?: string; p_month: number; p_year: number }
        Returns: undefined
      }
      ensure_student_class_balance: {
        Args: { p_class_id: number; p_student_id: number }
        Returns: undefined
      }
      get_teacher_class_pay_rates: {
        Args: { p_teacher_id: number }
        Returns: {
          class_id: number
          rate_cents: number
        }[]
      }
      grant_student_class_credits: {
        Args: {
          p_class_id: number
          p_created_by?: string
          p_credits: number
          p_reason?: string
          p_student_id: number
        }
        Returns: number
      }
      is_active_staff: { Args: never; Returns: boolean }
      record_class_attendance: {
        Args: {
          p_class_id: number
          p_class_schedule_id?: number | null
          p_created_by?: string
          p_notes?: string
          p_session_date: string
          p_status: Database["public"]["Enums"]["attendance_status"]
          p_student_id: number
        }
        Returns: number
      }
      record_class_payment: {
        Args: {
          p_amount_cents: number
          p_class_id: number
          p_created_by?: string
          p_notes?: string
          p_payment_plan: Database["public"]["Enums"]["payment_plan"]
          p_session_count: number
          p_student_id: number
        }
        Returns: number
      }
      record_class_session: {
        Args: {
          p_class_id: number
          p_class_schedule_id?: number | null
          p_created_by?: string
          p_session_date: string
          p_source: Database["public"]["Enums"]["session_record_source"]
          p_status: Database["public"]["Enums"]["session_record_status"]
          p_student_id: number
        }
        Returns: number
      }
      record_credit_writeoff: {
        Args: {
          p_class_id: number
          p_created_by?: string
          p_credits: number
          p_reason?: string
          p_student_id: number
        }
        Returns: number
      }
      record_makeup_session: {
        Args: {
          p_class_id: number
          p_class_schedule_id?: number | null
          p_created_by?: string
          p_credit_cost: number
          p_notes?: string
          p_related_attendance_id?: number | null
          p_session_date: string
          p_student_id: number
        }
        Returns: number
      }
      record_student_purchase: {
        Args: {
          p_amount_cents: number
          p_created_by?: string
          p_description: string
          p_student_id: number
        }
        Returns: number
      }
      record_teacher_paycheck: {
        Args: {
          p_created_by?: string
          p_lines: Json
          p_month: number
          p_teacher_id: number
          p_year: number
        }
        Returns: number
      }
      set_staff_preferred_language: {
        Args: { p_language: Database["public"]["Enums"]["staff_language"] }
        Returns: undefined
      }
      transfer_student_class_credits: {
        Args: {
          p_class_id: number
          p_created_by?: string
          p_credits: number
          p_from_student_id: number
          p_reason?: string
          p_related_payment_id?: number
          p_to_student_id?: number | null
          p_transfer_type: Database["public"]["Enums"]["credit_transfer_type"]
        }
        Returns: number
      }
      require_active_staff: { Args: never; Returns: string }
      update_campus_trial_pricing: {
        Args: {
          p_location_id: number
          p_reason?: string
          p_trial_price_cents: number
          p_trial_teacher_pay_cents: number
        }
        Returns: undefined
      }
      update_class_pricing: {
        Args: {
          p_class_id: number
          p_package_20_price_cents?: number
          p_package_50_price_cents?: number
          p_reason?: string
          p_single_price_cents: number
        }
        Returns: undefined
      }
      update_recurring_statement_entry_amount: {
        Args: {
          p_amount_cents: number
          p_id: number
          p_reason?: string
        }
        Returns: undefined
      }
      update_payment_status:
        | {
            Args: {
              p_changed_by?: string
              p_exchanged_for_payment_id?: number
              p_notes?: string
              p_payment_id: number
              p_status: Database["public"]["Enums"]["payment_status"]
            }
            Returns: undefined
          }
        | {
            Args: {
              p_changed_by?: string
              p_credits?: number
              p_exchanged_for_payment_id?: number
              p_notes?: string
              p_payment_id: number
              p_status: Database["public"]["Enums"]["payment_status"]
              p_to_student_id?: number
            }
            Returns: undefined
          }
      upsert_student_class_history: {
        Args: {
          p_attendance_status?: Database["public"]["Enums"]["attendance_status"]
          p_class_attendance_id?: number
          p_class_id: number
          p_class_schedule_id: number
          p_created_by?: string
          p_credits_used?: number
          p_history_type?: Database["public"]["Enums"]["student_class_history_type"]
          p_makeup_session_id?: number
          p_notes?: string
          p_session_date: string
          p_session_record_id?: number
          p_source?: Database["public"]["Enums"]["session_record_source"]
          p_student_id: number
        }
        Returns: number
      }
      upsert_teacher_class_pay_rate: {
        Args: {
          p_class_id: number
          p_rate_cents: number
          p_teacher_id: number
          p_updated_by?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status: "present" | "absent" | "late" | "excused"
      credit_transfer_type: "exchange" | "refund"
      lead_status: "new" | "contacted" | "enrolled" | "closed"
      member_type: "student" | "teacher"
      payment_plan: "single" | "package_20" | "package_50"
      payment_status: "completed" | "refunded" | "exchanged"
      session_record_source: "automatic" | "manual"
      session_record_status: "used" | "absent"
      staff_language: "en" | "zh"
      staff_location: "brooklyn" | "staten_island"
      staff_role: "admin" | "manager"
      statement_entry_type: "income" | "expense"
      financial_source_kind:
        | "class_payment"
        | "student_purchase"
        | "teacher_paycheck"
        | "statement_entry"
        | "recurring_statement_entry"
        | "class_pricing"
        | "campus_pricing"
      student_class_history_type: "regular" | "makeup"
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
      attendance_status: ["present", "absent", "late", "excused"],
      credit_transfer_type: ["exchange", "refund"],
      lead_status: ["new", "contacted", "enrolled", "closed"],
      member_type: ["student", "teacher"],
      payment_plan: ["single", "package_20", "package_50"],
      payment_status: ["completed", "refunded", "exchanged"],
      session_record_source: ["automatic", "manual"],
      session_record_status: ["used", "absent"],
      staff_language: ["en", "zh"],
      staff_location: ["brooklyn", "staten_island"],
      staff_role: ["admin", "manager"],
      statement_entry_type: ["income", "expense"],
      financial_source_kind: [
        "class_payment",
        "student_purchase",
        "teacher_paycheck",
        "statement_entry",
        "recurring_statement_entry",
        "class_pricing",
        "campus_pricing",
      ],
      student_class_history_type: ["regular", "makeup"],
    },
  },
} as const
