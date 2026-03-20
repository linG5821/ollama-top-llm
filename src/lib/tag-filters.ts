function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

export function toggleSelectedTags(currentTags: string[], tag: string): string[] {
  if (tag === 'all') {
    return []
  }

  const normalizedTag = normalizeTag(tag)
  const hasTag = currentTags.some((currentTag) => normalizeTag(currentTag) === normalizedTag)

  if (hasTag) {
    return currentTags.filter((currentTag) => normalizeTag(currentTag) !== normalizedTag)
  }

  return [...currentTags, tag]
}

export function matchesSelectedTags(modelTags: string[], selectedTags: string[]): boolean {
  if (selectedTags.length === 0) {
    return true
  }

  const normalizedSelectedTags = new Set(selectedTags.map((tag) => normalizeTag(tag)))
  return modelTags.some((tag) => normalizedSelectedTags.has(normalizeTag(tag)))
}
