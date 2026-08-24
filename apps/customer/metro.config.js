// Metro config for a monorepo.
//
// npm workspaces HOIST dependencies to the repo root, so `react-native` and friends
// live in ../../node_modules, not ./node_modules. Metro does not walk up from the
// project root on its own — without help it reports "Unable to resolve module react"
// with everything correctly installed, which is a confusing first hour for anyone
// new to this.
//
// Two settings fix it:
//   watchFolders     — so edits anywhere in the workspace trigger a reload,
//                      including in packages/* once shared code exists.
//   nodeModulesPaths — so resolution checks the app first, then the root.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

/*
  HIERARCHICAL LOOKUP STAYS ON, and this cost a real debugging session.

  It was set to `disableHierarchicalLookup = true` here, copied from the pnpm
  guidance, with a comment claiming it prevents two copies of React resolving. It
  does prevent that — and it also breaks every dependency that ships its own nested
  node_modules, because the only way to find `react-native-reanimated/node_modules/
  semver` is to walk up from the importing file. Reanimated does exactly that:
  `validate-worklets-version.js` requires `semver/functions/satisfies`, and the
  bundle failed with "Unable to resolve module semver" while semver sat installed in
  two places on disk.

  The duplicate-React problem the flag was guarding against does not arise here, and
  npm workspaces is why: npm hoists a single `react` to the workspace root, so there
  is only one copy to resolve. The flag was solving a pnpm problem in an npm repo.

  If a duplicate ever does appear, the targeted fix is `resolver.resolveRequest`
  pinning the specific package, not switching off resolution for everything.
*/

module.exports = config
