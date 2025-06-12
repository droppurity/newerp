
// src/app/customer-details/[customerId]/page.tsx

"use client";

import React, { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, isValid as isValidDate, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertCircle, User, MapPin, Phone as PhoneIcon, Mail, Home, Briefcase, Droplet,
  FileText, CalendarDays, Clock, Tag, ShieldCheck, BarChart3, Users,
  Building, Hash, CircleDollarSign, Wrench, Receipt, LogOut, ArrowLeft, LinkIcon, ExternalLink, Droplets as AppIcon,
  RotateCcwIcon, History, Wifi, Activity, Hourglass, ListRestart
} from 'lucide-react';

interface LastUsageEntry {
  timestamp: string; // ISO String
  dailyHoursReported: number;
  totalHoursReported: number;
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
  espCycleMaxHours?: number;
  espCycleMaxDays?: number;
  lastRechargeDate?: string; 
  rechargeCount?: number;   

  termsAgreed?: boolean;
  registeredAt?: string; 
  driveUrl?: string | null; 

  // Fields for Device Sync Status
  lastContact?: string | null; // ISO String
  currentTotalHours?: number;
  lastUsage?: LastUsageEntry[] | null; 
  updatedAt?: string; // ISO String, general record update time
}

interface RechargeHistoryItem {
  _id: string;
  customerId: string;
  customerGeneratedId?: string;
  planId: string;
  planName: string;
  planPrice: number;
  planDurationDays: number;
  paymentMethod: string;
  rechargeDate: string; // ISO String
  rechargeType?: 'replace' | 'add';
  newPlanStartDate: string; // ISO String
  newPlanEndDate: string; // ISO String
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
        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 break-all">
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
         displayValue = value; // Fallback to original string if parsing fails
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


export default function CustomerDetailsPage({ params: paramsPromise }: { params: Promise<{ customerId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(paramsPromise);
  const customerId = resolvedParams.customerId;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistoryItem[]>([]);
  const [isLoadingRechargeHistory, setIsLoadingRechargeHistory] = useState(true);
  const [rechargeHistoryError, setRechargeHistoryError] = useState<string | null>(null);


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

  useEffect(() => {
    fetchCustomerDetails();
    fetchRechargeHistory();
  }, [fetchCustomerDetails, fetchRechargeHistory]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('isAuthenticated');
    }
    router.replace('/login');
  };

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
    return ( <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background to-muted/10"> <Card className="w-full max-w-md shadow-xl rounded-xl"> <CardHeader><CardTitle className="text-2xl text-center">Customer Not Found</CardTitle></CardHeader> <CardContent className="p-6 text-center"> <p className="text-muted-foreground">The requested customer could not be found.</p> <Button onClick={() => router.push('/all-customers')} className="mt-6"> Back to All Customers </Button> </CardContent> </Card> </div> );
  }
  
  const fullAddress = [ customer.customerAddress, customer.landmark, customer.city, customer.stateName, customer.pincode, customer.country ].filter(Boolean).join(', ');
  const latestUsage = customer.lastUsage && customer.lastUsage.length > 0 ? customer.lastUsage[customer.lastUsage.length - 1] : null;

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
          <CardContent className="p-6 space-y-8"> {/* Increased spacing */}
            
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
                <DetailItem icon={Hourglass} label="Plan ESP Max Hours" value={customer.espCycleMaxHours ? `${customer.espCycleMaxHours} hrs` : 'N/A'} />
                <DetailItem icon={Droplet} label="Plan ESP Max Days" value={customer.espCycleMaxDays ? `${customer.espCycleMaxDays} days` : 'N/A'} />
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
                <DetailItem icon={Clock} label="Current Cycle Total Hours" value={customer.currentTotalHours ? `${customer.currentTotalHours.toFixed(2)} hrs` : 'N/A'} />
                {latestUsage ? (
                  <>
                    <DetailItem icon={Hourglass} label="Last Reported Daily Hours" value={latestUsage.dailyHoursReported ? `${latestUsage.dailyHoursReported.toFixed(2)} hrs` : 'N/A'} />
                    <DetailItem icon={Hourglass} label="Last Reported Total Hours (Cycle)" value={latestUsage.totalHoursReported ? `${latestUsage.totalHoursReported.toFixed(2)} hrs` : 'N/A'} />
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
                          <TableCell>{recharge.rechargeType === 'add' ? 'Added' : 'Replaced'}</TableCell>
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

            <section> <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><FileText className="mr-2 h-5 w-5"/>Administrative</h3> <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6"> <DetailItem icon={Receipt} label="Original Receipt Number" value={customer.receiptNumber} /> <DetailItem icon={LinkIcon} label="Drive Receipt Link" value={customer.driveUrl} isLink={!!customer.driveUrl} /> <DetailItem icon={CalendarDays} label="Registered At" value={customer.registeredAt} isDate /> <DetailItem icon={ShieldCheck} label="Terms Agreed" value={customer.termsAgreed} isBoolean /> </div> </section>

          </CardContent>
          <CardFooter className="p-6 border-t"> <Button onClick={() => router.push('/all-customers')} variant="outline"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Customers </Button> </CardFooter>
        </Card>
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto"> © {new Date().getFullYear()} DropPurity. All rights reserved. </footer>
    </div>
  );
}

