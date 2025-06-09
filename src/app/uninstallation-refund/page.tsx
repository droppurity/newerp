
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { Calendar as CalendarIcon, Droplets, LogOut, LayoutDashboard, RotateCcwIcon, Search, ArrowRight, Banknote, NotebookPen, Settings2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";

const isAuthenticatedClientSide = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  }
  return false;
};

const uninstallationRefundSchema = z.object({
  customerId: z.string().min(1, { message: "Customer ID is required." }),
  searchQuery: z.string().optional(), // Used for search input, not part of the final form data
  customerDetails: z.object({
    name: z.string(),
    address: z.string(),
    contact: z.string(),
    installationDate: z.string(),
    planDetails: z.string(),
    initialPayment: z.number(),
    deviceId: z.string(),
  }).optional(), // Placeholder for fetched customer data
  uninstallationDate: z.date({
    required_error: "Uninstallation date is required.",
  }),
  reasonForUninstallation: z.string().min(1, { message: "Reason for uninstallation is required." }),
  deviceCondition: z.string().min(1, { message: "Device condition is required." }),
  deductionDetails: z.string().optional(),
  deductionAmount: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0, { message: "Deduction amount must be a non-negative number." }).default(0)
  ),
  totalRefundAmount: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0, { message: "Refund amount must be a non-negative number." }).default(0)
  ),
  refundMethod: z.enum(["Bank Transfer", "Cash", "Other"], {
    required_error: "Refund method is required."
  }),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  internalNotes: z.string().optional(),
});

type UninstallationRefundFormData = z.infer<typeof uninstallationRefundSchema>;

interface CustomerDetails {
  name: string;
  address: string;
}

