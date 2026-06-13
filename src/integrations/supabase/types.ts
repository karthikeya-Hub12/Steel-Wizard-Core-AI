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
      alerts: {
        Row: {
          assigned_engineer: string | null
          corrective_actions: string | null
          created_at: string
          detection_method: string | null
          equipment_id: string
          evidence: string | null
          failure_mode: string | null
          id: string
          impact: string | null
          observed_symptom: string
          preventive_actions: string | null
          recommended_action: string | null
          resolved_at: string | null
          risk_score: number
          root_cause: string | null
          severity: string
          status: string
          team_assignment: string | null
        }
        Insert: {
          assigned_engineer?: string | null
          corrective_actions?: string | null
          created_at?: string
          detection_method?: string | null
          equipment_id: string
          evidence?: string | null
          failure_mode?: string | null
          id?: string
          impact?: string | null
          observed_symptom: string
          preventive_actions?: string | null
          recommended_action?: string | null
          resolved_at?: string | null
          risk_score?: number
          root_cause?: string | null
          severity: string
          status?: string
          team_assignment?: string | null
        }
        Update: {
          assigned_engineer?: string | null
          corrective_actions?: string | null
          created_at?: string
          detection_method?: string | null
          equipment_id?: string
          evidence?: string | null
          failure_mode?: string | null
          id?: string
          impact?: string | null
          observed_symptom?: string
          preventive_actions?: string | null
          recommended_action?: string | null
          resolved_at?: string | null
          risk_score?: number
          root_cause?: string | null
          severity?: string
          status?: string
          team_assignment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          area: string
          business_impact: string | null
          created_at: string
          criticality: string
          equipment_id: string
          failure_probability: number
          health_score: number
          id: string
          installed_year: number | null
          last_maintenance_date: string | null
          manufacturer: string | null
          mtbf_hours: number | null
          mttr_hours: number | null
          name: string
          next_pm_date: string | null
          production_impact_kt: number | null
          remaining_useful_life: number
          risk_level: string
          status: string
        }
        Insert: {
          area: string
          business_impact?: string | null
          created_at?: string
          criticality: string
          equipment_id: string
          failure_probability: number
          health_score: number
          id?: string
          installed_year?: number | null
          last_maintenance_date?: string | null
          manufacturer?: string | null
          mtbf_hours?: number | null
          mttr_hours?: number | null
          name: string
          next_pm_date?: string | null
          production_impact_kt?: number | null
          remaining_useful_life: number
          risk_level: string
          status: string
        }
        Update: {
          area?: string
          business_impact?: string | null
          created_at?: string
          criticality?: string
          equipment_id?: string
          failure_probability?: number
          health_score?: number
          id?: string
          installed_year?: number | null
          last_maintenance_date?: string | null
          manufacturer?: string | null
          mtbf_hours?: number | null
          mttr_hours?: number | null
          name?: string
          next_pm_date?: string | null
          production_impact_kt?: number | null
          remaining_useful_life?: number
          risk_level?: string
          status?: string
        }
        Relationships: []
      }
      knowledge_documents: {
        Row: {
          category: string
          confidence_contribution: number | null
          content: string | null
          created_at: string
          cross_references: string[] | null
          doc_id: string
          id: string
          pages: number | null
          related_assets: string[] | null
          related_failure_modes: string[] | null
          relevance_score: number | null
          summary: string
          tags: string[] | null
          title: string
          updated_on: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          confidence_contribution?: number | null
          content?: string | null
          created_at?: string
          cross_references?: string[] | null
          doc_id: string
          id?: string
          pages?: number | null
          related_assets?: string[] | null
          related_failure_modes?: string[] | null
          relevance_score?: number | null
          summary: string
          tags?: string[] | null
          title: string
          updated_on?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          confidence_contribution?: number | null
          content?: string | null
          created_at?: string
          cross_references?: string[] | null
          doc_id?: string
          id?: string
          pages?: number | null
          related_assets?: string[] | null
          related_failure_modes?: string[] | null
          relevance_score?: number | null
          summary?: string
          tags?: string[] | null
          title?: string
          updated_on?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      maintenance_logs: {
        Row: {
          action_taken: string | null
          created_at: string
          diagnosis: string | null
          duration_hours: number | null
          engineer: string | null
          equipment_id: string
          id: string
          issue: string
          outcome: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          diagnosis?: string | null
          duration_hours?: number | null
          engineer?: string | null
          equipment_id: string
          id?: string
          issue: string
          outcome?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          diagnosis?: string | null
          duration_hours?: number | null
          engineer?: string | null
          equipment_id?: string
          id?: string
          issue?: string
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_requests: {
        Row: {
          created_at: string
          description: string | null
          estimated_cost: number
          id: string
          justification: string | null
          part_number: string
          pr_number: string
          priority: string
          quantity: number
          requested_by: string | null
          status: string
          supplier: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_cost?: number
          id?: string
          justification?: string | null
          part_number: string
          pr_number: string
          priority?: string
          quantity?: number
          requested_by?: string | null
          status?: string
          supplier?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_cost?: number
          id?: string
          justification?: string | null
          part_number?: string
          pr_number?: string
          priority?: string
          quantity?: number
          requested_by?: string | null
          status?: string
          supplier?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          asset_id: string | null
          body_md: string
          generated_at: string
          id: string
          report_type: string
          title: string
        }
        Insert: {
          asset_id?: string | null
          body_md: string
          generated_at?: string
          id?: string
          report_type: string
          title: string
        }
        Update: {
          asset_id?: string | null
          body_md?: string
          generated_at?: string
          id?: string
          report_type?: string
          title?: string
        }
        Relationships: []
      }
      spares: {
        Row: {
          alternative_suppliers: string | null
          associated_equipment: string | null
          consumption_per_year: number | null
          created_at: string
          criticality: string
          current_stock: number
          description: string
          id: string
          lead_time: number
          part_number: string
          reorder_level: number
          supplier: string | null
          unit_cost: number
          usage_trend: string | null
        }
        Insert: {
          alternative_suppliers?: string | null
          associated_equipment?: string | null
          consumption_per_year?: number | null
          created_at?: string
          criticality?: string
          current_stock?: number
          description: string
          id?: string
          lead_time?: number
          part_number: string
          reorder_level?: number
          supplier?: string | null
          unit_cost?: number
          usage_trend?: string | null
        }
        Update: {
          alternative_suppliers?: string | null
          associated_equipment?: string | null
          consumption_per_year?: number | null
          created_at?: string
          criticality?: string
          current_stock?: number
          description?: string
          id?: string
          lead_time?: number
          part_number?: string
          reorder_level?: number
          supplier?: string | null
          unit_cost?: number
          usage_trend?: string | null
        }
        Relationships: []
      }
      wizard_rate_limit: {
        Row: {
          client_hash: string
          last_request_at: string
          request_count: number
          window_started_at: string
        }
        Insert: {
          client_hash: string
          last_request_at?: string
          request_count?: number
          window_started_at?: string
        }
        Update: {
          client_hash?: string
          last_request_at?: string
          request_count?: number
          window_started_at?: string
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
