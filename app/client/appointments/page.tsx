"use client"

import { useState, useEffect, FormEvent } from "react"
import { useSession } from "next-auth/react"
import { format, parseISO, isBefore, isToday, isTomorrow, addHours } from "date-fns"
import { Plus, Calendar, Clock, Video, MapPin, Phone, Loader2, AlertCircle, RefreshCw, X } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

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
  lawyer: {
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
    case "CONFIRMED":
      return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
    case "SCHEDULED":
      return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
    case "COMPLETED":
      return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100"
    case "NO_SHOW":
      return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100"
  }
}

const getStatusText = (status: AppointmentStatus) => {
  return status.toLowerCase().replace("_", " ")
}

const getTypeText = (type: AppointmentType) => {
  return type.toLowerCase().replace("_", " ")
}

const getTypeIcon = (type: AppointmentType) => {
  switch (type) {
    case "MEETING":
      return <MapPin className="h-4 w-4 mr-2" />
    case "CONSULTATION":
      return <Phone className="h-4 w-4 mr-2" />
    case "VIDEO_CALL":
      return <Video className="h-4 w-4 mr-2" />
    default:
      return <Calendar className="h-4 w-4 mr-2" />
  }
}

function ClientAppointmentsPage() {
  const { data: session, status } = useSession()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const { toast: shadcnToast } = useToast()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [type, setType] = useState<AppointmentType>('CONSULTATION')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const handleJoinMeeting = (appointment: Appointment) => {
    window.location.href = `/client/video-calls?appointmentId=${appointment.id}`;
  }

  const handleRescheduleClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    const startDate = new Date(appointment.startTime)
    setRescheduleDate(startDate.toISOString().split('T')[0])
    setRescheduleTime(startDate.toTimeString().substring(0, 5))
    setIsRescheduleDialogOpen(true)
  }

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return

    setIsSubmitting(true)
    try {
      const newStartTime = new Date(`${rescheduleDate}T${rescheduleTime}`)
      const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000) // 1 hour duration

      const response = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          status: "RESCHEDULED"
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reschedule appointment")
      }

      const updatedAppointment = await response.json()
      setAppointments(appointments.map(apt => 
        apt.id === updatedAppointment.id ? updatedAppointment : apt
      ))
      
      setIsRescheduleDialogOpen(false)
      setSelectedAppointment(null)
      toast.success("Appointment rescheduled successfully!")
    } catch (err) {
      console.error("Error rescheduling appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to reschedule appointment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      })

      if (!response.ok) {
        throw new Error("Failed to cancel appointment")
      }

      const updatedAppointment = await response.json()
      setAppointments(appointments.map(apt => 
        apt.id === updatedAppointment.id ? updatedAppointment : apt
      ))
      
      toast.success("Appointment cancelled successfully!")
    } catch (err) {
      console.error("Error cancelling appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to cancel appointment")
    }
  }

  const fetchAppointments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/appointments')
      
      if (!response.ok) {
        throw new Error('Failed to fetch appointments')
      }
      
      const data = await response.json()
      setAppointments(data)
    } catch (err) {
      console.error('Error fetching appointments:', err)
      setError('Failed to load appointments. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user?.id) {
      shadcnToast({
        title: "Error",
        description: "You must be signed in to create an appointment",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || '',
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          type,
          location: location || '',
          notes: notes || '',
          status: 'SCHEDULED', // Default status for new appointments
          clientId: session.user.id, // Add clientId from session
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create appointment')
      }

      const newAppointment = await response.json()
      
      // Add the new appointment to the list
      setAppointments(prev => [newAppointment, ...prev])
      
      // Reset form
      setTitle('')
      setDescription('')
      setStartTime('')
      setEndTime('')
      setType('CONSULTATION')
      setLocation('')
      setNotes('')
      setIsDialogOpen(false)
      
      shadcnToast({
        title: "Success",
        description: "Appointment created successfully!",
      })
    } catch (error) {
      console.error('Error creating appointment:', error)
      shadcnToast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create appointment',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = new Date(e.target.value)
    const end = new Date(start.getTime() + 60 * 60 * 1000) // Add 1 hour
    setStartTime(e.target.value)
    setEndTime(end.toISOString().slice(0, 16)) // Format as YYYY-MM-DDTHH:MM
  } // Initial data fetch
  useEffect(() => {
    if (status === "authenticated") {
      fetchAppointments()
    }
  }, [status])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-2xl font-bold">Authentication Required</h2>
        <p className="text-muted-foreground">
          Please sign in to view your appointments
        </p>
        <Button onClick={() => (window.location.href = "/auth/signin")}>
          Sign In
        </Button>
      </div>
    )
  }

  const upcomingAppointments = appointments.filter(
    (appt) =>
      isBefore(new Date(), new Date(appt.endTime)) &&
      appt.status !== "CANCELLED" &&
      appt.status !== "COMPLETED"
  )

  const pastAppointments = appointments.filter(
    (appt) =>
      isBefore(new Date(appt.endTime), new Date()) ||
      appt.status === "CANCELLED" ||
      appt.status === "COMPLETED"
  )

  const nextAppointment = upcomingAppointments[0]
  const totalUpcoming = upcomingAppointments.length
  const totalCompleted = pastAppointments.filter(
    (a) => a.status === "COMPLETED"
  ).length
  const totalCancelled = pastAppointments.filter(
    (a) => a.status === "CANCELLED"
  ).length



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">View and manage your upcoming appointments</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>
              Fill in the details to schedule a new appointment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Initial Consultation"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the appointment"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={handleStartTimeChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    min={startTime}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Appointment Type *</Label>
                <Select value={type} onValueChange={(value) => setType(value as AppointmentType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTATION">Consultation</SelectItem>
                    <SelectItem value="CASE_REVIEW">Case Review</SelectItem>
                    <SelectItem value="COURT_APPEARANCE">Court Appearance</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="VIDEO_CALL">Video Call</SelectItem>
                    <SelectItem value="PHONE_CALL">Phone Call</SelectItem>
                    <SelectItem value="IN_PERSON">In-Person</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Meeting link or physical address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or details"
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Appointment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for your appointment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReschedule}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rescheduleDate">Date</Label>
                  <Input
                    id="rescheduleDate"
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rescheduleTime">Time</Label>
                  <Input
                    id="rescheduleTime"
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRescheduleDialogOpen(false)
                  setSelectedAppointment(null)
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !rescheduleDate || !rescheduleTime}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rescheduling...
                  </>
                ) : (
                  'Reschedule Appointment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{appointments.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUpcoming}</div>
            <p className="text-xs text-muted-foreground">Scheduled meetings</p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCompleted}</div>
            <p className="text-xs text-muted-foreground">Past meetings</p>
          </CardContent>
        </Card>

        {/* Next */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Meeting</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <>
                <div className="text-3xl font-bold">
                  {isToday(parseISO(nextAppointment.startTime))
                    ? "Today"
                    : isTomorrow(parseISO(nextAppointment.startTime))
                    ? "Tomorrow"
                    : format(parseISO(nextAppointment.startTime), "MMM d")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(nextAppointment.startTime), "h:mm a")} •{" "}
                  {nextAppointment.lawyer.name}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming meetings
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>
                Your scheduled meetings with your legal team
              </CardDescription>
            </div>
            {upcomingAppointments.length > 0 && (
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                {upcomingAppointments.length}{" "}
                {upcomingAppointments.length === 1
                  ? "appointment"
                  : "appointments"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading appointments</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchAppointments}
                      className="text-red-800 hover:bg-red-100"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try again
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{appointment.title}</h3>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeVariant(appointment.status)}
                        >
                          {getStatusText(appointment.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {appointment.description}
                      </p>

                      <div className="flex items-center gap-4 text-sm mt-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(
                            parseISO(appointment.startTime),
                            "EEEE, MMM d, yyyy"
                          )}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(parseISO(appointment.startTime), "h:mm a")} -{" "}
                          {format(parseISO(appointment.endTime), "h:mm a")}
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
                          {appointment.lawyer.name?.[0] || "L"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {appointment.lawyer.name || "Lawyer"}
                          </p>
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
                            onClick={() => handleJoinMeeting(appointment)}
                          >
                            <Video className="h-4 w-4" />
                            Join
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRescheduleClick(appointment)}
                          >
                            Reschedule
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleCancelAppointment(appointment.id)}
                        disabled={appointment.status === "CANCELLED"}
                      >
                        {appointment.status === "CANCELLED" ? "Cancelled" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">
                No upcoming appointments
              </h3>
              <p className="text-muted-foreground mb-4">
                Schedule a new appointment to get started
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Request Appointment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Appointments</CardTitle>
            <CardDescription>
              Your previous meetings with your legal team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastAppointments.map((appointment: Appointment) => (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{appointment.title}</h3>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeVariant(appointment.status)}
                        >
                          {getStatusText(appointment.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm mt-1">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(
                            parseISO(appointment.startTime),
                            "MMM d, yyyy"
                          )}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(parseISO(appointment.startTime), "h:mm a")}
                        </div>
                        <div className="flex items-center">
                          {getTypeIcon(appointment.type)}
                          <span className="text-muted-foreground">
                            {getTypeText(appointment.type)}
                          </span>
                        </div>
                      </div>

                      {appointment.notes && (
                        <div className="mt-2 p-3 bg-muted/30 rounded-md">
                          <p className="text-sm font-medium mb-1">Notes:</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/client/appointments/${appointment.id}`}>
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

export default ClientAppointmentsPage
