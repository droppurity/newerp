
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Droplets, LogOut, LayoutDashboard, Users, Search as SearchIcon, Loader2, AlertCircle, ExternalLink, MapPin, CalendarClock, Phone as PhoneIcon } from 'lucide-react';

const isAuthenticatedClientSide = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  }
  return false;
};

interface Customer {
  _id: string;
  customerName?: string;
  generatedCustomerId?: string;
  customerPhone?: string;
  customerAddress?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  stateName?: string;
  confirmedMapLink?: string | null;
  mapLatitude?: number | null;
  mapLongitude?: number | null;
  modelInstalled?: string;
  serialNumber?: string;
  planSelected?: string;
  planEndDate?: string | null; // ISO string for plan end date
  registeredAt?: string; // ISO string
}

interface RemainingDaysInfo {
  text: string;
  isUrgent: boolean;
}

// Debounce function
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


export default function AllCustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date()); // For calculating remaining days

  useEffect(() => {
    setIsClient(true);
    // Update current date periodically if needed, or just once on mount for simplicity
    const timer = setInterval(() => setCurrentDate(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
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

  const fetchCustomers = useCallback(async (searchTerm: string) => {
    setIsLoadingCustomers(true);
    setFetchError(null);
    try {
      const response = await fetch(`/api/customers${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch customers: ${response.statusText}` }));
        throw new Error(errorData.message || `Failed to fetch customers: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      } else {
        throw new Error(data.message || 'Invalid customers data format received.');
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      setFetchError(error.message || "Could not retrieve customer data.");
      toast({
        variant: "destructive",
        title: "Failed to Load Customers",
        description: error.message || "Could not retrieve customer data. Please try again later.",
      });
      setCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [toast]);

  const debouncedFetchCustomers = useCallback(debounce(fetchCustomers, 500), [fetchCustomers]);

  useEffect(() => {
    if (isClient && !isAuthenticating) {
      if (customerSearchTerm.length > 2 || customerSearchTerm.length === 0) {
         debouncedFetchCustomers(customerSearchTerm);
      } else if (customers.length > 0 && customerSearchTerm.length <=2) {
        // If search term is too short, and we previously had results, clear them or show all
      }
    }
  }, [isClient, isAuthenticating, customerSearchTerm, debouncedFetchCustomers, customers.length]);

  const calculateRemainingDays = (planEndDateString?: string | null): RemainingDaysInfo => {
    if (!planEndDateString) return { text: 'N/A', isUrgent: false };
    const endDate = parseISO(planEndDateString);
    if (!isValid(endDate)) return { text: 'Invalid Date', isUrgent: false };
    
    const daysLeft = differenceInDays(endDate, currentDate);
    
    if (daysLeft < 0) return { text: 'Expired', isUrgent: true };
    if (daysLeft === 0) return { text: 'Today', isUrgent: true };
    if (daysLeft < 4) return { text: `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, isUrgent: true };
    return { text: `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, isUrgent: false };
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
          <p className="text-lg text-muted-foreground">Loading Customer Database...</p>
        </div>
      </div>
    );
  }

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
              <Users className="mr-3 h-6 w-6 text-primary" />
              Customer Database
            </CardTitle>
            <CardDescription>Search and manage all registered customers. Displaying more details including map location.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search by name, ID, or phone (min 3 chars)..." 
                className="pl-10 w-full text-base"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
              />
            </div>
            
            {isLoadingCustomers && (
              <div className="p-8 text-center min-h-[250px] flex flex-col justify-center items-center">
                <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Loading customers...</p>
              </div>
            )}

            {!isLoadingCustomers && fetchError && (
              <div className="p-8 text-center border-2 border-dashed border-destructive/50 rounded-lg min-h-[250px] flex flex-col justify-center items-center bg-destructive/5">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive font-medium">Failed to load customer data</p>
                <p className="text-muted-foreground text-sm">{fetchError}</p>
              </div>
            )}

            {!isLoadingCustomers && !fetchError && customers.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed rounded-lg min-h-[250px] flex flex-col justify-center items-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {customerSearchTerm ? `No customers found matching "${customerSearchTerm}".` : "No customers found."}
                </p>
                {!customerSearchTerm && <p className="text-xs text-muted-foreground/70 mt-1">Register new customers to see them here.</p>}
              </div>
            )}

            {!isLoadingCustomers && !fetchError && customers.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center">
                            <CalendarClock className="mr-1.5 h-4 w-4" /> Remaining Days
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => {
                      const remainingDaysInfo = calculateRemainingDays(customer.planEndDate);
                      return (
                        <TableRow key={customer._id}>
                          <TableCell className="font-medium">{customer.generatedCustomerId || 'N/A'}</TableCell>
                          <TableCell>{customer.customerName || 'N/A'}</TableCell>
                          <TableCell>
                            {customer.customerPhone ? (
                              <a href={`tel:${customer.customerPhone}`} className="text-primary hover:underline flex items-center gap-1">
                                <PhoneIcon className="h-3.5 w-3.5 shrink-0"/>
                                {customer.customerPhone}
                              </a>
                            ) : 'N/A'}
                          </TableCell>
                          <TableCell 
                            className={cn(
                              "text-center font-medium",
                              remainingDaysInfo.isUrgent && "text-destructive"
                            )}
                          >
                            {remainingDaysInfo.text}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/customer-details/${customer._id}`} passHref>
                              <Button variant="outline" size="sm">View Details</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
