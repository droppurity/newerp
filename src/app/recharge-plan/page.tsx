
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Droplets, LogOut, Search as SearchIcon, Zap, LayoutDashboard, Loader2, AlertCircle, ListChecks, Banknote, CheckCircle
} from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  // Add other relevant customer fields you want to display
}

interface Plan {
  _id: string;
  planId: string;
  planName: string;
  price: number;
  dailyWaterLimitLiters: number;
  durationDays: number;
}

export default function RechargePlanPage() {
  const router = useRouter();
  const { toast } = useToast(); 
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [plansList, setPlansList] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [planFetchError, setPlanFetchError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isRecharging, setIsRecharging] = useState<boolean>(false);


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

  // Fetch Plans
  useEffect(() => {
    if (isClient && !isAuthenticating) {
      const fetchPlans = async () => {
        setIsLoadingPlans(true);
        setPlanFetchError(null);
        try {
          const response = await fetch('/api/plans');
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Failed to fetch plans: ${response.statusText}` }));
            throw new Error(errorData.message || `Failed to fetch plans: ${response.statusText}`);
          }
          const data = await response.json();
          if (data.success && Array.isArray(data.plans)) {
            setPlansList(data.plans);
            if (data.plans.length === 0) {
               setPlanFetchError("No plans found in the database. Please ensure plans are initialized.");
            }
          } else {
            setPlanFetchError(data.message || 'Invalid plans data format received from /api/plans.');
          }
        } catch (error: any) {
          console.error("Error fetching plans:", error);
          setPlanFetchError(error.message || "Could not retrieve service plans.");
          setPlansList([]); 
        } finally {
          setIsLoadingPlans(false);
        }
      };
      fetchPlans();
    }
  }, [isClient, isAuthenticating]);

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

  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) {
      toast({ 
        variant: "default",
        title: "Search Hint",
        description: "Please enter at least 3 characters to search (name, ID, or phone).",
      });
      return;
    }

    setIsSearching(true);
    setFoundCustomer(null);
    setSelectedPlanId(''); // Reset plan selection on new search
    setPaymentMethod('');   // Reset payment method

    try {
      // Using /api/customers route with search parameter for consistency
      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();

      if (response.ok && data.success) {
        if (data.customers && data.customers.length > 0) {
          setFoundCustomer(data.customers[0]); // Take the first match
          toast({
            title: "Customer Found",
            description: `${data.customers[0].customerName} selected. You can now choose a plan.`,
          });
        } else { // data.customers is empty or not present
          toast({
              variant: "default", 
              title: "Search Result",
              description: `No customers found matching "${searchTerm}".`,
          });
        }
      } else { // Handle non-ok responses or success:false from API
         toast({
            variant: "destructive", 
            title: "Search Failed",
            description: data.message || `Failed to fetch customer data. Status: ${response.status}`,
        });
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive",
        title: "Search Error",
        description: error.message || "An unexpected error occurred during search.",
      });
      console.error('Actual search error object:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRecharge = async () => {
    if (!foundCustomer) {
      toast({ variant: "destructive", title: "Error", description: "No customer selected." });
      return;
    }
    if (!selectedPlanId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a plan." });
      return;
    }
    if (!paymentMethod) {
      toast({ variant: "destructive", title: "Error", description: "Please select a payment method." });
      return;
    }
    if (isLoadingPlans || planFetchError) {
      toast({ variant: "destructive", title: "Error", description: "Plans are not loaded correctly. Cannot proceed." });
      return;
    }

    setIsRecharging(true);
    try {
      const rechargeData = {
        customerId: foundCustomer._id,
        customerGeneratedId: foundCustomer.generatedCustomerId,
        planId: selectedPlanId,
        paymentMethod: paymentMethod,
      };

      const response = await fetch('/api/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rechargeData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Recharge Successful",
          description: result.message || `Plan recharged for ${foundCustomer.customerName}.`,
          variant: "success"
        });
        // Reset form after successful recharge
        setFoundCustomer(null); 
        setSelectedPlanId('');
        setPaymentMethod('');
        setSearchTerm(''); 
      } else {
        throw new Error(result.message || 'Failed to process recharge.');
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Recharge Failed",
        description: error.message || "An unknown error occurred during recharge.",
      });
    } finally {
      setIsRecharging(false);
    }
  };


  if (!isClient || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg text-muted-foreground">Loading Recharge Plan Page...</p>
        </div>
      </div>
    );
  }

  const selectedPlanDetails = plansList.find(p => p.planId === selectedPlanId);

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
            <Button variant="outline" onClick={handleLogout} className="font-semibold">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Zap className="mr-3 h-6 w-6 text-primary" />
              Recharge Plan
            </CardTitle>
            <CardDescription>Search for a customer to recharge or renew their plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, ID, or phone (min 3 chars)"
                  className="pl-10 w-full text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || searchTerm.trim().length < 3}>
                {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {isSearching && (
                 <div className="mt-6 text-center text-muted-foreground flex items-center justify-center p-6">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Searching for customer...
                </div>
            )}

            {foundCustomer && (
                <Card className="mt-6 bg-muted/20 border-primary/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl flex items-center">
                            <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> Customer Found:
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p><strong>Name:</strong> {foundCustomer.customerName || 'N/A'}</p>
                            <p><strong>Customer ID:</strong> {foundCustomer.generatedCustomerId || 'N/A'}</p>
                            <p><strong>Phone:</strong> {foundCustomer.customerPhone || 'N/A'}</p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="planSelect" className="flex items-center text-md"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Select Plan</Label>
                            {isLoadingPlans ? (
                                <div className="flex items-center text-muted-foreground p-2 border rounded-md bg-background">
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading plans...
                                </div>
                            ) : planFetchError ? (
                                <Alert variant="destructive" className="mt-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Plan Loading Error</AlertTitle>
                                    <AlertDescription>
                                      {planFetchError}
                                      <Button variant="link" asChild className="p-0 h-auto font-medium text-destructive hover:underline block mt-1">
                                        <Link href="/api/initialize-collections" target="_blank">Try Initializing Collections</Link>
                                      </Button>
                                    </AlertDescription>
                                </Alert>
                            ) : plansList.length === 0 ? (
                                <p className="text-sm text-muted-foreground p-2 border rounded-md bg-background">No plans available to select. Please ensure plans are configured.</p>
                            ) : (
                                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                    <SelectTrigger id="planSelect" className="w-full md:w-[400px] bg-background">
                                        <SelectValue placeholder="Choose a plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plansList.map(plan => (
                                            <SelectItem key={plan.planId} value={plan.planId}>
                                                {plan.planName} - ₹{plan.price} ({plan.durationDays} days, {plan.dailyWaterLimitLiters}L/day)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {selectedPlanDetails && (
                          <div className="p-3 bg-primary/10 rounded-md text-sm border border-primary/30">
                            <p className="font-semibold text-primary-foreground">Selected Plan Details:</p>
                            <p><strong>Name:</strong> {selectedPlanDetails.planName}</p>
                            <p><strong>Price:</strong> ₹{selectedPlanDetails.price}</p>
                            <p><strong>Duration:</strong> {selectedPlanDetails.durationDays} days</p>
                            <p><strong>Daily Limit:</strong> {selectedPlanDetails.dailyWaterLimitLiters} Liters/day</p>
                          </div>
                        )}

                        <div className="space-y-2">
                             <Label htmlFor="paymentMethodSelect" className="flex items-center text-md"><Banknote className="mr-2 h-5 w-5 text-primary"/>Payment Method</Label>
                             <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger id="paymentMethodSelect" className="w-full md:w-[300px] bg-background">
                                    <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Online">Online</SelectItem>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                             </Select>
                        </div>
                        <Button 
                            onClick={handleRecharge} 
                            disabled={!selectedPlanId || !paymentMethod || isRecharging || isLoadingPlans || !!planFetchError} 
                            className="w-full sm:w-auto"
                        >
                            {isRecharging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                            {isRecharging ? 'Processing Recharge...' : 'Confirm Recharge'}
                        </Button>
                    </CardContent>
                </Card>
            )}
            
            {!isSearching && !foundCustomer && searchTerm.trim().length >= 3 && (
                 <div className="mt-6 text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg">
                    <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    No customer found matching "{searchTerm}". Please try a different search term.
                </div>
            )}

             {!isSearching && !foundCustomer && searchTerm.trim().length < 3 && (
                 <div className="mt-6 text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg">
                     <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    Enter at least 3 characters of a customer's name, ID, or phone number to search.
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
