import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { enqueueToast, advanceQueue } from "@/lib/toast";
import type { ToastQueue, ToastType } from "@/lib/toast";

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let _toastSeq = 0;
function nextToastId(): string {
  return `toast-${++_toastSeq}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastQueue>([]);
  const opacity = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextToastId();
      setQueue((prev) => enqueueToast(prev, message, type, id));

      // Cancel any in-flight animation and restart for the new toast
      if (animRef.current) animRef.current.stop();
      opacity.setValue(0);

      animRef.current = Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2200),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start(({ finished }) => {
        if (finished) setQueue((prev) => advanceQueue(prev));
      });
    },
    [opacity]
  );

  const current = queue[0] ?? null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {current && (
        <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
          <View
            style={[
              styles.pill,
              current.type === "success" ? styles.success : styles.error,
            ]}
          >
            <Text style={styles.text}>{current.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 9999,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: 340,
  },
  success: {
    backgroundColor: "#4848c0", // bourbon-600
  },
  error: {
    backgroundColor: "#b91c1c", // red-700
  },
  text: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
