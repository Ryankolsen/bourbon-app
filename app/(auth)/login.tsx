import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        console.log("WebBrowser result:", JSON.stringify(result));
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
    <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
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
      </View>

      <Text className="text-bourbon-500 text-xs mt-8 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}
