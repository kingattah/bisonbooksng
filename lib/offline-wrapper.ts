"use client"

import { offlineSync } from "./offline-sync"

// Type for any database action function
type DatabaseAction<T, R> = (data: T) => Promise<R>

// Wrapper for database actions to handle offline functionality
export function withOfflineSupport<T, R>(action: DatabaseAction<T, R>, tableName: string): DatabaseAction<T, R> {
  return async (data: T) => {
    // Check if we're online
    if (navigator.onLine) {
      try {
        // If online, perform the action normally
        const result = await action(data)
        return result
      } catch (error) {
        console.error("Error performing online action:", error)
        throw error
      }
    } else {
      // If offline, queue the operation for later
      console.log(`Offline: Queueing ${tableName} operation for later`)

      // Generate a temporary ID for new items
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      // Determine if this is an insert, update, or delete based on the data structure
      // This is a simplified approach - you may need to adjust based on your actual data structure
      const hasId = typeof data === "object" && data !== null && "id" in data && data.id
      const isDelete = typeof data === "object" && data !== null && "deleted" in data && data.deleted === true

      const action = hasId ? (isDelete ? "delete" : "update") : "insert"

      // Queue the operation
      offlineSync.queueOperation({
        id: hasId ? (data as any).id : tempId,
        table: tableName,
        action,
        data: action === "delete" ? { id: (data as any).id } : data,
      })

      // For inserts, return a mock response with the temporary ID
      if (action === "insert") {
        return {
          data: { ...(data as object), id: tempId },
          error: null,
          isOffline: true,
        } as unknown as R
      }

      // For updates and deletes, return a mock success response
      return {
        data: data,
        error: null,
        isOffline: true,
      } as unknown as R
    }
  }
}
