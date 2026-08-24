import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderCss } from '../src/css.ts'

/**
 * Writes the web app's token stylesheet, or verifies it is current.
 *
 * `--check` is the half that matters. A generated file checked into git is only a
 * single source of truth for as long as somebody remembers to regenerate it; without
 * a check, editing the source and forgetting is indistinguishable from not editing
 * it at all. With one, it is a non-zero exit.
 */
const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, '../../../apps/web/src/app/tokens.generated.css')
const rendered = renderCss()
const check = process.argv.includes('--check')

if (check) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : ''
  if (current === rendered) {
    console.log(`tokens: up to date (${target})`)
    process.exit(0)
  }
  console.error('tokens: GENERATED CSS IS STALE')
  console.error(`  ${target}`)
  console.error('  run: npm run generate --workspace=@chowk/tokens')
  process.exit(2)
}

writeFileSync(target, rendered)
console.log(`tokens: wrote ${target} (${rendered.split('\n').length} lines)`)
