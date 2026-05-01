export interface PlakySpace {
  id: string
  title: string
  boards?: PlakyBoard[]
}

export interface PlakyBoard {
  id: string
  title: string
  fields: PlakyField[]
  groups: PlakyGroup[]
  members?: PlakyMember[]
}

export interface PlakyField {
  id: string
  key: string
  title: string
  type: string
  options?: PlakyFieldOption[]
}

export interface PlakyFieldOption {
  id: string
  label: string
  color?: string
}

export interface PlakyGroup {
  id: string
  title: string
}

export interface PlakyMember {
  id: string
  name: string
  email: string
  role: string
}

export interface PlakyUser {
  id: string
  name: string
  email: string
  type: string
  status: string
}

export interface PlakyItemField {
  key: string
  title: string
  type: string
  value: unknown
}

export interface PlakyItem {
  id: string
  title: string
  createdAt: string
  group: { id: string; title: string }
  board: { id: string; title: string }
  space: { id: string; title: string }
  fields?: PlakyItemField[]
}

export interface PlakyComment {
  id: string
  text: string
  createdAt: string
  createdBy: { id: string; name: string; email: string }
}

export interface PlakyPaginated<T> {
  data: T[]
  hasMore: boolean
}
