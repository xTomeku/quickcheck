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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_utenti: {
        Row: {
          created_at: string
          ruolo: string
          user_id: string
          vede_docenti: boolean
        }
        Insert: {
          created_at?: string
          ruolo: string
          user_id: string
          vede_docenti?: boolean
        }
        Update: {
          created_at?: string
          ruolo?: string
          user_id?: string
          vede_docenti?: boolean
        }
        Relationships: []
      }
      blocchi_saltati: {
        Row: {
          compilazione_id: string
          id: string
          insegnamento_id: string
        }
        Insert: {
          compilazione_id: string
          id?: string
          insegnamento_id: string
        }
        Update: {
          compilazione_id?: string
          id?: string
          insegnamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocchi_saltati_compilazione_id_fkey"
            columns: ["compilazione_id"]
            isOneToOne: false
            referencedRelation: "compilazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocchi_saltati_insegnamento_id_fkey"
            columns: ["insegnamento_id"]
            isOneToOne: false
            referencedRelation: "insegnamenti"
            referencedColumns: ["id"]
          },
        ]
      }
      collegamenti_domanda: {
        Row: {
          docente_id: string | null
          domanda_id: string
          id: string
          insegnamento_id: string | null
          materia_id: string | null
        }
        Insert: {
          docente_id?: string | null
          domanda_id: string
          id?: string
          insegnamento_id?: string | null
          materia_id?: string | null
        }
        Update: {
          docente_id?: string | null
          domanda_id?: string
          id?: string
          insegnamento_id?: string | null
          materia_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collegamenti_domanda_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "docenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collegamenti_domanda_domanda_id_fkey"
            columns: ["domanda_id"]
            isOneToOne: false
            referencedRelation: "domande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collegamenti_domanda_insegnamento_id_fkey"
            columns: ["insegnamento_id"]
            isOneToOne: false
            referencedRelation: "insegnamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collegamenti_domanda_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materie"
            referencedColumns: ["id"]
          },
        ]
      }
      compilazioni: {
        Row: {
          anno_studente: number | null
          data_compilazione: string
          edizione_id: string
          fuori_corso: boolean
          id: string
          materia_corso_id: string
        }
        Insert: {
          anno_studente?: number | null
          data_compilazione?: string
          edizione_id: string
          fuori_corso?: boolean
          id?: string
          materia_corso_id: string
        }
        Update: {
          anno_studente?: number | null
          data_compilazione?: string
          edizione_id?: string
          fuori_corso?: boolean
          id?: string
          materia_corso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compilazioni_edizione_id_fkey"
            columns: ["edizione_id"]
            isOneToOne: false
            referencedRelation: "edizioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compilazioni_materia_corso_id_fkey"
            columns: ["materia_corso_id"]
            isOneToOne: false
            referencedRelation: "materie_corso"
            referencedColumns: ["id"]
          },
        ]
      }
      corsi_di_laurea: {
        Row: {
          anni_attivi: number[] | null
          attivo: boolean
          created_at: string
          dipartimento_id: string
          durata_anni: number
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          anni_attivi?: number[] | null
          attivo?: boolean
          created_at?: string
          dipartimento_id: string
          durata_anni: number
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          anni_attivi?: number[] | null
          attivo?: boolean
          created_at?: string
          dipartimento_id?: string
          durata_anni?: number
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "corsi_di_laurea_dipartimento_id_fkey"
            columns: ["dipartimento_id"]
            isOneToOne: false
            referencedRelation: "dipartimenti"
            referencedColumns: ["id"]
          },
        ]
      }
      dipartimenti: {
        Row: {
          attivo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      docenti: {
        Row: {
          attivo: boolean
          cognome: string
          created_at: string
          dipartimento_id: string | null
          id: string
          nome: string
        }
        Insert: {
          attivo?: boolean
          cognome: string
          created_at?: string
          dipartimento_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          attivo?: boolean
          cognome?: string
          created_at?: string
          dipartimento_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "docenti_dipartimento_id_fkey"
            columns: ["dipartimento_id"]
            isOneToOne: false
            referencedRelation: "dipartimenti"
            referencedColumns: ["id"]
          },
        ]
      }
      domande: {
        Row: {
          ambito_docente: string | null
          attiva: boolean
          categoria: string
          created_at: string
          etichetta_max: string | null
          etichetta_min: string | null
          gruppo: string | null
          id: string
          mostra_se_domanda_id: string | null
          mostra_se_opzioni: string[]
          obbligatoria: boolean
          ordine: number
          scala_max: number | null
          scala_min: number | null
          testo: string
          tipo_risposta: string
        }
        Insert: {
          ambito_docente?: string | null
          attiva?: boolean
          categoria: string
          created_at?: string
          etichetta_max?: string | null
          etichetta_min?: string | null
          gruppo?: string | null
          id?: string
          mostra_se_domanda_id?: string | null
          mostra_se_opzioni?: string[]
          obbligatoria?: boolean
          ordine?: number
          scala_max?: number | null
          scala_min?: number | null
          testo: string
          tipo_risposta: string
        }
        Update: {
          ambito_docente?: string | null
          attiva?: boolean
          categoria?: string
          created_at?: string
          etichetta_max?: string | null
          etichetta_min?: string | null
          gruppo?: string | null
          id?: string
          mostra_se_domanda_id?: string | null
          mostra_se_opzioni?: string[]
          obbligatoria?: boolean
          ordine?: number
          scala_max?: number | null
          scala_min?: number | null
          testo?: string
          tipo_risposta?: string
        }
        Relationships: []
      }
      edizioni: {
        Row: {
          anno_accademico: string
          aperta: boolean
          aperta_il: string | null
          chiusa_il: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          anno_accademico: string
          aperta?: boolean
          aperta_il?: string | null
          chiusa_il?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          anno_accademico?: string
          aperta?: boolean
          aperta_il?: string | null
          chiusa_il?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      impostazioni: {
        Row: {
          chiave: string
          descrizione: string | null
          valore: string
        }
        Insert: {
          chiave: string
          descrizione?: string | null
          valore: string
        }
        Update: {
          chiave?: string
          descrizione?: string | null
          valore?: string
        }
        Relationships: []
      }
      insegnamenti: {
        Row: {
          docente_id: string
          id: string
          materia_id: string
        }
        Insert: {
          docente_id: string
          id?: string
          materia_id: string
        }
        Update: {
          docente_id?: string
          id?: string
          materia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insegnamenti_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "docenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insegnamenti_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materie"
            referencedColumns: ["id"]
          },
        ]
      }
      materie: {
        Row: {
          attiva: boolean
          cfu: number | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          attiva?: boolean
          cfu?: number | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          attiva?: boolean
          cfu?: number | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      materie_corso: {
        Row: {
          anno: number
          corso_id: string
          id: string
          materia_id: string
        }
        Insert: {
          anno: number
          corso_id: string
          id?: string
          materia_id: string
        }
        Update: {
          anno?: number
          corso_id?: string
          id?: string
          materia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materie_corso_corso_id_fkey"
            columns: ["corso_id"]
            isOneToOne: false
            referencedRelation: "corsi_di_laurea"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materie_corso_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materie"
            referencedColumns: ["id"]
          },
        ]
      }
      opzioni_risposta: {
        Row: {
          domanda_id: string
          id: string
          ordine: number
          testo: string
        }
        Insert: {
          domanda_id: string
          id?: string
          ordine: number
          testo: string
        }
        Update: {
          domanda_id?: string
          id?: string
          ordine?: number
          testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "opzioni_risposta_domanda_id_fkey"
            columns: ["domanda_id"]
            isOneToOne: false
            referencedRelation: "domande"
            referencedColumns: ["id"]
          },
        ]
      }
      partecipazioni: {
        Row: {
          edizione_id: string
          id: string
          materia_corso_id: string
          studente_hash: string
        }
        Insert: {
          edizione_id: string
          id?: string
          materia_corso_id: string
          studente_hash: string
        }
        Update: {
          edizione_id?: string
          id?: string
          materia_corso_id?: string
          studente_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "partecipazioni_edizione_id_fkey"
            columns: ["edizione_id"]
            isOneToOne: false
            referencedRelation: "edizioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partecipazioni_materia_corso_id_fkey"
            columns: ["materia_corso_id"]
            isOneToOne: false
            referencedRelation: "materie_corso"
            referencedColumns: ["id"]
          },
        ]
      }
      risposte: {
        Row: {
          compilazione_id: string
          domanda_id: string
          id: string
          insegnamento_id: string | null
          nascosta: boolean
          opzione_id: string | null
          testo: string | null
          valore_numero: number | null
        }
        Insert: {
          compilazione_id: string
          domanda_id: string
          id?: string
          insegnamento_id?: string | null
          nascosta?: boolean
          opzione_id?: string | null
          testo?: string | null
          valore_numero?: number | null
        }
        Update: {
          compilazione_id?: string
          domanda_id?: string
          id?: string
          insegnamento_id?: string | null
          nascosta?: boolean
          opzione_id?: string | null
          testo?: string | null
          valore_numero?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risposte_compilazione_id_fkey"
            columns: ["compilazione_id"]
            isOneToOne: false
            referencedRelation: "compilazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risposte_domanda_id_fkey"
            columns: ["domanda_id"]
            isOneToOne: false
            referencedRelation: "domande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risposte_insegnamento_id_fkey"
            columns: ["insegnamento_id"]
            isOneToOne: false
            referencedRelation: "insegnamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risposte_opzione_id_fkey"
            columns: ["opzione_id"]
            isOneToOne: false
            referencedRelation: "opzioni_risposta"
            referencedColumns: ["id"]
          },
        ]
      }
      risposte_extra: {
        Row: {
          domanda_id: string
          edizione_id: string
          id: string
          nascosta: boolean
          opzione_id: string | null
          testo: string | null
          valore_numero: number | null
        }
        Insert: {
          domanda_id: string
          edizione_id: string
          id?: string
          nascosta?: boolean
          opzione_id?: string | null
          testo?: string | null
          valore_numero?: number | null
        }
        Update: {
          domanda_id?: string
          edizione_id?: string
          id?: string
          nascosta?: boolean
          opzione_id?: string | null
          testo?: string | null
          valore_numero?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risposte_extra_domanda_id_fkey"
            columns: ["domanda_id"]
            isOneToOne: false
            referencedRelation: "domande"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      elimina_voce: {
        Args: { p_esegui?: boolean; p_id: string; p_tipo: string }
        Returns: Json
      }
      stat_extra: {
        Args: { p_edizione: string }
        Returns: { distribuzione: Json; domanda_id: string; n: number; somma: number }[]
      }
      nascondi_risposta_extra: {
        Args: { p_id: string; p_nascosta: boolean }
        Returns: undefined
      }
      nascondi_risposta: {
        Args: { p_id: string; p_nascosta: boolean }
        Returns: undefined
      }
      testi_risposte: {
        Args: {
          p_anno_corso?: number
          p_anno_studente?: number
          p_corso?: string
          p_docente?: string
          p_edizione: string
          p_fuori_corso?: boolean
          p_materia?: string
        }
        Returns: {
          docente_id: string | null
          domanda_id: string
          id: string
          materia_id: string
          nascosta: boolean
          testo: string
        }[]
      }
      stat_risposte: {
        Args: {
          p_anno_corso?: number
          p_anno_studente?: number
          p_corso?: string
          p_docente?: string
          p_edizione: string
          p_fuori_corso?: boolean
          p_gruppo?: string
          p_materia?: string
        }
        Returns: {
          distribuzione: Json
          docente_id: string | null
          domanda_id: string
          materia_id: string | null
          n: number
          somma: number
        }[]
      }
      stat_saltati: {
        Args: {
          p_anno_corso?: number
          p_anno_studente?: number
          p_corso?: string
          p_docente?: string
          p_edizione: string
          p_fuori_corso?: boolean
          p_materia?: string
        }
        Returns: { docente_id: string; materia_id: string; n: number }[]
      }
      stat_compilazioni: {
        Args: {
          p_anno_corso?: number
          p_anno_studente?: number
          p_corso?: string
          p_edizione: string
          p_fuori_corso?: boolean
          p_materia?: string
        }
        Returns: { anno: number; corso_id: string; materia_id: string; n: number }[]
      }
      elenco_utenti_pannello: {
        Args: never
        Returns: {
          email: string
          ruolo: string
          ultimo_accesso: string | null
          user_id: string
          vede_docenti: boolean
        }[]
      }
      imposta_utente_pannello: {
        Args: { p_email: string; p_ruolo: string; p_vede_docenti: boolean }
        Returns: undefined
      }
      rimuovi_utente_pannello: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      invia_compilazioni: {
        Args: {
          p_anno?: number
          p_edizione: string
          p_fuori_corso: boolean
          p_materie: Json
        }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
