/**
 * Downloads dish photography from Wikimedia Commons into public/dishes/, and
 * records the licence for every file it keeps.
 *
 * WHY COMMONS. A food app needs real photographs, and the options were: scrape
 * image search (unlicensed, not defensible), use a stock API (needs a key and an
 * account), or use a source where every file states its licence in machine
 * readable form. Only the last one can be audited later, and the attribution
 * this script writes is what makes the images legally usable rather than merely
 * present.
 *
 * WHAT THIS IS NOT. These are not photographs of Khansama's food. For a food
 * ordering app that matters: a customer ordering biryani from a photo of someone
 * else's biryani is being shown something they will not receive. This is
 * development and pre-launch scaffolding, and the attribution page makes the
 * provenance visible rather than hiding it. Replacing these with real shoot
 * photography is a launch requirement, not a nice-to-have.
 *
 * Run: node scripts/fetch-dish-images.mjs
 * Idempotent -- skips anything already downloaded.
 */

import { writeFile, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'public', 'dishes')
const MANIFEST = join(process.cwd(), 'src', 'lib', 'dish-photos.generated.json')

/**
 * What to fetch, and under what key.
 *
 * `slug` is the filename and the lookup key. `search` is the Commons query --
 * tuned per dish, because a bare dish name often returns a raw ingredient or a
 * restaurant sign rather than a plated dish.
 *
 * `filetype:bitmap` excludes SVGs and PDFs, which Commons happily returns for a
 * food search and which are useless here.
 */
const WANTED = [
  { slug: 'mutton-biryani',   search: 'mutton biryani served plate rice filetype:bitmap' },
  { slug: 'chicken-biryani',  search: 'chicken biryani filetype:bitmap' },
  { slug: 'seekh-kebab',      search: 'Indian chicken seekh kebab filetype:bitmap' },
  { slug: 'tandoori-platter', search: 'tandoori platter filetype:bitmap' },
  { slug: 'butter-chicken',   search: 'butter chicken murgh makhani filetype:bitmap' },
  { slug: 'paneer-tikka',     search: 'paneer tikka filetype:bitmap' },
  { slug: 'dal-makhani',      search: 'dal makhani filetype:bitmap' },
  { slug: 'chole-bhature',    search: 'chole bhature filetype:bitmap' },
  { slug: 'thali',            search: 'Indian thali meal filetype:bitmap' },
  { slug: 'dosa',             search: 'masala dosa chutney sambar plate filetype:bitmap' },
  { slug: 'naan',             search: 'naan bread tandoor filetype:bitmap' },
  { slug: 'rogan-josh',       search: 'rogan josh mutton curry filetype:bitmap' },
  { slug: 'samosa',           search: 'samosa filetype:bitmap' },
  { slug: 'gulab-jamun',      search: 'gulab jamun filetype:bitmap' },
  { slug: 'kheer',            search: 'kheer rice pudding filetype:bitmap' },
  { slug: 'chai',             search: 'masala chai glass filetype:bitmap' },

  /*
    Kitchen COVER images, prefixed so they are obviously a different set. These
    fill the wide image on a kitchen card -- the single largest element on every
    reference listing page -- so the queries look for a spread or an interior
    rather than one plated dish, which crops badly at 16:10.
  */
  { slug: 'cover-awadhi',     search: 'Awadhi cuisine spread filetype:bitmap' },
  { slug: 'cover-mughlai',    search: 'Mughlai food spread filetype:bitmap' },
  { slug: 'cover-tandoor',    search: 'kebab platter grilled meat filetype:bitmap' },
  { slug: 'cover-southindian',search: 'South Indian meal banana leaf filetype:bitmap' },
  { slug: 'cover-streetfood', search: 'chaat plate Indian snack filetype:bitmap' },
  { slug: 'cover-sweets',     search: 'Indian sweets shop mithai filetype:bitmap' },
  // A sixth distinct cover: with five, two kitchens shared a photograph and the
  // grid immediately looked like a bug.
  { slug: 'cover-biryani',    search: 'biryani pot filetype:bitmap' },
]

/**
 * 900px wide. The largest place any of these renders is a kitchen card at ~360px
 * CSS pixels, so 900 covers a 2x display with room to spare. Downloading the
 * originals would put 4700px, multi-megabyte files in git for no visible gain.
 */
const WIDTH = 900

