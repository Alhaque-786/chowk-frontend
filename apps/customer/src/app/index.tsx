import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { API_BASE_URL, assetUrl, describeApiHost } from '@/lib/api-host'

/**
 * The first real screen: kitchens near you, from the actual Go API.
 *
 * Deliberately a REAL request rather than a hello-world, because the only thing
 * worth proving on day one of a mobile app is that the device can reach the
 * backend. Everything else is layout.
 *
 * It shows the resolved API host on screen. That is not debug clutter left in by
 * accident — "Network request failed" is indistinguishable from a dead server, and
 * seeing which URL was attempted turns the commonest setup problem into a glance.
 */

type Kitchen = {
  id: string
  name: string
  cuisines: string[]
  is_open: boolean
  avg_prep_minutes: number
  rating_average: number
  rating_count: number
  cost_for_two_minor?: number
  cover_image_url?: string
  distance_m?: number
}

// Lucknow, matching the web app's launch city.
const CENTRE = { lat: 26.85, lng: 80.947 }

export default function KitchensScreen() {
  const [kitchens, setKitchens] = useState<Kitchen[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const url =
        `${API_BASE_URL}/kitchens/nearby` +
        `?lat=${CENTRE.lat}&lng=${CENTRE.lng}&radius_m=15000`
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        // React Native's fetch has no timeout either. Same trap as the web client.
        signal: AbortSignal.timeout(10_000),
      })
      const body = await res.json()
      if (body.error) throw new Error(body.error.message)
      // The API wraps everything in { data: ... } — same envelope as the web app.
      setKitchens(body.data?.kitchens ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the API.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Kitchens near you</Text>
        <Text style={styles.host} numberOfLines={2}>
          {API_BASE_URL}
        </Text>
        <Text style={styles.hostWhy}>{describeApiHost()}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.centre} size="large" />
      ) : error ? (
        <View style={styles.centre}>
          <Text style={styles.errorTitle}>Could not reach the API</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Text style={styles.errorHint}>
            Is the Go server running? On a real device, the phone and this Mac must
            be on the same wifi.
          </Text>
        </View>
      ) : (
        <FlatList
          data={kitchens}
          keyExtractor={(k) => k.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void load()
              }}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.cover_image_url ? (
                <Image
                  // assetUrl, not the API host: these files are served by the WEB
                  // app on :3000, and prefixing the API host gives a 404. See
                  // api-host.ts for why that distinction exists and should not.
                  source={{ uri: assetUrl(item.cover_image_url) }}
                  style={styles.image}
                />
              ) : (
                <View style={[styles.image, styles.imageFallback]} />
              )}

              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.rating_count > 0 && (
                    <Text style={styles.rating}>★ {item.rating_average.toFixed(1)}</Text>
                  )}
                </View>

                <Text style={styles.cuisines} numberOfLines={1}>
                  {item.cuisines.join(' · ')}
                </Text>

                <View style={styles.meta}>
                  <Text style={styles.metaText}>{item.avg_prep_minutes} min</Text>
                  {item.distance_m !== undefined && (
                    <Text style={styles.metaText}>
                      {item.distance_m < 1000
                        ? `${item.distance_m} m`
                        : `${(item.distance_m / 1000).toFixed(1)} km`}
                    </Text>
                  )}
                  {item.cost_for_two_minor ? (
                    <Text style={styles.metaText}>
                      ₹{Math.round(item.cost_for_two_minor / 100)} for two
                    </Text>
                  ) : null}
                  {!item.is_open && <Text style={styles.closed}>Closed</Text>}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  )
}

/*
  StyleSheet, not className.

  This is the concrete shape of "React Native does not reuse web components": the
  layout logic is identical in spirit and none of the Tailwind classes carry over.
  Flexbox works the same way, `gap` works, but every value is a JS object.
*/
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF6EF' },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#1C1917', letterSpacing: -0.5 },
  host: { marginTop: 6, fontSize: 11, color: '#6B6560', fontFamily: 'Menlo' },
  hostWhy: { marginTop: 2, fontSize: 11, color: '#9A938C' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle: { fontSize: 17, fontWeight: '700', color: '#A6342B' },
  errorBody: { marginTop: 6, fontSize: 13, color: '#6B6560', textAlign: 'center' },
  errorHint: { marginTop: 12, fontSize: 12, color: '#9A938C', textAlign: 'center' },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#4A3820',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  image: { width: '100%', height: 150 },
  imageFallback: { backgroundColor: '#E8A44C' },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1C1917' },
  rating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#1F7A4D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cuisines: { marginTop: 4, fontSize: 13, color: '#6B6560' },
  meta: { marginTop: 10, flexDirection: 'row', gap: 12, alignItems: 'center' },
  metaText: { fontSize: 12, color: '#9A938C' },
  closed: { fontSize: 12, fontWeight: '700', color: '#A6342B' },
})
