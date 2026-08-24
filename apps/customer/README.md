# Chowk — customer app

Expo + React Native, part of the `frontend` workspace.

## Run it

The Go API must be running first (`cd ../../backend && make dev`).

```bash
# from the repo root
npm run customer          # then press i for iOS, or scan the QR with Expo Go
```

## Testing on a real phone — no Android SDK needed

This is the fastest path, and the one to use for Android:

1. Install **Expo Go** from the Play Store (or App Store).
2. Put the phone on the **same wifi** as this Mac.
3. `npm run customer` and scan the QR code.

That is it. No Android Studio, no SDK, no emulator. The app discovers this Mac's
LAN address from the Expo packager, so the API resolves without editing anything —
see `src/lib/api-host.ts`.

**If requests fail**, the app prints the URL it tried on screen. Check in order:

| Symptom | Cause |
| --- | --- |
| `Network request failed` on a phone | Phone is on mobile data, not the wifi |
| Works on simulator, fails on phone | Same — or the Mac's firewall is blocking :8080 |
| Photos missing, data fine | The web app on :3000 is not running; it serves the images |

## Where the pieces are

```
src/app/          expo-router routes. File-based, like the Next.js App Router:
                    index.tsx        →  /
                    _layout.tsx      →  the root Stack
src/lib/          api-host.ts — per-platform API and asset URLs
metro.config.js   monorepo resolution. Do not delete; see the comments inside.
```

## Android emulator, when you actually want one

Only needed to test Android without a physical device. It is a ~1.2GB install:

```bash
brew install --cask android-studio
```

Then in Android Studio: **More Actions → SDK Manager**, install the latest SDK
platform and build tools, and create a device under **Device Manager**. Add to
`~/.zshrc`:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
```

Expo Go on a real phone covers most of what an emulator would, so this is
deliberately deferred rather than set up in advance.

## What Expo Go cannot do

Expo Go runs a fixed set of native modules. The moment the app needs one it does
not bundle — a payment SDK, background location for the rider app — you switch to
a **development build**:

```bash
npx expo run:ios        # needs Xcode, already installed
npx expo run:android    # needs the Android SDK above
```

Same workflow afterwards, and it is worth knowing this cliff exists before hitting
it mid-feature: Razorpay and background location will both require it.
