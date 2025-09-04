'use client'

import { FileText, Download, Trash2, Eye, Loader2, User, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { formatDistanceToNow, format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Document {
  id: string
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  type: 'CONTRACT' | 'EVIDENCE' | 'CORRESPONDENCE' | 'OTHER'
  url: string
  createdAt: string
  updatedAt: string
  case: {
    id: string
    title: string
    client: {
      id: string
      name: string
      email: string
    } | null
  } | null
  uploader: {
    id: string
    name: string | null
    email: string
  } | null
}

async function fetchDocuments(): Promise<Document[]> {
  const response = await fetch('/api/documents')
  if (!response.ok) {
    throw new Error('Failed to fetch documents')
  }
  return response.json()
}

async function deleteDocument(id: string) {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete document')
  }
  return response.json()
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function DocumentsTable() {
  const queryClient = useQueryClient()
  
  const { data: documents, isLoading, error } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true, // Continue polling when tab is not active
    staleTime: 0, // Always consider data stale to ensure fresh data
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete document')
      console.error('Error deleting document:', error)
    },
  })

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading documents. Please try again later.
      </div>
    )
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No documents found. Upload your first document to get started.
      </div>
    )
  }

  const getDocumentTypeBadge = (type: string) => {
    const typeMap = {
      CONTRACT: { label: 'Contract', variant: 'default' },
      EVIDENCE: { label: 'Evidence', variant: 'secondary' },
      CORRESPONDENCE: { label: 'Correspondence', variant: 'outline' },
      OTHER: { label: 'Other', variant: 'ghost' },
    }
    
    const { label, variant } = typeMap[type as keyof typeof typeMap] || { label: type, variant: 'ghost' }
    return <Badge variant={variant as any} className="text-xs">{label}</Badge>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Client / Case</TableHead>
            <TableHead>Uploaded By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground line-clamp-1">{doc.originalName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(doc.createdAt), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getDocumentTypeBadge(doc.type)}
                  <span className="text-xs text-muted-foreground">
                    {doc.mimeType.split('/')[1]?.toUpperCase() || doc.mimeType}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatFileSize(doc.fileSize)}
              </TableCell>
              <TableCell className="text-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                    </TooltipTrigger>
                    <TooltipContent>
                      {format(new Date(doc.createdAt), 'PPpp')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>
                <div className="flex flex-col space-y-1">
                  {doc.case?.client && (
                    <div className="flex items-center text-sm">
                      <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <span className="font-medium">{doc.case.client.name}</span>
                    </div>
                  )}
                  {doc.case && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                      <span className="truncate max-w-[150px]">{doc.case.title}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {doc.uploader ? (
                  <div className="flex items-center text-sm">
                    <span className="truncate max-w-[120px]">
                      {doc.uploader.name || doc.uploader.email.split('@')[0]}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">System</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDownload(doc.url, doc.originalName)}
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.variables === doc.id && deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