export default function UninstallationRefundPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  const [searchedCustomerId, setSearchedCustomerId] = useState('');
  const [customerData, setCustomerData] = useState<z.infer<typeof uninstallationRefundSchema>['customerDetails'] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<UninstallationRefundFormData>({
    resolver: zodResolver(uninstallationRefundSchema),
    defaultValues: {
      deductionAmount: 0,
    },
  });
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
    if (!searchedCustomerId) {
      toast({
        title: "Search Error",
        description: "Please enter a Customer ID to search.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setCustomerData(null); // Clear previous data
    form.reset({
      customerId: searchedCustomerId,
      deductionAmount: 0,
    }, { keepDefaultValues: true }); // Reset form but keep customerId and default deduction

    // Simulate fetching customer data based on ID
    try {
      // In a real application, you would make an API call here
      // const response = await fetch(`/api/customers/${searchedCustomerId}`);
      // if (!response.ok) {
      //   throw new Error('Customer not found');
      // }
      // const data = await response.json();

      // Mock data for demonstration
      const mockData = {
        name: 'John Doe',
        address: '123 Main St, Anytown',
        contact: '555-1234',
        installationDate: '2022-05-10',
        planDetails: 'Annual Plan - Basic',
        initialPayment: 1500.00,
        deviceId: 'DEV-XYZ-789',
      };

      setCustomerData(mockData);
      toast({ title: "Success", description: "Customer found." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to fetch customer data.", variant: "destructive" });
      setCustomerData(null);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isClient || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg text-muted-foreground">Loading Uninstallation & Refund...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/50">
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
              <RotateCcwIcon className="mr-3 h-6 w-6 text-primary" />
              Uninstallation & Refund Processing
            </CardTitle>
            <CardDescription>Manage customer device uninstallations and process refunds.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Placeholder for Uninstallation & Refund features */}
            <form onSubmit={form.handleSubmit(async (data) => {
              console.log("Form Data:", data);
              // Prepare data for API
              const apiData = {
                customerId: data.customerId,
                uninstallationDate: data.uninstallationDate.toISOString(),
                reasonForUninstallation: data.reasonForUninstallation,
                deviceCondition: data.deviceCondition,
                deductionDetails: data.deductionDetails,
                deductionAmount: data.deductionAmount,
                totalRefundAmount: data.totalRefundAmount,
                refundMethod: data.refundMethod,
                bankDetails: (data.refundMethod === 'Bank Transfer') ? {
                  bankName: data.bankName,
                  accountNumber: data.accountNumber,
                  ifscCode: data.ifscCode,
                } : undefined,
                internalNotes: data.internalNotes,
              };

              try {
                // const response = await fetch('/api/uninstallations', {
                //   method: 'POST',
                //   headers: {
                //     'Content-Type': 'application/json',
                //   },
                //   body: JSON.stringify(apiData),
                // });

                // if (!response.ok) {
                //   throw new Error('Failed to process uninstallation and refund');
                // }

                // const result = await response.json();

                // Mock success for demonstration
                toast({
                  title: "Success",
                  description: "Uninstallation and refund processed successfully.",
                });
                form.reset(); // Reset form on success
                setCustomerData(null); // Clear customer data
                setSearchedCustomerId(''); // Clear search input

              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "An error occurred while processing the request.",
                  variant: "destructive",
                });
              }

            })}>
              <div className="grid gap-6">
                {/* Customer Search */}
                <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
                  <div className="grid gap-2">
                    <Label htmlFor="customer-id-search">Customer ID</Label>
                    <Input
                      id="customer-id-search"
                      placeholder="Enter Customer ID"
                      value={searchedCustomerId}
                      onChange={(e) => setSearchedCustomerId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault(); // Prevent form submission on Enter
                          handleSearch();
                        }
                      }}
                    />
                  </div>
                  <Button type="button" onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <>
                        <RotateCcwIcon className="mr-2 h-4 w-4 animate-spin" /> Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" /> Search Customer
                      </>
                    )}
                  </Button>
                </div>

                {customerData && (
                  <>
                    {/* Display Customer and Installation Details */}
                    <Card className="border-primary/50">
                      <CardHeader>
                        <CardTitle>Customer Details</CardTitle>
                        <CardDescription>Verify the customer information and installation details.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Name:</p>
                          <p className="font-semibold">{customerData.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Address:</p>
                          <p className="font-semibold">{customerData.address}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Contact:</p>
                          <p className="font-semibold">
                            <a href={`tel:${customerData.contact}`} className="hover:underline text-primary">
                              {customerData.contact}
                            </a>
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Device ID:</p>
                          <p className="font-semibold">{customerData.deviceId}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Installation Date:</p>
                          <p className="font-semibold">{format(new Date(customerData.installationDate), 'PPP')}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Plan Details:</p>
                          <p className="font-semibold">{customerData.planDetails}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Initial Payment:</p>
                          <p className="font-semibold">₹{customerData.initialPayment.toFixed(2)}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Uninstallation Details */}
                    <h2 className="text-xl font-semibold mt-4 flex items-center"><RotateCcwIcon className="mr-2 h-5 w-5 text-orange-500" /> Uninstallation Details</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Controller
                        control={form.control}
                        name="uninstallationDate"
                        render={({ field }) => (
                          <div className="grid gap-2">
                            <Label htmlFor="uninstallationDate">Uninstallation Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {form.formState.errors.uninstallationDate && (
                              <p className="text-sm font-medium text-destructive">{form.formState.errors.uninstallationDate.message}</p>
                            )}
                          </div>
                        )}
                      />

                      <div className="grid gap-2">
                        <Label htmlFor="reasonForUninstallation">Reason for Uninstallation</Label>
                        <Textarea id="reasonForUninstallation" placeholder="Enter reason" {...form.register("reasonForUninstallation")} />
                        {form.formState.errors.reasonForUninstallation && (
                          <p className="text-sm font-medium text-destructive">{form.formState.errors.reasonForUninstallation.message}</p>
                        )}
                      </div>
                      <div className="grid gap-2 col-span-full">
                        <Label htmlFor="deviceCondition">Device Condition Upon Uninstallation</Label>
                        <Textarea id="deviceCondition" placeholder="Describe device condition (e.g., working, damaged, missing parts)" {...form.register("deviceCondition")} />
                        {form.formState.errors.deviceCondition && (
                          <p className="text-sm font-medium text-destructive">{form.formState.errors.deviceCondition.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Deductions */}
                    <h2 className="text-xl font-semibold mt-4 flex items-center"><Banknote className="mr-2 h-5 w-5 text-red-500" /> Deductions</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="deductionDetails">Deduction Details (Optional)</Label>
                        <Textarea id="deductionDetails" placeholder="e.g., Damage to device, unpaid dues" {...form.register("deductionDetails")} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="deductionAmount">Deduction Amount (₹)</Label>
                        <Input
                          id="deductionAmount"
                          type="number"
                          placeholder="0.00"
                          {...form.register("deductionAmount", { valueAsNumber: true })}
                          step="0.01"
                          min="0"
                        />
                        {form.formState.errors.deductionAmount && (
                          <p className="text-sm font-medium text-destructive">{form.formState.errors.deductionAmount.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Refund Calculation */}
                    <div className="grid gap-2 mt-4">
                      <Label htmlFor="totalRefundAmount">Total Refund Amount (₹)</Label>
                      <Input
                        id="totalRefundAmount"
                        type="number"
                        placeholder="Calculate Refund"
                        {...form.register("totalRefundAmount", { valueAsNumber: true })}
                        step="0.01"
                        min="0"
                      />
                      {form.formState.errors.totalRefundAmount && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.totalRefundAmount.message}</p>
                      )}
                      {/* Add a button or logic here to calculate refund based on initial payment, deductions, etc. */}
                    </div>

                    {/* Refund Method */}
                    <h2 className="text-xl font-semibold mt-4 flex items-center"><Banknote className="mr-2 h-5 w-5 text-green-600" /> Refund Method</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="refundMethod">Method</Label>
                        <Controller
                          control={form.control}
                          name="refundMethod"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger id="refundMethod">
                                <SelectValue placeholder="Select refund method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {form.formState.errors.refundMethod && (
                          <p className="text-sm font-medium text-destructive">{form.formState.errors.refundMethod.message}</p>
                        )}
                      </div>

                      {form.watch('refundMethod') === 'Bank Transfer' && (
                        <div className="col-span-full grid gap-4 sm:grid-cols-3">
                          <div className="grid gap-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input id="bankName" placeholder="Enter bank name" {...form.register("bankName")} />
                            {form.formState.errors.bankName && (
                              <p className="text-sm font-medium text-destructive">{form.formState.errors.bankName.message}</p>
                            )}
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input id="accountNumber" placeholder="Enter account number" {...form.register("accountNumber")} />
                            {form.formState.errors.accountNumber && (
                              <p className="text-sm font-medium text-destructive">{form.formState.errors.accountNumber.message}</p>
                            )}
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="ifscCode">IFSC Code</Label>
                            <Input id="ifscCode" placeholder="Enter IFSC code" {...form.register("ifscCode")} />
                            {form.formState.errors.ifscCode && (
                              <p className="text-sm font-medium text-destructive">{form.formState.errors.ifscCode.message}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Internal Notes */}
                    <h2 className="text-xl font-semibold mt-4 flex items-center"><NotebookPen className="mr-2 h-5 w-5 text-blue-500" /> Internal Notes</h2>
                    <div className="grid gap-2">
                      <Label htmlFor="internalNotes">Internal Notes (Optional)</Label>
                      <Textarea id="internalNotes" placeholder="Add any relevant notes" {...form.register("internalNotes")} />
                      {form.formState.errors.internalNotes && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.internalNotes.message}</p>
                      )}
                    </div>

                    {/* Submit Button with Confirmation */}
                    <div className="mt-6">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? (
                              <>
                                <RotateCcwIcon className="mr-2 h-4 w-4 animate-spin" /> Processing...
                              </>
                            ) : (
                              <>
                                <ArrowRight className="mr-2 h-4 w-4" /> Process Uninstallation & Refund
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Uninstallation & Refund</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to proceed with the uninstallation and refund process for Customer ID: <strong>{searchedCustomerId}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => form.handleSubmit(async (data) => {
                               console.log("Form Data:", data);
                               // Prepare data for API
                               const apiData = {
                                 customerId: data.customerId,
                                 uninstallationDate: data.uninstallationDate.toISOString(),
                                 reasonForUninstallation: data.reasonForUninstallation,
                                 deviceCondition: data.deviceCondition,
                                 deductionDetails: data.deductionDetails,
                                 deductionAmount: data.deductionAmount,
                                 totalRefundAmount: data.totalRefundAmount,
                                 refundMethod: data.refundMethod,
                                 bankDetails: (data.refundMethod === 'Bank Transfer') ? {
                                   bankName: data.bankName,
                                   accountNumber: data.accountNumber,
                                   ifscCode: data.ifscCode,
                                 } : undefined,
                                 internalNotes: data.internalNotes,
                               };

                               try {
                                 // const response = await fetch('/api/uninstallations', {
                                 //   method: 'POST',
                                 //   headers: {
                                 //     'Content-Type': 'application/json',
                                 //   },
                                 //   body: JSON.stringify(apiData),
                                 // });

                                 // if (!response.ok) {
                                 //   throw new Error('Failed to process uninstallation and refund');
                                 // }

                                 // const result = await response.json();

                                 // Mock success for demonstration
                                 toast({
                                   title: "Success",
                                   description: "Uninstallation and refund processed successfully.",
                                 });
                                 form.reset(); // Reset form on success
                                 setCustomerData(null); // Clear customer data
                                 setSearchedCustomerId(''); // Clear search input

                               } catch (error: any) {
                                 toast({
                                   title: "Error",
                                   description: error.message || "An error occurred while processing the request.",
                                   variant: "destructive",
                                 });
                               }

                             })}>Confirm</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}

                {!customerData && !isSearching && (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg min-h-[300px] flex flex-col justify-center items-center bg-muted/20">
                    <Search className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
                    <h3 className="text-xl font-semibold text-muted-foreground mb-2">Search for a Customer</h3>
                    <p className="text-muted-foreground max-w-md">
                      Enter a Customer ID in the search bar above to retrieve their details and proceed with the uninstallation and refund process.
                    </p>
                  </div>
                )}

              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} DropPurity. All rights reserved.
      </footer>
    </div>
  );
}
