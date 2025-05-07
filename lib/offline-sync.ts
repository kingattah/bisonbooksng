"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Define the types for our offline data
type OfflineItem = {
  id: string
  table: string
  action: "insert" | "update" | "delete"
  data: any
  timestamp: number
}

export const offlineSync = {
  // Store data for offline use
  storeOfflineData: (table: string, data: any) => {
    if (typeof window === "undefined") return

    try {
      // Get existing data
      const existingData = localStorage.getItem(`offline_${table}`)
      const parsedData = existingData ? JSON.parse(existingData) : []

      // Add new data
      parsedData.push(data)

      // Store updated data
      localStorage.setItem(`offline_${table}`, JSON.stringify(parsedData))
    } catch (error) {
      console.error("Error storing offline data:", error)
    }
  },

  // Get offline data for a specific table
  getOfflineData: (table: string) => {
    if (typeof window === "undefined") return []

    try {
      const data = localStorage.getItem(`offline_${table}`)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("Error retrieving offline data:", error)
      return []
    }
  },

  // Queue an operation to be performed when back online
  queueOperation: (item: Omit<OfflineItem, "timestamp">) => {
    if (typeof window === "undefined") return

    try {
      // Get existing queue
      const existingQueue = localStorage.getItem("offline_queue")
      const queue = existingQueue ? JSON.parse(existingQueue) : []

      // Add new operation to queue
      queue.push({
        ...item,
        timestamp: Date.now(),
      })

      // Store updated queue
      localStorage.setItem("offline_queue", JSON.stringify(queue))
    } catch (error) {
      console.error("Error queueing offline operation:", error)
    }
  },

  // Process queued operations when back online
  processQueue: async () => {
    if (typeof window === "undefined") return

    try {
      // Get queue
      const queueData = localStorage.getItem("offline_queue")
      if (!queueData) return

      const queue: OfflineItem[] = JSON.parse(queueData)
      if (queue.length === 0) return

      // Create Supabase client
      const supabase = createClientComponentClient()

      // Process each operation
      for (const item of queue) {
        try {
          switch (item.action) {
            case "insert":
              await supabase.from(item.table).insert(item.data)
              break
            case "update":
              await supabase.from(item.table).update(item.data).eq("id", item.data.id)
              break
            case "delete":
              await supabase.from(item.table).delete().eq("id", item.id)
              break
          }
        } catch (error) {
          console.error(`Error processing offline operation for ${item.table}:`, error)
        }
      }

      // Clear queue after processing
      localStorage.removeItem("offline_queue")
    } catch (error) {
      console.error("Error processing offline queue:", error)
    }
  },

  // Initialize offline sync
  init: () => {
    if (typeof window === "undefined") return

    // Process queue when coming back online
    window.addEventListener("online", () => {
      offlineSync.processQueue()
    })

    // Check if we're online on init and process queue if needed
    if (navigator.onLine) {
      offlineSync.processQueue()
    }
  },
}
