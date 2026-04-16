/**
 * DevUserSwitcher — floating panel to switch between test personas.
 * Only rendered in __DEV__ builds. Import and render it once in the root layout.
 *
 * Usage:
 *   {__DEV__ && <DevUserSwitcher />}
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { DEV_USERS, DEV_PASSWORD } from "@/lib/dev-users";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Defense-in-depth wrapper: never renders outside a dev build, even if the
 * caller forgets the {__DEV__ && ...} guard in the layout.
 */
export function DevUserSwitcher() {
  if (!__DEV__) return null;
  return <DevUserSwitcherPanel />;
}

function DevUserSwitcherPanel() {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  async function switchTo(email: string) {
    setSwitching(email);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    });
    if (signInError) {
      setError(signInError.message);
    } else {
      // Clear all cached queries so the new user sees fresh data
      queryClient.clear();
      setOpen(false);
    }
    setSwitching(null);
  }

  async function signOut() {
    setSwitching("signout");
    setError(null);
    await supabase.auth.signOut();
    queryClient.clear();
    setSwitching(null);
    setOpen(false);
  }

  return (
    <>
      {/* Floating toggle button */}
      <View className="absolute bottom-24 right-4 z-50">
        <Pressable
          onPress={() => setOpen(true)}
          className="bg-indigo-700 rounded-full w-10 h-10 items-center justify-center shadow-lg"
          accessibilityLabel="Open dev user switcher"
        >
          <Text className="text-white text-lg">👤</Text>
        </Pressable>
      </View>

      {/* Switcher modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 justify-end"
          onPress={() => setOpen(false)}
        >
          {/* Panel — stop propagation so taps inside don't close */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-gray-950 rounded-t-2xl px-4 pt-4 pb-8">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white font-bold text-base">
                  Dev: Switch User
                </Text>
                <Pressable
                  onPress={() => setOpen(false)}
                  className="p-1"
                  accessibilityLabel="Close switcher"
                >
                  <Text className="text-gray-400 text-xl leading-none">✕</Text>
                </Pressable>
              </View>

              {/* Error message */}
              {error ? (
                <Text className="text-red-400 text-sm mb-3">{error}</Text>
              ) : null}

              {/* Persona list */}
              <ScrollView
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator={false}
              >
                {DEV_USERS.map((devUser) => {
                  const isLoading = switching === devUser.email;
                  return (
                    <Pressable
                      key={devUser.id}
                      onPress={() => switchTo(devUser.email)}
                      disabled={switching !== null}
                      className="flex-row items-center justify-between py-3 border-b border-gray-800"
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-white font-medium">
                          {devUser.name}
                        </Text>
                        <Text className="text-gray-500 text-xs">
                          {devUser.role}
                        </Text>
                      </View>
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                      ) : (
                        <Text className="text-indigo-400 text-xs">Switch</Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Theme picker link */}
              <Pressable
                onPress={() => { setOpen(false); router.push("/dev/themes"); }}
                className="mt-4 bg-gray-800 rounded-xl py-3 items-center"
                accessibilityLabel="Open theme picker"
              >
                <Text className="text-indigo-300 font-medium">🎨 Theme Picker</Text>
              </Pressable>

              {/* Sign out / back to admin */}
              <Pressable
                onPress={signOut}
                disabled={switching !== null}
                className="mt-2 bg-gray-800 rounded-xl py-3 items-center"
                accessibilityLabel="Sign out and return to admin login"
              >
                {switching === "signout" ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <Text className="text-indigo-300 font-medium">
                    Sign Out (Return to Admin Login)
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
