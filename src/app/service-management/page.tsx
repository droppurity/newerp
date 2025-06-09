
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { 
  Droplets, LogOut, LayoutDashboard, WrenchIcon, Search as SearchIcon, 
  User, Phone, MapPin, StickyNote, Loader2, AlertCircle, ExternalLink, Users as UsersIcon,
  ListChecks, CheckSquare, History
} from 'lucide-react';

const isAuthenticatedClientSide = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  }
  return false;
};

interface Customer {
  _id: string; // MongoDB ObjectId as string
  generatedCustomerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  stateName?: string;
  confirmedMapLink?: string | null;
}

interface ServiceJob {
  _id: string;
  customerId: string;
  customerGeneratedId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  confirmedMapLink?: string | null;
  problemDescription: string;
  status: "Open" | "Resolved" | string; 
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

interface ServiceJobNotification {
    id: string; 
    customerName: string;
    mapLink: string | null;
    phone: string;
    problem: string;
    createdAt: string;
    status: 'Open' | 'Resolved'; // Added status to notification interface
}

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
};

export default function ServiceManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [problemDescription, setProblemDescription] = useState('');
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const [activeJobs, setActiveJobs] = useState<ServiceJob[]>([]);
  const [recentJobs, setRecentJobs] = useState<ServiceJob[]>([]);
  const [isLoadingActiveJobs, setIsLoadingActiveJobs] = useState(false);
  const [isLoadingRecentJobs, setIsLoadingRecentJobs] = useState(false);
  const [activeJobsError, setActiveJobsError] = useState<string | null>(null);
  const [recentJobsError, setRecentJobsError] = useState<string | null>(null);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchActiveJobs = useCallback(async () => {
    setIsLoadingActiveJobs(true);
    setActiveJobsError(null);
    try {
      const response = await fetch('/api/service-jobs?status=Open');
      if (!response.ok) throw new Error('Failed to fetch active jobs');
      const data = await response.json();
      if (data.success) setActiveJobs(data.jobs);
      else throw new Error(data.message || 'Error fetching active jobs');
    } catch (err: any) {
      setActiveJobsError(err.message);
      toast({ variant: "destructive", title: "Error Loading Active Jobs", description: err.message });
    } finally {
      setIsLoadingActiveJobs(false);
    }
  }, [toast]);

  const fetchRecentJobs = useCallback(async () => {
    setIsLoadingRecentJobs(true);
    setRecentJobsError(null);
    try {
      const response = await fetch('/api/service-jobs?limit=5');
      if (!response.ok) throw new Error('Failed to fetch recent jobs');
      const data = await response.json();
      if (data.success) setRecentJobs(data.jobs);
      else throw new Error(data.message || 'Error fetching recent jobs');
    } catch (err: any) {
      setRecentJobsError(err.message);
      toast({ variant: "destructive", title: "Error Loading Recent Jobs", description: err.message });
    } finally {
      setIsLoadingRecentJobs(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (isClient && !isAuthenticating) {
      fetchActiveJobs();
      fetchRecentJobs();
    }
  }, [isClient, isAuthenticating, fetchActiveJobs, fetchRecentJobs]);


  useEffect(() => {
    if (isClient) {
      if (!isAuthenticatedClientSide()) {
        router.replace('/login');
      } else {
        setIsAuthenticating(false);
      }
    }
  }, [router, isClient]);

  const fetchCustomers = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setSearchedCustomers([]);
      setSearchError(null); 
      return;
    }
    setIsLoadingSearch(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}&limit=10`); 
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error: ${response.statusText}` }));
        throw new Error(errorData.message || `Failed to fetch customers`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.customers)) {
        setSearchedCustomers(data.customers);
      } else {
        throw new Error(data.message || 'Invalid customer data format.');
      }
    } catch (error: any) {
      setSearchError(error.message);
      setSearchedCustomers([]);
    } finally {
      setIsLoadingSearch(false);
    }
  }, []);

  const debouncedFetchCustomers = useCallback(debounce(fetchCustomers, 500), [fetchCustomers]);

  useEffect(() => {
    debouncedFetchCustomers(customerSearchTerm);
  }, [customerSearchTerm, debouncedFetchCustomers]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm(''); 
    setSearchedCustomers([]); 
    setSearchError(null);
  };

  const handleResolveJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/service-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved' }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast({
          title: "Job Resolved",
          description: `Job ID ${jobId.slice(-6)} has been marked as resolved.`,
          variant: "success"
        });
        fetchActiveJobs(); 
        fetchRecentJobs();

        // Update local storage notification status
        if (typeof window !== "undefined") {
          const existingNotificationsRaw = localStorage.getItem('newServiceJobNotifications');
          let existingNotifications: ServiceJobNotification[] = [];
          if (existingNotificationsRaw) {
            try {
              existingNotifications = JSON.parse(existingNotificationsRaw);
            } catch (error) {
              console.error("Error parsing service notifications from localStorage on job resolve:", error);
              toast({ variant: "destructive", title: "Local Storage Error", description: "Could not read existing notifications. Clearing invalid data." });
              // If parsing fails, clear localStorage to prevent future errors with this data
              localStorage.removeItem('newServiceJobNotifications'); 
              existingNotifications = [];
            }
          }
          const updatedNotifications = existingNotifications.map(notif => {
            if (notif.id === jobId) {
              return { ...notif, status: 'Resolved' as 'Resolved' }; // Mark as resolved
            }
            return notif;
          });

          try {
            localStorage.setItem('newServiceJobNotifications', JSON.stringify(updatedNotifications));
             // Dispatch custom event to notify other components (like the dashboard)
             window.dispatchEvent(new CustomEvent('localStorageChange', { detail: { key: 'newServiceJobNotifications' } }));
          } catch (error) {
             console.error("Error writing updated service notifications to localStorage:", error);
             toast({ variant: "destructive", title: "Local Storage Error", description: "Could not save updated notification status." });
          }
          window.dispatchEvent(new CustomEvent('localStorageChange', { detail: { key: 'newServiceJobNotifications' } }));
        }
      } else {
        throw new Error(result.message || 'Failed to resolve job.');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Resolve Job",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  const proceedWithJobCreation = async () => {
    if (!selectedCustomer || !problemDescription.trim()) return;

    setIsSubmittingJob(true);
    try {
      const jobData = {
        customerId: selectedCustomer._id,
        customerGeneratedId: selectedCustomer.generatedCustomerId,
        customerName: selectedCustomer.customerName,
        customerPhone: selectedCustomer.customerPhone,
        customerAddress: `${selectedCustomer.customerAddress || ''}, ${selectedCustomer.city || ''}, ${selectedCustomer.stateName || ''} - ${selectedCustomer.pincode || ''}`.trim().replace(/^,|,$/g, ''),
        confirmedMapLink: selectedCustomer.confirmedMapLink,
        problemDescription: problemDescription.trim(),
      };

      const response = await fetch('/api/service-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });

      const result = await response.json();

      if (response.ok && result.success && result.job) {
        toast({
          title: "Job Sheet Created",
          description: `Job for ${selectedCustomer.customerName} (ID: ${result.job._id.slice(-6)}) created successfully.`,
          variant: "success"
        });

        if (typeof window !== "undefined") {
            const newNotification: ServiceJobNotification = {
                id: result.job._id.toString(),
                customerName: selectedCustomer.customerName || 'N/A',
                mapLink: selectedCustomer.confirmedMapLink || null,
                phone: selectedCustomer.customerPhone || 'N/A',
                problem: problemDescription.trim(),
                createdAt: new Date().toISOString(),
                status: 'Open', // New notifications are 'Open'
            };
            const existingNotificationsRaw = localStorage.getItem('newServiceJobNotifications');
            let existingNotifications: ServiceJobNotification[] = [];
            if (existingNotificationsRaw) {
                try {
                    existingNotifications = JSON.parse(existingNotificationsRaw);
                } catch (e) {
                    existingNotifications = []; 
                }
            }
            const updatedNotifications = [newNotification, ...existingNotifications].slice(0, 10); 
            localStorage.setItem('newServiceJobNotifications', JSON.stringify(updatedNotifications));
            window.dispatchEvent(new CustomEvent('localStorageChange', { detail: { key: 'newServiceJobNotifications' } }));
        }
        
        setProblemDescription('');
        setSelectedCustomer(null); 
        fetchActiveJobs();
        fetchRecentJobs();
      } else {
        throw new Error(result.message || 'Failed to create job sheet.');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Job Creation Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsSubmittingJob(false);
      setIsConfirmDialogOpen(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('isAuthenticated');
    }
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.replace('/login');
  };

  const canSubmit = selectedCustomer && problemDescription.trim() !== '' && !isSubmittingJob;

  if (!isClient || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg text-muted-foreground">Loading Service Management...</p>
        </div>
      </div>
    );
  }

  const renderJobsTable = (jobs: ServiceJob[], title: string, isLoading: boolean, error: string | null, showResolveButton: boolean) => (
    <section className="mt-8">
      <h3 className="text-xl font-semibold text-foreground/90 mb-3 flex items-center">
        {showResolveButton ? <WrenchIcon className="mr-2 h-5 w-5 text-primary" /> : <History className="mr-2 h-5 w-5 text-primary" />}
        {title}
      </h3>
      {isLoading ? (
        <div className="p-6 text-center"><Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" /></div>
      ) : error ? (
        <div className="p-6 text-center border-2 border-dashed border-destructive/50 rounded-lg bg-destructive/5">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-destructive font-medium">Error loading jobs: {error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed rounded-lg">
          <WrenchIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No {title.toLowerCase().includes('active') ? 'active' : 'recent'} jobs found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Problem</TableHead>
                {!showResolveButton && <TableHead>Status</TableHead>}
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job._id}>
                  <TableCell>
                    <div className="font-medium">{job.customerName || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{job.customerGeneratedId || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={job.problemDescription}>{job.problemDescription}</TableCell>
                  {!showResolveButton && <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${job.status === "Open" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                        {job.status}
                    </span>
                  </TableCell>}
                  <TableCell>{format(parseISO(job.createdAt), "dd MMM, HH:mm")}</TableCell>
                  <TableCell className="text-right">
                    {showResolveButton && job.status === "Open" ? (
                      <Button variant="outline" size="sm" onClick={() => handleResolveJob(job._id)}>
                        <CheckSquare className="mr-2 h-4 w-4" /> Resolve
                      </Button>
                    ) : !showResolveButton ? (
                       <Link href="/manage-service-jobs" passHref>
                        <Button variant="outline" size="sm">Manage All</Button>
                       </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted/10">
      <header className="p-4 sm:p-6 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link href="/" passHref>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center cursor-pointer">
              <Droplets className="mr-2 h-7 w-7 sm:h-8 sm:w-8" /> DropPurity
            </h1>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" passHref><Button variant="outline"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Button></Link>
            <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center text-2xl">
                <WrenchIcon className="mr-3 h-6 w-6 text-primary" />
                Service Management
              </CardTitle>
              <Link href="/manage-service-jobs" passHref>
                <Button variant="outline" size="sm">
                  <ListChecks className="mr-2 h-4 w-4" />
                  View & Manage All Job Sheets
                </Button>
              </Link>
            </div>
            <CardDescription>
              Create new service job sheets, view active jobs, and see recent job history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Customer Search Section */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground/90">1. Find Customer & Create New Job</h3>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search by name, ID, or phone (min 3 chars)..." 
                  className="pl-10 w-full"
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  disabled={!!selectedCustomer || isSubmittingJob}
                />
              </div>
              
              <div className="min-h-[50px]">
                {isLoadingSearch && (
                  <div className="p-4 text-center border-2 border-dashed rounded-lg">
                    <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground mt-2">Searching for customers...</p>
                  </div>
                )}
                {!isLoadingSearch && customerSearchTerm.length > 0 && customerSearchTerm.length < 3 && !selectedCustomer && (
                   <div className="p-4 text-center border-2 border-dashed rounded-lg bg-muted/20">
                    <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Please enter at least 3 characters to search.</p>
                  </div>
                )}
                {!isLoadingSearch && searchError && customerSearchTerm.length >= 3 && (
                  <div className="p-4 text-center border-2 border-dashed border-destructive/50 rounded-lg bg-destructive/5">
                    <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
                    <p className="text-sm text-destructive font-medium">Search Error</p>
                    <p className="text-xs text-muted-foreground">{searchError}</p>
                  </div>
                )}
                {!isLoadingSearch && !searchError && searchedCustomers.length === 0 && customerSearchTerm.length >= 3 && !selectedCustomer && (
                  <div className="p-4 text-center border-2 border-dashed rounded-lg">
                    <UsersIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No customers found matching "{customerSearchTerm}".</p>
                  </div>
                )}
                {!isLoadingSearch && searchedCustomers.length > 0 && !selectedCustomer && (
                  <div className="border rounded-md max-h-60 overflow-y-auto shadow-sm">
                    {searchedCustomers.map(cust => (
                      <div 
                        key={cust._id} 
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                        onClick={() => handleSelectCustomer(cust)}
                      >
                        <p className="font-medium text-primary-foreground">{cust.customerName} <span className="text-xs text-muted-foreground">({cust.generatedCustomerId})</span></p>
                        <p className="text-sm text-muted-foreground">{cust.customerPhone} - {cust.city}, {cust.stateName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {selectedCustomer && (
              <section className="space-y-3 p-4 border-2 border-primary/30 rounded-lg bg-primary/5 shadow-md">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-primary flex items-center"><User className="mr-2 h-5 w-5"/>Selected Customer</h3>
                    <Button variant="outline" size="sm" onClick={() => {setSelectedCustomer(null); setProblemDescription('');} } disabled={isSubmittingJob}>
                      Clear & Search Again
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <p><strong className="text-foreground/80">Name:</strong> {selectedCustomer.customerName}</p>
                  <p><strong className="text-foreground/80">Customer ID:</strong> {selectedCustomer.generatedCustomerId}</p>
                  <p><strong className="text-foreground/80">Phone:</strong> {selectedCustomer.customerPhone}</p>
                  <p className="md:col-span-2"><strong className="text-foreground/80">Address:</strong> {`${selectedCustomer.customerAddress || ''}${selectedCustomer.customerAddress && (selectedCustomer.city || selectedCustomer.stateName || selectedCustomer.pincode) ? ', ' : ''}${selectedCustomer.city || ''}${selectedCustomer.city && (selectedCustomer.stateName || selectedCustomer.pincode) ? ', ' : ''}${selectedCustomer.stateName || ''}${selectedCustomer.stateName && selectedCustomer.pincode ? ' - ' : ''}${selectedCustomer.pincode || ''}`.trim().replace(/^,|,$/g, '') || 'N/A'}</p>
                  {selectedCustomer.confirmedMapLink && (
                    <p className="md:col-span-2">
                      <strong className="text-foreground/80">Map Link:</strong> 
                      <a href={selectedCustomer.confirmedMapLink} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline flex items-center gap-1">
                         View Location <ExternalLink className="h-3 w-3 shrink-0"/>
                      </a>
                    </p>
                  )}
                </div>
                 <div className="mt-4">
                    <Label htmlFor="problemDescription" className="flex items-center mb-1">
                    <StickyNote className="mr-2 h-4 w-4 text-primary/70" /> Problem Description
                    </Label>
                    <Textarea 
                    id="problemDescription" 
                    rows={3} 
                    placeholder="Enter customer's reported problem..."
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    disabled={isSubmittingJob}
                    />
                </div>
                <div className="mt-4 flex justify-end">
                    <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button 
                        disabled={!canSubmit}
                        size="default"
                        >
                        <WrenchIcon className="mr-2 h-4 w-4" />
                        Create Job Sheet
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Job Sheet Creation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to create a new service job for:
                            <br />
                            <strong>Customer:</strong> {selectedCustomer?.customerName || 'N/A'}
                            <br />
                            <strong>Problem:</strong> {problemDescription.length > 100 ? problemDescription.substring(0,97) + "..." : problemDescription}
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmittingJob}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={proceedWithJobCreation} disabled={isSubmittingJob}>
                            {isSubmittingJob ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSubmittingJob ? 'Creating...' : 'Confirm & Create'}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                </div>
              </section>
            )}
            
            {renderJobsTable(activeJobs, "Active Job Sheets", isLoadingActiveJobs, activeJobsError, true)}
            {renderJobsTable(recentJobs, "Last 5 Recent Job Sheets", isLoadingRecentJobs, recentJobsError, false)}

          </CardContent>
        </Card>
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} DropPurity. All rights reserved.
      </footer>
    </div>
  );
}

