// Generated types will be placed here after running:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
//
// For now, a manual definition that matches our schema.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bourbons: {
        Row: {
          id: string;
          name: string;
          distillery: string | null;
          mashbill: string | null;
          age_statement: number | null;
          proof: number | null;
          type: string | null;
          msrp: number | null;
          image_url: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          distillery?: string | null;
          mashbill?: string | null;
          age_statement?: number | null;
          proof?: number | null;
          type?: string | null;
          msrp?: number | null;
          image_url?: string | null;
          description?: string | null;
        };
        Update: {
          name?: string;
          distillery?: string | null;
          mashbill?: string | null;
          age_statement?: number | null;
          proof?: number | null;
          type?: string | null;
          msrp?: number | null;
          image_url?: string | null;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_collection: {
        Row: {
          id: string;
          user_id: string;
          bourbon_id: string;
          purchase_price: number | null;
          purchase_date: string | null;
          purchase_location: string | null;
          bottle_status: "sealed" | "open" | "empty";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bourbon_id: string;
          purchase_price?: number | null;
          purchase_date?: string | null;
          purchase_location?: string | null;
          bottle_status?: "sealed" | "open" | "empty";
          notes?: string | null;
        };
        Update: {
          purchase_price?: number | null;
          purchase_date?: string | null;
          purchase_location?: string | null;
          bottle_status?: "sealed" | "open" | "empty";
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_collection_bourbon_id_fkey";
            columns: ["bourbon_id"];
            isOneToOne: false;
            referencedRelation: "bourbons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_collection_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_wishlist: {
        Row: {
          id: string;
          user_id: string;
          bourbon_id: string;
          priority: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bourbon_id: string;
          priority?: number;
          notes?: string | null;
        };
        Update: {
          priority?: number;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_wishlist_bourbon_id_fkey";
            columns: ["bourbon_id"];
            isOneToOne: false;
            referencedRelation: "bourbons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_wishlist_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tastings: {
        Row: {
          id: string;
          user_id: string;
          bourbon_id: string;
          collection_id: string | null;
          rating: number | null;
          nose: string | null;
          palate: string | null;
          finish: string | null;
          overall_notes: string | null;
          tasted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bourbon_id: string;
          collection_id?: string | null;
          rating?: number | null;
          nose?: string | null;
          palate?: string | null;
          finish?: string | null;
          overall_notes?: string | null;
          tasted_at?: string;
        };
        Update: {
          rating?: number | null;
          nose?: string | null;
          palate?: string | null;
          finish?: string | null;
          overall_notes?: string | null;
          tasted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tastings_bourbon_id_fkey";
            columns: ["bourbon_id"];
            isOneToOne: false;
            referencedRelation: "bourbons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tastings_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "user_collection";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tastings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bourbon_comments: {
        Row: {
          id: string;
          bourbon_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bourbon_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bourbon_comments_bourbon_id_fkey";
            columns: ["bourbon_id"];
            isOneToOne: false;
            referencedRelation: "bourbons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bourbon_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      bourbon_rating_stats: {
        Row: {
          bourbon_id: string;
          avg_rating: number | null;
          rating_count: number;
          tasting_count: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
