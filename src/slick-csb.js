const elCache = new Map()
// This helps fix the annoying disappearing of dom elements on csb save.
// Use $() or $$() to retrieve your dom elements in loops
const createQuerySelectorUtil = (qs) => (query) => {
  let el = elCache.get(query)
  if (el && document.body.contains(el)) {
    return el
  }
  el = qs(query)
  elCache.set(query, el)
  return el
}

export const querySelector = createQuerySelectorUtil(
  window.document.querySelector.bind(window.document)
)
export const querySelectorAll = createQuerySelectorUtil(
  window.document.querySelectorAll.bind(window.document)
)
export const $ = querySelector
export const $$ = querySelectorAll

const cleanupMethods = [
  'destroy',
  'unsubscribe',
  'clean',
  'cleanup',
  'clear',
  'remove',
]
const cleanup = (o, warnings = false) => {
  if (typeof o === 'function') {
    o()
    return
  }
  const fns = cleanupMethods.filter((m) => typeof o[m] === 'function')
  for (let fn of fns) {
    try {
      o[fn]()
    } catch (e) {
      if (warnings) {
        console.warn(`Problem calling method ${fn} on object`, o)
      }
    }
  }
}

// This takes care of unsightly clutter that's left around
// after a reload. Usage:
// const _gc = $GC(module)
// gc( thingToManage )
export const createGarbageCollector = (
  m,
  { showWarnings = false, clearConsole = true } = {}
) => {
  const tracked = new Set()
  m.hot.dispose(() => {
    for (let o of tracked) {
      cleanup(o, showWarnings)
    }
    if (clearConsole) {
      console.clear()
    }
  })
  return (o) => {
    if (!o) {
      return
    }
    if (typeof o !== 'object' && typeof o !== 'function') {
      return
    }
    tracked.add(o)
  }
}
export const $GC = createGarbageCollector
