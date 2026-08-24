import * as Haptics from 'expo-haptics'
import { useEffect } from 'react'
import { Pressable, ScrollView, StyleSheet } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { c, duration, radius, s } from '@/theme'

/**
 * Horizontal cuisine filter.
 *
 * THE SELECTION IS ANIMATED PER CHIP, not by moving a highlight bar. Each chip owns
 * a shared value that springs its scale and cross-fades its background and text
 * colour together. That matters because `interpolateColor` on the UI thread gives a
 * genuine gradient between two colours over 180ms — a plain conditional style would
 * hard-cut, and a hard cut on a filter tap is the single most common tell that a
 * React Native app was built quickly.
 *
 * Selection haptic is Light on select and nothing on deselect: confirming a choice
 * is worth a tap, undoing one is not.
 */
export function CuisineRail({
  cuisines,
  selected,
  onSelect,
}: {
  cuisines: string[]
  selected: string | null
  onSelect: (cuisine: string | null) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      // So a chip half off the right edge is not sliced at the screen edge — the
      // rail should look like it continues, which is what invites the swipe.
      decelerationRate="fast"
    >
      <Chip label="All" active={selected === null} onPress={() => onSelect(null)} />
      {cuisines.map((cuisine) => (
        <Chip
          key={cuisine}
          label={cuisine}
          active={selected === cuisine}
          onPress={() => onSelect(selected === cuisine ? null : cuisine)}
        />
      ))}
    </ScrollView>
  )
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const on = useSharedValue(active ? 1 : 0)
  const pressed = useSharedValue(0)

  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, { duration: duration.fast + 20 })
  }, [active, on])

  const container = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [c.surface, c.ink]),
    borderColor: interpolateColor(on.value, [0, 1], [c.rule, c.ink]),
    transform: [{ scale: 1 - pressed.value * 0.04 }],
  }))

  const text = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [c.inkSoft, c.inkInverse]),
  }))

  return (
    <Pressable
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 20, stiffness: 400 })
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 20, stiffness: 400 })
      }}
      onPress={() => {
        if (!active) void Haptics.selectionAsync()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={[styles.chip, container]}>
        <Animated.Text style={[styles.chipText, text]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  rail: { paddingHorizontal: s.lg, gap: s.sm, paddingVertical: s.xs },
  chip: {
    paddingHorizontal: s.lg - 2,
    paddingVertical: s.sm + 1,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
})
