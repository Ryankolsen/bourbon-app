import { View, Text, TouchableOpacity, Platform, ActivityIndicator, ScrollView } from "react-native";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";
import { DEV_USERS, DEV_PASSWORD } from "@/lib/dev-users";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWithEmail(email: string) {
    try {
      setLoadingEmail(email);
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password: DEV_PASSWORD });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message ?? "Sign in failed");
    } finally {
      setLoadingEmail(null);
    }
  }

  const redirectTo = makeRedirectUri({ scheme: "bourbonvault", path: "auth/callback" });

  async function signInWithGoogle() {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === "success") {
          const hash = result.url.split("#")[1] ?? "";
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const code = new URL(result.url).searchParams.get("code");

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
            if (sessionError) setError(sessionError.message);
          } else if (code) {
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (sessionError) setError(sessionError.message);
          } else {
            setError("No auth tokens in redirect — check Supabase config");
          }
        }
      }
    } catch (e: any) {
      setError(e.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithApple() {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === "success") {
          const hash = result.url.split("#")[1] ?? "";
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const code = new URL(result.url).searchParams.get("code");

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
            if (sessionError) setError(sessionError.message);
          } else if (code) {
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (sessionError) setError(sessionError.message);
          }
        }
      }
    } catch (e: any) {
      setError(e.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-bourbon-900"
      contentContainerClassName="items-center justify-center px-8 py-16"
      keyboardShouldPersistTaps="handled"
    >
      <View className="mb-12 items-center">
        <Text className="text-5xl mb-2">🥃</Text>
        <Text className="text-4xl font-bold text-bourbon-100 tracking-tight">
          BourbonVault
        </Text>
        <Text className="text-bourbon-300 mt-2 text-base">
          Track your collection, tastings & wishlist
        </Text>
      </View>

      {error && (
        <View className="bg-red-900/50 border border-red-600 rounded-xl px-4 py-3 mb-6 w-full">
          <Text className="text-red-300 text-sm text-center">{error}</Text>
        </View>
      )}

      <View className="w-full gap-3">
        {Platform.OS === "ios" && (
          <TouchableOpacity
            onPress={signInWithApple}
            disabled={loading}
            className="bg-white rounded-xl py-4 flex-row items-center justify-center gap-2"
          >
            <Text className="text-black font-semibold text-base">
              {loading ? "Signing in..." : "Continue with Apple"}
            </Text>
          </TouchableOpacity>
        )}

        {__DEV__ ? (
          <View className="bg-bourbon-800 rounded-xl py-4 flex-row items-center justify-center gap-2 opacity-40">
            <Text className="text-bourbon-400 font-semibold text-base">
              Google (disabled in local dev)
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={signInWithGoogle}
            disabled={loading}
            className="bg-bourbon-600 rounded-xl py-4 flex-row items-center justify-center gap-2"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Continue with Google
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text className="text-bourbon-500 text-xs mt-8 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>

      {__DEV__ && (
        <View className="mt-8 w-full border-t border-bourbon-700 pt-6">
          <Text className="text-bourbon-500 text-xs text-center mb-3">DEV — sign in as</Text>
          {DEV_USERS.map((u) => (
            <TouchableOpacity
              key={u.id}
              onPress={() => signInWithEmail(u.email)}
              disabled={loadingEmail !== null}
              className="bg-bourbon-800 rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
            >
              <View>
                <Text className="text-bourbon-100 font-semibold text-sm">{u.name}</Text>
                <Text className="text-bourbon-500 text-xs">{u.role}</Text>
              </View>
              {loadingEmail === u.email ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-bourbon-500 text-xs">{u.email}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
