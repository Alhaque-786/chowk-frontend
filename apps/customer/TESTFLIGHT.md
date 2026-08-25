# Getting this app onto TestFlight

## What it costs, before anything else

| | cost | avoidable? |
| --- | --- | --- |
| **Apple Developer Program** | **$99/year** | **No.** TestFlight is App Store Connect, and that requires a paid membership. |
| EAS Build | free tier: 15 iOS builds/month | Yes — see "building locally" below |
| EAS Submit | free on every plan | — |

The free EAS tier uses a **low-priority queue**, so a build can wait 90+ minutes at
busy times. That is the only thing $19/month buys you early on: not capability,
just not waiting.

## The bundle identifier is effectively permanent

Set to `com.chowk.customer` in `app.json`. **Confirm this before the first build.**

Changing it later does not rename an app — it creates a *different* app. A new
record in App Store Connect, new TestFlight testers, and every existing install
becomes an orphan that cannot update to the new one. It is one of the few
genuinely irreversible decisions in mobile.

Two things worth knowing:

- Apple does not verify that you own the domain. `com.chowk.*` is fine whether or
  not you end up with chowk.something.
- Bundle IDs are globally unique across App Store Connect. If someone already
  registered `com.chowk.customer`, you will find out at the first build and will
  have to choose another — so if the name is still unsettled, resolving it first is
  cheaper than resolving it after.

## Steps

```bash
# 1. Log in, and link the project to your Expo account.
npx eas-cli login
npx eas-cli init            # writes extra.eas.projectId into app.json

# 2. Let EAS create and hold the signing credentials. Say yes.
#    It generates the distribution certificate and provisioning profile on your
#    Apple account and stores them, which is the part people lose a day to
#    doing by hand in Xcode.
npx eas-cli build --platform ios --profile production

# 3. Send the finished build to TestFlight.
npx eas-cli submit --platform ios --latest
```

Step 2 prompts for your Apple ID and, if the app record does not exist yet, offers
to create it in App Store Connect. Let it.

After `submit`, the build appears in App Store Connect under **TestFlight** in
5–15 minutes while Apple processes it. Internal testers (up to 100, anyone on your
team) can install immediately. External testers (up to 10,000) need a **Beta App
Review**, which is lighter than App Store review but is still a human and takes a
day or two.

## Fill in `ascAppId` after the first submit

`eas.json` has a placeholder. After the app exists in App Store Connect, get the
real value:

```bash
npx eas-cli submit --platform ios --latest   # it prints the App ID it used
```

Then replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID`. Without it, later submits
have to resolve the app by name every time, which breaks the moment you have two
apps with similar names.

## Set the production API URL first

The `production` profile in `eas.json` points at `https://api.example.com/api/v1`.
**A TestFlight build compiled against localhost reaches nothing** — the phone is
not your Mac, and there is no Metro server to fall back on.

Point it at the deployed backend before building. Until the backend is deployed,
a TestFlight build cannot do anything useful, so deploy first.

## Expo Go stops working before you get here

Not a TestFlight problem, but the same wall. The app currently runs in Expo Go,
which ships a fixed set of native modules. The moment a dependency needs native
code Expo Go does not contain — Razorpay is the one coming — Expo Go cannot run
this app at all.

The replacement is a **development build**, which is the `development` profile in
`eas.json`:

```bash
npx eas-cli build --platform ios --profile development
```

That produces a simulator build you install once and then use exactly like Expo Go,
except it contains your native dependencies. Worth doing before you need it, rather
than on the afternoon you add payments.

## Android: cheaper, and free for testing

The costs are not symmetric, and the difference is bigger than the numbers suggest.

| | Apple | Google |
| --- | --- | --- |
| developer account | **$99/year** | **$25 once** |
| testing without an account | **impossible** | **free — send an APK** |

### Testing needs no account at all

This is the part with no iOS equivalent. Build an APK and send the file:

```bash
npx eas-cli build --platform android --profile preview
```

EAS returns a download link. Anyone can install it after allowing "install unknown
apps". No developer account, no store, no review, no $25 — a tester has your build
in the time it takes to download.

On iOS there is nothing like this. Even ad-hoc distribution to a single device
requires the paid membership, which is why TestFlight is the cheapest iOS path
rather than a convenient one.

### Publishing to Play has a 14-DAY dependency

Worth planning around now rather than discovering in launch week. Personal
developer accounts created after **13 November 2023** — which yours would be —
cannot ship to production until:

> At least **12 testers** must be opted in to your closed test when you apply for
> production access, and they must have been opted in **continuously for the
> preceding 14 days**.

Then a production-access review, usually under seven days.

So a Play Store launch is not "upload and wait for review". It is: recruit twelve
real people, keep them enrolled for two uninterrupted weeks, then apply, then wait
up to a week. If a tester drops out and rejoins, the 14 days restart.

**The practical consequence:** start the Android closed test EARLY, even if iOS is
the priority. The 14-day clock is a scheduling dependency, not a task — it costs
nothing to start and cannot be compressed later. Everything else about this project
can be hurried; that cannot.

Nothing in the config needs changing for Android — `android.package` already
matches the iOS bundle identifier.
