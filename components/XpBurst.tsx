/**
 * XpBurst — lightweight sparkle animation triggered via ref.
 *
 * Usage:
 *   const burstRef = useRef<XpBurstHandle>(null);
 *   <XpBurst ref={burstRef} />
 *   burstRef.current?.trigger();  // call at the point of action
 *
 * Plays once and disappears; pointerEvents="none" so it never blocks touches.
 * Uses react-native-reanimated for smooth, native-thread animation.
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

export interface XpBurstHandle {
  trigger: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}

const COLORS = ["#F59E0B", "#3B82F6", "#22C55E", "#EF4444", "#A855F7"];
const PARTICLE_COUNT = 8;

let _burstSeq = 0;

function makeParticles(): Particle[] {
  const id = ++_burstSeq * 100;
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: id + i,
    x: Math.cos((i / PARTICLE_COUNT) * 2 * Math.PI) * 30,
    y: Math.sin((i / PARTICLE_COUNT) * 2 * Math.PI) * 30,
    color: COLORS[i % COLORS.length],
  }));
}

interface ParticleViewProps {
  particle: Particle;
  onDone: () => void;
}

function ParticleView({ particle, onDone }: ParticleViewProps) {
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(0, { duration: 500 })
    );
    translateX.value = withTiming(particle.x, { duration: 500 });
    translateY.value = withTiming(particle.y, { duration: 500 });
    scale.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: particle.color },
        style,
      ]}
    />
  );
}

export const XpBurst = forwardRef<XpBurstHandle>((_, ref) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const doneCount = React.useRef(0);
  const totalRef = React.useRef(0);

  useImperativeHandle(ref, () => ({
    trigger() {
      const next = makeParticles();
      totalRef.current = next.length;
      doneCount.current = 0;
      setParticles(next);
    },
  }));

  function handleParticleDone() {
    doneCount.current += 1;
    if (doneCount.current >= totalRef.current) {
      setParticles([]);
    }
  }

  if (particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <ParticleView key={p.id} particle={p} onDone={handleParticleDone} />
      ))}
    </View>
  );
});

XpBurst.displayName = "XpBurst";

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
