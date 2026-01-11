export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      check_ins: {
        Row: {
          alcohol_units: number | null
          created_at: string | null
          cravings: boolean | null
          date: string
          energy: number | null
          gratitude: string | null
          id: string
          mood: number | null
          notes: string | null
          soreness: number | null
          updated_at: string | null
          user_id: string
          win_of_day: string | null
        }
        Insert: {
          alcohol_units?: number | null
          created_at?: string | null
          cravings?: boolean | null
          date: string
          energy?: number | null
          gratitude?: string | null
          id?: string
          mood?: number | null
          notes?: string | null
          soreness?: number | null
          updated_at?: string | null
          user_id: string
          win_of_day?: string | null
        }
        Update: {
          alcohol_units?: number | null
          created_at?: string | null
          cravings?: boolean | null
          date?: string
          energy?: number | null
          gratitude?: string | null
          id?: string
          mood?: number | null
          notes?: string | null
          soreness?: number | null
          updated_at?: string | null
          user_id?: string
          win_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_actions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          message_id: string
          metadata: Json | null
          title: string
          type: Database["public"]["Enums"]["coach_action_type"]
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          message_id: string
          metadata?: Json | null
          title: string
          type: Database["public"]["Enums"]["coach_action_type"]
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          message_id?: string
          metadata?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["coach_action_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "coach_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_messages: {
        Row: {
          citations: string[] | null
          content: string
          context_data: Json | null
          created_at: string | null
          id: string
          is_safety_card: boolean | null
          mode: Database["public"]["Enums"]["coach_mode"] | null
          timestamp: string | null
          type: Database["public"]["Enums"]["coach_message_type"]
          user_id: string
        }
        Insert: {
          citations?: string[] | null
          content: string
          context_data?: Json | null
          created_at?: string | null
          id?: string
          is_safety_card?: boolean | null
          mode?: Database["public"]["Enums"]["coach_mode"] | null
          timestamp?: string | null
          type: Database["public"]["Enums"]["coach_message_type"]
          user_id: string
        }
        Update: {
          citations?: string[] | null
          content?: string
          context_data?: Json | null
          created_at?: string | null
          id?: string
          is_safety_card?: boolean | null
          mode?: Database["public"]["Enums"]["coach_mode"] | null
          timestamp?: string | null
          type?: Database["public"]["Enums"]["coach_message_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          connection_data: Json | null
          created_at: string | null
          data_quality: Database["public"]["Enums"]["data_quality"] | null
          id: string
          last_sync: string | null
          name: string
          status: Database["public"]["Enums"]["device_status"] | null
          type: Database["public"]["Enums"]["device_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          connection_data?: Json | null
          created_at?: string | null
          data_quality?: Database["public"]["Enums"]["data_quality"] | null
          id?: string
          last_sync?: string | null
          name: string
          status?: Database["public"]["Enums"]["device_status"] | null
          type: Database["public"]["Enums"]["device_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          connection_data?: Json | null
          created_at?: string | null
          data_quality?: Database["public"]["Enums"]["data_quality"] | null
          id?: string
          last_sync?: string | null
          name?: string
          status?: Database["public"]["Enums"]["device_status"] | null
          type?: Database["public"]["Enums"]["device_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          baseline: number | null
          category: Database["public"]["Enums"]["goal_category"]
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          target: number
          title: string
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          baseline?: number | null
          category: Database["public"]["Enums"]["goal_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          target: number
          title: string
          unit: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          baseline?: number | null
          category?: Database["public"]["Enums"]["goal_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          target?: number
          title?: string
          unit?: string
          updated_at?: string | null
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
      habit_completions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          habit_id: string
          id: string
          notes: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          habit_id: string
          id?: string
          notes?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          habit_id?: string
          id?: string
          notes?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          adherence: number | null
          created_at: string | null
          description: string | null
          frequency: Database["public"]["Enums"]["habit_frequency"]
          goal_id: string
          id: string
          is_active: boolean | null
          level: Database["public"]["Enums"]["habit_level"]
          streak: number | null
          target_value: number
          title: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          adherence?: number | null
          created_at?: string | null
          description?: string | null
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          goal_id: string
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["habit_level"]
          streak?: number | null
          target_value?: number
          title: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          adherence?: number | null
          created_at?: string | null
          description?: string | null
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          goal_id?: string
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["habit_level"]
          streak?: number | null
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          quality: Database["public"]["Enums"]["data_quality"] | null
          source: string
          timestamp: string
          type: Database["public"]["Enums"]["metric_type"]
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          quality?: Database["public"]["Enums"]["data_quality"] | null
          source?: string
          timestamp: string
          type: Database["public"]["Enums"]["metric_type"]
          unit: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          quality?: Database["public"]["Enums"]["data_quality"] | null
          source?: string
          timestamp?: string
          type?: Database["public"]["Enums"]["metric_type"]
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      program_tasks: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["program_task_type"]
          updated_at: string | null
          week_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
          type: Database["public"]["Enums"]["program_task_type"]
          updated_at?: string | null
          week_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["program_task_type"]
          updated_at?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_tasks_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      program_weeks: {
        Row: {
          created_at: string | null
          id: string
          program_id: string
          reading_materials: string[] | null
          review_notes: string | null
          week_number: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id: string
          reading_materials?: string[] | null
          review_notes?: string | null
          week_number: number
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string
          reading_materials?: string[] | null
          review_notes?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          adherence: number | null
          category: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          duration_weeks: number
          id: string
          is_active: boolean | null
          started_at: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adherence?: number | null
          category: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_weeks?: number
          id?: string
          is_active?: boolean | null
          started_at?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adherence?: number | null
          category?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_weeks?: number
          id?: string
          is_active?: boolean | null
          started_at?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          notifications_evening: boolean | null
          notifications_morning: boolean | null
          notifications_nudges: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          time_format: Database["public"]["Enums"]["time_format"] | null
          timezone: string | null
          units: Database["public"]["Enums"]["unit_system"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notifications_evening?: boolean | null
          notifications_morning?: boolean | null
          notifications_nudges?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          time_format?: Database["public"]["Enums"]["time_format"] | null
          timezone?: string | null
          units?: Database["public"]["Enums"]["unit_system"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notifications_evening?: boolean | null
          notifications_morning?: boolean | null
          notifications_nudges?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          time_format?: Database["public"]["Enums"]["time_format"] | null
          timezone?: string | null
          units?: Database["public"]["Enums"]["unit_system"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          start_date?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_habit_adherence: {
        Args: {
          habit_uuid: string
          days_back?: number
        }
        Returns: number
      }
      update_habit_streak: {
        Args: {
          habit_uuid: string
        }
        Returns: number
      }
    }
    Enums: {
      coach_action_type: "checklist" | "timer" | "reminder" | "schedule"
      coach_message_type: "user" | "coach"
      coach_mode: "explain" | "plan" | "motivate" | "checkin"
      data_quality: "high" | "medium" | "low"
      device_status: "connected" | "syncing" | "attention" | "disconnected"
      device_type: "wearable" | "scale" | "app" | "manual"
      goal_category: "sleep" | "movement" | "nutrition" | "stress" | "body" | "cognitive"
      habit_frequency: "daily" | "weekly" | "custom"
      habit_level: "starter" | "solid" | "stretch"
      metric_type: "sleep_duration" | "sleep_efficiency" | "hrv" | "resting_hr" | "steps" | "zone2_minutes" | "protein" | "hydration" | "mood" | "energy" | "weight" | "body_fat" | "muscle_mass" | "vo2_max" | "blood_pressure_systolic" | "blood_pressure_diastolic" | "glucose" | "ketones"
      program_task_type: "nutrition" | "training" | "recovery" | "mindset"
      time_format: "12h" | "24h"
      unit_system: "metric" | "imperial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}