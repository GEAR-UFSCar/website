"use client"

let cachedRect: DOMRect | null = null

function getHeroRect(): DOMRect | null {
  if (cachedRect) return cachedRect
  const el = document.querySelector(".hero")
  if (!el) return null
  cachedRect = el.getBoundingClientRect()
  return cachedRect
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    cachedRect = null
  })
  window.addEventListener("scroll", () => {
    cachedRect = null
  })
}

export function isPointInHero(x: number, y: number): boolean {
  const rect = getHeroRect()
  if (!rect) return false
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}
