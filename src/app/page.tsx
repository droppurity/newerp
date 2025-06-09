
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Droplets, LogOut, UserPlus, Users, Search as SearchIcon,
  BellIcon, WrenchIcon, RotateCcwIcon, ShoppingCartIcon, PackagePlusIcon, AlertTriangleIcon, UserCog,
  Zap, 
  MapPin, Phone, ExternalLink, StickyNote, MessageCircle, CalendarClock, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, differenceInDays, parseISO, isValid as isValidDate } from 'date-fns';

const isAuthenticatedClientSide = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  }
  return false;
};

interface ServiceJobNotification {
    id: string; // Job's MongoDB _id
    customerName: string;
    mapLink: string | null;
    phone: string;
    problem: string;
    createdAt: string; // ISO string date
}

interface CustomerFromAPI {
  _id: string;
  customerName?: string;
  generatedCustomerId?: string;
  customerPhone?: string;
  planEndDate?: string | null; // ISO string for plan end date
  planName?: string; // Name of the current plan
}

interface PlanExpiryNotification {
  customerId: string;
  customerName: string;
  customerGeneratedId: string;
  customerPhone: string;
  planName: string;
  remainingDaysText: string;
  daysNumeric: number;
  planEndDate: string; // Store for sorting
}

interface RemainingDaysInfo {
  text: string;
  isUrgent: boolean;
  daysNumeric: number;
}

