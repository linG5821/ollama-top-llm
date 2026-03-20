import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

function getBasePath(): string {
  const fromBasePath = process.env.BASE_PATH?.trim()
  if (fromBasePath) {
    const withLeadingSlash = fromBasePath.startsWith('/') ? fromBasePath : `/${fromBasePath}`
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
  }

  const repository = process.env.GITHUB_REPOSITORY?.trim()
  if (repository) {
    const [, repoName = ''] = repository.split('/')
    if (repoName.length > 0) {
      return `/${repoName}/`
    }
  }

  return '/'
}

function copyModelsDataPlugin() {
  return {
    name: 'copy-models-data',
    apply: 'build' as const,
    async closeBundle() {
      const outputDir = path.resolve(process.cwd(), 'dist', 'data')
      await mkdir(outputDir, { recursive: true })
      await copyFile(path.resolve(process.cwd(), 'data', 'models.json'), path.join(outputDir, 'models.json'))
    },
  }
}

export default defineConfig({
  plugins: [react(), copyModelsDataPlugin()],
  base: getBasePath(),
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
  },
})
