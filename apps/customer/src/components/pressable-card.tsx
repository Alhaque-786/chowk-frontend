import * as Haptics from 'expo-haptics'
import { Pressable, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { spring } from '@/theme'

/**
 * A card that responds to touch.
 *
 * THE POINT IS WHERE THE ANIMATION RUNS. Reanimated drives this on the UI thread
 * via a shared value, so the scale keeps up even while the JS thread is busy
 * parsing an API response. The same effect written with `Animated` from
 * react-native, or with setState, runs on the JS thread and stutters at exactly
 * the moment it matters — a list settling after a fetch. That difference is most
 * of what "feels native" means in practice.
 *
 * `pressIn` rather than `onPress` for the scale, so the response is immediate
 * rather than waiting to see whether the gesture becomes a tap or a scroll.
 *
 * HAPTICS on press, not on release. The tactile confirmation should coincide with
 * the finger landing; firing it on release feels like a delayed echo. Light impact
 * only — a food list is not a slot machine, and heavy feedback on every card tap
 * becomes noise people turn off in Settings.
 */
export function PressableCard({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
}: {
  children: React.ReactNode
  onPress?: () => void
  style?: ViewStyle | ViewStyle[]
  disabled?: boolean
  /**
   * Collapses the card into ONE VoiceOver stop with this label.
   *
   * Without it, a card is six separate stops — name, rating, cuisines, prep time,
   * distance, price — and reaching the tenth kitchen means sixty swipes. The visual
   * design groups those six things into one object precisely so they are read as
   * one; the accessibility tree has to make the same grouping or it is a different,
   * much worse layout.
   */
  accessibilityLabel?: string
}) {
  const pressed = useSharedValue(0)

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.02 }],
  }))

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withSpring(1, spring)
        // Deliberately not awaited. A haptic is fire-and-forget, and awaiting it
        // would put a promise between the touch and the visual response.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, spring)
      }}
      onPress={onPress}
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      // The whole card is one target. A small button inside a large card is the
      // commonest cause of a mis-tap on a phone.
      hitSlop={0}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  )
}
