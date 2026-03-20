import { writeFile } from 'node:fs/promises'

const SOURCE_URL = 'https://ollama.com/search'
const OUTPUT_PATH = new URL('../data/models.json', import.meta.url)
const MAX_PAGES = 100
const TARGET_COUNT = 100
const FAILPOINT_ENV = 'SCRAPE_MODELS_FAILPOINT'
const PULLS_PATTERN = /^(\d+(?:\.\d+)?)([KMB])?$/i
const MULTIPLIERS = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
}

function log(message) {
  console.log(`[scrape-models] ${message}`)
}

function fail(message) {
  console.error(`[scrape-models] ${message}`)
  process.exitCode = 1
}

function maybeInjectFailure(point) {
  if (process.env[FAILPOINT_ENV] === point) {
    throw new Error(`Injected failure at ${point} via ${FAILPOINT_ENV}`)
  }
}

function usage() {
  return [
    'Usage: node scripts/scrape-models.mjs [--dry-run] [--help]',
    '',
    'Options:',
    '  --dry-run   Scrape and print count only, do not write data/models.json',
    '  --help      Show this help and exit',
  ].join('\n')
}

function parseCliArgs(argv) {
  const knownArgs = new Set(['--dry-run', '--help'])
  const args = new Set(argv)

  for (const arg of args) {
    if (!knownArgs.has(arg)) {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return {
    help: args.has('--help'),
    dryRun: args.has('--dry-run'),
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripHtmlTags(input) {
  return input.replace(/<[^>]*>/g, ' ')
}

function decodeHtmlEntities(input) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function normalizeText(input) {
  return decodeHtmlEntities(stripHtmlTags(input)).replace(/\s+/g, ' ').trim()
}

function parsePullsToNumber(input) {
  const trimmed = input.trim()

  if (trimmed.length === 0) {
    throw new Error('Invalid pulls value: empty input')
  }

  const normalized = trimmed.replace(/,/g, '')
  const match = normalized.match(PULLS_PATTERN)

  if (!match) {
    throw new Error(`Invalid pulls value: ${input}`)
  }

  const [, numericPart, unitPart] = match
  const baseValue = Number(numericPart)

  if (Number.isNaN(baseValue)) {
    throw new Error(`Invalid pulls value: ${input}`)
  }

  const multiplier = unitPart ? MULTIPLIERS[unitPart.toUpperCase()] : 1
  return baseValue * multiplier
}

function extractAttributeValues(html, attributeName) {
  const pattern = new RegExp(`<[^>]*${escapeRegExp(attributeName)}[^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi')
  const values = []

  let match = pattern.exec(html)
  while (match) {
    const value = normalizeText(match[1])
    if (value.length > 0) {
      values.push(value)
    }
    match = pattern.exec(html)
  }

  return values
}

function extractSingleAttributeValue(html, attributeName) {
  const values = extractAttributeValues(html, attributeName)
  return values[0] ?? ''
}

function extractModelCards(html) {
  const cards = []
  const pattern = /<li\s+x-test-model\b[\s\S]*?<\/li>/gi

  let match = pattern.exec(html)
  while (match) {
    cards.push(match[0])
    match = pattern.exec(html)
  }

  return cards
}

function buildPageUrl(page) {
  const url = new URL(SOURCE_URL)
  url.searchParams.set('p', String(page))
  return url
}

function buildFallbackPageUrl(page) {
  const url = new URL(SOURCE_URL)
  url.searchParams.set('page', String(page))
  return url
}

async function fetchPageHtml(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} when requesting ${url.toString()}`)
  }

  return response.text()
}

function parseModelCard(cardHtml) {
  const name = extractSingleAttributeValue(cardHtml, 'x-test-search-response-title')
  const pullsRaw = extractSingleAttributeValue(cardHtml, 'x-test-pull-count')
  const pullsValue = parsePullsToNumber(pullsRaw)
  const capabilityTags = extractAttributeValues(cardHtml, 'x-test-capability')
  const sizeTags = extractAttributeValues(cardHtml, 'x-test-size')
  const cloudTags = extractAttributeValues(cardHtml, 'bg-cyan-50')
  const tags = Array.from(new Set([...capabilityTags, ...sizeTags, ...cloudTags]))

  return {
    name,
    tags,
    pullsRaw,
    pullsValue,
  }
}

function createPageFingerprint(models) {
  return models.map((model) => `${model.name}:${model.pullsRaw}`).join('|')
}

async function collectModels() {
  const dedupedByName = new Map()
  const pageFingerprints = new Set()
  let usedFallbackParam = false

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const pageUrl = usedFallbackParam ? buildFallbackPageUrl(page) : buildPageUrl(page)
    const html = await fetchPageHtml(pageUrl)
    const cards = extractModelCards(html)

    log(`page=${page} cards=${cards.length} via=${usedFallbackParam ? 'page' : 'p'}`)

    if (page === 1 && cards.length === 0) {
      throw new Error('Selector drift: no `li[x-test-model]` cards found on first page')
    }

    if (cards.length === 0) {
      log(`stopping at page=${page}: no model cards found`)
      break
    }

    const modelsOnPage = cards.map(parseModelCard).filter((item) => item.name.length > 0 && item.pullsRaw.length > 0)
    const fingerprint = createPageFingerprint(modelsOnPage)

    if (pageFingerprints.has(fingerprint)) {
      if (!usedFallbackParam) {
        log(`page=${page} repeated with p param; switching to page param fallback`)
        usedFallbackParam = true
        pageFingerprints.clear()
        dedupedByName.clear()
        page = 0
        continue
      }

      log(`stopping at page=${page}: repeated page fingerprint`)
      break
    }
    pageFingerprints.add(fingerprint)

    for (const model of modelsOnPage) {
      const existing = dedupedByName.get(model.name)
      if (!existing || model.pullsValue > existing.pullsValue) {
        dedupedByName.set(model.name, model)
      }
    }
  }

  if (dedupedByName.size < TARGET_COUNT) {
    throw new Error(`Expected at least ${TARGET_COUNT} unique models, got ${dedupedByName.size}`)
  }

  return Array.from(dedupedByName.values())
    .sort((a, b) => b.pullsValue - a.pullsValue)
    .slice(0, TARGET_COUNT)
}

async function main() {
  const { help, dryRun } = parseCliArgs(process.argv.slice(2))

  if (help) {
    console.log(usage())
    process.exitCode = 0
    return
  }

  const models = await collectModels()

  if (models.length !== TARGET_COUNT) {
    throw new Error(`Expected ${TARGET_COUNT} models after sorting, got ${models.length}`)
  }

  for (let index = 1; index < models.length; index += 1) {
    if (models[index - 1].pullsValue < models[index].pullsValue) {
      throw new Error('Models are not sorted in descending pullsValue order')
    }
  }

  maybeInjectFailure('before-payload')

  if (dryRun) {
    log(`count=${models.length}`)
    process.exitCode = 0
    return
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    models,
  }

  if (!Array.isArray(payload.models) || payload.models.length !== TARGET_COUNT) {
    throw new Error(`Refusing write: invalid payload models length ${payload.models?.length ?? 'unknown'}`)
  }

  if (typeof payload.generatedAt !== 'string' || payload.generatedAt.length === 0) {
    throw new Error('Refusing write: invalid generatedAt metadata')
  }

  maybeInjectFailure('before-write')

  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  log(`wrote ${models.length} models to data/models.json`)
  process.exitCode = 0
}

main().catch((error) => {
  if (error instanceof Error && error.message.startsWith('Injected failure at')) {
    fail(`${error.message}; preserving last-known-good data/models.json snapshot`)
    return
  }

  if (error instanceof Error && error.message.startsWith('Unknown argument:')) {
    fail(error.message)
    console.error(usage())
    return
  }

  fail(`${error instanceof Error ? error.message : 'Unexpected error during scrape'}; preserving last-known-good data/models.json snapshot`)
  console.error(error)
})
