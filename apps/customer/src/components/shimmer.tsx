import { useEffect } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { c, radius } from '@/theme'

/**
 * A shimmering placeholder, used instead of a spinner.
 *
 * A spinner says "something is happening". A shimmer in the SHAPE of the content
 * says "three cards are arriving, here is where they will be" — so the layout does
 * not jump when they land, and the wait feels shorter because it looks like
 * progress rather than a hang. It is the single cheapest perceived-performance win
 * in a list-driven app.
 *
 * The sweep runs on the UI thread via Reanimated, so it keeps moving while the JS
 * thread is busy parsing the response it is waiting for. A shimmer that freezes
 * exactly when the data arrives is worse than no shimmer, because a stalled
 * animation reads as a crash.
 */
export function Shimmer({
  style,
  children,
}: {
  style?: ViewStyle | ViewStyle[]
  children?: React.ReactNode
}) {
  const x = useSharedValue(-1)
  // Honoured explicitly: a looping sweep is precisely the kind of ambient motion
  // that causes trouble for vestibular sensitivity, and it conveys nothing that
  // the static placeholder shape does not.
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return
    x.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    )
  }, [reduce, x])

  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * 320 }],
  }))

  return (
    <View style={[styles.base, style]}>
      {children}
      {!reduce && (
        <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
          <LinearGradient
            // Horizontal, and only a few percent of white at the peak. A strong
            // highlight reads as a glitch rather than a sheen.
            colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  )
}

/** The list's loading state: card-shaped placeholders, not a centred spinner. */
export function KitchenListSkeleton() {
  return (
    <View style={styles.list}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <Shimmer style={styles.image} />
          <View style={styles.body}>
            <Shimmer style={styles.lineWide} />
            <Shimmer style={styles.lineMid} />
            <Shimmer style={styles.lineNarrow} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  base: { backgroundColor: c.surfaceSunk, overflow: 'hidden', borderRadius: radius.sm },
  list: { paddingHorizontal: 16, gap: 14 },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 150, borderRadius: 0 },
  body: { padding: 14, gap: 8 },
  lineWide: { height: 18, width: '62%' },
  lineMid: { height: 12, width: '80%' },
  lineNarrow: { height: 12, width: '40%' },
})
