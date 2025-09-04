"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, DollarSign, FileText, MessageSquare, User, Loader2 } from "lucide-react"
import Link from "next/link"

interface Case {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  status: string;
  priority: string;
  startDate: string;
  dueDate: string;
  description: string;
  lastActivity?: string;
  clientDetails?: {
    id: string;
    name: string;
    email: string;
  };
  documents?: Document[];
  recentMessages?: Message[];
}

interface Document {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
}

export default function CaseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/dashboard/cases/${params.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch case details')
        }
        
        const data = await response.json()
        setCaseData(data)
      } catch (err) {
        console.error('Error fetching case details:', err)
        setError('Failed to load case details. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchCaseDetails()
    }
  }, [params.id])

  const handleStatusUpdate = async () => {
    if (!caseData) return
    
    const newStatus = prompt(
      'Update case status:', 
      caseData.status
    )
    
    if (!newStatus || newStatus === caseData.status) return
    
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/dashboard/cases/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update case status')
      }
      
      const updatedCase = await response.json()
      setCaseData({
        ...caseData,
        status: updatedCase.status,
      })
    } catch (err) {
      console.error('Error updating case status:', err)
      alert('Failed to update case status. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }
  
  const handlePriorityUpdate = async () => {
    if (!caseData) return
    
    const newPriority = prompt(
      'Update case priority (LOW, MEDIUM, HIGH, URGENT):', 
      caseData.priority
    )
    
    if (!newPriority || newPriority === caseData.priority) return
    
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/dashboard/cases/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority: newPriority,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update case priority')
      }
      
      const updatedCase = await response.json()
      setCaseData({
        ...caseData,
        priority: updatedCase.priority,
      })
    } catch (err) {
      console.error('Error updating case priority:', err)
      alert('Failed to update case priority. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteCase = async () => {
    if (!caseData) return
    
    const confirmDelete = confirm(`Are you sure you want to delete the case "${caseData.title}"? This action cannot be undone.`)
    
    if (!confirmDelete) return
    
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/dashboard/cases/${params.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete case')
      }
      
      alert('Case deleted successfully')
      router.push('/dashboard/cases')
    } catch (err) {
      console.error('Error deleting case:', err)
      alert('Failed to delete case. Please try again.')
      setIsUpdating(false)
    }
  }

  const handleEditCase = () => {
    if (!caseData) return
    
    // Prompt for new title and description
    const newTitle = prompt('Edit case title:', caseData.title)
    if (newTitle === null) return // User cancelled
    
    const newDescription = prompt('Edit case description:', caseData.description)
    if (newDescription === null) return // User cancelled
    
    // Only update if something changed
    if (newTitle === caseData.title && newDescription === caseData.description) {
      alert('No changes made')
      return
    }
    
    updateCaseDetails(newTitle, newDescription)
  }
  
  const updateCaseDetails = async (title: string, description: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/dashboard/cases/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update case details')
      }
      
      const updatedCase = await response.json()
      setCaseData({
        ...caseData!,
        title: updatedCase.title,
        description: updatedCase.description,
      })
      
      alert('Case updated successfully')
    } catch (err) {
      console.error('Error updating case details:', err)
      alert('Failed to update case details. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200"
      case "In Review":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Pending":
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading case details...</span>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error || 'Case not found'}</p>
          <Button onClick={() => router.push('/dashboard/cases')}>Back to Cases</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{caseData.title}</h1>
          <p className="text-muted-foreground text-lg">Case #{caseData.id.substring(0, 8)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/cases')}>
            Back to Cases
          </Button>
          <Button onClick={() => router.push(`/dashboard/messages?clientId=${caseData.clientId}`)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Message Client
          </Button>
          <Button variant="secondary" onClick={handleEditCase} disabled={isUpdating}>
            Edit Case
          </Button>
          <Button variant="destructive" onClick={handleDeleteCase} disabled={isUpdating}>
            Delete Case
          </Button>
        </div>
      </div>

      {/* Case Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(caseData.status)}>{caseData.status}</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleStatusUpdate()}
                      disabled={isUpdating}
                    >
                      Change
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(caseData.priority)} variant="outline">
                      {caseData.priority}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePriorityUpdate()}
                      disabled={isUpdating}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p>{caseData.clientName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p>{new Date(caseData.startDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p>{caseData.dueDate === 'Not scheduled' 
                    ? 'Not scheduled' 
                    : new Date(caseData.dueDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="mt-1">{caseData.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Document uploaded</p>
                  <p className="text-sm text-muted-foreground">Contract agreement.pdf</p>
                  <p className="text-xs text-muted-foreground">Today at 10:30 AM</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">New message from client</p>
                  <p className="text-sm text-muted-foreground">Regarding the upcoming hearing</p>
                  <p className="text-xs text-muted-foreground">Yesterday at 4:15 PM</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Hearing scheduled</p>
                  <p className="text-sm text-muted-foreground">Court appearance set</p>
                  <p className="text-xs text-muted-foreground">3 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Documents, Messages, Timeline */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Case Documents</CardTitle>
                <Button 
                  size="sm"
                  onClick={() => router.push(`/dashboard/documents/upload?caseId=${caseData.id}`)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {caseData.documents && caseData.documents.length > 0 ? (
                <div className="space-y-4">
                  {caseData.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2">No documents uploaded yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => router.push(`/dashboard/documents/upload?caseId=${caseData.id}`)}
                  >
                    Upload your first document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="messages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Communication</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.recentMessages && caseData.recentMessages.length > 0 ? (
                <div className="space-y-4">
                  {caseData.recentMessages.map((message) => (
                    <div key={message.id} className="flex items-start gap-3 p-3 border rounded-md">
                      <div className="rounded-full bg-primary/10 p-2">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{message.sender.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <p className="mt-1">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-center mt-4">
                    <Button onClick={() => router.push(`/dashboard/messages?clientId=${caseData.clientId}`)}>
                      View All Messages
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2">No messages in this case yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => router.push(`/dashboard/messages?clientId=${caseData.clientId}`)}
                  >
                    Send a message
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Case Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="w-px h-full bg-border"></div>
                  </div>
                  <div>
                    <p className="font-medium">Case opened</p>
                    <p className="text-sm text-muted-foreground">{new Date(caseData.startDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}</p>
                    <p className="mt-2 text-sm">Initial consultation with client</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="w-px h-full bg-border"></div>
                  </div>
                  <div>
                    <p className="font-medium">Documents requested</p>
                    <p className="text-sm text-muted-foreground">3 days after case opened</p>
                    <p className="mt-2 text-sm">Requested initial documentation from client</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Current status</p>
                    <p className="text-sm text-muted-foreground">Today</p>
                    <p className="mt-2 text-sm">Awaiting client response</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}