/**
 * PEXELS, when a key is available.
 *
 * Commons is the FALLBACK, not the preference. It is documentation photography --
 * people photographing their dinner to illustrate an article -- so even its
 * juried "Quality images" pool optimises for accuracy rather than appetite. The
 * chaat kitchen's first cover was a photograph of hands holding raw peas, and
 * that is the failure mode exactly: correct subject, useless for selling food.
 *
 * Pexels is professionally shot and styled, and its licence permits commercial
 * use with no attribution required. It needs a free API key, so this activates
 * only when PEXELS_API_KEY is set and otherwise changes nothing:
 *
 *     PEXELS_API_KEY=xxx node scripts/fetch-dish-images.mjs
 *
 * Pass slugs to replace only those. Everything downstream is untouched -- same
 * filenames, same manifest, same attribution page -- so switching source is this
 * one environment variable and no code change.
 */
const PEXELS_KEY = process.env.PEXELS_API_KEY ?? ''
const PEXELS_API = 'https://api.pexels.com/v1/search'

/**
 * Searches Pexels, returning candidates in the SAME shape as the Commons path so
 * that `pick` and the download loop never learn which source answered.
 *
 * orientation=landscape is requested server-side rather than filtered locally:
 * asking for six results and discarding portraits can leave nothing, whereas this
 * returns six usable ones.
 */
