import { View, Text, TouchableOpacity, Platform, ActivityIndicator, ScrollView, TextInput, LayoutAnimation } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Device from "expo-device";
import { makeRedirectUri } from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/lib/supabase";
import { DEV_USERS, DEV_PASSWORD } from "@/lib/dev-users";
import { colors } from "@/lib/colors";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [emailExpanded, setEmailExpanded] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [emailSignInLoading, setEmailSignInLoading] = useState(false);
  const [emailSignInError, setEmailSignInError] = useState<string | null>(null);

  function toggleEmailExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEmailExpanded((v) => !v);
    setEmailSignInError(null);
  }

  async function signInWithEmailPassword() {
    try {
      setEmailSignInLoading(true);
      setEmailSignInError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      });
      if (error) throw error;
    } catch (e: any) {
      setEmailSignInError(e.message ?? "Sign in failed");
    } finally {
      setEmailSignInLoading(false);
    }
  }

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
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken!,
      });
      if (error) throw error;
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") {
        setError(e.message ?? "Sign in failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-900"
      contentContainerClassName="items-center justify-center px-8 py-16"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="mb-12 items-center">
        <Text className="text-5xl mb-2">🥃</Text>
        <Text className="text-4xl font-bold text-brand-100 tracking-tight">
          BourbonVault
        </Text>
        <Text className="text-brand-300 mt-2 text-base">
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
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={12}
            style={{ width: "100%", height: 50 }}
            onPress={signInWithApple}
          />
        )}

        {!Device.isDevice && Platform.OS !== "ios" ? (
          <View className="bg-brand-800 rounded-xl py-4 flex-row items-center justify-center gap-2 opacity-40">
            <Text className="text-brand-400 font-semibold text-base">
              Google (disabled in local dev)
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={signInWithGoogle}
            disabled={loading}
            className="bg-brand-600 rounded-xl py-4 flex-row items-center justify-center gap-2"
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

      {/* Email / password sign-in — always visible for Apple reviewers */}
      <View className="w-full mt-6">
        <View className="flex-row items-center gap-3 mb-3">
          <View className="flex-1 h-px bg-brand-700" />
          <Text className="text-brand-500 text-xs">or</Text>
          <View className="flex-1 h-px bg-brand-700" />
        </View>

        <TouchableOpacity onPress={toggleEmailExpanded}>
          <Text className="text-brand-400 text-sm text-center">
            {emailExpanded ? "Hide email sign-in" : "Sign in with email"}
          </Text>
        </TouchableOpacity>

        {emailExpanded && (
          <View className="mt-4 gap-3">
            <TextInput
              className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-base"
              placeholder="Email"
              placeholderTextColor={colors.brand500}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={emailInput}
              onChangeText={setEmailInput}
            />
            <TextInput
              className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-base"
              placeholder="Password"
              placeholderTextColor={colors.brand500}
              secureTextEntry
              value={passwordInput}
              onChangeText={setPasswordInput}
            />

            {emailSignInError && (
              <Text className="text-red-400 text-xs text-center">{emailSignInError}</Text>
            )}

            <TouchableOpacity
              onPress={signInWithEmailPassword}
              disabled={emailSignInLoading}
              className="bg-brand-700 rounded-xl py-4 items-center justify-center"
            >
              {emailSignInLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-brand-100 font-semibold text-base">Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text className="text-brand-500 text-xs mt-8 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>

      {!Device.isDevice && Platform.OS !== "ios" && (
        <View className="mt-8 w-full border-t border-brand-700 pt-6">
          <Text className="text-brand-500 text-xs text-center mb-3">DEV — sign in as</Text>
          {DEV_USERS.map((u) => (
            <TouchableOpacity
              key={u.id}
              onPress={() => signInWithEmail(u.email)}
              disabled={loadingEmail !== null}
              className="bg-brand-800 rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
            >
              <View>
                <Text className="text-brand-100 font-semibold text-sm">{u.name}</Text>
                <Text className="text-brand-500 text-xs">{u.role}</Text>
              </View>
              {loadingEmail === u.email ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-brand-500 text-xs">{u.email}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
