import Link from 'next/link'
import { Mic, Search } from 'lucide-react'
import { LocationBar } from '@/components/home/location-bar'

/**
 * The terracotta band the page opens on.
 *
 * BROUGHT ACROSS FROM THE CUSTOMER APP, deliberately and not by coincidence: the
 * gradient stops, the rounded bottom edge, and the search card straddling that edge
 * are the same three things in the same arrangement, because they are the app's
 * recognisable surface and this is the same product. The gradient itself is a shared
 * token (`--gradient-hero`), so the two cannot drift into being two warm gradients
 * that merely resemble each other.
 *
 * WHAT DID NOT COME ACROSS is the cuisine rail. The app filters live data through
 * pills; web navigates a curated taxonomy through circular photographs, which is
 * both richer and better for a page that has to rank. Consistency means one visual
 * identity, not one component — copying the pills here would have meant deleting the
 * photographs to match a surface that has none yet.
 *
 * THE STRADDLE IS FLOW-BASED, not a fixed height. The band carries bottom padding
 * and the search card is pulled up into it with a negative margin, so the boundary
 * lands across the middle of the card at every viewport width and every font size.
 * The app could use a measured height because a phone is one known width; a fixed
 * pixel height here would put the edge through the headline on a narrow screen and
 * below the card on a wide one.
 */
export function HeroBand({ label, isFallback }: { label: string; isFallback: boolean }) {
  return (
    <>
      <section className="rounded-b-[2rem] bg-[image:var(--gradient-hero)] px-4 pb-9 pt-4 sm:px-6 sm:pb-10">
        <div className="mx-auto max-w-6xl">
          <LocationBar label={label} isFallback={isFallback} tone="onDark" />

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-white/75">
            {greeting()}
          </p>

          {/*
            THE H1, and it says what the page is rather than saying hello.

            The app's big line is a greeting, which is right for a surface with no
            crawler. Here the same position has to carry the page's subject — both
            references do exactly this: Zomato's h1 is "Best Restaurants in Gurgaon",
            Swiggy's is "Restaurants with online food delivery in Gurgaon". So the
            greeting keeps the human note as the eyebrow above it, and the headline
            keeps the meaning.
          */}
          <h1 className="mt-1.5 font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-white sm:text-[2.5rem]">
            Kitchens near {label}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
            Cooked to order, from kitchens down the road.
          </p>
        </div>
      </section>

      {/*
        Pulled up over the band's bottom edge. `-mt-7` against the band's `pb-9`
        leaves roughly half the card on terracotta and half on paper, which is what
        makes it read as a floating object rather than a panel glued under a coloured
        block.

        `relative` is load-bearing: without it the card sits in the same stacking
        context as the band and the band's background paints over it.
      */}
      <div className="relative -mt-7 px-4 sm:px-6">
        {/*
          CAPPED, not full width. At 1280 the card stretched the full 1152px of the
          content column and the placeholder sat stranded at the far left with a
          metre of white beside it — a search field that wide reads as a page banner
          rather than a control. Both references cap the hero search around this
          width for the same reason. Left-aligned rather than centred, so it lines up
          with the headline above it.
        */}
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <SearchField />
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Search is a LINK, not an input, so the home page ships no search JavaScript.
 *
 * The real input lives on /search and takes focus on arrival — the interaction feels
 * identical and the home page stays light. The app does the same thing for a
 * different reason: a live input there would raise the keyboard over the list the
 * customer is still reading.
 */
function SearchField() {
  return (
    <Link
      href="/search"
      className="flex h-14 items-center gap-3 rounded-xl bg-surface px-4 shadow-md ring-1 ring-rule/70 transition-shadow hover:shadow-lg"
    >
      <Search className="size-[18px] shrink-0 text-accent" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm text-ink-faint">
        Search for biryani, kebabs or a kitchen
      </span>
      <span className="h-5 w-px shrink-0 bg-rule-strong" aria-hidden="true" />
      <Mic className="size-[18px] shrink-0 text-accent" aria-hidden="true" />
    </Link>
  )
}

/**
 * The greeting, in the timezone the customers are in.
 *
 * `new Date().getHours()` would read the SERVER's clock, which is UTC — so at 9pm in
 * Lucknow the page would have said "What's for lunch?", because 21:00 IST is 15:30
 * UTC. Every serving area is in India, so the zone is fixed rather than derived; when
 * that stops being true it belongs on the ServingArea record.
 */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  )
  if (hour < 11) return 'Good morning'
  if (hour < 16) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Late night'
}
