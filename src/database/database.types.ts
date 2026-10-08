
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "assignments": {
                  Row: {
                    "class_id": string,"lesson_id": string
                  }
                  Insert: {
                    "class_id": string,"lesson_id": string
                  }
                  Update: {
                    "class_id"?: string,"lesson_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"class_members": {
                  Row: {
                    "class_id": string,"id": string,"joined_at": string,"student_id": string
                  }
                  Insert: {
                    "class_id": string,"id"?: string,"joined_at"?: string,"student_id": string
                  }
                  Update: {
                    "class_id"?: string,"id"?: string,"joined_at"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_members_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_members_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"classes": {
                  Row: {
                    "created_at": string,"id": string,"join_code": string,"name": string,"teacher_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"join_code"?: string,"name": string,"teacher_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"join_code"?: string,"name"?: string,"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "classes_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "id": string,"instructions_markdown": string,"lesson_id": string,"position": number,"runtime_type": string,"slug": string,"starter_code": string,"title": string
                  }
                  Insert: {
                    "id"?: string,"instructions_markdown": string,"lesson_id": string,"position"?: number,"runtime_type": string,"slug": string,"starter_code": string,"title": string
                  }
                  Update: {
                    "id"?: string,"instructions_markdown"?: string,"lesson_id"?: string,"position"?: number,"runtime_type"?: string,"slug"?: string,"starter_code"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "id": string,"position": number,"slug": string,"teacher_id": string,"title": string
                  }
                  Insert: {
                    "id"?: string,"position"?: number,"slug": string,"teacher_id": string,"title": string
                  }
                  Update: {
                    "id"?: string,"position"?: number,"slug"?: string,"teacher_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"display_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"updated_at": string,"username": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"display_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"updated_at"?: string,"username"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"display_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"username"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"student_work": {
                  Row: {
                    "code": string,"exercise_id": string,"last_edited_at": string,"last_error_summary": string | null,"last_error_type": string | null,"last_run_at": string | null,"last_run_success": boolean | null,"status": string,"student_id": string
                  }
                  Insert: {
                    "code": string,"exercise_id": string,"last_edited_at"?: string,"last_error_summary"?: string | null,"last_error_type"?: string | null,"last_run_at"?: string | null,"last_run_success"?: boolean | null,"status"?: string,"student_id": string
                  }
                  Update: {
                    "code"?: string,"exercise_id"?: string,"last_edited_at"?: string,"last_error_summary"?: string | null,"last_error_type"?: string | null,"last_run_at"?: string | null,"last_run_success"?: boolean | null,"status"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_work_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_work_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "claim_account_session": { Args: Record<PropertyKey, never>; Returns: boolean },
            "is_current_session": { Args: Record<PropertyKey, never>; Returns: boolean },
            "revoke_user_sessions":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"student_login_email":
{ Args: { "p_join_code": string,"p_username": string }; Returns: string
                           }
          }
          Enums: {
            "user_role": "teacher"|"student"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "user_role": ["teacher", "student"]
          }
        }
} as const