async function pexelsSearch(query) {
  const url =
    `${PEXELS_API}?query=${encodeURIComponent(query)}` +
    `&per_page=6&orientation=landscape&size=medium`

  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } })
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`)
  const body = await res.json()

  return (body.photos ?? []).map((photo) => ({
    page: { title: photo.alt || query },
    info: {
      width: photo.width,
      height: photo.height,
      mime: 'image/jpeg',
      // `large` is ~940px wide, close to the WIDTH the Commons path requests, so
      // both sources yield comparably sized files.
      thumburl: photo.src?.large,
      url: photo.src?.original,
      thumbwidth: 940,
      thumbheight: Math.round((940 * photo.height) / photo.width),
      extmetadata: {
        LicenseShortName: { value: 'Pexels License' },
        LicenseUrl: { value: 'https://www.pexels.com/license/' },
        Artist: { value: photo.photographer ?? 'Unknown' },
        Credit: { value: photo.url ?? 'pexels.com' },
      },
    },
    // Overrides the Commons file page so the manifest links the real source.
    sourcePage: photo.url,
  }))
}

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'chowk-dev/1.0 (local development image seeding)'

/**
 * Commons rate-limits anonymous bursts, and the first version of this script hit
 * 429 on the third request and lost twelve of sixteen images. Two fixes, both
 * needed: a fixed pause between every request so we do not burst in the first
 * place, and backoff on a 429 so a shared IP that is already warm still
 * completes rather than failing the whole run.
 *
 * Slow on purpose. This runs once, by hand, and a two-minute polite run beats a
 * five-second run that returns a quarter of the images.
 */
const PAUSE_MS = 1200
const MAX_ATTEMPTS = 4

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** fetch with backoff on 429/5xx. Anything else fails fast -- a 404 will not
 *  fix itself by being retried. */
async function politeFetch(url) {
  let wait = 2000
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) return res
    if (res.status !== 429 && res.status < 500) {
      throw new Error(`HTTP ${res.status}`)
    }
    if (attempt === MAX_ATTEMPTS) throw new Error(`HTTP ${res.status} after ${attempt} tries`)
    // Honour Retry-After when the server sends one; it knows better than we do.
    const retryAfter = Number(res.headers.get('retry-after'))
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : wait
    console.log(`         ${res.status}, waiting ${(delay / 1000).toFixed(0)}s…`)
    await sleep(delay)
    wait *= 2
  }
  throw new Error('unreachable')
}

/**
 * Prefers Commons' JURIED collections.
 *
 * The first version searched all of Commons and it showed: the chaat kitchen got
 * a photograph of hands holding raw peas, and half the cuisine circles were
 * unidentifiable at 88px. Commons is documentation photography, so a plain
 * search optimises for "depicts the subject", not "is a good photograph".
 *
 * `incategory:"Quality images"` restricts to files that passed Commons' own
 * photographic review -- sharpness, exposure, composition. That is the closest
 * thing to a quality bar available without a commercial stock API. Searched
 * FIRST, with the unrestricted search as a fallback, because the juried pool is
 * small enough that some dishes are not in it at all.
 */
async function search(query) {
  if (PEXELS_KEY !== '') {
    // Strip the Commons-only operator: `filetype:bitmap` is meaningless to Pexels
    // and would be treated as search terms, matching nothing.
    const cleaned = query.replace(/\s*filetype:bitmap\s*/g, ' ').trim()
    try {
      const photos = await pexelsSearch(cleaned)
      if (pick(photos, 1.0)) return photos
      console.log(`         pexels had nothing for "${cleaned}", trying Commons`)
    } catch (err) {
      // Caught EXPLICITLY. A rejected key fails every request, and without this
      // the run dies with a network error that looks nothing like "your key is
      // wrong". Falling back keeps the run useful while naming the real problem.
      console.log(`         pexels failed (${err.message}), falling back to Commons`)
    }
  }

  const juried = await rawSearch(`${query} incategory:"Quality images"`)
  if (pick(juried)) return juried
  return rawSearch(query)
}

async function rawSearch(query) {
  const url =
    `${API}?action=query&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrnamespace=6&gsrlimit=6` +
    `&prop=imageinfo&iiprop=url|size|mime|extmetadata` +
    `&iiurlwidth=${WIDTH}&format=json&formatversion=2`

  const res = await politeFetch(url)
  const body = await res.json()
  return body.query?.pages ?? []
}

/**
 * Picks the best candidate.
 *
 * Landscape-ish and reasonably large, because every slot these fill is a wide
 * card. A tall portrait photo of a thali crops to its own rim. Rejecting rather
 * than accepting-and-cropping is the difference between a designed grid and a
 * grid of accidents.
 */
function pick(pages, minRatio = 1.2) {
  const usable = pages
    .map((p) => ({ page: p, info: p.imageinfo?.[0] }))
    .filter(({ info }) => info && /^image\/(jpeg|png)$/.test(info.mime))
    .filter(({ info }) => info.width >= 800)
    // LANDSCAPE ONLY now, 1.2:1 or wider. Every slot these fill is either a
    // 16:10 card or a circle, and a square-ish photo of a thali crops to its own
    // rim in both. The earlier 0.9 threshold let portraits through and they are
    // the ones that looked broken.
    .filter(({ info }) => info.width / info.height >= minRatio)

  // Widest aspect first: least likely to lose the plate to a crop.
  usable.sort((a, b) => b.info.width / b.info.height - a.info.width / a.info.height)
  return usable[0]
}

function licenceOf(info) {
  const md = info.extmetadata ?? {}
  const strip = (v) => (v ? String(v).replace(/<[^>]*>/g, '').trim() : '')
  return {
    licence: strip(md.LicenseShortName?.value) || 'unknown',
    licenceUrl: strip(md.LicenseUrl?.value),
    author: strip(md.Artist?.value) || 'Unknown',
    credit: strip(md.Credit?.value),
  }
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const manifest = {}
// Reuse prior entries so a rerun after a network blip does not lose attribution
// for files that are already on disk.
try {
  Object.assign(manifest, JSON.parse(await readFile(MANIFEST, 'utf8')))
} catch {
  /* first run */
}

// Optional slug filter, so a bad photograph can be replaced without re-fetching
// the whole set and without hand-deleting files.
const only = new Set(process.argv.slice(2))
const forced = only.size > 0

for (const { slug, search: query } of WANTED) {
  if (forced && !only.has(slug)) continue

  const file = join(OUT_DIR, `${slug}.jpg`)

  // A forced slug is always re-fetched; that is the point of naming it.
  if (!forced && (await exists(file)) && manifest[slug]) {
    console.log(`  skip   ${slug} (already have it)`)
    continue
  }

  try {
    const pages = await search(query)
    // Two-pass: prefer a properly landscape photo, then settle for anything not
    // portrait. Refusing outright would leave a gradient tile where a usable
    // squarish photograph exists, and a mild crop beats no photograph.
    const chosen = pick(pages, 1.2) ?? pick(pages, 1.0)
    if (!chosen) {
      console.log(`  MISS   ${slug} — nothing usable, will fall back to a gradient`)
      continue
    }

    const { page, info } = chosen
    // thumburl is Commons' server-side resize to WIDTH. Falling back to the
    // original only if a thumb was not produced.
    const src = info.thumburl ?? info.url
    const res = await politeFetch(src)

    const bytes = Buffer.from(await res.arrayBuffer())
    // A "successful" response of a few hundred bytes is an error page, not a
    // photo. Writing it would produce a broken image that looks like a CSS bug.
    if (bytes.length < 10_000) throw new Error(`suspiciously small (${bytes.length}b)`)

    await writeFile(file, bytes)
    manifest[slug] = {
      file: `/dishes/${slug}.jpg`,
      sourcePage:
        chosen.sourcePage ??
        `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      width: info.thumbwidth ?? info.width,
      height: info.thumbheight ?? info.height,
      ...licenceOf(info),
    }
    console.log(
      `  ok     ${slug}  ${(bytes.length / 1024).toFixed(0)}kB  ${manifest[slug].licence}`,
    )
  } catch (err) {
    console.log(`  FAIL   ${slug} — ${err.message}`)
  }

  await sleep(PAUSE_MS)
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`\n${Object.keys(manifest).length} photos in the manifest.`)
if (PEXELS_KEY === '') {
  console.log(
    'Source: Wikimedia Commons. Set PEXELS_API_KEY for professionally shot food\n' +
      'photography instead -- same filenames, no other change needed.',
  )
}
