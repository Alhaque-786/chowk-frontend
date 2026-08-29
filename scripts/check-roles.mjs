#!/usr/bin/env node
/**
 * Fails if the web app's role list has drifted from the backend's.
 *
 * Roles cross a language boundary: Go cannot import a TypeScript const, so one of the
 * two lists is necessarily a copy. The choice is between a copy that is checked and a
 * copy that is not, and an unchecked one fails silently — a renamed role becomes a gate
 * that never opens, on a dashboard nobody on the team uses daily.
 *
 * WHAT THIS DOES NOT DO, stated plainly because a guard people over-trust is worse than
 * no guard: the two repos are separate, so this cannot run in either CI without checking
 * out the other. It runs on a developer machine, where both checkouts sit side by side,
 * and skips with a message anywhere else. It is a fast local tripwire, not enforcement.
 *
 * It compares the role NAMES only. It cannot tell whether the capability grants in
 * access.ts match the backend's route groups — that is a judgement about what a role is
 * for, and it lives in the comments beside GRANTS.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const goFile = resolve(here, '../../backend/internal/platform/httpx/context.go')
const tsFile = resolve(here, '../apps/web/src/lib/access.ts')

if (!existsSync(goFile)) {
  console.log(`check-roles: no backend checkout at ${goFile} — skipping.`)
  process.exit(0)
}

/** `RoleCustomer Role = "customer"` → customer */
const goRoles = [...readFileSync(goFile, 'utf8').matchAll(/\bRole\s*=\s*"([a-z_]+)"/g)].map((m) => m[1])

/** The values inside `export const Role = { ... } as const`. */
const tsBlock = readFileSync(tsFile, 'utf8').match(/export const Role = \{([\s\S]*?)\} as const/)
if (!tsBlock) fail(`could not find "export const Role = { ... } as const" in ${tsFile}`)
const tsRoles = [...tsBlock[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])

if (goRoles.length === 0) fail(`found no roles in ${goFile} — the pattern this script matches has probably changed`)

const missingInTs = goRoles.filter((r) => !tsRoles.includes(r))
const extraInTs = tsRoles.filter((r) => !goRoles.includes(r))

if (missingInTs.length || extraInTs.length) {
  const lines = ['check-roles: the web app and the backend disagree about roles.', '']
  if (missingInTs.length) {
    lines.push(`  in the backend, absent from access.ts:  ${missingInTs.join(', ')}`)
    lines.push('    → a person holding this role gets no capabilities and sees no links.')
  }
  if (extraInTs.length) {
    lines.push(`  in access.ts, absent from the backend:  ${extraInTs.join(', ')}`)
    lines.push('    → the UI offers a journey the API will refuse.')
  }
  fail(lines.join('\n'))
}

console.log(`check-roles: ${goRoles.length} roles match the backend.`)

function fail(message) {
  console.error(message)
  process.exit(1)
}
