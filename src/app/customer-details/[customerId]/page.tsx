
// src/app/customer-details/[customerId]/page.tsx

"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertCircle, User, MapPin, Phone as PhoneIcon, Mail, Home, Briefcase, Droplet,
  FileText, CalendarDays, Clock, Tag, ShieldCheck, BarChart3, Users,
  Building, Hash, CircleDollarSign, Wrench, Receipt, LogOut, ArrowLeft, LinkIcon, ExternalLink, Droplets as AppIcon
} from 'lucide-react';

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
  installationDate?: string; // Expected as ISO string from API
  installationTime?: string;
  tdsBefore?: string;
  tdsAfter?: string;
  paymentType?: string;
  securityAmount?: string; 
  planSelected?: string; // Plan ID
  planName?: string;     // Actual name of the plan
  planPrice?: number; 
  termsAgreed?: boolean;
  registeredAt?: string; // Expected as ISO string from API
  driveUrl?: string | null; 
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
  currencySymbol?: string;
  children?: React.ReactNode;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon: Icon, label, value, isLink, isDate, isBoolean, isCurrency, isTel, currencySymbol = '₹', children }) => {
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
          {Icon && <Icon className="h-4 w-4 mr-0 text-primary/80 shrink-0 invisible" /> /* Placeholder for alignment if icon is passed */}
          {value}
        </a>
      );
    } else if (isDate && typeof value === 'string') {
      try {
        displayValue = format(parseISO(value), "PPP"); // Use parseISO for ISO strings
      } catch (e) {
        try { // Fallback for non-ISO date strings like YYYY-MM-DD
            displayValue = format(new Date(value), "PPP");
        } catch (parseError) {
            displayValue = value; // Fallback to original string if all parsing fails
        }
      }
    } else if (isCurrency && typeof value === 'number') {
      displayValue = `${currencySymbol}${value.toFixed(2)}`;
    } else if (isCurrency && typeof value === 'string') {
      const numValue = parseFloat(value);
      displayValue = isNaN(numValue) ? String(value) : `${currencySymbol}${numValue.toFixed(2)}`;
    }
     else {
      displayValue = String(value);
    }
  }

  return (
    <div className="py-2 break-words">
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

  useEffect(() => {
    if (customerId) {
      const fetchCustomerDetails = async () => {
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
      };

      fetchCustomerDetails();
    } else {
      setError("No customer ID could be resolved.");
      setIsLoading(false);
    }
  }, [customerId]);

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
            <div className="flex items-center">
              <User className="h-8 w-8 text-primary mr-3" />
              <CardTitle className="text-2xl sm:text-3xl">Customer Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background to-muted/10">
        <Card className="w-full max-w-md shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive text-center">Error</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error}</p>
            <Button onClick={() => router.push('/all-customers')} className="mt-6">
              Back to All Customers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background to-muted/10">
        <Card className="w-full max-w-md shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Customer Not Found</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">The requested customer could not be found.</p>
            <Button onClick={() => router.push('/all-customers')} className="mt-6">
              Back to All Customers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const fullAddress = [
    customer.customerAddress,
    customer.landmark,
    customer.city,
    customer.stateName,
    customer.pincode,
    customer.country
  ].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted/10">
       <header className="p-4 sm:p-6 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link href="/" passHref>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center cursor-pointer">
              <AppIcon className="mr-2 h-7 w-7 sm:h-8 sm:w-8" /> DropPurity
            </h1>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/all-customers" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Customers
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <Card className="w-full max-w-3xl mx-auto shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="bg-card">
             <div className="flex items-center">
                <User className="h-8 w-8 text-primary mr-3" />
                <CardTitle className="text-2xl sm:text-3xl">{customer.customerName || 'Customer Details'}</CardTitle>
             </div>
             {customer.generatedCustomerId && <p className="text-sm text-muted-foreground pt-1">Customer ID: {customer.generatedCustomerId}</p>}
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><User className="mr-2 h-5 w-5"/>Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <DetailItem icon={User} label="Full Name" value={customer.customerName} />
                <DetailItem icon={Users} label="Father/Spouse Name" value={customer.fatherSpouseName} />
                <DetailItem icon={PhoneIcon} label="Primary Phone" value={customer.customerPhone} isTel />
                <DetailItem icon={PhoneIcon} label="Alternate Phone" value={customer.altMobileNo} isTel />
                <DetailItem icon={Mail} label="Email ID" value={customer.emailId} />
                <DetailItem icon={Hash} label="Aadhaar No." value={customer.aadhaarNo} />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><Home className="mr-2 h-5 w-5"/>Address & Location</h3>
              <div className="grid grid-cols-1">
                 <DetailItem icon={Home} label="Full Address" value={fullAddress || 'N/A'} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <DetailItem icon={MapPin} label="Map Link" value={customer.confirmedMapLink} isLink={!!customer.confirmedMapLink} />
                <DetailItem icon={Building} label="Zone" value={customer.selectedZone} />
                <DetailItem icon={BarChart3} label="Division" value={customer.selectedDivision} />
              </div>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><Wrench className="mr-2 h-5 w-5"/>Installation & Device</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <DetailItem icon={Tag} label="Model Installed" value={customer.modelInstalled} />
                <DetailItem icon={Tag} label="Serial Number" value={customer.serialNumber} />
                <DetailItem icon={CalendarDays} label="Installation Date" value={customer.installationDate} isDate />
                <DetailItem icon={Clock} label="Installation Time" value={customer.installationTime} />
                <DetailItem icon={Droplet} label="TDS Before" value={customer.tdsBefore ? `${customer.tdsBefore} ppm` : undefined} />
                <DetailItem icon={Droplet} label="TDS After" value={customer.tdsAfter ? `${customer.tdsAfter} ppm` : undefined} />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><Briefcase className="mr-2 h-5 w-5"/>Plan & Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <DetailItem icon={Tag} label="Plan Name" value={customer.planName || customer.planSelected} />
                <DetailItem icon={CircleDollarSign} label="Plan Price" value={customer.planPrice} isCurrency />
                <DetailItem icon={CircleDollarSign} label="Security Amount" value={customer.securityAmount} isCurrency />
                <DetailItem icon={Receipt} label="Payment Type" value={customer.paymentType} />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-primary flex items-center"><FileText className="mr-2 h-5 w-5"/>Administrative</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <DetailItem icon={Receipt} label="Receipt Number" value={customer.receiptNumber} />
                <DetailItem icon={LinkIcon} label="Drive Receipt" value={customer.driveUrl} isLink={!!customer.driveUrl} />
                <DetailItem icon={CalendarDays} label="Registered At" value={customer.registeredAt} isDate />
                <DetailItem icon={ShieldCheck} label="Terms Agreed" value={customer.termsAgreed} isBoolean />
              </div>
            </section>

          </CardContent>
          <CardFooter className="p-6 border-t">
            <Button onClick={() => router.push('/all-customers')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Customers
            </Button>
          </CardFooter>
        </Card>
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} DropPurity. All rights reserved.
      </footer>
    </div>
  );
}
