"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Phone, Mail, MoreHorizontal, Edit, Trash2, Eye, Loader2, Users, UserCheck, Clock } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ClientStats {
  total: number
  active: number
  pending: number
}

interface Client {
  id: string
  name: string
  email: string
  phone: string
  status: 'Active' | 'Pending' | 'Inactive' | 'Completed'
  cases: number
  activeCases: number
  pendingCases: number
  completedCases: number
  joinDate: string
  lastContact: string | null
  lastCaseStatus?: string
  lawyerNotes?: string
  image?: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Fetch real client data
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        controller.abort();
        setError('Request timed out. Please try again.');
        setIsLoading(false);
        setIsStatsLoading(false);
      }
    }, 10000); // 10 second timeout
    
    const fetchClients = async () => {
      try {
        if (!isMounted) return;
        
        setIsLoading(true);
        setIsStatsLoading(true);
        setError(null);
        
        // Fetch session first to ensure user is authenticated
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include',
          signal: controller.signal
        });
        
        if (!sessionRes.ok) {
          if (sessionRes.status === 401) {
            window.location.href = '/auth/signin';
            return;
          }
          throw new Error('Authentication required. Please sign in again.');
        }
        
        const session = await sessionRes.json();
        if (!session?.user) {
          throw new Error('No active session found');
        }
        
        // Check if user has the right role
        if (session.user.role !== 'LAWYER' && session.user.role !== 'ADMIN') {
          window.location.href = '/unauthorized';
          return;
        }
        
        // Fetch clients data
        const clientsRes = await fetch('/api/dashboard/clients', {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Authorization': `Bearer ${session.accessToken || ''}`
          },
          credentials: 'include',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        // Handle response
        if (!clientsRes.ok) {
          if (clientsRes.status === 401) {
            window.location.href = '/auth/signin';
            return;
          }
          const errorData = await clientsRes.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to load clients. Status: ${clientsRes.status}`);
        }
        
        const clientsData = await clientsRes.json();
        
        if (!Array.isArray(clientsData)) {
          throw new Error('Invalid response format: expected an array of clients');
        }
        
        if (!isMounted) return;
        
        // Transform and validate client data
        const validatedClients = clientsData.map((client: any) => {
          try {
            // Ensure status is one of the allowed values
            const validStatuses = ['Active', 'Pending', 'Inactive', 'Completed'] as const;
            let status: 'Active' | 'Pending' | 'Inactive' | 'Completed';
            
            if (validStatuses.includes(client.status as any)) {
              status = client.status;
            } else if ((client.completedCases || 0) > 0) {
              status = 'Completed';
            } else if ((client.activeCases || 0) > 0) {
              status = 'Active';
            } else if ((client.pendingCases || 0) > 0) {
              status = 'Pending';
            } else {
              status = 'Inactive';
            }
            
            // Calculate stats based on cases
            const cases = Math.max(0, Number(client.cases) || 0);
            const activeCases = Math.max(0, Number(client.activeCases) || 0);
            const pendingCases = Math.max(0, Number(client.pendingCases) || 0);
            const completedCases = Math.max(0, Number(client.completedCases) || 0);
            
            return {
              id: client.id?.toString() || '',
              name: client.name?.toString() || 'Unknown Client',
              email: client.email?.toString() || 'No email',
              phone: client.phone?.toString() || 'No phone',
              status,
              cases,
              activeCases,
              pendingCases,
              completedCases,
              joinDate: client.joinDate || new Date().toISOString(),
              lastContact: client.lastContact || null,
              lastCaseStatus: client.lastCaseStatus || 'No cases',
              lawyerNotes: client.lawyerNotes || '',
              image: client.image
            };
          } catch (err) {
            console.error('Error processing client data:', err, client);
            // Return a safe default client object in case of error
            return {
              id: 'error-' + Math.random().toString(36).substr(2, 9),
              name: 'Error Loading Client',
              email: 'error@example.com',
              phone: 'N/A',
              status: 'Inactive' as const,
              cases: 0,
              activeCases: 0,
              pendingCases: 0,
              completedCases: 0,
              joinDate: new Date().toISOString(),
              lastContact: null,
              lastCaseStatus: 'Error',
              lawyerNotes: 'Error loading client data',
              image: undefined
            };
          }
        });
        
        setClients(validatedClients);
        
        // Calculate stats
        const total = validatedClients.length;
        const active = validatedClients.filter(c => c.status === 'Active').length;
        const pending = validatedClients.filter(c => c.status === 'Pending').length;
        
        setStats({ total, active, pending });
        
      } catch (err) {
        console.error('Error in fetchClients:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Failed to load client data: ${errorMessage}`);
        setClients([]);
        setStats({ total: 0, active: 0, pending: 0 });
      } finally {
        setIsLoading(false);
        setIsStatsLoading(false);
      }
    };

    fetchClients();
    
    // Cleanup function to abort fetch if component unmounts
    return () => {
      // AbortController will clean up automatically
    };
  }, [])

  const filteredClients = clients.filter(
    (client) =>
      client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    icon, 
    isLoading = false,
    className = ""
  }: { 
    title: string; 
    value: string; 
    icon: React.ReactNode;
    isLoading?: boolean;
    className?: string;
  }) => (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="rounded-md border">
          <div className="flex items-center justify-between p-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        {stats && (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard 
              title="Total Clients" 
              value={stats.total.toString()} 
              icon={<Users className="h-4 w-4 text-muted-foreground" />} 
              isLoading={isStatsLoading}
            />
            <StatCard 
              title="Active" 
              value={stats.active.toString()} 
              icon={<UserCheck className="h-4 w-4 text-muted-foreground" />} 
              isLoading={isStatsLoading}
              className="bg-green-50"
            />
            <StatCard 
              title="Pending" 
              value={stats.pending.toString()} 
              icon={<Clock className="h-4 w-4 text-muted-foreground" />} 
              isLoading={isStatsLoading}
              className="bg-amber-50"
            />
          </div>
        )}
        <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
          <div className="text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          title="Total Clients" 
          value={stats?.total?.toString() || '0'} 
          icon={<Users className="h-4 w-4 text-muted-foreground" />} 
          isLoading={isStatsLoading}
        />
        <StatCard 
          title="Active" 
          value={stats?.active?.toString() || '0'} 
          icon={<UserCheck className="h-4 w-4 text-muted-foreground" />} 
          isLoading={isStatsLoading}
          className="bg-green-50"
        />
        <StatCard 
          title="Pending" 
          value={stats?.pending?.toString() || '0'} 
          icon={<Clock className="h-4 w-4 text-muted-foreground" />} 
          isLoading={isStatsLoading}
          className="bg-amber-50"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Client List</h2>
          <p className="text-sm text-muted-foreground">
            {stats?.total} {stats?.total === 1 ? 'client' : 'clients'} in total
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients..."
              className="pl-8 w-[200px] lg:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cases</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{client.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={client.image || ''} alt={client.name} />
                          <AvatarFallback>{client.name?.charAt(0) || 'C'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground">{client.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <a 
                          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(client.email)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-blue-600 hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </a>
                        {client.phone && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <a 
                              href={`tel:${client.phone}`}
                              className="flex items-center gap-1.5 text-blue-600 hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              Call
                            </a>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        className={`${getStatusColor(client.status)} min-w-[80px] justify-center`}
                        variant={client.status === 'Inactive' ? 'outline' : 'default'}
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{client.cases}</TableCell>
                    <TableCell>
                      {new Date(client.joinDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      {client.lastContact ? 
                        formatDistanceToNow(new Date(client.lastContact), { addSuffix: true }) : 
                        'No contact yet'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Client
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
