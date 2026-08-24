import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ReduceMotion, ReducedMotionConfig } from 'react-native-reanimated'

import { c } from '@/theme'
import { queryClient } from '@/lib/query'

/**
 * The root layout.
 *
 * A plain Stack for now, not the template's tab bar. Tabs are a navigation shape
 * you adopt once you know what the tabs ARE — the template shipped two
 * placeholders, and keeping them would have meant designing around a decision
 * nobody had made.
 *
 * expo-router is file-based, exactly like the Next.js App Router: `app/index.tsx`
 * is `/`, `app/kitchens/[id].tsx` is a dynamic route. That familiarity is a real
 * part of why React Native won this decision.
 */
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/*
        Reduced motion, stated rather than inherited.

        `System` is already Reanimated's default, so this line changes no behaviour —
        it makes the behaviour a decision. Everything animated in this app is either
        scroll-linked (driven by the customer's own finger, which is not the kind of
        motion that causes trouble) or an entrance, and entrances are exactly what
        `System` disables when someone has asked their phone for less movement.

        The alternative worth knowing about is `ReduceMotion.Never`, which forces
        animations to play regardless. It exists, and using it on a consumer app is
        overriding an accessibility setting the customer deliberately turned on.
      */}
      <ReducedMotionConfig mode={ReduceMotion.System} />

      {/* Dark text on the light ground, matching the web app's light-only theme. */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          // The screen draws its own header, so the navigator's is off. Turning it
          // on later is one line; undoing a double header is confusing.
          headerShown: false,
          contentStyle: { backgroundColor: c.ground },
        }}
      />
    </QueryClientProvider>
  )
}
