import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { PressableCard } from './pressable-card'
import { assetUrl } from '@/lib/api-host'
import { c, gradients, radius, s, shadow } from '@/theme'
import type { Kitchen } from '@/lib/types'

/**
 * One kitchen in the list.
 *
 * THE ENTRANCE IS STAGGERED, and the delay is capped. Each card enters 60ms after
 * the one above it, which reads as the list assembling rather than appearing — but
 * capped at 300ms, because on a list of forty the twelfth card would otherwise wait
 * most of a second and the effect stops being polish and becomes a delay.
 *
 * expo-image rather than react-native's Image: it caches to disk across launches,
 * cross-fades rather than popping, and takes a placeholder colour so the space is
 * never blank. On a food app, where photographs ARE the content, that is the
 * difference between a list that settles and one that flickers.
 */
export function KitchenCard({
  kitchen,
  index,
  onPress,
}: {
  kitchen: Kitchen
  index: number
  onPress?: () => void
}) {
  const closed = !kitchen.is_open

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 60, 300))
        .duration(380)
        .springify()
        .damping(18)}
    >
      <PressableCard
        style={styles.card}
        onPress={onPress}
        accessibilityLabel={describe(kitchen)}
      >
        <View style={styles.imageWrap}>
          <Image
            source={kitchen.cover_image_url ? assetUrl(kitchen.cover_image_url) : undefined}
            style={styles.image}
            contentFit="cover"
            transition={280}
            // Disk cache, so a scroll back up costs nothing and a relaunch is
            // instant. On Indian mobile data that is a real saving, not a nicety.
            cachePolicy="memory-disk"
          />

          {closed && (
            <View style={styles.closedVeil}>
              <View style={styles.closedPill}>
                <Text style={styles.closedText}>Closed right now</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {kitchen.name}
            </Text>
            {kitchen.rating_count > 0 && (
              <View style={styles.ratingPill} accessibilityElementsHidden>
                <Text style={styles.ratingText}>★ {kitchen.rating_average.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {kitchen.cuisines.length > 0 && (
            <Text style={styles.cuisines} numberOfLines={1}>
              {kitchen.cuisines.join(' · ')}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <Text style={styles.meta}>{kitchen.avg_prep_minutes} min</Text>
              {kitchen.distance_m !== undefined && (
                <Text style={styles.meta}>{formatDistance(kitchen.distance_m)}</Text>
              )}
            </View>
            {/* Pushed right, like the web card: "when and how far" and "can I
                afford it" answer different questions, and reading them as one run
                of numbers is harder. */}
            {kitchen.cost_for_two_minor ? (
              <Text style={styles.costForTwo}>
                ₹{Math.round(kitchen.cost_for_two_minor / 100)} for two
              </Text>
            ) : null}
          </View>
        </View>
      </PressableCard>
    </Animated.View>
  )
}

function formatDistance(metres: number): string {
  return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`
}

/**
 * The card, as a sentence.
 *
 * Written in reading order and spelled out rather than abbreviated: a screen reader
 * says "three hundred and seventy five metres", where the visual "375 m" is scanned.
 * The closed state comes FIRST, because it changes whether the rest is worth hearing
 * — a sighted customer sees the grey veil before reading the name, and the spoken
 * version should put the same fact in the same position.
 */
function describe(k: Kitchen): string {
  const parts: string[] = []
  if (!k.is_open) parts.push('Closed right now')
  parts.push(k.name)
  if (k.rating_count > 0) parts.push(`rated ${k.rating_average.toFixed(1)} out of 5`)
  if (k.cuisines.length > 0) parts.push(k.cuisines.join(', '))
  parts.push(`${k.avg_prep_minutes} minutes`)
  if (k.distance_m !== undefined) {
    parts.push(
      k.distance_m < 1000
        ? `${k.distance_m} metres away`
        : `${(k.distance_m / 1000).toFixed(1)} kilometres away`,
    )
  }
  if (k.cost_for_two_minor) {
    parts.push(`about ${Math.round(k.cost_for_two_minor / 100)} rupees for two`)
  }
  return parts.join('. ')
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  // A warm tone underneath, so the slot is never white while the photo decodes.
  // A hard swap from white to a dark photograph is the flash that makes an
  // otherwise fast list feel cheap.
  imageWrap: { width: '100%', height: 168, backgroundColor: gradients.imagePlaceholder },
  image: { width: '100%', height: '100%' },
  closedVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedPill: {
    backgroundColor: c.surface,
    paddingHorizontal: s.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  closedText: { fontSize: 12, fontWeight: '600', color: c.ink },
  body: { padding: s.lg - 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
  name: { flex: 1, fontSize: 17, fontWeight: '700', color: c.ink, letterSpacing: -0.2 },
  ratingPill: {
    backgroundColor: c.veg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm - 2,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: c.onVeg },
  cuisines: { marginTop: 3, fontSize: 13, color: c.inkSoft },
  metaRow: {
    marginTop: s.md,
    paddingTop: s.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.rule,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLeft: { flexDirection: 'row', gap: s.md },
  meta: { fontSize: 12, color: c.inkFaint },
  costForTwo: { fontSize: 12, fontWeight: '600', color: c.inkSoft },
})
