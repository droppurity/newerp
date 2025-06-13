
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Droplets, LogOut, Search as SearchIcon, Zap, LayoutDashboard, Loader2, AlertCircle, ListChecks, Banknote, CheckCircle, AlertTriangle, PlusSquare, Replace, Droplet
} from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseISO, isFuture, format, addDays as dateFnsAddDays } from 'date-fns';

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
  currentPlanId?: string;
  currentPlanName?: string;
  planPricePaid?: number;
  planStartDate?: string; 
  planEndDate?: string; 
  espCycleMaxHours?: number;
  espCycleMaxDays?: number;
  dailyWaterLimitLiters?: number; // Used for current daily limit display
  currentPlanDailyLitersLimit?: number; // More specific field for current plan's daily limit
  currentPlanTotalLitersLimit?: number; // Current plan's total liter limit for cycle
  lastRechargeDate?: string; 
  rechargeCount?: number;
}

interface PlanFromAPI {
  _id: string;
  planId: string;
  planName: string;
  price: number;
  durationDays: number;
  espCycleMaxHours?: number;     
  dailyWaterLimitLiters?: number; 
  totalLitersLimitForCycle?: number; // New: total liters for cycle
}

interface RechargeConfirmationDetails {
  currentPlanName?: string;
  currentPlanEndDate?: string;
  newPlanName?: string;
  newPlanPrice?: number;
  newPlanDurationDays?: number;
  newPlanMaxHours?: number;         
  newPlanMaxLitersPerDay?: number;  
  newPlanTotalLitersForCycle?: number; // New: total liters for new plan cycle
}

