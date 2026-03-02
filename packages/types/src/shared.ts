// Shared utility types and constants used across all Oneoff frontend projects.
// This file is manually maintained -- add shared types here.

export type PaginatedResponse<T> = {
  data: T[]
  page: number | null
  total: number | null
}
