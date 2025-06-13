
// src/app/customer-details/[customerId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, isValid as isValidDate, formatDistanceToNow, isFuture, addDays as dateFnsAddDays } from 'date-fns';
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle, User, MapPin, Phone as PhoneIcon, Mail, Home, Briefcase, Droplet,
  FileText, CalendarDays, Clock, Tag, ShieldCheck, BarChart3, Users, AlertTriangle,
  Building, Hash, CircleDollarSign, Wrench, Receipt, LogOut, ArrowLeft, LinkIcon, ExternalLink, Droplets as AppIcon,
  RotateCcwIcon, History, Wifi, Activity, Hourglass, ListRestart, Zap, Loader2, ListChecks, Banknote,
  PlusSquare, Replace, Search as SearchIcon, PackageIcon, GlassWater
} from 'lucide-react';

interface LastUsageEntry {
  timestamp: string;
  dailyHoursReported?: number; // Kept for devices that only report hours
  totalHoursReported?: number;  // Kept for devices that only report hours
  dailyLitersReported?: number; // Direct from ESP with flow sensor
  totalLitersReportedInCycle?: number; // Direct from ESP with flow sensor
  dailyLitersCalculated?: number; // Calculated if only hours reported
  totalLitersCalculatedInCycle?: number; // Calculated if only hours reported
}
interface Customer {
  _id: string;
  receiptNumber?: string;
  customerName?: string;
  fatherSpouseName?: string;
  customerPhone?: string;
  altMobileNo?: string;
  emailId?: string;
  customerAddress?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  stateName?: string;
  country?: string;
  confirmedMapLink?: string | null;
  aadhaarNo?: string;
  selectedZone?: string;
  selectedDivision?: string;
  generatedCustomerId?: string;
  modelInstalled?: string;
  serialNumber?: string;
  installationDate?: string;
  installationTime?: string;
  tdsBefore?: string;
  tdsAfter?: string;
  paymentType?: string;
  securityAmount?: string;

  currentPlanId?: string;
  currentPlanName?: string;
  planPricePaid?: number;
  planStartDate?: string;
  planEndDate?: string;
  dailyWaterLimitLiters?: number; // This might be the legacy field if currentPlanDailyLitersLimit is not set
  currentPlanDailyLitersLimit?: number;
  currentPlanTotalLitersLimit?: number;
  espCycleMaxHours?: number;
  espCycleMaxDays?: number;
  lastRechargeDate?: string;
  rechargeCount?: number;

  termsAgreed?: boolean;
  registeredAt?: string;
  driveUrl?: string | null;

  lastContact?: string | null;
  currentTotalHours?: number; // Still useful for hour-based tracking/diagnostics
  currentTotalLitersUsed?: number; // This will be updated by direct totalLiters from ESP if available
  lastUsage?: LastUsageEntry[] | null;
  updatedAt?: string;
}

interface RechargeHistoryItem {
  _id: string;
  customerId: string;
  customerGeneratedId?: string;
  planId: string;
  planName: string;
  planPrice: number;
  planDurationDays: number;
  dailyWaterLimitLiters?: number;
  totalLitersLimitForCycle?: number;
  espCycleMaxHours?: number;
  paymentMethod: string;
  rechargeDate: string;
  rechargeType?: 'replace' | 'add';
  newPlanStartDate: string;
  newPlanEndDate: string;
  transactionId?: string;
}

interface DetailItemProps {
  icon?: React.ElementType;
  label: string;
  value?: string | number | boolean | null;
  isLink?: boolean;
  isDate?: boolean;
  isBoolean?: boolean;
  isCurrency?: boolean;
  isTel?: boolean;
  isDateTime?: boolean;
  isRelativeTime?: boolean;
  currencySymbol?: string;
  children?: React.ReactNode;
  className?: string;
}

interface PlanFromAPI {
  _id: string;
  planId: string;
  planName: string;
  price: number;
  durationDays: number;
  espCycleMaxHours?: number;
  dailyWaterLimitLiters?: number;
  totalLitersLimitForCycle?: number;
}

interface RechargeConfirmationDetails {
  currentPlanName?: string;
  currentPlanEndDate?: string;
  newPlanName?: string;
  newPlanPrice?: number;
  newPlanDurationDays?: number;
  newPlanMaxHours?: number;
  newPlanMaxLitersPerDay?: number;
  newPlanTotalLitersForCycle?: number;
}


