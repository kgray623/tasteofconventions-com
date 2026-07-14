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
      audit_log: {
        Row: {
          action: string
          created_at: string
          display_name: string | null
          id: string
          ip: string | null
          metadata: Json
          phone_normalized: string | null
          success: boolean
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          display_name?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          phone_normalized?: string | null
          success?: boolean
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          display_name?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          phone_normalized?: string | null
          success?: boolean
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      category_assignments: {
        Row: {
          category_id: string
          created_at: string
          id: string
          notes: string | null
          user_id: string | null
          volunteer_name: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string | null
          volunteer_name?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string | null
          volunteer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_messages: {
        Row: {
          body: string
          category_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          category_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          category_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_messages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_last_seen: {
        Row: {
          chat_id: string
          chat_kind: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          chat_kind: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          chat_kind?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cuisine_preorders: {
        Row: {
          created_at: string
          id: string
          invitation_id: string | null
          name: string
          phone: string
          selections: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id?: string | null
          name: string
          phone: string
          selections?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string | null
          name?: string
          phone?: string
          selections?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuisine_preorders_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_rows_archive: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          deleted_by_name: string | null
          deleted_by_phone: string | null
          id: string
          row_data: Json
          row_id: string
          table_name: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_name?: string | null
          deleted_by_phone?: string | null
          id?: string
          row_data: Json
          row_id: string
          table_name: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_name?: string | null
          deleted_by_phone?: string | null
          id?: string
          row_data?: Json
          row_id?: string
          table_name?: string
        }
        Relationships: []
      }
      donations_summary: {
        Row: {
          id: boolean
          notes: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          notes?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          notes?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      duplicate_flags: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invitation_a: string
          invitation_b: string
          match_type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invitation_a: string
          invitation_b: string
          match_type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invitation_a?: string
          invitation_b?: string
          match_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_flags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_flags_invitation_a_fkey"
            columns: ["invitation_a"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_flags_invitation_b_fkey"
            columns: ["invitation_b"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entertainment_submissions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          talent: string | null
          video_path: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          talent?: string | null
          video_path: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          talent?: string | null
          video_path?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          starts_at: string
          title: string
          virtual_link: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          starts_at: string
          title: string
          virtual_link?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          starts_at?: string
          title?: string
          virtual_link?: string | null
        }
        Relationships: []
      }
      guest_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          invitation_id: string
          read_by_admin: boolean
          read_by_guest: boolean
          sender: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          invitation_id: string
          read_by_admin?: boolean
          read_by_guest?: boolean
          sender: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          invitation_id?: string
          read_by_admin?: boolean
          read_by_guest?: boolean
          sender?: string
          user_id?: string | null
        }
        Relationships: []
      }
      invitation_content: {
        Row: {
          datetime_body: string
          datetime_heading: string
          dress_body: string
          gifts_body: string
          hero_eyebrow: string
          hero_intro: string
          hero_tagline: string
          hero_title: string
          hero_title_emphasis: string
          hero_title_suffix: string
          id: string
          itinerary: Json
          location_body: string
          location_name: string
          location_subtitle: string
          singleton: boolean
          updated_at: string
          video_url: string | null
        }
        Insert: {
          datetime_body?: string
          datetime_heading?: string
          dress_body?: string
          gifts_body?: string
          hero_eyebrow?: string
          hero_intro?: string
          hero_tagline?: string
          hero_title?: string
          hero_title_emphasis?: string
          hero_title_suffix?: string
          id?: string
          itinerary?: Json
          location_body?: string
          location_name?: string
          location_subtitle?: string
          singleton?: boolean
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          datetime_body?: string
          datetime_heading?: string
          dress_body?: string
          gifts_body?: string
          hero_eyebrow?: string
          hero_intro?: string
          hero_tagline?: string
          hero_title?: string
          hero_title_emphasis?: string
          hero_title_suffix?: string
          id?: string
          itinerary?: Json
          location_body?: string
          location_name?: string
          location_subtitle?: string
          singleton?: boolean
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          event_id: string
          guest_email: string | null
          guest_email_normalized: string | null
          guest_name: string
          guest_phone: string | null
          guest_phone_normalized: string | null
          host_id: string
          id: string
          invite_sent_at: string | null
          inviter_id: string | null
          is_committee: boolean
          notes: string | null
          rsvp_token: string
        }
        Insert: {
          created_at?: string
          event_id: string
          guest_email?: string | null
          guest_email_normalized?: string | null
          guest_name: string
          guest_phone?: string | null
          guest_phone_normalized?: string | null
          host_id: string
          id?: string
          invite_sent_at?: string | null
          inviter_id?: string | null
          is_committee?: boolean
          notes?: string | null
          rsvp_token?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          guest_email?: string | null
          guest_email_normalized?: string | null
          guest_name?: string
          guest_phone?: string | null
          guest_phone_normalized?: string | null
          host_id?: string
          id?: string
          invite_sent_at?: string | null
          inviter_id?: string | null
          is_committee?: boolean
          notes?: string | null
          rsvp_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "inviters"
            referencedColumns: ["id"]
          },
        ]
      }
      inviters: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          host_id: string | null
          id: string
          name: string
          phone: string | null
          quota: number
          quota_request_note: string | null
          quota_requested_at: string | null
          requested_quota: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          host_id?: string | null
          id?: string
          name: string
          phone?: string | null
          quota?: number
          quota_request_note?: string | null
          quota_requested_at?: string | null
          requested_quota?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          host_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          quota?: number
          quota_request_note?: string | null
          quota_requested_at?: string | null
          requested_quota?: number | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          available: boolean
          category: string | null
          created_at: string
          description: string | null
          dietary_flags: string[] | null
          id: string
          name: string
          price: number
          restaurant_id: string
        }
        Insert: {
          available?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          dietary_flags?: string[] | null
          id?: string
          name: string
          price?: number
          restaurant_id: string
        }
        Update: {
          available?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          dietary_flags?: string[] | null
          id?: string
          name?: string
          price?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          invitation_id: string
          items: Json
          notes: string | null
          restaurant_id: string
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id: string
          items?: Json
          notes?: string | null
          restaurant_id: string
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string
          items?: Json
          notes?: string | null
          restaurant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          active: boolean
          created_at: string
          cuisine: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cuisine?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cuisine?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          attendance_mode: string
          created_at: string
          dietary_notes: string | null
          id: string
          invitation_id: string
          invited_by: string | null
          message: string | null
          ordering_food: boolean | null
          party_size: number
          responded_at: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          attendance_mode?: string
          created_at?: string
          dietary_notes?: string | null
          id?: string
          invitation_id: string
          invited_by?: string | null
          message?: string | null
          ordering_food?: boolean | null
          party_size?: number
          responded_at?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          attendance_mode?: string
          created_at?: string
          dietary_notes?: string | null
          id?: string
          invitation_id?: string
          invited_by?: string | null
          message?: string | null
          ordering_food?: boolean | null
          party_size?: number
          responded_at?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          email_normalized: string | null
          id: string
          invited_by: string
          name: string | null
          phone: string | null
          phone_normalized: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          invited_by: string
          name?: string | null
          phone?: string | null
          phone_normalized?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          invited_by?: string
          name?: string | null
          phone?: string | null
          phone_normalized?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      team_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      duplicate_flag_pairs: {
        Row: {
          created_at: string | null
          event_id: string | null
          invitation_a: string | null
          invitation_b: string | null
          match_types: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_flags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_admin: { Args: never; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_committee_team_role: { Args: never; Returns: boolean }
      get_auth_user_id_by_phone: { Args: { _phone: string }; Returns: string }
      get_auth_user_id_by_phone_digits: {
        Args: { _digits: string }
        Returns: string
      }
      get_my_chat_unread: { Args: never; Returns: Json }
      get_public_inviters: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_committee: { Args: never; Returns: boolean }
      merge_preorder_selections: {
        Args: { _existing: Json; _incoming: Json }
        Returns: Json
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_name_for_match: { Args: { _name: string }; Returns: string }
      normalize_preorder_selection: { Args: { _item: Json }; Returns: Json }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      search_invitations_fuzzy: {
        Args: { _event_id: string; _query: string; _threshold?: number }
        Returns: {
          guest_email: string
          guest_name: string
          guest_phone: string
          id: string
          is_committee: boolean
          match_kind: string
          similarity: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "host" | "guest" | "team"
      rsvp_status: "pending" | "yes" | "no" | "maybe" | "waitlist"
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
      app_role: ["admin", "host", "guest", "team"],
      rsvp_status: ["pending", "yes", "no", "maybe", "waitlist"],
    },
  },
} as const
