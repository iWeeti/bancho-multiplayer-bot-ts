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
            game: {
                Row: {
                    beatmap_id: number;
                    count_finished: number;
                    count_left: number;
                    count_passed: number;
                    created_at: string;
                    id: number;
                    lobby_id: number | null;
                    time: number;
                };
                Insert: {
                    beatmap_id: number;
                    count_finished: number;
                    count_left: number;
                    count_passed: number;
                    created_at?: string;
                    id?: number;
                    lobby_id?: number | null;
                    time: number;
                };
                Update: {
                    beatmap_id?: number;
                    count_finished?: number;
                    count_left?: number;
                    count_passed?: number;
                    created_at?: string;
                    id?: number;
                    lobby_id?: number | null;
                    time?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "public_game_lobby_id_fkey";
                        columns: ["lobby_id"];
                        isOneToOne: false;
                        referencedRelation: "lobby";
                        referencedColumns: ["id"];
                    }
                ];
            };
            lobby: {
                Row: {
                    created_at: string;
                    free_mod: boolean;
                    id: number;
                    max_length_seconds: number | null;
                    min_length_seconds: number | null;
                    mods: number | null;
                    name: string;
                    size: number;
                    star_rating_error: number;
                    star_rating_max: number | null;
                    star_rating_min: number | null;
                    team_mode: number;
                    win_condition: number;
                };
                Insert: {
                    created_at?: string;
                    free_mod?: boolean;
                    id?: number;
                    max_length_seconds?: number | null;
                    min_length_seconds?: number | null;
                    mods?: number | null;
                    name: string;
                    size?: number;
                    star_rating_error?: number;
                    star_rating_max?: number | null;
                    star_rating_min?: number | null;
                    team_mode?: number;
                    win_condition?: number;
                };
                Update: {
                    created_at?: string;
                    free_mod?: boolean;
                    id?: number;
                    max_length_seconds?: number | null;
                    min_length_seconds?: number | null;
                    mods?: number | null;
                    name?: string;
                    size?: number;
                    star_rating_error?: number;
                    star_rating_max?: number | null;
                    star_rating_min?: number | null;
                    team_mode?: number;
                    win_condition?: number;
                };
                Relationships: [];
            };
            score: {
                Row: {
                    beatmap_id: number;
                    count_100: number;
                    count_300: number;
                    count_50: number;
                    count_miss: number;
                    created_at: string;
                    game_id: number;
                    id: number;
                    lobby_id: number | null;
                    max_combo: number;
                    mods: number;
                    osu_id: number;
                    osu_user_id: number;
                    rank: string;
                    time: number;
                    total_score: number;
                };
                Insert: {
                    beatmap_id: number;
                    count_100: number;
                    count_300: number;
                    count_50: number;
                    count_miss: number;
                    created_at?: string;
                    game_id: number;
                    id?: number;
                    lobby_id?: number | null;
                    max_combo: number;
                    mods: number;
                    osu_id: number;
                    osu_user_id: number;
                    rank: string;
                    time: number;
                    total_score: number;
                };
                Update: {
                    beatmap_id?: number;
                    count_100?: number;
                    count_300?: number;
                    count_50?: number;
                    count_miss?: number;
                    created_at?: string;
                    game_id?: number;
                    id?: number;
                    lobby_id?: number | null;
                    max_combo?: number;
                    mods?: number;
                    osu_id?: number;
                    osu_user_id?: number;
                    rank?: string;
                    time?: number;
                    total_score?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "public_score_game_id_fkey";
                        columns: ["game_id"];
                        isOneToOne: false;
                        referencedRelation: "game";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "public_score_lobby_id_fkey";
                        columns: ["lobby_id"];
                        isOneToOne: false;
                        referencedRelation: "lobby";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "public_score_osu_user_id_fkey";
                        columns: ["osu_user_id"];
                        isOneToOne: false;
                        referencedRelation: "user";
                        referencedColumns: ["osu_id"];
                    }
                ];
            };
            user: {
                Row: {
                    admin: boolean;
                    created_at: string;
                    osu_id: number;
                    user_id: string | null;
                    username: string;
                };
                Insert: {
                    admin?: boolean;
                    created_at?: string;
                    osu_id?: number;
                    user_id?: string | null;
                    username: string;
                };
                Update: {
                    admin?: boolean;
                    created_at?: string;
                    osu_id?: number;
                    user_id?: string | null;
                    username?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "public_user_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            get_user_total_playtime_seconds: {
                Args: {
                    user_id: number;
                };
                Returns: number;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
    PublicTableNameOrOptions extends
        | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
              Database[PublicTableNameOrOptions["schema"]]["Views"])
        : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
          Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
          PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
          PublicSchema["Views"])[PublicTableNameOrOptions] extends {
          Row: infer R;
      }
        ? R
        : never
    : never;

export type TablesInsert<
    PublicTableNameOrOptions extends
        | keyof PublicSchema["Tables"]
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
        : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
          Insert: infer I;
      }
        ? I
        : never
    : never;

export type TablesUpdate<
    PublicTableNameOrOptions extends
        | keyof PublicSchema["Tables"]
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
        : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
          Update: infer U;
      }
        ? U
        : never
    : never;

export type Enums<
    PublicEnumNameOrOptions extends
        | keyof PublicSchema["Enums"]
        | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
        ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
        : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;
