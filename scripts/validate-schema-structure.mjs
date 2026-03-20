import { readFile } from 'node:fs/promises'

function fail(message) {
  console.error(`[schema-structure] ${message}`)
  process.exitCode = 1
}

function ok(message) {
  console.log(`[schema-structure] ${message}`)
}

function isStringArraySchema(node) {
  return (
    node &&
    node.type === 'array' &&
    node.items &&
    node.items.type === 'string'
  )
}

async function main() {
  const schemaPath = process.argv[2]

  if (!schemaPath) {
    fail('Missing schema path argument. Usage: node scripts/validate-schema-structure.mjs <schema-file>')
    return
  }

  let raw
  try {
    raw = await readFile(schemaPath, 'utf8')
  } catch (error) {
    fail(`Unable to read file: ${schemaPath}`)
    console.error(error)
    return
  }

  let schema
  try {
    schema = JSON.parse(raw)
  } catch (error) {
    fail(`Invalid JSON: ${schemaPath}`)
    console.error(error)
    return
  }

  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    fail('`$schema` must be Draft 2020-12 URI')
  }

  if (schema.type !== 'object') {
    fail('Top-level `type` must be `object`')
  }

  const requiredTop = ['generatedAt', 'source', 'models']
  for (const key of requiredTop) {
    if (!Array.isArray(schema.required) || !schema.required.includes(key)) {
      fail(`Top-level \`required\` must include \`${key}\``)
    }
  }

  const properties = schema.properties
  if (!properties || typeof properties !== 'object') {
    fail('Top-level `properties` must exist')
  } else {
    if (!properties.generatedAt || properties.generatedAt.type !== 'string') {
      fail('`generatedAt` must be type `string`')
    }

    if (!properties.source || properties.source.type !== 'string') {
      fail('`source` must be type `string`')
    }

    const models = properties.models
    if (!models || models.type !== 'array') {
      fail('`models` must be type `array`')
    } else {
      if (models.minItems !== 100) {
        fail('`models.minItems` must be 100')
      }
      if (models.maxItems !== 100) {
        fail('`models.maxItems` must be 100')
      }

      const item = models.items
      if (!item || item.type !== 'object') {
        fail('`models.items` must be type `object`')
      } else {
        const requiredItem = ['name', 'tags', 'pullsRaw', 'pullsValue']
        for (const key of requiredItem) {
          if (!Array.isArray(item.required) || !item.required.includes(key)) {
            fail(`\`models.items.required\` must include \`${key}\``)
          }
        }

        const itemProps = item.properties
        if (!itemProps || typeof itemProps !== 'object') {
          fail('`models.items.properties` must exist')
        } else {
          if (!itemProps.name || itemProps.name.type !== 'string' || itemProps.name.minLength < 1) {
            fail('`models.items.properties.name` must be non-empty string (`type: string`, `minLength >= 1`)')
          }

          if (!isStringArraySchema(itemProps.tags)) {
            fail('`models.items.properties.tags` must be array of strings')
          }

          if (!itemProps.pullsRaw || itemProps.pullsRaw.type !== 'string') {
            fail('`models.items.properties.pullsRaw` must be type `string`')
          }

          if (!itemProps.pullsValue || itemProps.pullsValue.type !== 'number' || itemProps.pullsValue.minimum < 0) {
            fail('`models.items.properties.pullsValue` must be number with `minimum >= 0`')
          }
        }
      }
    }
  }

  if (process.exitCode && process.exitCode !== 0) {
    return
  }

  ok('Schema structure is valid')
  process.exitCode = 0
}

main().catch((error) => {
  fail('Unexpected error during schema validation')
  console.error(error)
})
