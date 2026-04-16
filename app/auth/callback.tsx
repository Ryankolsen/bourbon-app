import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const url = Linking.getLinkingURL();
    if (url) {
      handleCallback(url);
    }
  }, []);

  async function handleCallback(url: string) {
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code as string | undefined;

    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }

    router.replace("/(tabs)");
  }

  return (
    <View className="flex-1 bg-brand-900 items-center justify-center">
      <ActivityIndicator color="white" size="large" />
    </View>
  );
}