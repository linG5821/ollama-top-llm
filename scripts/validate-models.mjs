import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const EXIT_CODES = {
  VALID: 0,
  INVALID_DATA: 1,
  INVALID_ARGS: 2,
  IO_ERROR: 3,
  JSON_ERROR: 4,
  SCHEMA_ERROR: 5,
}

function log(message) {
  console.log(`[validate-models] ${message}`)
}

function fail(message, code = EXIT_CODES.INVALID_DATA) {
  console.error(`[validate-models] ${message}`)
  process.exitCode = code
}

function usage() {
  return 'Usage: node scripts/validate-models.mjs <models-file> [schema-file]'
}

async function readJsonFile(filePath, label) {
  let raw
  try {
    raw = await readFile(filePath, 'utf8')
  } catch (error) {
    fail(`Unable to read ${label} file: ${filePath}`, EXIT_CODES.IO_ERROR)
    console.error(error)
    return null
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    fail(`Invalid JSON in ${label} file: ${filePath}`, EXIT_CODES.JSON_ERROR)
    console.error(error)
    return null
  }
}

function formatError(error, index) {
  const instancePath = error.instancePath && error.instancePath.length > 0 ? error.instancePath : '/'
  const schemaPath = error.schemaPath ?? '(unknown-schema-path)'
  return `error#${index + 1} path=${instancePath} schema=${schemaPath} message=${error.message}`
}

async function main() {
  const dataPath = process.argv[2]
  const schemaPath = process.argv[3] ?? new URL('../data/models.schema.json', import.meta.url)

  if (!dataPath) {
    fail(`Missing models path argument. ${usage()}`, EXIT_CODES.INVALID_ARGS)
    return
  }

  const schema = await readJsonFile(schemaPath, 'schema')
  if (!schema) {
    return
  }

  const data = await readJsonFile(dataPath, 'models')
  if (!data) {
    return
  }

  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
  })

  let validate
  try {
    validate = ajv.compile(schema)
  } catch (error) {
    fail('Schema compilation failed', EXIT_CODES.SCHEMA_ERROR)
    console.error(error)
    return
  }

  const valid = validate(data)
  if (!valid) {
    fail('Validation failed', EXIT_CODES.INVALID_DATA)
    for (const [index, error] of (validate.errors ?? []).entries()) {
      console.error(`[validate-models] ${formatError(error, index)}`)
    }
    return
  }

  log('Validation passed')
  process.exitCode = EXIT_CODES.VALID
}

main().catch((error) => {
  fail('Unexpected error during models validation', EXIT_CODES.INVALID_DATA)
  console.error(error)
})
