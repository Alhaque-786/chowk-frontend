import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo, useState } from 'react'
import { Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CuisineRail } from '@/components/cuisine-rail'
import { KitchenCard } from '@/components/kitchen-card'
import { KitchenListSkeleton } from '@/components/shimmer'
import { SearchField } from '@/components/search-field'
import { apiGet } from '@/lib/api'
import { API_BASE_URL, describeApiHost } from '@/lib/api-host'
import type { Kitchen } from '@/lib/types'
import { c, radius, s, shadow } from '@/theme'

/**
 * Kitchens near you — the home screen.
 *
 * FETCHED WITH TanStack Query, not useEffect. The web app fetches in effects and
 * carries eslint suppressions for it; the comments there name a data library as the
 * real fix, so this app starts with one. Compare what is gone: no effect, no
 * AbortController, no `loaded` flag, no abort-is-not-an-error branch, no
 * unmounted-component question.
 *
 * EVERY ANIMATION ON THIS SCREEN RUNS ON THE UI THREAD. That is the whole design,
 * not a detail. `useAnimatedScrollHandler` receives scroll events natively and
 * writes to a shared value; the banner, the collapsing headline and the blur bar all
 * read that value inside worklets. Nothing here re-renders while you scroll. The
 * same screen written with `Animated.event` and `useNativeDriver: false`, or with
 * onScroll → setState, would stutter precisely when a response lands — because that
 * is when the JS thread is busy — and a header that hitches on arrival is the exact
 * moment an app stops feeling native.
 */

// Lucknow, matching the web app's launch city.
const CENTRE = { lat: 26.85, lng: 80.947 }

/*
  How far the banner reaches, measured from below the notch.

  This number is not a guess and it is not decoration. It is set so the boundary
  lands ACROSS THE MIDDLE OF THE SEARCH FIELD: the card straddles terracotta above
  and paper below, which is what makes it read as a floating object rather than a
  panel glued to the bottom of a coloured block.

  It also has to be small enough that the cuisine rail and the result count clear the
  banner entirely. The first version used 300 and they landed on the orange — with
  `inkSoft` grey text on terracotta, which was unreadable. Content sitting on a
  coloured ground has to be COLOURED FOR that ground, so the cheaper fix is to keep
  it off the ground instead.
*/
const BANNER_BELOW_NOTCH = 148

/*
  How far the banner extends ABOVE the top of the screen.

  This exists so the rubber-band scale has material to grow into. It has to be added
  to the height as well as subtracted from the top — the first attempt used a
  negative `marginTop` against a fixed `height`, which moved the whole view up and
  therefore pulled the BOTTOM edge up with it, to 0.6 of the intended depth. The
  visible result was the white headline and tagline hanging off the bottom of the
  orange onto cream paper, which is as unreadable as it sounds. An overshoot must
  change one edge, not both.
*/
const BANNER_OVERSHOOT = 130
/** Scroll distance over which the big headline hands off to the compact blur bar. */
const HANDOFF = 96

