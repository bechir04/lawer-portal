"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, DollarSign, FileText, MessageSquare, Eye, Loader2, AlertCircle, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"
import { CreateCaseDialog } from "@/components/cases/create-case-dialog"

interface Case {
  id: string
  title: string
  description: string
  status: string
  priority: string
  startDate: string
  nextHearing: string
  lawyer: string
  estimatedValue: string
  documents: number
  lastUpdate: string
  unreadMessages: number
  upcomingMeetings: number
}

export default function ClientCasesPage() {
  const { data: session, status } = useSession()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      fetchCases()
    }
  }, [status])

  const fetchCases = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/client/cases')
      if (!response.ok) {
        throw new Error('Failed to fetch cases')
      }
      const data = await response.json()
      setCases(data)
    } catch (err) {
      console.error('Error fetching cases:', err)
      setError('Failed to load cases. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200"
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Under Review":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Closed":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">My Cases</h1>
          <p className="text-muted-foreground text-lg">Track the progress of your legal matters.</p>
        </div>
        <CreateCaseDialog />
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{cases.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{cases.filter((c: Case) => c.status !== "CLOSED").length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0$</div>
            <p className="text-xs text-muted-foreground">Combined case value</p>
          </CardContent>
        </Card>
      </div>

      {/* Cases Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-2 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="col-span-2 text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-lg font-medium">Error loading cases</h3>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchCases}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : cases.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No cases found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You don't have any cases yet. Create a new case to get started.
            </p>
            <div className="mt-4">
              <CreateCaseDialog />
            </div>
          </div>
        ) : (
          cases.map((caseItem) => (
            <Card key={caseItem.id} className="border-2 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{caseItem.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{caseItem.description}</p>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(caseItem.status)}>{caseItem.status}</Badge>
                      <Badge className={getPriorityColor(caseItem.priority)}>{caseItem.priority}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Started: {caseItem.startDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Value: {caseItem.estimatedValue}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{caseItem.documents} documents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Next: {caseItem.nextHearing}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong>Lawyer:</strong> {caseItem.lawyer}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-2" asChild>
                      <Link href={`/client/cases/${caseItem.id}`}>
                        <Eye className="h-4 w-4" />
                        View Details
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                      <MessageSquare className="h-4 w-4" />
                      Message Lawyer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}