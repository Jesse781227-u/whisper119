export const GENRE_CATEGORIES = [
  "Romance",
  "Werewolf",
  "Paranormal",
  "Dark Romance",
  "Billionaire Romance",
  "Completed Series",
] as const

export type GenreCategory = (typeof GENRE_CATEGORIES)[number]

export const EMPTY_CATEGORIES = GENRE_CATEGORIES.map((name) => ({ name, count: 0 }))