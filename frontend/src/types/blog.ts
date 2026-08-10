export type BlogReference = { label: string; url: string }
export type BlogSection = { heading: string; paragraphs: string[] }
export type BlogPost = {
  slug: string
  title: string
  description: string
  category: string
  publishedAt: string
  updatedAt: string
  readingMinutes: number
  author: string
  keywords: string[]
  intro: string[]
  sections: BlogSection[]
  checklist: string[]
  references: BlogReference[]
}
