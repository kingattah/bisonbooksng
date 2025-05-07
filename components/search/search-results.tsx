"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export type SearchResult = {
  id: string
  type: string
  title: string
  subtitle: string
  status?: string
  amount?: number
  date?: string
  url: string
}

interface SearchResultsProps {
  initialResults: SearchResult[]
  query: string | undefined
  type: string
  error?: string
}

export function SearchResults({ initialResults, query, type, error }: SearchResultsProps) {
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!query) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Enter a search term to begin</p>
        </CardContent>
      </Card>
    )
  }

  if (initialResults.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No results found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {initialResults.map((result) => (
          <Link
            key={`${result.type}-${result.id}`}
            href={result.url}
            className="block py-4 hover:bg-muted/50 -mx-6 px-6 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{result.title}</h3>
                <p className="text-sm text-muted-foreground">{result.subtitle}</p>
              </div>
              <div className="text-right">
                {result.amount !== undefined && (
                  <p className="font-medium">₦{Number(result.amount).toFixed(2)}</p>
                )}
                {result.date && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(result.date).toLocaleDateString()}
                  </p>
                )}
                {result.status && (
                  <p className="text-sm capitalize text-muted-foreground">{result.status}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
} 