const calculateRemainingDays = (planEndDateString?: string | null, currentDate: Date = new Date()): RemainingDaysInfo => {
  if (!planEndDateString) return { text: 'N/A', isUrgent: false, daysNumeric: Infinity };
  const endDate = parseISO(planEndDateString);
  if (!isValidDate(endDate)) return { text: 'Invalid Date', isUrgent: false, daysNumeric: Infinity };
  
  const daysLeft = differenceInDays(endDate, currentDate);
  
  if (daysLeft < 0) return { text: 'Expired', isUrgent: true, daysNumeric: daysLeft };
  if (daysLeft === 0) return { text: 'Today', isUrgent: true, daysNumeric: 0 };
  return { text: `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, isUrgent: daysLeft < 4, daysNumeric: daysLeft };
};


export default function DropPurityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  
  const [serviceNotifications, setServiceNotifications] = useState<ServiceJobNotification[]>([]);
  const [planExpiryNotifications, setPlanExpiryNotifications] = useState<PlanExpiryNotification[]>([]);
  const [isLoadingPlanExpiries, setIsLoadingPlanExpiries] = useState(true);

  const loadServiceNotifications = useCallback(() => {
    if (typeof window !== "undefined") {
      const storedNotificationsRaw = localStorage.getItem('newServiceJobNotifications');
      if (storedNotificationsRaw) {
        try {
          const parsedNotifications: ServiceJobNotification[] = JSON.parse(storedNotificationsRaw);
          parsedNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setServiceNotifications(parsedNotifications);
        } catch (e) {
          console.error("Error parsing service notifications from localStorage", e);
          localStorage.removeItem('newServiceJobNotifications');
          setServiceNotifications([]);
        }
      } else {
        setServiceNotifications([]);
      }
    }
  }, []);

  const fetchAndProcessPlanExpiries = useCallback(async () => {
    setIsLoadingPlanExpiries(true);
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) {
        throw new Error('Failed to fetch customers for plan expiry checks.');
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.customers)) {
        const today = new Date();
        const EXPIRY_THRESHOLD_DAYS = 7; // Notify for plans expiring in 7 days or less

        const expiries = data.customers
          .map((customer: CustomerFromAPI) => {
            const remainingDaysInfo = calculateRemainingDays(customer.planEndDate, today);
            return { ...customer, remainingDaysInfo };
          })
          .filter((customer: CustomerFromAPI & { remainingDaysInfo: RemainingDaysInfo }) => 
            customer.remainingDaysInfo.daysNumeric >= 0 && customer.remainingDaysInfo.daysNumeric <= EXPIRY_THRESHOLD_DAYS
          )
          .map((customer: CustomerFromAPI & { remainingDaysInfo: RemainingDaysInfo }): PlanExpiryNotification => ({
            customerId: customer._id,
            customerName: customer.customerName || 'N/A',
            customerGeneratedId: customer.generatedCustomerId || 'N/A',
            customerPhone: customer.customerPhone || 'N/A',
            planName: customer.planName || 'Current Plan',
            remainingDaysText: customer.remainingDaysInfo.text,
            daysNumeric: customer.remainingDaysInfo.daysNumeric,
            planEndDate: customer.planEndDate || new Date().toISOString(), // Fallback for sorting
          }))
          .sort((a, b) => a.daysNumeric - b.daysNumeric); // Sort by soonest expiring

        setPlanExpiryNotifications(expiries);
      } else {
        throw new Error(data.message || 'Invalid customer data for plan expiry checks.');
      }
    } catch (error: any) {
      console.error("Error fetching plan expiry notifications:", error);
      toast({
        variant: "destructive",
        title: "Plan Expiry Check Failed",
        description: error.message || "Could not load plan expiry information.",
      });
    } finally {
      setIsLoadingPlanExpiries(false);
    }
  }, [toast]);


  useEffect(() => {
    setIsClient(true);
    loadServiceNotifications();

    const handleStorageChange = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail && customEvent.detail.key === 'newServiceJobNotifications') {
            loadServiceNotifications();
        }
    };
    
    window.addEventListener('localStorageChange', handleStorageChange);
    window.addEventListener('storage', (event) => {
      if (event.key === 'newServiceJobNotifications') {
        loadServiceNotifications();
      }
    });

    return () => {
        window.removeEventListener('localStorageChange', handleStorageChange);
        window.removeEventListener('storage', (event) => {
            if (event.key === 'newServiceJobNotifications') loadServiceNotifications();
        });
    };

  }, [loadServiceNotifications]);


  useEffect(() => {
    if (isClient) {
      if (!isAuthenticatedClientSide()) {
        router.replace('/login');
      } else {
        setIsAuthenticating(false);
        fetchAndProcessPlanExpiries(); // Fetch plan expiries after authentication
      }
    }
  }, [router, isClient, fetchAndProcessPlanExpiries]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('isAuthenticated');
      localStorage.removeItem('newServiceJobNotifications'); 
    }
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.replace('/login');
  };

  const handleSendServiceJobToWhatsApp = (notification: ServiceJobNotification) => {
    const customerPhoneNumber = notification.phone.replace(/\D/g, '');
    let message = `Hello ${notification.customerName},\n\nThis message is regarding your service request for: "${notification.problem}".\n`;
    if (notification.mapLink) {
      message += `You can view the service location here: ${notification.mapLink}\n\n`;
    }
    message += `Our team will be in touch with you shortly.\n\nThank you,\nDropPurity Support`;

    const internationalPhoneNumber = customerPhoneNumber.startsWith('91') ? customerPhoneNumber : `91${customerPhoneNumber}`;
    const whatsappBaseUrl = /Mobi|Android/i.test(navigator.userAgent) ? 'wa.me' : 'web.whatsapp.com/send';
    const whatsappUrl = `https://${whatsappBaseUrl}/?phone=${internationalPhoneNumber}&text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleSendExpiryToWhatsApp = (notification: PlanExpiryNotification) => {
    const customerPhoneNumber = notification.customerPhone.replace(/\D/g, '');
    const expiringInText = notification.daysNumeric === 0 ? "Today" : `in ${notification.remainingDaysText}`;
    let message = `Dear ${notification.customerName} (ID: ${notification.customerGeneratedId}), your plan is expiring ${expiringInText}. Recharge for uninterrupted services.`;

    const internationalPhoneNumber = customerPhoneNumber.startsWith('91') ? customerPhoneNumber : `91${customerPhoneNumber}`;
    const whatsappBaseUrl = /Mobi|Android/i.test(navigator.userAgent) ? 'wa.me' : 'web.whatsapp.com/send';
    const whatsappUrl = `https://${whatsappBaseUrl}/?phone=${internationalPhoneNumber}&text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };


  if (!isClient || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg text-muted-foreground">Loading DropPurity Dashboard...</p>
        </div>
      </div>
    );
  }

  const featureCards = [
    { href: "/new-registration", Icon: UserPlus, title: "New Registration", description: "Register a new customer." },
    { href: "/all-customers", Icon: Users, title: "Customer Database", description: "Search and manage customers." },
    { href: "/service-management", Icon: WrenchIcon, title: "Service Management", description: "Manage service requests." },
    { href: "/recharge-plan", Icon: Zap, title: "Recharge Plan", description: "Recharge or renew customer plans." },
    { href: "/sale-parts", Icon: ShoppingCartIcon, title: "Sale Parts", description: "Manage inventory and sales." },
    { href: "/purchase-parts", Icon: PackagePlusIcon, title: "Purchase Parts", description: "Track parts procurement." },
    { href: "/uninstallation-refund", Icon: RotateCcwIcon, title: "Uninstallation & Refund", description: "Process uninstallations." },
    { href: "/manage-user", Icon: UserCog, title: "Manage Users", description: "Administer user accounts." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted/10">
      <header className="p-4 sm:p-6 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
            <Droplets className="mr-2 h-7 w-7 sm:h-8 sm:w-8" /> DropPurity
          </h1>
          <Button variant="outline" onClick={handleLogout} className="font-semibold">
            <LogOut className="mr-2 h-4 w-4" /> 
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          <Card className="shadow-lg rounded-xl overflow-hidden sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <BellIcon className="mr-2 h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Recent service requests and plan expiry warnings.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Service Job Notifications */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <WrenchIcon className="mr-2 h-5 w-5 text-blue-500" /> Service Job Requests
                </h3>
                {serviceNotifications.length === 0 ? (
                  <div className="p-4 text-center border-2 border-dashed rounded-lg min-h-[80px] flex flex-col justify-center items-center">
                    <WrenchIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No new service jobs at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                    {serviceNotifications.map(notif => (
                      <div key={`service-${notif.id}`} className="p-3 border rounded-lg bg-card shadow-sm relative hover:shadow-md transition-shadow">
                        <h4 className="font-semibold text-primary-foreground mb-1">{notif.customerName}</h4>
                        <p className="text-sm text-muted-foreground mb-1">
                          <StickyNote className="inline-block mr-1.5 h-3.5 w-3.5 align-[-0.125em]" /> Problem: {notif.problem.length > 60 ? notif.problem.substring(0, 60) + "..." : notif.problem}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground items-center mt-1.5">
                          {notif.mapLink && (
                            <a href={notif.mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
                              <MapPin className="mr-1 h-3 w-3" /> Map
                              <ExternalLink className="ml-0.5 h-2.5 w-2.5" />
                            </a>
                          )}
                          <span className="flex items-center"><Phone className="mr-1 h-3 w-3" /> {notif.phone}</span>
                          <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSendServiceJobToWhatsApp(notif)}
                              className="h-auto py-0.5 px-1.5 text-xs"
                          >
                            <MessageCircle className="mr-1 h-3 w-3" /> WhatsApp
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1.5 text-right">
                          Created {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Plan Expiry Notifications */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold flex items-center">
                    <CalendarClock className="mr-2 h-5 w-5 text-orange-500" /> Plan Expiry Warnings
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchAndProcessPlanExpiries} 
                    disabled={isLoadingPlanExpiries}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    {isLoadingPlanExpiries ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                    {isLoadingPlanExpiries ? 'Refreshing...' : 'Retry'}
                  </Button>
                </div>
                {isLoadingPlanExpiries ? (
                  <div className="p-4 text-center"><Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" /> <p className="text-sm text-muted-foreground mt-1">Loading expiry warnings...</p></div>
                ) : planExpiryNotifications.length === 0 ? (
                  <div className="p-4 text-center border-2 border-dashed rounded-lg min-h-[80px] flex flex-col justify-center items-center">
                    <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No plans expiring soon.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                    {planExpiryNotifications.map(notif => (
                      <div key={`expiry-${notif.customerId}`} className={`p-3 border rounded-lg bg-card shadow-sm relative hover:shadow-md transition-shadow ${notif.daysNumeric < 4 ? 'border-destructive/50' : ''}`}>
                        <h4 className="font-semibold text-primary-foreground mb-1">{notif.customerName} <span className="text-xs text-muted-foreground">({notif.customerGeneratedId})</span></h4>
                        <p className={`text-sm mb-1 ${notif.daysNumeric < 4 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                           Plan "{notif.planName}" expiring: {notif.remainingDaysText}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground items-center mt-1.5">
                          <span className="flex items-center"><Phone className="mr-1 h-3 w-3" /> {notif.customerPhone}</span>
                           <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSendExpiryToWhatsApp(notif)}
                              className="h-auto py-0.5 px-1.5 text-xs"
                          >
                            <MessageCircle className="mr-1 h-3 w-3" /> WhatsApp Reminder
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {featureCards.map(({ href, Icon, title, description }) => (
            <Link href={href} key={href} passHref legacyBehavior>
              <a className="block transform transition-transform hover:scale-105">
                <Card className="shadow-lg rounded-xl overflow-hidden h-full flex flex-col items-center justify-center text-center p-6 hover:shadow-primary/20 transition-shadow cursor-pointer min-h-[200px] bg-card">
                  <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-3" />
                  <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
                  <CardDescription className="mt-1 text-xs sm:text-sm">{description}</CardDescription>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} DropPurity. All rights reserved.
      </footer>
    </div>
  );
}

