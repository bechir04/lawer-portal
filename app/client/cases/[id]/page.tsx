"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  MessageSquare, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  User,
  Clock,
  Scale
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface CaseDetails {
  id: string
  title: string
  description: string
  status: string
  priority: string
  startDate: string
  nextHearing: string
  lawyer: {
    id: string
    name: string
    email: string
  }
  estimatedValue: string
  documents: number
  lastUpdate: string
  createdAt: string
  updatedAt: string
}

export default function CaseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const caseId = params.id as string

  useEffect(() => {
    if (status === "authenticated" && caseId) {
      fetchCaseDetails()
    }
  }, [status, caseId])

  const fetchCaseDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/cases/${caseId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Case not found')
        }
        throw new Error('Failed to fetch case details')
      }
      const data = await response.json()
      setCaseDetails(data)
    } catch (err) {
      console.error('Error fetching case details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load case details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "UNDER_REVIEW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "CLOSED":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "LOW":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-medium">Error loading case</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <div className="mt-4 space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={fetchCaseDetails}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!caseDetails) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-lg font-medium">Case not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The case you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{caseDetails.title}</h1>
          <p className="text-muted-foreground">Case Details</p>
        </div>
      </div>

      {/* Status and Priority Badges */}
      <div className="flex gap-2">
        <Badge className={getStatusColor(caseDetails.status)}>
          {caseDetails.status.replace('_', ' ')}
        </Badge>
        <Badge className={getPriorityColor(caseDetails.priority)}>
          {caseDetails.priority} Priority
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Case Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Case Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">{caseDetails.description}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Start Date</h4>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(caseDetails.startDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Next Hearing</h4>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {caseDetails.nextHearing ? new Date(caseDetails.nextHearing).toLocaleDateString() : 'Not scheduled'}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Estimated Value</h4>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  {caseDetails.estimatedValue || 'Not specified'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({caseDetails.documents})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-2" />
                <p>Case documents will be displayed here</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/client/documents">
                    View All Documents
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lawyer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Assigned Lawyer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseDetails.lawyer ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{caseDetails.lawyer.name}</p>
                    <p className="text-sm text-muted-foreground">{caseDetails.lawyer.email}</p>
                  </div>
                  <Button className="w-full gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Message Lawyer
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No lawyer assigned yet</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link href="/client/documents">
                  <FileText className="h-4 w-4" />
                  Upload Documents
                </Link>
              </Button>
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link href="/client/appointments">
                  <Calendar className="h-4 w-4" />
                  Schedule Meeting
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Case Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-muted-foreground">
                    Created on {new Date(caseDetails.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground">
                    Last updated {new Date(caseDetails.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
