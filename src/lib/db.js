// localStorage-backed entity store, mirroring Base44's API shape

const genId = () => crypto.randomUUID()

function createEntity(key) {
  const read = () => JSON.parse(localStorage.getItem(key) || '[]')
  const write = (data) => localStorage.setItem(key, JSON.stringify(data))

  return {
    list(sort = '-date', limit = 500) {
      let items = read()
      if (sort) {
        const desc = sort.startsWith('-')
        const field = desc ? sort.slice(1) : sort
        items.sort((a, b) => {
          const av = a[field] ?? ''
          const bv = b[field] ?? ''
          if (av < bv) return desc ? 1 : -1
          if (av > bv) return desc ? -1 : 1
          return 0
        })
      }
      return items.slice(0, limit)
    },

    filter(criteria) {
      return read().filter(item =>
        Object.entries(criteria).every(([k, v]) => item[k] === v)
      )
    },

    get(id) {
      return read().find(i => i.id === id) ?? null
    },

    create(data) {
      const items = read()
      const item = { ...data, id: genId(), created_date: new Date().toISOString() }
      items.push(item)
      write(items)
      return item
    },

    update(id, data) {
      const items = read()
      const idx = items.findIndex(i => i.id === id)
      if (idx === -1) throw new Error('Not found')
      items[idx] = { ...items[idx], ...data }
      write(items)
      return items[idx]
    },

    delete(id) {
      const items = read().filter(i => i.id !== id)
      write(items)
    },

    bulkCreate(rows) {
      const items = read()
      const created = rows.map(data => ({
        ...data,
        id: genId(),
        created_date: new Date().toISOString(),
      }))
      write([...items, ...created])
      return created
    },
  }
}

export const Run = createEntity('pt_runs')
export const TrainingGoal = createEntity('pt_goals')
export const TrainingPlan = createEntity('pt_plans')

// Settings stored separately (single object, not an array)
export const Settings = {
  get() {
    return JSON.parse(localStorage.getItem('pt_settings') || '{}')
  },
  set(data) {
    const current = this.get()
    const next = { ...current, ...data }
    localStorage.setItem('pt_settings', JSON.stringify(next))
    return next
  },
}
