"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, Clock, User, Briefcase, MapPin, FileText } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  location: string | null;
  notes: string | null;
  client: {
    name: string | null;
    email: string;
  };
  case: {
    title: string;
  } | null;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "CONFIRMED":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "COMPLETED":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "CANCELLED":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

export default function AppointmentDetailsPage() {
  const params = useParams()
  const appointmentId = params.id as string

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (appointmentId) {
      const fetchAppointmentDetails = async () => {
        try {
          setLoading(true)
          const response = await fetch(`/api/appointments/${appointmentId}`)
          if (!response.ok) {
            throw new Error('Failed to fetch appointment details.')
          }
          const data = await response.json()
          setAppointment(data)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.')
        } finally {
          setLoading(false)
        }
      }
      fetchAppointmentDetails()
    }
  }, [appointmentId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
        <Button asChild variant="link">
          <Link href="/dashboard/appointments">Back to Appointments</Link>
        </Button>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="text-center py-10">
        <p>Appointment not found.</p>
        <Button asChild variant="link">
          <Link href="/dashboard/appointments">Back to Appointments</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Button asChild variant="outline" className="mb-4">
        <Link href="/dashboard/appointments">← Back to Appointments</Link>
      </Button>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{appointment.title}</CardTitle>
              <CardDescription>Details for your appointment.</CardDescription>
            </div>
            <Badge className={getStatusBadgeVariant(appointment.status)}>{appointment.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 mt-1 text-primary" />
              <div>
                <p className="font-semibold">Date</p>
                <p className="text-muted-foreground">{format(new Date(appointment.startTime), 'EEEE, MMMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 mt-1 text-primary" />
              <div>
                <p className="font-semibold">Time</p>
                <p className="text-muted-foreground">
                  {format(new Date(appointment.startTime), 'p')} - {format(new Date(appointment.endTime), 'p')}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 mt-1 text-primary" />
              <div>
                <p className="font-semibold">Client</p>
                <p className="text-muted-foreground">{appointment.client.name} ({appointment.client.email})</p>
              </div>
            </div>
            {appointment.case && (
              <div className="flex items-start space-x-3">
                <Briefcase className="h-5 w-5 mt-1 text-primary" />
                <div>
                  <p className="font-semibold">Related Case</p>
                  <p className="text-muted-foreground">{appointment.case.title}</p>
                </div>
              </div>
            )}
            {appointment.location && (
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 mt-1 text-primary" />
                <div>
                  <p className="font-semibold">Location</p>
                  <p className="text-muted-foreground">{appointment.location}</p>
                </div>
              </div>
            )}
          </div>
          {appointment.description && (
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold">Description</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{appointment.description}</p>
              </div>
            </div>
          )}
          {appointment.notes && (
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold">Notes</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{appointment.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