const DetailItem: React.FC<DetailItemProps> = ({
    icon: Icon, label, value, isLink, isDate, isBoolean, isCurrency, isTel,
    isDateTime, isRelativeTime, currencySymbol = '₹', children, className
}) => {
  let displayValue: React.ReactNode = <span className="text-muted-foreground/80">N/A</span>;

  if (children) {
    displayValue = children;
  } else if (value !== undefined && value !== null && String(value).trim() !== '') {
    if (isBoolean) {
      displayValue = value ? "Yes" : "No";
    } else if (isLink && typeof value === 'string') {
      displayValue = (
        <a href={value.startsWith('http') ? value : `https://www.google.com/maps?q=${encodeURIComponent(value)}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 break-all">
          View Link <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      );
    } else if (isTel && typeof value === 'string') {
      displayValue = (
        <a href={`tel:${value}`} className="text-primary hover:underline flex items-center gap-1">
          {value}
        </a>
      );
    } else if ((isDate || isDateTime || isRelativeTime) && typeof value === 'string') {
      try {
        const parsedDate = parseISO(value);
        if (!isValidDate(parsedDate)) throw new Error("Invalid date");
        if (isRelativeTime) {
            displayValue = formatDistanceToNow(parsedDate, { addSuffix: true });
        } else {
            displayValue = format(parsedDate, isDateTime ? "PPP p" : "PPP");
        }
      } catch (e) {
         displayValue = value;
      }
    } else if (isCurrency) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      displayValue = isNaN(numValue as number) ? String(value) : `${currencySymbol}${(numValue as number).toFixed(2)}`;
    } else {
      displayValue = String(value);
    }
  }

  return (
    <div className={cn("py-2 break-words", className)}>
      <p className="text-xs sm:text-sm text-muted-foreground flex items-center">
        {Icon && <Icon className="h-4 w-4 mr-2 text-primary/80 shrink-0" />}
        {label}:
      </p>
      <p className="text-sm sm:text-base font-medium">{displayValue}</p>
    </div>
  );
};

export default function CustomerDetailsPage({ params }: { params: Promise<{ customerId: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.customerId;

  const router = useRouter();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistoryItem[]>([]);
  const [isLoadingRechargeHistory, setIsLoadingRechargeHistory] = useState(true);
  const [rechargeHistoryError, setRechargeHistoryError] = useState<string | null>(null);

  const [plansList, setPlansList] = useState<PlanFromAPI[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [planFetchError, setPlanFetchError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isRecharging, setIsRecharging] = useState<boolean>(false);
  const [showRechargeConfirmationDialog, setShowRechargeConfirmationDialog] = useState(false);
  const [rechargeConfirmationDetails, setRechargeConfirmationDetails] = useState<RechargeConfirmationDetails | null>(null);


  const fetchCustomerDetails = useCallback(async () => {
    if (!customerId) {
        setError("No customer ID provided.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setCustomer(data.customer);
      } else {
        throw new Error(data.message || 'Failed to fetch customer details');
      }
    } catch (err: any) {
      console.error("Error fetching customer details:", err);
      setError(err.message || 'Could not load customer details.');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  const fetchRechargeHistory = useCallback(async () => {
    if (!customerId) {
        setRechargeHistoryError("No customer ID for recharge history.");
        setIsLoadingRechargeHistory(false);
        return;
    }
    setIsLoadingRechargeHistory(true);
    setRechargeHistoryError(null);
    try {
      const response = await fetch(`/api/recharges/customer/${customerId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setRechargeHistory(data.recharges);
      } else {
        throw new Error(data.message || 'Failed to fetch recharge history');
      }
    } catch (err: any) {
      console.error("Error fetching recharge history:", err);
      setRechargeHistoryError(err.message || 'Could not load recharge history.');
    } finally {
      setIsLoadingRechargeHistory(false);
    }
  }, [customerId]);

  const fetchPlans = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (customerId) {
        fetchCustomerDetails();
        fetchRechargeHistory();
        fetchPlans();
    }
  }, [customerId, fetchCustomerDetails, fetchRechargeHistory, fetchPlans]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('isAuthenticated');
    }
    router.replace('/login');
  };

  const proceedWithRecharge = async (rechargeType: 'replace' | 'add') => {
    if (!customer || !selectedPlanId || !paymentMethod) {
        toast({ variant: "destructive", title: "Error", description: "Missing customer, plan, or payment method details." });
        setIsRecharging(false);
        setShowRechargeConfirmationDialog(false);
        return;
    }
    setIsRecharging(true);
    try {
      const rechargeData = {
        customerId: customer._id,
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
        setSelectedPlanId('');
        setPaymentMethod('');
        fetchCustomerDetails();
        fetchRechargeHistory();
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
    if (!customer) { toast({ variant: "destructive", title: "Error", description: "Customer data not loaded." }); return; }
    if (!selectedPlanId) { toast({ variant: "destructive", title: "Error", description: "Please select a plan." }); return; }
    if (!paymentMethod) { toast({ variant: "destructive", title: "Error", description: "Please select a payment method." }); return; }
    if (isLoadingPlans || planFetchError || plansList.length === 0) { toast({ variant: "destructive", title: "Error", description: "Plans not loaded or unavailable." }); return; }

    const newSelectedPlanDetails = plansList.find(p => p.planId === selectedPlanId);
    if (!newSelectedPlanDetails) {
      toast({ variant: "destructive", title: "Error", description: "Selected plan details not found." });
      return;
    }

    const currentPlanEndDate = customer.planEndDate ? parseISO(customer.planEndDate) : null;
    const isCurrentPlanActive = currentPlanEndDate && isFuture(currentPlanEndDate);

    setRechargeConfirmationDetails({
      currentPlanName: customer.currentPlanName || "N/A",
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

  const selectedPlanForDisplay = plansList.find(p => p.planId === selectedPlanId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background to-muted/10">
        <Card className="w-full max-w-3xl shadow-xl rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center"> <User className="h-8 w-8 text-primary mr-3" /> <CardTitle className="text-2xl sm:text-3xl"><Skeleton className="h-8 w-48" /></CardTitle></div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {[...Array(15)].map((_, i) => ( <div key={i} className="space-y-2"> <Skeleton className="h-4 w-1/4" /> <Skeleton className="h-6 w-3/4" /> </div> ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return ( <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background to-muted/10"> <Card className="w-full max-w-md shadow-xl rounded-xl"> <CardHeader><CardTitle className="text-2xl text-destructive text-center">Error</CardTitle></CardHeader> <CardContent className="p-6 text-center"> <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" /> <p className="text-destructive">{error}</p> <Button onClick={() => router.push('/all-customers')} className="mt-6"> Back to All Customers </Button> </CardContent> </Card> </div>);
  }
  if (!customer) {
    return ( <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background to-muted/10"> <Card className="w-full max-w-md shadow-xl rounded-xl"> <CardHeader><CardTitle className="text-2xl text-center">Customer Not Found</CardTitle></CardHeader> <CardContent className="p-6 text-center"> <p className="text-muted-foreground">The requested customer could not be found for ID: {customerId}</p> <Button onClick={() => router.push('/all-customers')} className="mt-6"> Back to All Customers </Button> </CardContent> </Card> </div> );
  }

  const fullAddress = [ customer.customerAddress, customer.landmark, customer.city, customer.stateName, customer.pincode, customer.country ].filter(Boolean).join(', ');
  const latestUsage = customer.lastUsage && customer.lastUsage.length > 0 ? customer.lastUsage[customer.lastUsage.length - 1] : null;

  const getDisplayDailyLiters = () => {
    if (latestUsage?.dailyLitersReported !== undefined) {
        return `${latestUsage.dailyLitersReported.toFixed(2)} L (Direct)`;
    } else if (latestUsage?.dailyLitersCalculated !== undefined) {
        return `${latestUsage.dailyLitersCalculated.toFixed(2)} L (Calculated)`;
    }
    return 'N/A';
  };


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted/10">
       <header className="p-4 sm:p-6 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link href="/" passHref> <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center cursor-pointer"> <AppIcon className="mr-2 h-7 w-7 sm:h-8 sm:w-8" /> DropPurity </h1> </Link>
          <div className="flex items-center gap-2 sm:gap-4"> <Link href="/all-customers" passHref> <Button variant="outline"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Customers </Button> </Link> <Button variant="outline" onClick={handleLogout}> <LogOut className="mr-2 h-4 w-4" /> Logout </Button> </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <Card className="w-full max-w-3xl mx-auto shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="bg-card">
             <div className="flex items-center"> <User className="h-8 w-8 text-primary mr-3" /> <CardTitle className="text-2xl sm:text-3xl">{customer.customerName || 'Customer Details'}</CardTitle> </div>
             {customer.generatedCustomerId && <p className="text-sm text-muted-foreground pt-1">Customer ID: {customer.generatedCustomerId}</p>}
          </CardHeader>
          <CardContent className="p-6 space-y-8">

            <section> <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><User className="mr-2 h-5 w-5"/>Personal Information</h3> <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6"> <DetailItem icon={User} label="Full Name" value={customer.customerName} /> <DetailItem icon={Users} label="Father/Spouse Name" value={customer.fatherSpouseName} /> <DetailItem icon={PhoneIcon} label="Primary Phone" value={customer.customerPhone} isTel /> <DetailItem icon={PhoneIcon} label="Alternate Phone" value={customer.altMobileNo} isTel /> <DetailItem icon={Mail} label="Email ID" value={customer.emailId} /> <DetailItem icon={Hash} label="Aadhaar No." value={customer.aadhaarNo} /> </div> </section>
            <section> <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><Home className="mr-2 h-5 w-5"/>Address & Location</h3> <div className="grid grid-cols-1"> <DetailItem icon={Home} label="Full Address" value={fullAddress || 'N/A'} /> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6"> <DetailItem icon={MapPin} label="Map Link" value={customer.confirmedMapLink} isLink={!!customer.confirmedMapLink} /> <DetailItem icon={Building} label="Zone" value={customer.selectedZone} /> <DetailItem icon={BarChart3} label="Division" value={customer.selectedDivision} /> </div> </section>
            <section> <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><Wrench className="mr-2 h-5 w-5"/>Installation & Device</h3> <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6"> <DetailItem icon={Tag} label="Model Installed" value={customer.modelInstalled} /> <DetailItem icon={Tag} label="Serial Number" value={customer.serialNumber} /> <DetailItem icon={CalendarDays} label="Installation Date" value={customer.installationDate} isDate /> <DetailItem icon={Clock} label="Installation Time" value={customer.installationTime} /> <DetailItem icon={Droplet} label="TDS Before" value={customer.tdsBefore ? `${customer.tdsBefore} ppm` : undefined} /> <DetailItem icon={Droplet} label="TDS After" value={customer.tdsAfter ? `${customer.tdsAfter} ppm` : undefined} /> </div> </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><Briefcase className="mr-2 h-5 w-5"/>Active Plan & Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <DetailItem icon={Tag} label="Current Plan Name" value={customer.currentPlanName || 'N/A'} />
                <DetailItem icon={CircleDollarSign} label="Current Plan Price Paid" value={customer.planPricePaid} isCurrency />
                <DetailItem icon={CalendarDays} label="Plan Start Date" value={customer.planStartDate} isDate />
                <DetailItem icon={CalendarDays} label="Plan End Date" value={customer.planEndDate} isDate />
                <DetailItem icon={GlassWater} label="Daily Water Limit (Plan)" value={customer.currentPlanDailyLitersLimit ? `${customer.currentPlanDailyLitersLimit} L/day` : (customer.dailyWaterLimitLiters ? `${customer.dailyWaterLimitLiters} L/day` : 'N/A')} />
                <DetailItem icon={PackageIcon} label="Total Water Limit (Cycle)" value={customer.currentPlanTotalLitersLimit ? `${customer.currentPlanTotalLitersLimit} L` : 'N/A'} />
                <DetailItem icon={Hourglass} label="Plan ESP Max Hours (Cycle)" value={customer.espCycleMaxHours ? `${customer.espCycleMaxHours} hrs` : 'N/A'} />
                <DetailItem icon={CalendarDays} label="Plan ESP Max Days (Cycle)" value={customer.espCycleMaxDays ? `${customer.espCycleMaxDays} days` : 'N/A'} />
                <DetailItem icon={Receipt} label="Payment Type (Initial)" value={customer.paymentType} />
                <DetailItem icon={CircleDollarSign} label="Security Amount" value={customer.securityAmount} isCurrency />
                <DetailItem icon={RotateCcwIcon} label="Last Recharge Date" value={customer.lastRechargeDate} isDate />
                <DetailItem icon={ListRestart} label="Total Recharges" value={customer.rechargeCount ? String(customer.rechargeCount) : 'N/A'} />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><Activity className="mr-2 h-5 w-5"/>Device Sync Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <DetailItem icon={Wifi} label="Last Contact Time" value={customer.lastContact} isDateTime />
                <DetailItem icon={GlassWater} label="Current Cycle Total Liters Used" value={customer.currentTotalLitersUsed ? `${customer.currentTotalLitersUsed.toFixed(2)} L` : 'N/A'} />
                {customer.currentTotalHours !== undefined && (
                    <DetailItem icon={Clock} label="Current Cycle Total Hours Used" value={customer.currentTotalHours ? `${customer.currentTotalHours.toFixed(2)} hrs` : 'N/A'} />
                )}
                {latestUsage ? (
                  <>
                    <DetailItem icon={GlassWater} label="Last Reported Daily Liters" value={getDisplayDailyLiters()} />
                    {latestUsage.dailyHoursReported !== undefined && (
                        <DetailItem icon={Hourglass} label="Last Reported Daily Hours" value={latestUsage.dailyHoursReported ? `${latestUsage.dailyHoursReported.toFixed(2)} hrs` : 'N/A'} />
                    )}
                    <DetailItem icon={CalendarDays} label="Timestamp of Last Report" value={latestUsage.timestamp} isDateTime className="md:col-span-2"/>
                  </>
                ) : (
                  <DetailItem icon={AlertCircle} label="Last Usage Report" value="No usage data reported yet." className="md:col-span-2"/>
                )}
                 <DetailItem icon={CalendarDays} label="Record Last Updated (DB)" value={customer.updatedAt} isDateTime />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><History className="mr-2 h-5 w-5"/>Recharge History</h3>
              {isLoadingRechargeHistory ? (
                <div className="text-center p-4"><Skeleton className="h-6 w-1/2 mx-auto" /><Skeleton className="h-4 w-3/4 mx-auto mt-2" /></div>
              ) : rechargeHistoryError ? (
                <p className="text-destructive">Error: {rechargeHistoryError}</p>
              ) : rechargeHistory.length === 0 ? (
                <p className="text-muted-foreground">No recharge history found for this customer.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Plan Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>New Start</TableHead>
                        <TableHead>New End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rechargeHistory.map((recharge) => (
                        <TableRow key={recharge._id}>
                          <TableCell>{format(parseISO(recharge.rechargeDate), "dd MMM yyyy")}</TableCell>
                          <TableCell>{recharge.planName}</TableCell>
                          <TableCell>{recharge.rechargeType === 'add' ? 'Added' : (recharge.rechargeType === 'replace' ? 'Replaced' : 'N/A')}</TableCell>
                          <TableCell>₹{recharge.planPrice.toFixed(2)}</TableCell>
                          <TableCell>{format(parseISO(recharge.newPlanStartDate), "dd MMM yyyy")}</TableCell>
                          <TableCell>{format(parseISO(recharge.newPlanEndDate), "dd MMM yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><Zap className="mr-2 h-5 w-5"/>Recharge Plan Now</h3>
               <div className="space-y-4 p-4 border rounded-md bg-muted/10">
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

                  {selectedPlanForDisplay && (
                    <div className="p-3 bg-primary/10 rounded-md text-sm border border-primary/30">
                      <p className="font-semibold text-primary-foreground">New Plan Details:</p>
                      <p><strong>Name:</strong> {selectedPlanForDisplay.planName}</p>
                      <p><strong>Price:</strong> ₹{selectedPlanForDisplay.price.toFixed(2)}</p>
                      <p><strong>Duration:</strong> {selectedPlanForDisplay.durationDays} days</p>
                      {selectedPlanForDisplay.dailyWaterLimitLiters !== undefined && <p><strong>Max Daily Liters:</strong> {selectedPlanForDisplay.dailyWaterLimitLiters} L/day</p>}
                      {selectedPlanForDisplay.totalLitersLimitForCycle !== undefined && <p><strong>Total Cycle Liters:</strong> {selectedPlanForDisplay.totalLitersLimitForCycle} L</p>}
                      {selectedPlanForDisplay.espCycleMaxHours !== undefined && <p><strong>Total Max Hours:</strong> {selectedPlanForDisplay.espCycleMaxHours} hours</p>}
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
              </div>
            </section>

            <section> <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><FileText className="mr-2 h-5 w-5"/>Administrative</h3> <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6"> <DetailItem icon={Receipt} label="Original Receipt Number" value={customer.receiptNumber} /> <DetailItem icon={LinkIcon} label="Drive Receipt Link" value={customer.driveUrl} isLink={!!customer.driveUrl} /> <DetailItem icon={CalendarDays} label="Registered At" value={customer.registeredAt} isDate /> <DetailItem icon={ShieldCheck} label="Terms Agreed" value={customer.termsAgreed} isBoolean /> </div> </section>

          </CardContent>
          <CardFooter className="p-6 border-t"> <Button onClick={() => router.push('/all-customers')} variant="outline"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Customers </Button> </CardFooter>
        </Card>

         <AlertDialog open={showRechargeConfirmationDialog} onOpenChange={setShowRechargeConfirmationDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <AlertTriangle className="h-6 w-6 mr-2 text-orange-500" />
                  Active Plan Detected
                </AlertDialogTitle>
                <div className="text-sm text-muted-foreground space-y-3 pt-2">
                  <div>Customer <span className="font-semibold">{customer?.customerName}</span> has an active plan:</div>
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

      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto"> © {new Date().getFullYear()} DropPurity. All rights reserved. </footer>
    </div>
  );
}

