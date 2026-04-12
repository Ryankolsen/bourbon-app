import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { generateAvatarPath } from "@/lib/profile";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: ProfileUpdate;
    }) => {
      // Check username uniqueness if username is being updated
      if (updates.username) {
        const { data: existing, error: checkError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", updates.username)
          .neq("id", userId)
          .maybeSingle();
        if (checkError) throw checkError;
        if (existing) {
          throw new Error("Username is already taken");
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["profile", data.id] });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Media library permission is required to upload an avatar");
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) {
        return null; // User cancelled
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        throw new Error("Failed to read image data");
      }

      // Determine file extension from URI or mimeType
      const ext = asset.mimeType === "image/png" ? "png" : "jpg";
      const filePath = generateAvatarPath(userId, ext);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, decode(asset.base64), {
          contentType: asset.mimeType ?? "image/jpeg",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with avatar_url (add cache-buster to force refresh)
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single();
      if (updateError) throw updateError;
      return data as ProfileRow;
    },
    onSuccess: (data) => {
      if (data) {
        qc.invalidateQueries({ queryKey: ["profile", data.id] });
      }
    },
  });
}

/** Public tasting + collection counts for any user profile */
export function useUserPublicStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-public-stats", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .rpc("get_user_public_stats", { p_user_id: userId });
      if (error) throw error;
      return data?.[0] ?? { tasting_count: 0, collection_count: 0 };
    },
    enabled: !!userId,
  });
}

/** Look up a single profile by email address (uses SECURITY DEFINER RPC) */
export function useProfileByEmail(email: string | undefined) {
  return useQuery({
    queryKey: ["profile-by-email", email],
    queryFn: async () => {
      if (!email) return null;
      const { data, error } = await supabase
        .rpc("find_profile_by_email", { p_email: email.trim().toLowerCase() });
      if (error) throw error;
      return (data?.[0] as ProfileRow) ?? null;
    },
    enabled: !!email,
  });
}

/** Look up a single profile by exact username */
export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: async () => {
      if (!username) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username.trim().toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
    enabled: !!username,
  });
}

/** Decode base64 string to Uint8Array for Supabase upload */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
