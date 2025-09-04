"use client"

import { useState, useEffect, useCallback } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { format, parseISO, isBefore, isToday, isTomorrow } from "date-fns"
import { Calendar, Clock, Video, MapPin, Phone, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useSocket } from "@/hooks/use-socket"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"

type AppointmentType =
  | "CONSULTATION"
  | "CASE_REVIEW"
  | "COURT_APPEARANCE"
  | "MEETING"
  | "VIDEO_CALL"
  | "PHONE_CALL"
  | "IN_PERSON"
  | "OTHER"

interface User {
  id: string
  name?: string | null
  email: string
  image?: string | null
  role: string
  lawyerId?: string
}

interface Session {
  user: User
  expires: string
}

interface Appointment {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  type: AppointmentType
  status: AppointmentStatus
  location: string | null
  notes: string | null
  client: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  case?: {
    id: string
    title: string
  } | null
}

const getStatusBadgeVariant = (status: AppointmentStatus) => {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "CONFIRMED":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "COMPLETED":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "CANCELLED":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    case "NO_SHOW":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

const getStatusText = (status: AppointmentStatus) => {
  return status.split('_').map(word => 
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ')
}

const getTypeText = (type: AppointmentType) => {
  return type.split('_').map(word => 
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ')
}

const getTypeIcon = (type: AppointmentType) => {
  switch (type) {
    case "VIDEO_CALL":
      return <Video className="h-4 w-4 mr-1 text-muted-foreground" />
    case "PHONE_CALL":
      return <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
    case "IN_PERSON":
      return <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
    default:
      return <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
  }
}

export default function LawyerAppointmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { socket, isConnected } = useSocket()
  const { toast } = useToast()

  const upcomingAppointments = appointments.filter(appointment => 
    isBefore(new Date(), new Date(appointment.startTime)) && 
    appointment.status !== "COMPLETED" && 
    appointment.status !== "CANCELLED"
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const pastAppointments = appointments.filter(appointment => 
    isBefore(new Date(appointment.startTime), new Date()) || 
    appointment.status === "COMPLETED" || 
    appointment.status === "CANCELLED"
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('Fetching appointments from /api/lawyer/appointments')
      const response = await fetch('/api/lawyer/appointments')
      const responseData = await response.json()
      console.log('Appointments API response:', { status: response.status, data: responseData })
      
      if (!response.ok) {
        throw new Error(
          `Failed to fetch appointments: ${response.status} ${response.statusText}\n${JSON.stringify(responseData, null, 2)}`
        )
      }
      
      setAppointments(responseData)
      return responseData
    } catch (err) {
      console.error('Error fetching appointments:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load appointments'
      console.error('Error details:', errorMessage)
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!socket || !isConnected || !session?.user?.lawyerId) return

    // Join the lawyer's appointments room
    socket.emit('join_lawyer_appointments', session.user.lawyerId)
    
    // Join individual appointment rooms
    appointments.forEach(appointment => {
      socket.emit('join_appointment', appointment.id)
    })
    
    // Set up event listeners
    socket.on('appointment_updated', (updatedAppointment: Appointment) => {
      setAppointments(prevAppointments => 
        prevAppointments.map(appt => 
          appt.id === updatedAppointment.id ? { ...appt, ...updatedAppointment } : appt
        )
      )
      
      toast({
        title: "Appointment Updated",
        description: `Appointment "${updatedAppointment.title}" has been updated.`,
      })
    })

    // Handle refresh event
    socket.on('appointments_updated', () => {
      fetchAppointments().catch(console.error)
    })

    // Handle connection errors
    socket.on('connect_error', (err: any) => {
      console.error('WebSocket connection error:', err)
      toast({
        title: "Connection Error",
        description: "Unable to connect to real-time updates. Some features may be limited.",
        variant: "destructive",
      })
    })

    // Clean up on unmount
    return () => {
      if (socket) {
        socket.off('appointment_updated')
        socket.off('appointments_updated')
        socket.off('connect_error')
        socket.disconnect()
      }
    }
  }, [status, session?.user?.lawyerId, fetchAppointments, toast])

  // Initial data fetch
  useEffect(() => {
    if (status === 'authenticated') {
      fetchAppointments().catch(console.error)
    }
  }, [status, fetchAppointments])

  const handleJoinVideoCall = (appointmentId: string) => {
    // Navigate to video call room using the same room naming pattern as client
    router.push(`/video-call/${appointmentId}`)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">You must be signed in as a lawyer to view this page.</p>
        <Button onClick={() => signIn()}>Sign In</Button>
      </div>
    )
  }

  if (session?.user.role !== 'LAWYER') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Unauthorized</h2>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground text-lg">Manage your client appointments.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'COMPLETED').length}
            </div>
            <p className="text-xs text-muted-foreground">Total completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'CANCELLED').length}
            </div>
            <p className="text-xs text-muted-foreground">Total cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Your scheduled meetings with clients</CardDescription>
            </div>
            {upcomingAppointments.length > 0 && (
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                {upcomingAppointments.length}{" "}
                {upcomingAppointments.length === 1 ? "appointment" : "appointments"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-red-600">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchAppointments}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{appointment.title}</h3>
                        <Badge variant="outline" className={getStatusBadgeVariant(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{appointment.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm mt-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(parseISO(appointment.startTime), 'EEEE, MMM d, yyyy')}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(parseISO(appointment.startTime), 'h:mm a')} - {format(parseISO(appointment.endTime), 'h:mm a')}
                        </div>
                        {appointment.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {appointment.location}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center mt-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium mr-2">
                          {appointment.client.name?.[0] || 'C'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{appointment.client.name || 'Client'}</p>
                          {appointment.case && (
                            <p className="text-xs text-muted-foreground">
                              Case: {appointment.case.title}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      {appointment.status === "SCHEDULED" && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => handleJoinVideoCall(appointment.id)}
                          >
                            <Video className="h-4 w-4" />
                            Join
                          </Button>
                          <Button size="sm" variant="outline">
                            Reschedule
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          // TODO: Implement cancel appointment
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No upcoming appointments</h3>
              <p className="text-muted-foreground">You don't have any scheduled appointments yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Appointments</CardTitle>
            <CardDescription>Your previous meetings with clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{appointment.title}</h3>
                        <Badge variant="outline" className={getStatusBadgeVariant(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm mt-1">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(parseISO(appointment.startTime), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(parseISO(appointment.startTime), 'h:mm a')}
                        </div>
                        <div className="flex items-center">
                          {getTypeIcon(appointment.type)}
                          <span className="text-muted-foreground">
                            {getTypeText(appointment.type)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium mr-2">
                          {appointment.client.name?.[0] || 'C'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{appointment.client.name || 'Client'}</p>
                          {appointment.case && (
                            <p className="text-xs text-muted-foreground">
                              Case: {appointment.case.title}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {appointment.notes && (
                        <div className="mt-2 p-3 bg-muted/30 rounded-md">
                          <p className="text-sm font-medium mb-1">Notes:</p>
                          <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/appointments/${appointment.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
