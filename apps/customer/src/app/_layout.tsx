import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

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
      {/* Dark text on the light ground, matching the web app's light-only theme. */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          // The screen draws its own header, so the navigator's is off. Turning it
          // on later is one line; undoing a double header is confusing.
          headerShown: false,
          contentStyle: { backgroundColor: '#FAF6EF' },
        }}
      />
    </QueryClientProvider>
  )
}
