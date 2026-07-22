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
      admin_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json
          severity: string
          workspace_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          severity?: string
          workspace_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          severity?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_steps: {
        Row: {
          cadence_id: string
          categoria_id: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          template_id: string | null
          tempo_espera_dias: number
          tipo_acao: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cadence_id: string
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          template_id?: string | null
          tempo_espera_dias?: number
          tipo_acao?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cadence_id?: string
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          template_id?: string | null
          tempo_espera_dias?: number
          tipo_acao?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadence_steps_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "cadences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_steps_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "message_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_steps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cadences: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          criado_por: string | null
          data: string
          descricao: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          local: string | null
          participantes: Json | null
          tipo: Database["public"]["Enums"]["calendar_event_tipo"]
          titulo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          local?: string | null
          participantes?: Json | null
          tipo?: Database["public"]["Enums"]["calendar_event_tipo"]
          titulo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          local?: string | null
          participantes?: Json | null
          tipo?: Database["public"]["Enums"]["calendar_event_tipo"]
          titulo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          data: Json
          empresa_id: string
          id: string
          proposal_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          empresa_id: string
          id?: string
          proposal_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          empresa_id?: string
          id?: string
          proposal_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_events: {
        Row: {
          data: Json
          empresa_id: string
          id: string
          occurred_at: string
          workspace_id: string
        }
        Insert: {
          data?: Json
          empresa_id: string
          id?: string
          occurred_at?: string
          workspace_id: string
        }
        Update: {
          data?: Json
          empresa_id?: string
          id?: string
          occurred_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_cadences: {
        Row: {
          cadence_id: string
          created_at: string
          data_inicio: string
          data_proxima_acao: string | null
          etapa_atual: number
          id: string
          lead_id: string
          proxima_acao: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cadence_id: string
          created_at?: string
          data_inicio?: string
          data_proxima_acao?: string | null
          etapa_atual?: number
          id?: string
          lead_id: string
          proxima_acao?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cadence_id?: string
          created_at?: string
          data_inicio?: string
          data_proxima_acao?: string | null
          etapa_atual?: number
          id?: string
          lead_id?: string
          proxima_acao?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_cadences_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "cadences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_cadences_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_cadences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          created_at: string
          data: Json
          id: string
          lead_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          lead_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          lead_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          created_at: string
          data: Json
          id: string
          lead_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          lead_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          lead_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tasks: {
        Row: {
          created_at: string
          data: Json
          id: string
          lead_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          lead_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          lead_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          data: Json
          empresa_id: string | null
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          empresa_id?: string | null
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          empresa_id?: string | null
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_categories: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_template_favorites: {
        Row: {
          created_at: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_template_favorites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          ativo: boolean
          categoria: string
          corpo: string
          created_at: string
          created_by: string | null
          id: string
          titulo: string
          updated_at: string
          updated_by: string | null
          variaveis: string[]
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          corpo: string
          created_at?: string
          created_by?: string | null
          id?: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
          variaveis?: string[]
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          corpo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
          variaveis?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          data: Json
          empresa_id: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          empresa_id: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          empresa_id?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          created_at: string
          data: Json
          empresa_id: string
          id: string
          opportunity_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          empresa_id: string
          id?: string
          opportunity_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          empresa_id?: string
          id?: string
          opportunity_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          contract_id: string
          created_at: string
          data: Json
          empresa_id: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          data?: Json
          empresa_id: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          data?: Json
          empresa_id?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          criado_por: string | null
          id: string
          nome: string
          storage_path: string
          tamanho_bytes: number | null
          task_id: string
          tipo_mime: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          id?: string
          nome: string
          storage_path: string
          tamanho_bytes?: number | null
          task_id: string
          tipo_mime?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          id?: string
          nome?: string
          storage_path?: string
          tamanho_bytes?: number | null
          task_id?: string
          tipo_mime?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          created_at: string
          done: boolean
          id: string
          ordem: number
          task_id: string
          titulo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          ordem?: number
          task_id: string
          titulo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          ordem?: number
          task_id?: string
          titulo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklist_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          corpo: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          corpo: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          corpo?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          categoria: Database["public"]["Enums"]["task_categoria"]
          completed_at: string | null
          created_at: string
          criado_por: string | null
          data: string | null
          data_inicio: string | null
          descricao: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          modulo_relacionado: string | null
          observacoes: string | null
          ordem: number
          origem: Database["public"]["Enums"]["task_origem"]
          origem_ref_id: string | null
          origem_ref_tipo: string | null
          prazo: string | null
          prioridade: Database["public"]["Enums"]["task_prioridade"]
          projeto: string | null
          recurrence_parent_id: string | null
          recurrence_rule: Json | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["task_categoria"]
          completed_at?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string | null
          data_inicio?: string | null
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          modulo_relacionado?: string | null
          observacoes?: string | null
          ordem?: number
          origem?: Database["public"]["Enums"]["task_origem"]
          origem_ref_id?: string | null
          origem_ref_tipo?: string | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_prioridade"]
          projeto?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: Json | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["task_categoria"]
          completed_at?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string | null
          data_inicio?: string | null
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          modulo_relacionado?: string | null
          observacoes?: string | null
          ordem?: number
          origem?: Database["public"]["Enums"]["task_origem"]
          origem_ref_id?: string | null
          origem_ref_tipo?: string | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_prioridade"]
          projeto?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: Json | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          created_at: string
          features: Json
          limits: Json
          plan: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          features?: Json
          limits?: Json
          plan?: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          features?: Json
          limits?: Json
          plan?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _workspace_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "administrador"
        | "gestor"
        | "operacional"
        | "financeiro"
        | "marketing"
        | "comercial"
        | "desenvolvimento"
        | "suporte"
      calendar_event_tipo: "reuniao" | "pessoal" | "externo" | "outro"
      task_categoria:
        | "comercial"
        | "desenvolvimento"
        | "marketing"
        | "financeiro"
        | "suporte"
        | "administrativo"
        | "conteudo"
        | "videoaula"
        | "projeto"
      task_origem: "manual" | "lead" | "crm" | "projeto" | "ia" | "sistema"
      task_prioridade: "baixa" | "media" | "alta" | "urgente"
      task_status:
        | "pendente"
        | "em_andamento"
        | "aguardando"
        | "homologacao"
        | "concluida"
        | "cancelada"
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
      app_role: [
        "administrador",
        "gestor",
        "operacional",
        "financeiro",
        "marketing",
        "comercial",
        "desenvolvimento",
        "suporte",
      ],
      calendar_event_tipo: ["reuniao", "pessoal", "externo", "outro"],
      task_categoria: [
        "comercial",
        "desenvolvimento",
        "marketing",
        "financeiro",
        "suporte",
        "administrativo",
        "conteudo",
        "videoaula",
        "projeto",
      ],
      task_origem: ["manual", "lead", "crm", "projeto", "ia", "sistema"],
      task_prioridade: ["baixa", "media", "alta", "urgente"],
      task_status: [
        "pendente",
        "em_andamento",
        "aguardando",
        "homologacao",
        "concluida",
        "cancelada",
      ],
    },
  },
} as const
