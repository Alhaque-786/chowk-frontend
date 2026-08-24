// Metro config for a monorepo.
//
// npm workspaces HOIST dependencies to the repo root, so `react-native` and
// friends live in ../../node_modules, not ./node_modules. Metro does not walk up
// by default — it would report "Unable to resolve module react" with everything
// correctly installed, which is a confusing first hour for anyone new to this.
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
// Without this, two copies of React can be resolved (one per node_modules) and
// hooks fail at runtime with "Invalid hook call" — a symptom that looks nothing
// like its cause.
config.resolver.disableHierarchicalLookup = true

module.exports = config
