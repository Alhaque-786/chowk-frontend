import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { c, radius, s, shadow } from '@/theme'

/**
 * The search entry point — a button that looks like a field, with a rotating hint.
 *
 * WHY A BUTTON AND NOT A TEXTINPUT. Tapping it will push a dedicated search screen.
 * A real input here would raise the keyboard over the list the customer is still
 * reading, and every serious food app does it this way for that reason.
 *
 * THE ROTATING HINT is the small piece of theatre, and it earns its place: "Search
 * Awadhi" → "Search biryani" → "Search Khansama" teaches the three different things
 * search accepts without one line of instructional copy. Each phrase slides up and
 * fades as the next arrives, so it reads as one control changing its mind rather
 * than three labels flickering.
 */
export function SearchField({ hints, onPress }: { hints: string[]; onPress?: () => void }) {
  const progress = useSharedValue(0)
  const [index, setIndex] = useState(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce || hints.length < 2) return
    /*
      One repeating sequence on the UI thread, over a 0 → 2 range:

        0 → 1   the current phrase rises and fades out
        1 → 2   the next phrase rises INTO place from below
        2 → 0   instant reset, invisible because opacity is 1 at both ends

      Two phases rather than one, so the replacement slides in rather than appearing.
      Driving this from a JS setInterval would drop frames whenever the list was busy
      — which, on a screen that is fetching, is exactly when it runs.
    */
    progress.value = withRepeat(
      withSequence(
        withDelay(2400, withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })),
        withTiming(2, { duration: 240, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    )
    return () => {
      progress.value = 0
    }
  }, [hints.length, reduce, progress])

  /*
    The one deliberate hop back to JS. A shared value does not re-render, which is
    why the slide is smooth — but text has to be rendered by React. This fires once
    per cycle, not once per frame.

    IT WATCHES A RANGE, NOT AN EXACT VALUE. The first version tested
    `progress.value === 1`, which is a bug that would have shipped silently: the
    animation passes through 1 between two frames, and a reaction only sees the
    values that happen to land on a frame boundary, so the hint could simply never
    rotate. A rising edge into a range always gets observed.
  */
  useAnimatedReaction(
    () => progress.value >= 1 && progress.value < 1.9,
    (leaving, previously) => {
      if (leaving && !previously) runOnJS(setIndex)((n: number) => (n + 1) % hints.length)
    },
  )

  /*
    Opacity is 0 exactly at the midpoint, which is where the text swap happens — so
    the change of words is never visible. The translate is deliberately discontinuous
    there: the outgoing phrase leaves upward and the incoming one starts from below,
    and the jump between them is hidden by that zero.
  */
  const phrase = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1, 2], [1, 0, 1]),
    transform: [{ translateY: interpolate(progress.value, [0, 0.999, 1, 2], [0, -14, 14, 0]) }],
  }))

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Search for a dish, cuisine or kitchen"
    >
      <View style={styles.field}>
        <Ionicons name="search" size={18} color={c.accent} />
        <View style={styles.phraseWrap}>
          <Animated.Text style={[styles.phrase, phrase]} numberOfLines={1}>
            {hints[index] ?? hints[0]}
          </Animated.Text>
        </View>
        <View style={styles.divider} />
        {/* Not wired yet, and labelled as the affordance it will be rather than
            shipped as a dead button with a mystery icon. */}
        <Ionicons name="mic-outline" size={18} color={c.accent} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.md,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingHorizontal: s.lg - 2,
    height: 48,
    ...shadow.card,
  },
  phraseWrap: { flex: 1, height: 20, overflow: 'hidden', justifyContent: 'center' },
  phrase: { fontSize: 14, color: c.inkFaint },
  divider: { width: StyleSheet.hairlineWidth, height: 22, backgroundColor: c.ruleStrong },
})