export default function KitchensScreen() {
  const insets = useSafeAreaInsets()
  const scrollY = useSharedValue(0)
  const [cuisine, setCuisine] = useState<string | null>(null)

  const { data, error, isPending, isRefetching, refetch } = useQuery({
    /*
      The key includes the coordinates. That is not decoration: it is what makes the
      cache correct. Change location and it becomes a different query with its own
      entry, rather than showing Lucknow's kitchens under a Kanpur heading while the
      new request is in flight.
    */
    queryKey: ['kitchens', 'nearby', CENTRE.lat, CENTRE.lng],
    queryFn: ({ signal }) =>
      apiGet<{ kitchens: Kitchen[] }>(
        `/kitchens/nearby?lat=${CENTRE.lat}&lng=${CENTRE.lng}&radius_m=15000`,
        // Query hands us a signal and aborts it on unmount. That is the plumbing the
        // web app had to write by hand, twice.
        signal,
      ),
  })

  /*
    Memoised on `data`, and the reason is not tidiness. `data?.kitchens ?? []`
    allocates a NEW array on every render, so every useMemo keyed on it recomputes
    every render — the memo is present in the source and absent in behaviour. This
    is the sort of thing the exhaustive-deps rule is genuinely good at: it flagged
    two dead memos that looked correct.
  */
  const kitchens = useMemo(() => data?.kitchens ?? [], [data])

  /*
    Cuisines ordered by how many kitchens serve them, not alphabetically. The filter
    a customer is most likely to want should not be the one furthest along a rail
    they have to swipe. Recomputed only when the data changes.
  */
  const cuisines = useMemo(() => {
    const counts = new Map<string, number>()
    for (const k of kitchens) {
      for (const cu of k.cuisines) counts.set(cu, (counts.get(cu) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name)
  }, [kitchens])

  const visible = cuisine ? kitchens.filter((k) => k.cuisines.includes(cuisine)) : kitchens

  const hints = useMemo(() => {
    const dishes = ['biryani', 'kebabs', 'thali']
    const names = kitchens.slice(0, 2).map((k) => k.name)
    return [...dishes, ...names].map((h) => `Search ${h}`)
  }, [kitchens])

  const bannerH = insets.top + BANNER_BELOW_NOTCH

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y
  })

  /*
    The banner recedes at HALF the scroll speed, and grows when you pull past the top.

    THE SIGN IS NEGATIVE, and getting it wrong is instructive. This banner is
    `position: absolute` — it is NOT inside the scroll content, so it does not move at
    all on its own. Content scrolling up by S therefore needs the banner translated by
    -0.5·S to lag behind it. The first version used +0.5·S, which pushed the banner
    DOWN as the list went up: at offset 240 its bottom edge sat 327pt down the screen,
    framing the first card in a band of orange. It was measured at ~323pt, which is
    how the sign error was caught rather than argued about.

    (Implementations that place the banner INSIDE the scroll content want the positive
    factor, because there the content has already moved it by -S and the transform is
    clawing some of that back. Same effect, opposite sign, different frame of
    reference — worth knowing which one you are in.)

    Scaling on negative offset is the iOS rubber-band: without it, over-pulling
    exposes bare background above the banner, which is the seam that makes a screen
    look assembled rather than designed.
  */
  const banner = useAnimatedStyle(() => ({
    transform: [
      { translateY: scrollY.value < 0 ? 0 : -scrollY.value * 0.5 },
      {
        scale: interpolate(scrollY.value, [-160, 0], [1.32, 1], {
          extrapolateLeft: Extrapolation.EXTEND,
          extrapolateRight: Extrapolation.CLAMP,
        }),
      },
    ],
  }))

  /* The big headline gives way as it leaves — fading and drifting up together, so
     it looks like it is being replaced rather than scrolled past. */
  const headline = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HANDOFF * 0.7], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, HANDOFF], [0, -18], Extrapolation.CLAMP) },
    ],
  }))

  /*
    The compact bar arrives as the headline goes. `pointerEvents` follows the opacity
    so an invisible bar never swallows a tap meant for the card underneath — the kind
    of bug that is impossible to see and infuriating to hit.
  */
  const topBar = useAnimatedStyle(() => {
    const shown = interpolate(scrollY.value, [HANDOFF * 0.55, HANDOFF], [0, 1], Extrapolation.CLAMP)
    return {
      opacity: shown,
      transform: [{ translateY: (1 - shown) * -8 }],
      pointerEvents: shown > 0.5 ? 'auto' : 'none',
    }
  })

  return (
    <View style={styles.screen}>
      {/* Behind everything, and taller than it looks — the extra height is what the
          rubber-band scale eats into when you over-pull. */}
      <Animated.View
        style={[
          styles.banner,
          // Height depends on the notch, so it cannot live in the stylesheet. The
          // overshoot is added here and subtracted via `top` in the stylesheet, so
          // the bottom edge lands exactly on `bannerH`.
          { height: bannerH + BANNER_OVERSHOOT },
          banner,
        ]}
      >
        <LinearGradient
          colors={['#E9963C', '#D2622C', '#B84B2A']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.FlatList
        data={visible}
        keyExtractor={(k) => (k as Kitchen).id}
        onScroll={onScroll}
        // 16ms: one event per frame. The default (0) fires as fast as the platform
        // can, which is wasted work for an animation that can only draw once a frame.
        scrollEventThrottle={16}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Animated.View style={headline}>
              <Pressable style={styles.locationRow} accessibilityRole="button">
                <Ionicons name="location-sharp" size={15} color="rgba(255,255,255,0.92)" />
                <Text style={styles.locationLabel}>Hazratganj</Text>
                <Text style={styles.locationCity}>Lucknow</Text>
                <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.8)" />
              </Pressable>

              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.tagline}>Cooked to order, from kitchens down the road.</Text>
            </Animated.View>

            <View style={styles.searchWrap}>
              <SearchField hints={hints} />
            </View>

            {cuisines.length > 1 && (
              <Animated.View entering={FadeIn.duration(320)} style={styles.railWrap}>
                <CuisineRail cuisines={cuisines} selected={cuisine} onSelect={setCuisine} />
              </Animated.View>
            )}

            {!isPending && !error && (
              <View style={styles.countRow}>
                <Text style={styles.count}>
                  {visible.length} {visible.length === 1 ? 'kitchen' : 'kitchens'}
                  {cuisine ? ` serving ${cuisine}` : ' near you'}
                  </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.cardWrap}>
            <KitchenCard kitchen={item as Kitchen} index={index} />
          </View>
        )}
        ListEmptyComponent={
          isPending ? (
            <KitchenListSkeleton />
          ) : error ? (
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          ) : (
            <EmptyState cuisine={cuisine} onClear={() => setCuisine(null)} />
          )
        }
        refreshControl={
          <RefreshControl
            // `isRefetching` comes from Query, so pull-to-refresh needs no state of
            // its own and cannot get stuck spinning after a failed request.
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            // White, because at the moment you pull, the spinner is over the banner.
            tintColor="#FFFFFF"
            progressBackgroundColor="#FFFFFF"
          />
        }
      />

      <Animated.View style={[styles.topBar, topBar]}>
        {/*
          A real blur, not a translucent white rectangle. On iOS this samples the
          content scrolling underneath, so the bar carries a trace of each card as it
          passes — which is why it reads as glass rather than a lid. Android has no
          equivalent primitive; expo-blur falls back to a tint there, and
          `experimentalBlurMethod` is deliberately not enabled because it costs real
          frames on mid-range hardware for an effect nobody asked for.
        */}
        <BlurView intensity={Platform.OS === 'ios' ? 75 : 0} tint="light" style={styles.blur}>
          {/*
            The notch inset is padding on THIS wrapper, not on the animated container
            outside the BlurView. Padding on the container pushed the glass down below
            the status bar, so a strip of unblurred photograph ran behind the clock and
            the battery — sharp content under system glyphs, which is precisely what a
            material is there to prevent. The blur has to span the inset, not begin
            after it.
          */}
          <View style={{ paddingTop: insets.top }}>
            <View style={styles.topBarInner}>
              <Ionicons name="location-sharp" size={14} color={c.accent} />
              <Text style={styles.topBarText} numberOfLines={1}>
                Hazratganj, Lucknow
              </Text>
              <View style={styles.topBarSpacer} />
              <Ionicons name="search" size={18} color={c.ink} />
            </View>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Good morning'
  if (h < 16) return 'What’s for lunch?'
  if (h < 21) return 'What’s for dinner?'
  return 'Still hungry?'
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.state}>
      <Ionicons name="cloud-offline-outline" size={34} color={c.inkFaint} />
      <Text style={styles.stateTitle}>Could not reach the kitchen</Text>
      <Text style={styles.stateBody}>{message}</Text>
      {/* Kept, not removed: "Network request failed" is indistinguishable from a
          dead server, and seeing which URL was attempted turns the commonest setup
          problem into a glance. */}
      <Text style={styles.stateHint}>
        {API_BASE_URL}
        {'\n'}
        {describeApiHost()}
      </Text>
      <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </Animated.View>
  )
}