export default function RechargePlanPage() {
  const router = useRouter();
  const { toast } = useToast(); 
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [plansList, setPlansList] = useState<PlanFromAPI[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [planFetchError, setPlanFetchError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isRecharging, setIsRecharging] = useState<boolean>(false);

  const [showRechargeConfirmationDialog, setShowRechargeConfirmationDialog] = useState(false);
  const [rechargeConfirmationDetails, setRechargeConfirmationDetails] = useState<RechargeConfirmationDetails | null>(null);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (isClient) {
      if (!isAuthenticatedClientSide()) {
        router.replace('/login');
      } else {
        setIsAuthenticating(false);
      }
    }
  }, [router, isClient]);

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
               setPlanFetchError("No plans found. Initialize plans at /api/initialize-collections.");
            }
          } else {
            setPlanFetchError(data.message || 'Invalid plans data from /api/plans.');
          }
        } catch (error: any) {
          setPlanFetchError(error.message || "Could not retrieve plans.");
          setPlansList([]); 
        } finally {
          setIsLoadingPlans(false);
        }
      };
      fetchPlans();
    }
  }, [isClient, isAuthenticating]);

  const handleLogout = () => {
    if (typeof window !== "undefined") sessionStorage.removeItem('isAuthenticated');
    toast({ title: "Logged Out", description: "Successfully logged out." });
    router.replace('/login');
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) {
      toast({ title: "Search Hint", description: "Enter at least 3 characters." });
      return;
    }
    setIsSearching(true); setFoundCustomer(null); setSelectedPlanId(''); setPaymentMethod('');
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.customers && data.customers.length > 0) {
          setFoundCustomer(data.customers[0]); 
          toast({ title: "Customer Found", description: `${data.customers[0].customerName} selected.` });
        } else {
          setFoundCustomer(null);
          toast({ title: "Search Result", description: `No customers found for "${searchTerm}".` });
        }
      } else {
         setFoundCustomer(null);
         toast({ variant: "destructive", title: "Search Failed", description: data.message || `Error: ${response.status}` });
      }
    } catch (error: any) {
      setFoundCustomer(null);
      toast({ variant: "destructive", title: "Search Error", description: error.message || "Unexpected search error." });
    } finally {
      setIsSearching(false);
    }
  };
  
  const proceedWithRecharge = async (rechargeType: 'replace' | 'add') => {
    if (!foundCustomer || !selectedPlanId || !paymentMethod) {
        toast({ variant: "destructive", title: "Error", description: "Missing customer, plan, or payment method details." });
        setIsRecharging(false); 
        setShowRechargeConfirmationDialog(false);
        return;
    }
    setIsRecharging(true);
    try {
      const rechargeData = { 
        customerId: foundCustomer._id, 
        planId: selectedPlanId, 
        paymentMethod,
        rechargeType 
      };
      const response = await fetch('/api/recharge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rechargeData),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast({ title: "Recharge Successful", description: result.message, variant: "success" });
        setFoundCustomer(null); setSelectedPlanId(''); setPaymentMethod(''); setSearchTerm('');
      } else {
        throw new Error(result.message || 'Failed to process recharge.');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Recharge Failed", description: error.message || "Unknown recharge error." });
    } finally {
      setIsRecharging(false);
      setShowRechargeConfirmationDialog(false);
    }
  };

  const handleRechargeAttempt = () => {
    if (!foundCustomer) { toast({ variant: "destructive", title: "Error", description: "No customer selected." }); return; }
    if (!selectedPlanId) { toast({ variant: "destructive", title: "Error", description: "Please select a plan." }); return; }
    if (!paymentMethod) { toast({ variant: "destructive", title: "Error", description: "Please select a payment method." }); return; }
    if (isLoadingPlans || planFetchError || plansList.length === 0) { toast({ variant: "destructive", title: "Error", description: "Plans not loaded or unavailable." }); return; }

    const newSelectedPlanDetails = plansList.find(p => p.planId === selectedPlanId);
    if (!newSelectedPlanDetails) {
      toast({ variant: "destructive", title: "Error", description: "Selected plan details not found." });
      return;
    }

    const currentPlanEndDate = foundCustomer.planEndDate ? parseISO(foundCustomer.planEndDate) : null;
    const isCurrentPlanActive = currentPlanEndDate && isFuture(currentPlanEndDate);

    setRechargeConfirmationDetails({
      currentPlanName: foundCustomer.currentPlanName || "N/A",
      currentPlanEndDate: currentPlanEndDate ? format(currentPlanEndDate, "PPP") : "N/A",
      newPlanName: newSelectedPlanDetails.planName,
      newPlanPrice: newSelectedPlanDetails.price,
      newPlanDurationDays: newSelectedPlanDetails.durationDays,
      newPlanMaxHours: newSelectedPlanDetails.espCycleMaxHours, 
      newPlanMaxLitersPerDay: newSelectedPlanDetails.dailyWaterLimitLiters,
      newPlanTotalLitersForCycle: newSelectedPlanDetails.totalLitersLimitForCycle,
    });

    if (isCurrentPlanActive) {
      setShowRechargeConfirmationDialog(true);
    } else {
      proceedWithRecharge('replace'); 
    }
  };

  if (!isClient || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg text-muted-foreground">Loading Recharge Page...</p>
        </div>
      </div>
    );
  }

  const selectedPlanDetails = plansList.find(p => p.planId === selectedPlanId);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted/10">
      <header className="p-4 sm:p-6 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link href="/" passHref><h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center cursor-pointer"><Droplets className="mr-2 h-7 w-7 sm:h-8 sm:w-8" /> DropPurity</h1></Link>
          <div className="flex items-center gap-2 sm:gap-4">
             <Link href="/" passHref><Button variant="outline"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Button></Link>
            <Button variant="outline" onClick={handleLogout} className="font-semibold"><LogOut className="mr-2 h-4 w-4" />Logout</Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl"><Zap className="mr-3 h-6 w-6 text-primary" />Recharge Plan</CardTitle>
            <CardDescription>Search for a customer to recharge or renew their plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input type="text" placeholder="Search by name, ID, or phone (min 3 chars)" className="pl-10 w-full text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || searchTerm.trim().length < 3}>
                {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {isSearching && (<div className="mt-6 text-center text-muted-foreground flex items-center justify-center p-6"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Searching...</div>)}

            {foundCustomer && (
                <Card className="mt-6 bg-muted/20 border-primary/30">
                    <CardHeader className="pb-3"><CardTitle className="text-xl flex items-center"><CheckCircle className="mr-2 h-5 w-5 text-green-500" /> Customer Found:</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p><strong>Name:</strong> {foundCustomer.customerName || 'N/A'}</p>
                            <p><strong>ID:</strong> {foundCustomer.generatedCustomerId || 'N/A'}</p>
                            <p><strong>Phone:</strong> {foundCustomer.customerPhone || 'N/A'}</p>
                            <p><strong>Current Plan:</strong> {foundCustomer.currentPlanName || 'N/A'}</p>
                            <p><strong>Plan Ends:</strong> {foundCustomer.planEndDate ? new Date(foundCustomer.planEndDate).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Daily Liters:</strong> {foundCustomer.currentPlanDailyLitersLimit ? `${foundCustomer.currentPlanDailyLitersLimit} L` : (foundCustomer.dailyWaterLimitLiters ? `${foundCustomer.dailyWaterLimitLiters} L` : 'N/A')}</p>
                            <p><strong>Total Cycle Liters:</strong> {foundCustomer.currentPlanTotalLitersLimit ? `${foundCustomer.currentPlanTotalLitersLimit} L` : 'N/A'}</p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="planSelect" className="flex items-center text-md"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Select New Plan</Label>
                            {isLoadingPlans ? (<div className="flex items-center text-muted-foreground p-2 border rounded-md bg-background"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</div>)
                            : planFetchError ? (<Alert variant="destructive" className="mt-2"><AlertCircle className="h-4 w-4" /><AlertTitle>Plan Error</AlertTitle><AlertDescription>{planFetchError}</AlertDescription></Alert>)
                            : plansList.length === 0 ? (<p className="text-sm text-muted-foreground p-2 border rounded-md bg-background">No plans available.</p>)
                            : (
                                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                    <SelectTrigger id="planSelect" className="w-full md:w-[400px] bg-background"><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                                    <SelectContent>
                                        {plansList.map(plan => (
                                            <SelectItem key={plan.planId} value={plan.planId}>
                                                {plan.planName} - ₹{plan.price} ({plan.durationDays} days
                                                {plan.dailyWaterLimitLiters ? `, ${plan.dailyWaterLimitLiters}L/day` : ''}
                                                {plan.totalLitersLimitForCycle ? `, ${plan.totalLitersLimitForCycle}L total` : ''}
                                                {plan.espCycleMaxHours ? `, ${plan.espCycleMaxHours}hrs` : ''})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {selectedPlanDetails && (
                          <div className="p-3 bg-primary/10 rounded-md text-sm border border-primary/30">
                            <p className="font-semibold text-primary-foreground">Selected Plan for New Recharge:</p>
                            <p><strong>Name:</strong> {selectedPlanDetails.planName}</p>
                            <p><strong>Price:</strong> ₹{selectedPlanDetails.price}</p>
                            <p><strong>Duration:</strong> {selectedPlanDetails.durationDays} days</p>
                            {selectedPlanDetails.dailyWaterLimitLiters !== undefined && <p><strong>Max Daily Liters:</strong> {selectedPlanDetails.dailyWaterLimitLiters} L/day</p>}
                            {selectedPlanDetails.totalLitersLimitForCycle !== undefined && <p><strong>Total Cycle Liters:</strong> {selectedPlanDetails.totalLitersLimitForCycle} L</p>}
                            {selectedPlanDetails.espCycleMaxHours !== undefined && <p><strong>Total Max Hours:</strong> {selectedPlanDetails.espCycleMaxHours} hours</p>}
                          </div>
                        )}

                        <div className="space-y-2">
                             <Label htmlFor="paymentMethodSelect" className="flex items-center text-md"><Banknote className="mr-2 h-5 w-5 text-primary"/>Payment Method</Label>
                             <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger id="paymentMethodSelect" className="w-full md:w-[300px] bg-background"><SelectValue placeholder="Select payment" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Online">Online</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                             </Select>
                        </div>
                        <Button onClick={handleRechargeAttempt} disabled={!selectedPlanId || !paymentMethod || isRecharging || isLoadingPlans || !!planFetchError || plansList.length === 0} className="w-full sm:w-auto">
                            {isRecharging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                            {isRecharging ? 'Processing...' : 'Proceed to Recharge'}
                        </Button>
                    </CardContent>
                </Card>
            )}
            
            {!isSearching && !foundCustomer && searchTerm.trim().length >= 3 && (<div className="mt-6 text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg"><SearchIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />No customer found for "{searchTerm}".</div>)}
            {!isSearching && !foundCustomer && searchTerm.trim().length < 3 && (<div className="mt-6 text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg"><SearchIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />Enter at least 3 characters to search.</div>)}
          
            <AlertDialog open={showRechargeConfirmationDialog} onOpenChange={setShowRechargeConfirmationDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center">
                    <AlertTriangle className="h-6 w-6 mr-2 text-orange-500" />
                    Active Plan Detected
                  </AlertDialogTitle>
                  <div className="text-sm text-muted-foreground space-y-3 pt-2">
                    <div>Customer <span className="font-semibold">{foundCustomer?.customerName}</span> has an active plan:</div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-md text-sm">
                        <div><strong>Current Plan:</strong> {rechargeConfirmationDetails?.currentPlanName}</div>
                        <div><strong>Ends On:</strong> {rechargeConfirmationDetails?.currentPlanEndDate}</div>
                    </div>
                    <div>New plan selected for recharge:</div>
                     <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-md text-sm space-y-0.5">
                        <div><strong>New Plan:</strong> {rechargeConfirmationDetails?.newPlanName}</div>
                        <div><strong>Price:</strong> ₹{rechargeConfirmationDetails?.newPlanPrice?.toFixed(2)}</div>
                        <div><strong>Duration:</strong> {rechargeConfirmationDetails?.newPlanDurationDays} days</div>
                        {rechargeConfirmationDetails?.newPlanMaxLitersPerDay !== undefined && <div><strong>Max Liters/Day:</strong> {rechargeConfirmationDetails.newPlanMaxLitersPerDay} L</div>}
                        {rechargeConfirmationDetails?.newPlanTotalLitersForCycle !== undefined && <div><strong>Total Cycle Liters:</strong> {rechargeConfirmationDetails.newPlanTotalLitersForCycle} L</div>}
                        {rechargeConfirmationDetails?.newPlanMaxHours !== undefined && <div><strong>Total Max Hours:</strong> {rechargeConfirmationDetails.newPlanMaxHours} hrs</div>}
                    </div>
                    <div className="font-semibold">How would you like to apply the new plan?</div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-between gap-2">
                  <AlertDialogCancel onClick={() => setShowRechargeConfirmationDialog(false)} disabled={isRecharging}>Cancel</AlertDialogCancel>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => proceedWithRecharge('add')} disabled={isRecharging} variant="outline" className="flex items-center">
                        {isRecharging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusSquare className="mr-2 h-4 w-4" />}
                        Add to Current Plan
                    </Button>
                    <Button onClick={() => proceedWithRecharge('replace')} disabled={isRecharging} className="bg-primary hover:bg-primary/90 flex items-center">
                        {isRecharging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Replace className="mr-2 h-4 w-4" />}
                        Replace Current Plan
                    </Button>
                  </div>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </CardContent>
        </Card>
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} DropPurity. All rights reserved.
      </footer>
    </div>
  );
}
