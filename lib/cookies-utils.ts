import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"

// Interface for cookie operations that works in both app/ and pages/ directories
export interface CookieOperations {
  get(name: string): string | undefined
  set(name: string, value: string, options: any): void
  remove(name: string, options: any): void
}

// Create cookie operations for the app directory (using next/headers)
export const createAppCookieOperations = () => {
  // Import dynamically to avoid static imports that would affect pages/
  const { cookies } = require("next/headers")
  const cookieStore = cookies()

  return {
    get(name: string) {
      return cookieStore.get(name)?.value
    },
    set(name: string, value: string, options: any) {
      try {
        cookieStore.set(name, value, options)
      } catch (error) {
        console.error(`Error setting cookie ${name}:`, error)
      }
    },
    remove(name: string, options: any) {
      try {
        cookieStore.delete(name, options)
      } catch (error) {
        console.error(`Error removing cookie ${name}:`, error)
      }
    },
  } as CookieOperations
}

// Create cookie operations for the pages directory (using request cookies)
export const createPagesCookieOperations = (cookieStore: ReadonlyRequestCookies) => {
  return {
    get(name: string) {
      return cookieStore.get(name)?.value
    },
    set(name: string, value: string, options: any) {
      try {
        // Note: This won't actually set cookies in the response
        // It's just a placeholder to maintain the interface
        console.warn("Setting cookies in pages/ directory may not work as expected")
      } catch (error) {
        console.error(`Error setting cookie ${name}:`, error)
      }
    },
    remove(name: string, options: any) {
      try {
        // Note: This won't actually remove cookies from the response
        // It's just a placeholder to maintain the interface
        console.warn("Removing cookies in pages/ directory may not work as expected")
      } catch (error) {
        console.error(`Error removing cookie ${name}:`, error)
      }
    },
  } as CookieOperations
}