function EmptyState({ cuisine, onClear }: { cuisine: string | null; onClear: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.state}>
      <Ionicons name="restaurant-outline" size={34} color={c.inkFaint} />
      <Text style={styles.stateTitle}>
        {cuisine ? `No ${cuisine} kitchens nearby` : 'No kitchens nearby yet'}
      </Text>
      <Text style={styles.stateBody}>
        {cuisine
          ? 'Try another cuisine — the rest are still open to you.'
          : 'We are signing up kitchens in your area. Check back shortly.'}
      </Text>
      {cuisine && (
        <Pressable onPress={onClear} style={styles.retry} accessibilityRole="button">
          <Text style={styles.retryText}>Show all kitchens</Text>
        </Pressable>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ground },

  banner: {
    position: 'absolute',
    top: -BANNER_OVERSHOOT,
    left: 0,
    right: 0,
    // A soft bottom edge. Square would read as a header bar; this reads as a
    // surface the list is sliding out from underneath.
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },

  listContent: { paddingBottom: s.xxl + s.lg },
  header: { paddingBottom: s.sm },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: s.lg,
  },
  locationLabel: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  locationCity: { fontSize: 13, color: 'rgba(255,255,255,0.82)' },

  greeting: {
    marginTop: s.md + 2,
    paddingHorizontal: s.lg,
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  tagline: {
    marginTop: 4,
    paddingHorizontal: s.lg,
    fontSize: 14,
    color: 'rgba(255,255,255,0.86)',
    lineHeight: 20,
  },

  searchWrap: { marginTop: s.xl - 2, paddingHorizontal: s.lg },
  railWrap: { marginTop: s.xl - 2 },
  countRow: { marginTop: s.lg, paddingHorizontal: s.lg },
  count: { fontSize: 13, fontWeight: '600', color: c.inkSoft },

  cardWrap: { paddingHorizontal: s.lg, paddingTop: s.md + 2 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Hairline under the glass: without it the bar and the list share an edge and
    // the boundary disappears over a white card.
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.rule,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(250,246,239,0.72)' : 'rgba(250,246,239,0.97)',
  },
  blur: { overflow: 'hidden' },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: s.lg,
    height: 48,
  },
  topBarText: { fontSize: 14, fontWeight: '700', color: c.ink, maxWidth: '62%' },
  topBarSpacer: { flex: 1 },

  state: {
    alignItems: 'center',
    paddingHorizontal: s.xl,
    paddingTop: s.xxl,
    gap: s.sm,
  },
  stateTitle: { marginTop: s.sm, fontSize: 17, fontWeight: '700', color: c.ink },
  stateBody: { fontSize: 13, color: c.inkSoft, textAlign: 'center', lineHeight: 19 },
  stateHint: { fontSize: 11, color: c.inkFaint, textAlign: 'center', fontFamily: 'Menlo' },
  retry: {
    marginTop: s.md,
    backgroundColor: c.ink,
    paddingHorizontal: s.xl,
    paddingVertical: s.md,
    borderRadius: radius.full,
    ...shadow.card,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: c.inkInverse },
})
