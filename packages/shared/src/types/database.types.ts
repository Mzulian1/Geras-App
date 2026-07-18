// ============================================================
// TIPOS GENERADOS AUTOMÁTICAMENTE DESDE EL SCHEMA DE SUPABASE
//
// Este archivo se genera con:
//   mcp__supabase__generate_typescript_types (project_id: aupynxrokrpozthbzxle)
// o, desde la CLI de Supabase:
//   npx supabase gen types typescript --project-id aupynxrokrpozthbzxle > packages/shared/src/types/database.types.ts
//
// NO EDITAR A MANO. Es la única fuente de verdad sobre la forma real
// de las tablas, vistas, funciones y enums en Postgres. Si el schema
// cambia (nueva migración), hay que regenerar este archivo — cualquier
// tipo manual en types/index.ts que "adivine" un enum en vez de leerlo
// de aquí tiende a desincronizarse con la base de datos real.
// ============================================================
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
      bookings: {
        Row: {
          created_at: string
          duration_minutes: number
          family_user_id: string
          id: string
          notes: string | null
          platform_fee: number
          price: number
          professional_id: string
          request_id: string | null
          scheduled_at: string
          service_id: number
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          family_user_id: string
          id?: string
          notes?: string | null
          platform_fee?: number
          price: number
          professional_id: string
          request_id?: string | null
          scheduled_at: string
          service_id: number
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          family_user_id?: string
          id?: string
          notes?: string | null
          platform_fee?: number
          price?: number
          professional_id?: string
          request_id?: string | null
          scheduled_at?: string
          service_id?: number
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_family_user_id_fkey"
            columns: ["family_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      comunas: {
        Row: {
          active: boolean
          id: number
          name: string
          region: string
        }
        Insert: {
          active?: boolean
          id?: number
          name: string
          region?: string
        }
        Update: {
          active?: boolean
          id?: number
          name?: string
          region?: string
        }
        Relationships: []
      }
      family_profiles: {
        Row: {
          comuna_id: number | null
          created_at: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          relationship_to_elder: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comuna_id?: number | null
          created_at?: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          relationship_to_elder?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comuna_id?: number | null
          created_at?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          relationship_to_elder?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_profiles_comuna_id_fkey"
            columns: ["comuna_id"]
            isOneToOne: false
            referencedRelation: "comunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          professional_id: string
          request_id: string
          score: number
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          professional_id: string
          request_id: string
          score?: number
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          professional_id?: string
          request_id?: string
          score?: number
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          platform_fee: number
          provider: string | null
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          platform_fee?: number
          provider?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          platform_fee?: number
          provider?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          description: string | null
          id: number
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: number
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: number
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      platform_config_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          config_key: string
          id: string
          new_value: string
          old_value: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          config_key: string
          id?: string
          new_value: string
          old_value?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          config_key?: string
          id?: string
          new_value?: string
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_config_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_availability: {
        Row: {
          active: boolean
          created_at: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id: string
          professional_id: string
          start_time: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id?: string
          professional_id: string
          start_time: string
        }
        Update: {
          active?: boolean
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          id?: string
          professional_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_view"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_coverage: {
        Row: {
          comuna_id: number
          id: string
          professional_id: string
        }
        Insert: {
          comuna_id: number
          id?: string
          professional_id: string
        }
        Update: {
          comuna_id?: number
          id?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_coverage_comuna_id_fkey"
            columns: ["comuna_id"]
            isOneToOne: false
            referencedRelation: "comunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_coverage_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_coverage_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_coverage_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_view"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          expires_at: string | null
          file_url: string
          id: string
          notes: string | null
          professional_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_url: string
          id?: string
          notes?: string | null
          professional_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          professional_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_documents_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_documents_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_documents_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          active: boolean
          average_rating: number | null
          base_comuna_id: number | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          profession_id: number
          profile_photo_url: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          years_experience: number | null
        }
        Insert: {
          active?: boolean
          average_rating?: number | null
          base_comuna_id?: number | null
          bio?: string | null
          created_at?: string
          full_name: string
          id?: string
          profession_id: number
          profile_photo_url?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Update: {
          active?: boolean
          average_rating?: number | null
          base_comuna_id?: number | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          profession_id?: number
          profile_photo_url?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_base_comuna_id_fkey"
            columns: ["base_comuna_id"]
            isOneToOne: false
            referencedRelation: "comunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "professions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_services: {
        Row: {
          active: boolean
          created_at: string
          id: string
          modality: Database["public"]["Enums"]["service_modality"]
          price: number
          professional_id: string
          service_id: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          modality?: Database["public"]["Enums"]["service_modality"]
          price: number
          professional_id: string
          service_id: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          modality?: Database["public"]["Enums"]["service_modality"]
          price?: number
          professional_id?: string
          service_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["verification_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["verification_status"] | null
          professional_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["verification_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["verification_status"] | null
          professional_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["verification_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["verification_status"] | null
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_status_history_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_status_history_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_status_history_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_view"
            referencedColumns: ["id"]
          },
        ]
      }
      professions: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: number
          name: string
          requires_degree: boolean
          requires_document_validation: boolean
          risk_level: Database["public"]["Enums"]["risk_level"]
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: number
          name: string
          requires_degree?: boolean
          requires_document_validation?: boolean
          risk_level?: Database["public"]["Enums"]["risk_level"]
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: number
          name?: string
          requires_degree?: boolean
          requires_document_validation?: boolean
          risk_level?: Database["public"]["Enums"]["risk_level"]
        }
        Relationships: []
      }
      residence_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          residence_id: string
          sort_order: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          residence_id: string
          sort_order?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          residence_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "residence_images_residence_id_fkey"
            columns: ["residence_id"]
            isOneToOne: false
            referencedRelation: "residences"
            referencedColumns: ["id"]
          },
        ]
      }
      residence_services: {
        Row: {
          description: string | null
          id: string
          name: string
          residence_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          residence_id: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          residence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "residence_services_residence_id_fkey"
            columns: ["residence_id"]
            isOneToOne: false
            referencedRelation: "residences"
            referencedColumns: ["id"]
          },
        ]
      }
      residences: {
        Row: {
          active: boolean
          address: string
          available_slots: number | null
          capacity: number | null
          comuna_id: number
          created_at: string
          description: string | null
          email: string | null
          id: string
          name: string
          owner_user_id: string | null
          phone: string | null
          price_from: number | null
          price_to: number | null
          soma_integrated: boolean
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          active?: boolean
          address: string
          available_slots?: number | null
          capacity?: number | null
          comuna_id: number
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          phone?: string | null
          price_from?: number | null
          price_to?: number | null
          soma_integrated?: boolean
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          active?: boolean
          address?: string
          available_slots?: number | null
          capacity?: number | null
          comuna_id?: number
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          price_from?: number | null
          price_to?: number | null
          soma_integrated?: boolean
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residences_comuna_id_fkey"
            columns: ["comuna_id"]
            isOneToOne: false
            referencedRelation: "comunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residences_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          id: string
          professional_id: string
          rating: number
          reviewer_user_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          id?: string
          professional_id: string
          rating: number
          reviewer_user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          professional_id?: string
          rating?: number
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          comuna_id: number
          created_at: string
          description: string | null
          family_user_id: string
          frequency: string | null
          gender_pref: string | null
          id: string
          preferred_date: string | null
          service_id: number
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          urgency_level: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          comuna_id: number
          created_at?: string
          description?: string | null
          family_user_id: string
          frequency?: string | null
          gender_pref?: string | null
          id?: string
          preferred_date?: string | null
          service_id: number
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          urgency_level?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          comuna_id?: number
          created_at?: string
          description?: string | null
          family_user_id?: string
          frequency?: string | null
          gender_pref?: string | null
          id?: string
          preferred_date?: string | null
          service_id?: number
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          urgency_level?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_comuna_id_fkey"
            columns: ["comuna_id"]
            isOneToOne: false
            referencedRelation: "comunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_family_user_id_fkey"
            columns: ["family_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          base_price_max: number | null
          base_price_min: number | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: number
          name: string
          profession_id: number
        }
        Insert: {
          active?: boolean
          base_price_max?: number | null
          base_price_min?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: number
          name: string
          profession_id: number
        }
        Update: {
          active?: boolean
          base_price_max?: number | null
          base_price_min?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: number
          name?: string
          profession_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "professions"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean
          clerk_id: string
          created_at: string
          email: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          clerk_id: string
          created_at?: string
          email: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          clerk_id?: string
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_metrics_view: {
        Row: {
          active_bookings: number | null
          active_residences: number | null
          completed_bookings: number | null
          completed_requests: number | null
          pending_verification: number | null
          platform_avg_rating: number | null
          total_families: number | null
          total_professionals: number | null
          total_requests: number | null
          verified_professionals: number | null
        }
        Relationships: []
      }
      admin_professionals_view: {
        Row: {
          active: boolean | null
          active_services: number | null
          average_rating: number | null
          base_comuna: string | null
          coverage_comunas: string[] | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          pending_documents: number | null
          phone: string | null
          profession_category: string | null
          profession_name: string | null
          total_documents: number | null
          total_reviews: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_experience: number | null
        }
        Relationships: []
      }
      public_professionals_view: {
        Row: {
          availability: Json | null
          average_rating: number | null
          base_comuna: string | null
          bio: string | null
          category: string | null
          coverage_comunas: string[] | null
          full_name: string | null
          id: string | null
          profession_name: string | null
          profile_photo_url: string | null
          services: Json | null
          total_reviews: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_experience: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_user_id: { Args: never; Returns: string }
      auth_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      calculate_platform_fee: {
        Args: { fee_pct?: number; price: number }
        Returns: number
      }
      generate_matches: {
        Args: { request_id: string }
        Returns: {
          professional_id: string
          score: number
        }[]
      }
      process_request_matches: {
        Args: { p_request_id: string }
        Returns: number
      }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      document_type:
        | "national_id"
        | "background_check"
        | "professional_title"
        | "complementary_cert"
        | "professional_registry"
        | "work_reference"
        | "other"
      match_status:
        | "suggested"
        | "viewed"
        | "contacted"
        | "accepted"
        | "rejected"
      payment_status: "pending" | "paid" | "refunded" | "failed"
      request_status:
        | "created"
        | "reviewing"
        | "sent_to_professionals"
        | "professional_interested"
        | "accepted"
        | "scheduled"
        | "completed"
        | "cancelled"
        | "evaluated"
      risk_level: "low" | "medium" | "high"
      service_modality: "home_visit" | "online" | "center" | "one_time"
      urgency_level: "low" | "medium" | "high"
      user_role: "family" | "professional" | "residence" | "admin"
      verification_status: "pending" | "approved" | "rejected" | "expired"
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
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      document_type: [
        "national_id",
        "background_check",
        "professional_title",
        "complementary_cert",
        "professional_registry",
        "work_reference",
        "other",
      ],
      match_status: [
        "suggested",
        "viewed",
        "contacted",
        "accepted",
        "rejected",
      ],
      payment_status: ["pending", "paid", "refunded", "failed"],
      request_status: [
        "created",
        "reviewing",
        "sent_to_professionals",
        "professional_interested",
        "accepted",
        "scheduled",
        "completed",
        "cancelled",
        "evaluated",
      ],
      risk_level: ["low", "medium", "high"],
      service_modality: ["home_visit", "online", "center", "one_time"],
      urgency_level: ["low", "medium", "high"],
      user_role: ["family", "professional", "residence", "admin"],
      verification_status: ["pending", "approved", "rejected", "expired"],
    },
  },
} as const
