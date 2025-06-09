
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Droplets, LogOut, LayoutDashboard, WrenchIcon, Users, CheckSquare, ListFilter, 
  Loader2, AlertCircle, ExternalLink, Phone, MapPin, MessageSquare
} from 'lucide-react';

const isAuthenticatedClientSide = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  }
  return false;
};

interface ServiceJob {
  _id: string;
  customerGeneratedId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  confirmedMapLink?: string | null;
  problemDescription: string;
  status: "Open" | "Resolved" | string; // Allow for other statuses if they emerge
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export default function ManageServiceJobsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  
  const [serviceJobs, setServiceJobs] = useState<ServiceJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<"open" | "all">("open");

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      if (!isAuthenticatedClientSide()) {
        router.replace('/login');
      } else {
        setIsAuthenticating(false);
      }
    }
  }, [router, isClient]);

  const fetchServiceJobs = useCallback(async (statusFilter?: "Open") => {
    setIsLoadingJobs(true);
    setFetchError(null);
    try {
      let url = '/api/service-jobs';
      if (statusFilter) {
        url += `?status=${statusFilter}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch service jobs: ${response.statusText}` }));
        throw new Error(errorData.message || `Failed to fetch service jobs: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.jobs)) {
        setServiceJobs(data.jobs);
      } else {
        throw new Error(data.message || 'Invalid service jobs data format received.');
      }
    } catch (error: any) {
      console.error("Error fetching service jobs:", error);
      setFetchError(error.message || "Could not retrieve service job data.");
      toast({
        variant: "destructive",
        title: "Failed to Load Jobs",
        description: error.message || "Could not retrieve service job data. Please try again later.",
      });
      setServiceJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isClient && !isAuthenticating) {
      fetchServiceJobs(currentTab === "open" ? "Open" : undefined);
    }
  }, [isClient, isAuthenticating, currentTab, fetchServiceJobs]);

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
        fetchServiceJobs(currentTab === "open" ? "Open" : undefined); // Refresh list
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
  
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('isAuthenticated');
    }
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.replace('/login');
  };

  if (!isClient || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg text-muted-foreground">Loading Service Job Management...</p>
        </div>
      </div>
    );
  }

  const displayedJobs = serviceJobs; // Already filtered by API for "open" tab

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
            <Link href="/" passHref>
              <Button variant="outline">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Back to Dashboard
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <WrenchIcon className="mr-3 h-6 w-6 text-primary" />
              Manage Service Job Sheets
            </CardTitle>
            <CardDescription>View, filter, and update the status of service jobs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as "open" | "all")}>
              <TabsList className="grid w-full grid-cols-2 md:w-[300px]">
                <TabsTrigger value="open">
                  <ListFilter className="mr-2 h-4 w-4" /> Open Jobs
                </TabsTrigger>
                <TabsTrigger value="all">
                  <Users className="mr-2 h-4 w-4" /> All Jobs
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {isLoadingJobs && (
              <div className="p-8 text-center min-h-[250px] flex flex-col justify-center items-center">
                <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Loading service jobs...</p>
              </div>
            )}

            {!isLoadingJobs && fetchError && (
              <div className="p-8 text-center border-2 border-dashed border-destructive/50 rounded-lg min-h-[250px] flex flex-col justify-center items-center bg-destructive/5">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive font-medium">Failed to load job data</p>
                <p className="text-muted-foreground text-sm">{fetchError}</p>
              </div>
            )}

            {!isLoadingJobs && !fetchError && displayedJobs.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed rounded-lg min-h-[250px] flex flex-col justify-center items-center">
                <WrenchIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {currentTab === "open" ? "No open service jobs found." : "No service jobs found."}
                </p>
                {currentTab === "open" && <p className="text-xs text-muted-foreground/70 mt-1">Create new service jobs from the Service Management page.</p>}
              </div>
            )}

            {!isLoadingJobs && !fetchError && displayedJobs.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Problem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedJobs.map((job) => (
                      <TableRow key={job._id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{job.customerName || 'N/A'}</span>
                            <span className="text-xs text-muted-foreground">{job.customerGeneratedId || 'N/A'}</span>
                            {job.customerPhone && (
                               <span className="text-xs text-muted-foreground flex items-center mt-0.5">
                                 <Phone className="h-3 w-3 mr-1"/> {job.customerPhone}
                               </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={job.problemDescription}>
                            {job.problemDescription}
                          </div>
                           {job.confirmedMapLink && (
                              <a href={job.confirmedMapLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center mt-1">
                                <MapPin className="h-3 w-3 mr-1"/> View Map
                                <ExternalLink className="h-2.5 w-2.5 ml-0.5"/>
                              </a>
                            )}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            job.status === "Open" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
                            job.status === "Resolved" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                            job.status !== "Open" && job.status !== "Resolved" && "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          )}>
                            {job.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(job.createdAt), "dd MMM, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          {job.status === "Open" ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleResolveJob(job._id)}
                            >
                              <CheckSquare className="mr-2 h-4 w-4" /> Resolve
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} DropPurity. All rights reserved.
      </footer>
    </div>
  );
}

