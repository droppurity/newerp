
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, addDays } from 'date-fns'; // Added addDays

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Droplets, LogOut, LayoutDashboard, MapPinIcon as ServiceLocationIcon, Edit3Icon, UserPlus, UserRound,
  Home, MapPin as LandmarkIcon, NotebookPen, Loader2, Globe, LocateFixed, Locate, Navigation,
  ExternalLink, Save, FileText, ShieldCheck, Building, Sparkles, Mail, PhoneCall, UserSquare2, ListPlus, PlusCircle, Edit, Trash2, RefreshCw,
  Wrench, Package, CalendarDays, ClockIcon, Droplet, Banknote, ShieldQuestion, ListChecks, ScrollText, AlertCircle,
  ReceiptIcon as ReceiptTitleIcon, MessageCircle, Download, UploadCloud, ImagePlus
} from 'lucide-react';

import CustomerLocation from '@/components/customer-location';
import CustomerSignature from '@/components/customer-signature';
import type { AlertMessage } from '@/types';
import { fetchLocationFromPincode, type LocationData } from '@/services/location-service';

const isAuthenticatedClientSide = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  }
  return false;
};

const DEFAULT_LATITUDE = 23.3441;
const DEFAULT_LONGITUDE = 85.3096;

const initialSampleZones = [
  { value: "JH09", label: "JH09", stateNameMatch: "Jharkhand" },
  { value: "JH10", label: "JH10", stateNameMatch: "Jharkhand" },
  { value: "BR01", label: "BR01", stateNameMatch: "Bihar" },
];

interface TermsAndConditionsContent {
  _id?: string;
  configKey?: string;
  title: string;
  contentBlocks: string[];
  description?: string;
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface PlanFromAPI {
  _id: string;
  planId: string;
  planName: string;
  price: number;
  durationDays: number;
  espCycleMaxHours?: number;
  dailyWaterLimitLiters?: number;
}


export default function NewRegistrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  const [customerName, setCustomerName] = useState<string>('');
  const [fatherSpouseName, setFatherSpouseName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [altMobileNo, setAltMobileNo] = useState<string>('');
  const [emailId, setEmailId] = useState<string>('');

  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);
  const [customerPhotoDataUrl, setCustomerPhotoDataUrl] = useState<string | null>(null);
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [stateName, setStateName] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [isFetchingPincodeLocation, setIsFetchingPincodeLocation] = useState<boolean>(false);
  const [pincodeLocationError, setPincodeLocationError] = useState<string | null>(null);

  const [mapLatitude, setMapLatitude] = useState<number>(DEFAULT_LATITUDE);
  const [mapLongitude, setMapLongitude] = useState<number>(DEFAULT_LONGITUDE);
  const [isFetchingGeoLocation, setIsFetchingGeoLocation] = useState<boolean>(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string>(`Map shows default location. Use "Fetch My Current Location" or enter Pincode.`);
  const [pincodeDerivedAddressQuery, setPincodeDerivedAddressQuery] = useState<string | null>(null);
  const [generatedMapLink, setGeneratedMapLink] = useState<string>('');
  const [confirmedMapLink, setConfirmedMapLink] = useState<string | null>(null);

  const [aadhaarNo, setAadhaarNo] = useState<string>('');
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<File | null>(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null);
  const [aadhaarFrontDataUrl, setAadhaarFrontDataUrl] = useState<string | null>(null);
  const [aadhaarBackDataUrl, setAadhaarBackDataUrl] = useState<string | null>(null);

  const [currentSampleZones, setCurrentSampleZones] = useState(initialSampleZones);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [filteredZones, setFilteredZones] = useState(initialSampleZones);
  const [zonePlaceholder, setZonePlaceholder] = useState<string>("Select Zone");
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [generatedCustomerId, setGeneratedCustomerId] = useState<string>('');

  const [modelInstalled, setModelInstalled] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [installationDate, setInstallationDate] = useState<Date | undefined>(new Date());
  const [installationTime, setInstallationTime] = useState<string>('10:00');
  const [tdsBefore, setTdsBefore] = useState<string>('');
  const [tdsAfter, setTdsAfter] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('Online');
  const [securityAmount, setSecurityAmount] = useState<string>('');

  const [plansList, setPlansList] = useState<PlanFromAPI[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [planFetchError, setPlanFetchError] = useState<string | null>(null);
  const [planSelected, setPlanSelected] = useState<string>(''); // Will store planId


  const [termsContent, setTermsContent] = useState<TermsAndConditionsContent | null>(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState<boolean>(true);
  const [termsFetchError, setTermsFetchError] = useState<string | null>(null);
  const [termsAgreed, setTermsAgreed] = useState<boolean>(false);

  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  const [isManageZoneDialogOpen, setIsManageZoneDialogOpen] = useState(false);
  const [newZoneNameToAdd, setNewZoneNameToAdd] = useState("");
  const [zoneToEdit, setZoneToEdit] = useState("");
  const [editedZoneLabel, setEditedZoneLabel] = useState("");

  const [lastSuccessfulRegistrationData, setLastSuccessfulRegistrationData] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const receiptContentRef = useRef<HTMLDivElement>(null);
  const [isSavingReceiptToDrive, setIsSavingReceiptToDrive] = useState<boolean>(false);
  const [receiptDriveLink, setReceiptDriveLink] = useState<string | null>(null);


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
               setPlanFetchError("No plans found. Try initializing collections: /api/initialize-collections");
            }
          } else {
            throw new Error(data.message || 'Invalid plans data format from /api/plans.');
          }
        } catch (error: any) {
          console.error("Error fetching plans:", error);
          setPlanFetchError(error.message || "Could not retrieve plans. Please try again later.");
          setPlansList([]); // Set to empty array on error
        } finally {
          setIsLoadingPlans(false);
        }
      };
      fetchPlans();
    }
  }, [isClient, isAuthenticating]);

  useEffect(() => {
    if (isClient) {
      const fetchTerms = async () => {
        setIsLoadingTerms(true);
        setTermsFetchError(null);
        try {
          const response = await fetch('/api/terms-and-conditions');
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Failed to fetch T&C: ${response.statusText}` }));
            throw new Error(errorData.message || `Failed to fetch T&C: ${response.statusText}`);
          }
          const data = await response.json();
          if (data.success && data.terms) {
            setTermsContent(data.terms);
          } else {
            setTermsFetchError(data.message || 'Terms and Conditions not found or not active.');
            setTermsContent(null);
          }
        } catch (error: any) {
          console.error("Error fetching terms and conditions:", error);
          setTermsFetchError(error.message || "Could not retrieve Terms & Conditions. Please try again later.");
          setTermsContent(null);
        } finally {
          setIsLoadingTerms(false);
        }
      };
      fetchTerms();
    }
  }, [isClient]);

  useEffect(() => {
    let link = '';
    if (mapLatitude !== DEFAULT_LATITUDE || mapLongitude !== DEFAULT_LONGITUDE) {
      link = `https://www.google.com/maps?q=${mapLatitude},${mapLongitude}`;
    } else if (pincodeDerivedAddressQuery) {
      link = `https://www.google.com/maps?q=${encodeURIComponent(pincodeDerivedAddressQuery)}`;
    } else {
      link = `https://www.google.com/maps?q=${DEFAULT_LATITUDE},${DEFAULT_LONGITUDE}`;
    }
    setGeneratedMapLink(link);
    setConfirmedMapLink(null);
  }, [mapLatitude, mapLongitude, pincodeDerivedAddressQuery]);

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

  const addAlert = useCallback((type: AlertMessage['type'], title: string, description?: string) => {
    toast({
      variant: type === 'destructive' ? 'destructive' : type === 'warning' ? 'default' : 'default',
      title: title,
      description: description,
    });
  }, [toast]);

  const handleSaveSignature = useCallback((dataUrl: string) => {
    setSavedSignature(dataUrl);
    if (dataUrl) {
      addAlert('default', 'Signature Saved', 'The customer signature has been captured.');
    } else {
       addAlert('default', 'Signature Cleared', 'The signature has been cleared.');
    }
  }, [addAlert]);

  const updateFilteredZones = useCallback((targetStateName: string | null, zonesSource = currentSampleZones) => {
    if (targetStateName) {
      const matchedStateZones = zonesSource.filter(zone =>
        zone.stateNameMatch && zone.stateNameMatch.toLowerCase() === targetStateName.toLowerCase()
      );
      setFilteredZones(matchedStateZones.length > 0 ? matchedStateZones : []);
      if (matchedStateZones.length === 0) {
        setZonePlaceholder(targetStateName ? `No zones for ${targetStateName}, select manually or add` : "Select Zone");
      } else {
        setZonePlaceholder("Select Zone");
      }
    } else {
      setFilteredZones(zonesSource);
      setZonePlaceholder("Select Zone");
    }
  }, [currentSampleZones]);

  useEffect(() => {
    updateFilteredZones(stateName, currentSampleZones);
  }, [currentSampleZones, stateName, updateFilteredZones]);

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPincode = e.target.value.replace(/\D/g, '');
    setPincode(newPincode);

    setCity('');
    setStateName('');
    setCountry('');
    setPincodeLocationError(null);
    setSelectedZone('');

    if (newPincode.length === 6) {
      const lastThreeDigits = newPincode.substring(3);
      setSelectedDivision(lastThreeDigits);
      addAlert('default', 'Division Code Set', `Division code "${lastThreeDigits}" set from Pincode.`);

      setIsFetchingPincodeLocation(true);
      const locationData: LocationData = await fetchLocationFromPincode(newPincode);
      setIsFetchingPincodeLocation(false);

      if (locationData.error) {
        setPincodeLocationError(locationData.error);
        addAlert('destructive', 'Pincode Error', locationData.error);
        updateFilteredZones(null, currentSampleZones);
        setPincodeDerivedAddressQuery(null);
        setSelectedDivision('');
        addAlert('warning', 'Division Code Cleared', 'Pincode lookup failed, Division code cleared.');

        if (mapLatitude !== DEFAULT_LATITUDE || mapLongitude !== DEFAULT_LONGITUDE) {
            setLocationStatusMessage('Map shows your fetched GPS location. Pincode lookup failed.');
        } else {
            setLocationStatusMessage('Map shows default location. Pincode lookup failed. Use "Fetch My Current Location" or check Pincode.');
        }
      } else {
        setCity(locationData.city);
        setStateName(locationData.state);
        setCountry(locationData.country);
        updateFilteredZones(locationData.state, currentSampleZones);

        const query = `${locationData.city}, ${locationData.state}, ${locationData.country}`.trim();
        setPincodeDerivedAddressQuery(query);
        setLocationStatusMessage(`Address auto-filled from Pincode. Map centered on ${locationData.city ? 'general area of ' + locationData.city : 'default location'}. For precise pin, use 'Fetch My Current Location'.`);
      }
    } else {
      updateFilteredZones(null, currentSampleZones);
      setPincodeDerivedAddressQuery(null);
      if (selectedDivision !== '') {
          setSelectedDivision('');
          addAlert('default', 'Division Code Cleared', 'Pincode incomplete, Division code cleared.');
      }
      if (mapLatitude !== DEFAULT_LATITUDE || mapLongitude !== DEFAULT_LONGITUDE) {
          setLocationStatusMessage('Map shows your fetched GPS location.');
      } else {
          setLocationStatusMessage(`Map shows default location. Use "Fetch My Current Location" or enter Pincode.`);
      }
    }
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      addAlert('destructive', 'Geolocation Error', 'Geolocation is not supported by your browser.');
      setLocationStatusMessage('Geolocation not supported. Map shows default location.');
      return;
    }
    setIsFetchingGeoLocation(true);
    setLocationStatusMessage('Fetching current location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapLatitude(position.coords.latitude);
        setMapLongitude(position.coords.longitude);
        setIsFetchingGeoLocation(false);
        setPincodeDerivedAddressQuery(null);
        setLocationStatusMessage('Current GPS location fetched. Map updated.');
        addAlert('default', 'Location Fetched', 'Your current location has been set on the map.');
      },
      (error) => {
        setIsFetchingGeoLocation(false);
        let message = 'Failed to fetch current location.';
        switch (error.code) {
          case error.PERMISSION_DENIED: message = "Permission denied for Geolocation."; break;
          case error.POSITION_UNAVAILABLE: message = "Location information is unavailable."; break;
          case error.TIMEOUT: message = "The request to get user location timed out."; break;
        }
        if (pincodeDerivedAddressQuery) {
            setLocationStatusMessage(`${message} Map shows general area from Pincode.`);
        } else {
            setLocationStatusMessage(`${message} Map shows default location.`);
        }
        addAlert('destructive', 'Geolocation Error', message);
      }
    );
  };

  const handleSaveMapLink = () => {
    if (generatedMapLink) {
      setConfirmedMapLink(generatedMapLink);
      toast({
        title: "Map Link Confirmed",
        description: "This map link will be included with the registration.",
      });
    }
  };

  const handleAadhaarFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (type === 'front') {
        setAadhaarFrontFile(file);
        const reader = new FileReader();
        reader.onloadend = () => { setAadhaarFrontDataUrl(reader.result as string); };
        reader.readAsDataURL(file);
      } else {
        setAadhaarBackFile(file);
        const reader = new FileReader();
        reader.onloadend = () => { setAadhaarBackDataUrl(reader.result as string); };
        reader.readAsDataURL(file);
      }
    } else {
      if (type === 'front') { setAadhaarFrontFile(null); setAadhaarFrontDataUrl(null); }
      else { setAadhaarBackFile(null); setAadhaarBackDataUrl(null); }
    }
  };

   const handleCustomerPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setCustomerPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setCustomerPhotoDataUrl(reader.result as string); };
      reader.readAsDataURL(file);
    } else {
      setCustomerPhotoFile(null); setCustomerPhotoDataUrl(null);
    }
  };
  const handleZoneChange = (value: string) => { setSelectedZone(value); };

  const handleGenerateCustomerId = async () => {
    if (!selectedZone || !selectedDivision || selectedDivision.length !== 3) {
      addAlert('warning', 'Zone & Division Required', 'Please select a zone and ensure Division Code (from Pincode) is valid (3 digits) to generate Customer ID.');
      return;
    }
    setIsGeneratingId(true);
    try {
      const response = await fetch(`/api/next-customer-id?zone=${selectedZone}&division=${selectedDivision}`);
      const data = await response.json();
      if (response.ok && data.success && data.sequentialNumber) {
        const newCustomerId = `${selectedZone}d${selectedDivision}${data.sequentialNumber}`;
        setGeneratedCustomerId(newCustomerId);
        addAlert('default', 'Customer ID Generated', `Generated ID: ${newCustomerId}`);
      } else {
        throw new Error(data.message || 'Failed to get next sequential number.');
      }
    } catch (error: any) {
      setGeneratedCustomerId('');
      addAlert('destructive', 'ID Generation Failed', error.message || "Could not generate customer ID.");
    } finally {
      setIsGeneratingId(false);
    }
  };

  const resetFormFieldsAndReceipt = () => {
    setCustomerName(''); setFatherSpouseName(''); setCustomerPhone(''); setAltMobileNo(''); setEmailId('');
    const customerPhotoInput = document.getElementById('customerPhotoFile') as HTMLInputElement | null;
    if (customerPhotoInput) customerPhotoInput.value = "";
    setCustomerPhotoFile(null); setCustomerPhotoDataUrl(null);
    setCustomerAddress(''); setLandmark(''); setPincode(''); setCity(''); setStateName(''); setCountry('');
    setPincodeLocationError(null); setPincodeDerivedAddressQuery(null);
    setMapLatitude(DEFAULT_LATITUDE); setMapLongitude(DEFAULT_LONGITUDE);
    setLocationStatusMessage(`Map shows default location. Use "Fetch My Current Location" or enter Pincode.`);
    setGeneratedMapLink(''); setConfirmedMapLink(null);
    setAadhaarNo('');
    const aadhaarFrontInput = document.getElementById('aadhaarFrontFile') as HTMLInputElement | null;
    if (aadhaarFrontInput) aadhaarFrontInput.value = "";
    setAadhaarFrontFile(null); setAadhaarFrontDataUrl(null);
    const aadhaarBackInput = document.getElementById('aadhaarBackFile') as HTMLInputElement | null;
    if (aadhaarBackInput) aadhaarBackInput.value = "";
    setAadhaarBackFile(null); setAadhaarBackDataUrl(null);
    setSelectedZone(''); setSelectedDivision(''); setGeneratedCustomerId('');
    updateFilteredZones(null, currentSampleZones);
    setModelInstalled(''); setSerialNumber(''); setInstallationDate(new Date()); setInstallationTime('10:00');
    setTdsBefore(''); setTdsAfter(''); setPaymentType('Online'); setSecurityAmount('');
    setPlanSelected(''); setTermsAgreed(false); setSavedSignature(null);
    if (typeof (window as any).customerSignatureClear === 'function') { (window as any).customerSignatureClear(); }
    setShowReceipt(false); setLastSuccessfulRegistrationData(null);
    setIsSubmitting(false); setIsSavingReceiptToDrive(false); setReceiptDriveLink(null);
  };

  const handleFormSubmitAttempt = async () => {
    if (!customerName.trim()) { addAlert('destructive', 'Validation Error', 'Customer Name is required.'); return; }
    if (!customerPhone.trim() || !/^\d{10}$/.test(customerPhone)) { addAlert('destructive', 'Validation Error', 'Valid 10-digit Mobile Number is required.'); return; }
    if (!customerAddress.trim()) { addAlert('destructive', 'Validation Error', 'Complete Address is required.'); return; }
    if (!pincode.trim() || pincode.length !== 6) { addAlert('destructive', 'Validation Error', 'Valid 6-digit Pincode is required.'); return; }
    if (!city || !stateName || !country) { addAlert('warning', 'Missing Location Info', 'City, State, or Country missing. Check Pincode.'); return; }
    if (!confirmedMapLink) { addAlert('destructive', 'Map Link Not Confirmed', 'Please confirm the service location map link.'); return;}
    if (!aadhaarNo.trim() || !/^\d{12}$/.test(aadhaarNo)) { addAlert('destructive', 'Validation Error', 'Valid 12-digit Aadhaar Number is required.'); return; }
    if (!selectedZone) { addAlert('destructive', 'Validation Error', 'Zone selection is required.'); return; }
    if (!selectedDivision || selectedDivision.length !== 3) { addAlert('destructive', 'Validation Error', 'Valid 3-digit Division Code is required.'); return; }
    if (!generatedCustomerId) { addAlert('destructive', 'Validation Error', 'Customer ID must be generated.'); return; }
    if (!modelInstalled) { addAlert('destructive', 'Validation Error', 'Model Installed is required.'); return; }
    if (!serialNumber.trim()) { addAlert('destructive', 'Validation Error', 'Serial Number is required.'); return; }
    if (!installationDate) { addAlert('destructive', 'Validation Error', 'Installation Date is required.'); return; }
    if (!paymentType) { addAlert('destructive', 'Validation Error', 'Payment Type is required.'); return; }
    if (!securityAmount.trim()) { addAlert('destructive', 'Validation Error', 'Security Amount is required.'); return; }
    if (!planSelected) { addAlert('destructive', 'Validation Error', 'Plan Selected is required (choose a plan ID).'); return; }
    if (!termsAgreed) { addAlert('destructive', 'Validation Error', 'You must agree to the Terms & Conditions.'); return; }
    if (!savedSignature) { addAlert('destructive', 'Validation Error', 'Customer signature is required.'); return; }

    const receiptNo = `RCPT-${Date.now() % 1000000}`;
    const selectedPlanDetails = plansList.find(p => p.planId === planSelected);

    const registrationData = {
      receiptNumber: receiptNo,
      customerName, fatherSpouseName, customerPhone, altMobileNo, emailId,
      customerAddress, landmark, pincode, city, stateName, country,
      mapLatitude: mapLatitude === DEFAULT_LATITUDE ? null : mapLatitude,
      mapLongitude: mapLongitude === DEFAULT_LONGITUDE ? null : mapLongitude,
      confirmedMapLink,
      aadhaarNo,
      aadhaarFrontDataUrl, 
      customerPhotoDataUrl, 
      aadhaarBackDataUrl,
      selectedZone, selectedDivision, generatedCustomerId,
      modelInstalled, serialNumber, installationDate: installationDate ? format(installationDate, 'yyyy-MM-dd') : null, installationTime,
      tdsBefore, tdsAfter, paymentType, securityAmount,
      planSelected: planSelected, // This is the planId
      planName: selectedPlanDetails?.planName || 'N/A',
      planPrice: selectedPlanDetails?.price || 0,
      termsAgreed,
      termsContentSnapshot: termsContent ? { title: termsContent.title, contentBlocks: termsContent.contentBlocks } : null,
      signatureDataUrl: savedSignature,
      registeredAt: new Date().toISOString(),
    };

    addAlert('default', 'Submitting Registration...', 'Please wait.');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/register-customer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registrationData),
      });
      const result = await response.json().catch(() => ({ success: false, message: 'Non-JSON response from server.' }));
      setIsSubmitting(false);
      if (response.ok && result.success) {
        addAlert('default', 'Registration Successful!', `Customer ${registrationData.customerName} registered. Receipt No: ${receiptNo}`);
        const fullReceiptData = {
            ...registrationData,
            planName: selectedPlanDetails?.planName || 'N/A',
            planPrice: selectedPlanDetails?.price || 0,
            planDurationDays: selectedPlanDetails?.durationDays || 0,
            installationDate: registrationData.installationDate,
        };
        setLastSuccessfulRegistrationData(fullReceiptData);
        setShowReceipt(true);
        handleSaveReceiptToDrive(fullReceiptData);
      } else {
        addAlert('destructive', 'Registration Failed', result.details || result.message || `Server error: ${response.status}.`);
      }
    } catch (error: any) {
      setIsSubmitting(false);
      addAlert('destructive', 'Submission Error', `Error: ${error.message}.`);
    }
  };

  const handleSaveReceiptToDrive = async (dataToSave: any) => {
    if (!dataToSave) return;
    setIsSavingReceiptToDrive(true); setReceiptDriveLink(null);
    addAlert('default', 'Saving Receipt to Drive...', 'Please wait.');
    try {
      const response = await fetch('/api/generate-and-save-receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSave),
      });
      const result = await response.json().catch(() => ({ success: false, message: 'Non-JSON response from receipt API.' }));
      if (response.ok && result.success && result.receiptUrl) {
        toast({ title: "Receipt Saved to Drive", description: `File: ${result.fileName}` });
        setReceiptDriveLink(result.receiptUrl);
      } else {
        toast({ variant: 'destructive', title: "Failed to Save Receipt to Drive", description: result.message || result.details || "Unknown error." });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Error Saving Receipt", description: `Error: ${error.message}` });
    } finally {
      setIsSavingReceiptToDrive(false);
    }
  };

  useEffect(() => {
    if (selectedZone === '' || !selectedDivision || selectedDivision.length !== 3) { setGeneratedCustomerId(''); }
  }, [selectedZone, selectedDivision]);

  useEffect(() => {
    if (zoneToEdit) {
      const zone = currentSampleZones.find(z => z.value === zoneToEdit);
      setEditedZoneLabel(zone ? zone.label : "");
    } else { setEditedZoneLabel(""); }
  }, [zoneToEdit, currentSampleZones]);

  const handleAddNewZone = () => { /* ... (keep existing logic) ... */ };
  const handleUpdateZone = () => { /* ... (keep existing logic) ... */ };
  const handleDeleteZone = () => { /* ... (keep existing logic) ... */ };
  const handlePrintReceipt = () => { /* ... (keep existing logic as it was) ... */ };


  if (!isClient || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg text-muted-foreground">Loading Registration Form...</p>
        </div>
      </div>
    );
  }

  const isFetchingAnyLocation = isFetchingPincodeLocation || isFetchingGeoLocation;
  const canGenerateId = !!selectedZone && !!selectedDivision && selectedDivision.length === 3 && !isGeneratingId;
  const isFormSubmittable = !isFetchingAnyLocation && !isSubmitting && !isLoadingTerms && !isGeneratingId && !!planSelected;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted/10">
      {/* Header */}
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
        {!showReceipt && (
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <UserPlus className="mr-3 h-6 w-6 text-primary" /> New Customer Registration
            </CardTitle>
            <CardDescription>Enter all details for new customer onboarding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-6">
            {/* Customer Details */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <UserRound className="mr-2 h-5 w-5 text-primary/80" /> Customer Details
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Full Name</Label>
                  <Input id="customerName" placeholder="Enter customer's full name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="fatherSpouseName">Father's / Spouse's Name</Label>
                  <Input id="fatherSpouseName" placeholder="Enter father's or spouse's name" value={fatherSpouseName} onChange={(e) => setFatherSpouseName(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerPhone" className="flex items-center"><PhoneCall className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Mobile Number</Label>
                    <Input id="customerPhone" type="tel" placeholder="Enter primary mobile number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0,10))} maxLength={10} />
                  </div>
                  <div>
                    <Label htmlFor="altMobileNo" className="flex items-center"><PhoneCall className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Alternate Mobile Number (Optional)</Label>
                    <Input id="altMobileNo" type="tel" placeholder="Enter alternate mobile number" value={altMobileNo} onChange={(e) => setAltMobileNo(e.target.value.replace(/\D/g, '').slice(0,10))} maxLength={10} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="emailId" className="flex items-center"><Mail className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Email ID</Label>
                  <Input id="emailId" type="email" placeholder="Enter email address" value={emailId} onChange={(e) => setEmailId(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="customerPhotoFile" className="flex items-center"><ImagePlus className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Customer Photograph (Optional)</Label>
                  <Input id="customerPhotoFile" type="file" accept="image/*" onChange={handleCustomerPhotoFileChange} />
                  {customerPhotoDataUrl && (
                    <div className="mt-2 p-2 border rounded-md w-48 h-auto">
                      <Label className="text-xs text-muted-foreground mb-1 block">Preview:</Label>
                      <Image src={customerPhotoDataUrl} alt="Customer Photograph Preview" width={180} height={180} className="rounded object-contain" data-ai-hint="customer photo"/>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Address Details */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <Home className="mr-2 h-5 w-5 text-primary/80" /> Address Details
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerAddress">Complete Address</Label>
                  <Textarea id="customerAddress" placeholder="House no, street, area" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={3}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pincode" className="flex items-center"><NotebookPen className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Pincode</Label>
                    <div className="relative">
                      <Input id="pincode" type="text" placeholder="6-digit Pincode" value={pincode} onChange={handlePincodeChange} maxLength={6}/>
                      {isFetchingPincodeLocation && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />}
                    </div>
                    {pincodeLocationError && <p className="text-xs text-destructive mt-1">{pincodeLocationError}</p>}
                  </div>
                  <div>
                    <Label htmlFor="landmark" className="flex items-center"><LandmarkIcon className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Landmark (Optional)</Label>
                    <Input id="landmark" placeholder="E.g., Near City Mall" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city" className="flex items-center"><LocateFixed className="inline-block mr-1.5 h-4 w-4 text-primary/70" />City / District</Label>
                    <Input id="city" placeholder="Auto-fetched" value={city} readOnly className="bg-muted/50"/>
                  </div>
                  <div>
                    <Label htmlFor="stateNameDisplay" className="flex items-center"><ServiceLocationIcon className="inline-block mr-1.5 h-4 w-4 text-primary/70" />State</Label>
                    <Input id="stateNameDisplay" placeholder="Auto-fetched" value={stateName} readOnly className="bg-muted/50"/>
                  </div>
                  <div>
                    <Label htmlFor="country" className="flex items-center"><Globe className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Country</Label>
                    <Input id="country" placeholder="Auto-fetched" value={country} readOnly className="bg-muted/50"/>
                  </div>
                </div>
              </div>
            </section>

            {/* Service Location Pin (Map) */}
            <section>
              <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                <h3 className="text-lg font-medium flex items-center text-foreground/90"><Navigation className="mr-2 h-5 w-5 text-primary/80" /> Service Location Pin (Map)</h3>
                <Button variant="outline" size="sm" onClick={handleFetchCurrentLocation} disabled={isFetchingGeoLocation}>
                  {isFetchingGeoLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Locate className="mr-2 h-4 w-4" />} Fetch Current Location
                </Button>
              </div>
              <CustomerLocation latitude={mapLatitude} longitude={mapLongitude} defaultLatitude={DEFAULT_LATITUDE} defaultLongitude={DEFAULT_LONGITUDE} addressQuery={pincodeDerivedAddressQuery} />
              <p className="text-xs text-muted-foreground mt-1">{locationStatusMessage}</p>
              {generatedMapLink && (
                <div className="mt-3 p-3 border rounded-md bg-muted/30">
                  <Label className="text-xs font-medium text-foreground/80 mb-1.5 block">Verify &amp; Confirm Service Location Link:</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <a href={generatedMapLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all flex items-center gap-1">
                      <ExternalLink className="h-4 w-4" /> Open Map Link
                    </a>
                    <Button size="sm" variant={confirmedMapLink === generatedMapLink ? "default" : "outline"} onClick={handleSaveMapLink} disabled={!generatedMapLink}>
                      <Save className="mr-2 h-4 w-4" /> {confirmedMapLink === generatedMapLink ? "Link Confirmed" : "Confirm Link"}
                    </Button>
                  </div>
                   {confirmedMapLink && <p className="text-xs text-green-600 mt-1">Map link confirmed.</p>}
                </div>
              )}
            </section>

            {/* Identity Verification */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <ShieldCheck className="mr-2 h-5 w-5 text-primary/80" /> Identity Verification
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="aadhaarNo">Aadhaar Number (12 digits)</Label>
                  <Input id="aadhaarNo" type="text" placeholder="Enter 12-digit Aadhaar number" value={aadhaarNo} onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, '').slice(0,12))} maxLength={12} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="aadhaarFrontFile" className="flex items-center"><ImagePlus className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Upload Aadhaar Photo (Front)</Label>
                    <Input id="aadhaarFrontFile" type="file" accept="image/*" onChange={(e) => handleAadhaarFileChange(e, 'front')} />
                    {aadhaarFrontDataUrl && (
                      <div className="mt-2 p-2 border rounded-md"><Image src={aadhaarFrontDataUrl} alt="Aadhaar Front Preview" width={200} height={120} className="rounded" data-ai-hint="ID card"/></div>
                    )}
                  </div>
                   <div>
                    <Label htmlFor="aadhaarBackFile" className="flex items-center"><ImagePlus className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Upload Aadhaar Photo (Back)</Label>
                    <Input id="aadhaarBackFile" type="file" accept="image/*" onChange={(e) => handleAadhaarFileChange(e, 'back')} />
                    {aadhaarBackDataUrl && (
                       <div className="mt-2 p-2 border rounded-md"><Image src={aadhaarBackDataUrl} alt="Aadhaar Back Preview" width={200} height={120} className="rounded" data-ai-hint="ID card"/></div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Administrative Details */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <Building className="mr-2 h-5 w-5 text-primary/80" /> Administrative Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zoneSelect">Select Zone</Label>
                  <Select value={selectedZone} onValueChange={handleZoneChange} disabled={filteredZones.length === 0 && zonePlaceholder.startsWith("No zones for")}>
                    <SelectTrigger id="zoneSelect"><SelectValue placeholder={zonePlaceholder} /></SelectTrigger>
                    <SelectContent>{filteredZones.map(zone => <SelectItem key={zone.value} value={zone.value}>{zone.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="divisionCode">Division Code</Label><Input id="divisionCode" value={selectedDivision} readOnly className="bg-muted/50" placeholder="From Pincode"/></div>
              </div>
            </section>

            {/* Customer ID Generation */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <UserSquare2 className="mr-2 h-5 w-5 text-primary/80" /> Customer ID Generation
              </h3>
              <div className="flex items-end gap-4">
                <div className="flex-grow"><Label htmlFor="generatedCustomerId">Generated Customer ID</Label><Input id="generatedCustomerId" placeholder="Click button to generate ID" value={generatedCustomerId} readOnly className="bg-muted/50" /></div>
                <Button onClick={handleGenerateCustomerId} variant="outline" disabled={!canGenerateId || isGeneratingId}>
                  {isGeneratingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {isGeneratingId ? "Generating..." : "Generate ID"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ensure Zone and Division Code are set.</p>
            </section>

             {/* Installation & Plan Details */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <Wrench className="mr-2 h-5 w-5 text-primary/80" /> Installation &amp; Plan Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor="modelInstalled" className="flex items-center"><Package className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Model Installed</Label><Input id="modelInstalled" placeholder="Enter model name" value={modelInstalled} onChange={(e) => setModelInstalled(e.target.value)}/></div>
                  <div><Label htmlFor="serialNumber" className="flex items-center"><NotebookPen className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Serial Number</Label><Input id="serialNumber" placeholder="Enter device serial number" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="installationDate" className="flex items-center"><CalendarDays className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Installation Date</Label>
                    <Popover><PopoverTrigger asChild><Button variant={"outline"} className={`w-full justify-start text-left font-normal ${!installationDate && "text-muted-foreground"}`}><CalendarDays className="mr-2 h-4 w-4" />{installationDate ? format(installationDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={installationDate} onSelect={setInstallationDate} initialFocus /></PopoverContent></Popover>
                  </div>
                  <div><Label htmlFor="installationTime" className="flex items-center"><ClockIcon className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Installation Time</Label><Input id="installationTime" type="time" value={installationTime} onChange={(e) => setInstallationTime(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor="tdsBefore" className="flex items-center"><Droplet className="inline-block mr-1.5 h-4 w-4 text-primary/70" />TDS Before</Label><Input id="tdsBefore" type="number" placeholder="Enter TDS" value={tdsBefore} onChange={(e) => setTdsBefore(e.target.value)} /></div>
                  <div><Label htmlFor="tdsAfter" className="flex items-center"><Droplet className="inline-block mr-1.5 h-4 w-4 text-primary/70" />TDS After</Label><Input id="tdsAfter" type="number" placeholder="Enter TDS" value={tdsAfter} onChange={(e) => setTdsAfter(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentType" className="flex items-center"><Banknote className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Payment Type</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}><SelectTrigger id="paymentType"><SelectValue placeholder="Select Type" /></SelectTrigger><SelectContent><SelectItem value="Online">Online</SelectItem><SelectItem value="Cash">Cash</SelectItem></SelectContent></Select>
                  </div>
                  <div><Label htmlFor="securityAmount" className="flex items-center"><ShieldQuestion className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Security Amount</Label><Input id="securityAmount" type="number" placeholder="Enter amount" value={securityAmount} onChange={(e) => setSecurityAmount(e.target.value)} /></div>
                </div>
                <div>
                  <Label htmlFor="planSelected" className="flex items-center"><ListChecks className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Plan Selected</Label>
                    <Select value={planSelected} onValueChange={setPlanSelected} disabled={isLoadingPlans || !!planFetchError || plansList.length === 0}>
                      <SelectTrigger id="planSelected">
                        <SelectValue placeholder={
                          isLoadingPlans ? "Loading plans..." : 
                          planFetchError ? "Error loading plans" :
                          plansList.length === 0 ? "No plans available" :
                          "Select Plan"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {plansList.map(plan => (
                          <SelectItem key={plan.planId} value={plan.planId}>
                            {plan.planName} - ₹{plan.price} ({plan.durationDays} days{plan.espCycleMaxHours ? `, ${plan.espCycleMaxHours}hrs` : ''})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {planFetchError && <p className="text-xs text-destructive mt-1">{planFetchError}</p>}
                </div>
              </div>
            </section>

            {/* Terms & Conditions */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <ScrollText className="mr-2 h-5 w-5 text-primary/80" /> {isLoadingTerms ? "Loading T&C..." : (termsContent?.title || "Terms & Conditions")}
              </h3>
              <div className="space-y-4">
                {isLoadingTerms ? (<div className="h-32 flex items-center justify-center p-3 border rounded-md bg-muted/30 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...</div>)
                : termsFetchError || !termsContent ? ( <Alert variant="warning" className="mt-2"><AlertCircle className="h-4 w-4" /><AlertTitle>Failed to Load T&C</AlertTitle><AlertDescription>{termsFetchError || "Content not found."} <Button variant="link" asChild className="p-0 h-auto font-medium text-primary hover:underline block mt-1"><Link href="/api/initialize-collections" target="_blank">Initialize Collections</Link></Button></AlertDescription></Alert>)
                : termsContent?.contentBlocks?.length > 0 ? (<div className="h-32 overflow-y-auto p-3 border rounded-md bg-muted/30 text-sm text-muted-foreground space-y-1">{termsContent.contentBlocks.map((block, index) => (<p key={index} className="text-xs">{block}</p>))}</div>)
                : (<div className="h-32 flex items-center justify-center p-3 border rounded-md bg-muted/30 text-muted-foreground">T&C content not available.</div>)}
                <div className="flex items-center space-x-2">
                  <Checkbox id="termsAgreed" checked={termsAgreed} onCheckedChange={(checked) => setTermsAgreed(checked as boolean)} disabled={isLoadingTerms || !!termsFetchError || !termsContent} />
                  <Label htmlFor="termsAgreed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">I agree to the Terms & Conditions.</Label>
                </div>
              </div>
            </section>

            {/* Customer Confirmation */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90"><Edit3Icon className="mr-2 h-5 w-5 text-primary/80" /> Customer Confirmation</h3>
              <CustomerSignature onSaveSignature={handleSaveSignature} />
              {savedSignature && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                  <h4 className="text-md font-semibold mb-3">Captured Signature:</h4>
                  <div className="flex justify-center items-center p-2 rounded-md border bg-background shadow-inner">
                    <Image src={savedSignature} alt="Customer Signature" width={300} height={150} className="rounded" style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }} data-ai-hint="signature drawing"/>
                  </div>
                </div>
              )}
            </section>
          </CardContent>
          <CardFooter className="p-6 border-t bg-card flex flex-col items-stretch gap-4">
            <Button onClick={handleFormSubmitAttempt} className="w-full font-semibold text-lg py-3" size="lg" disabled={!isFormSubmittable}>
              {(isSubmitting || isLoadingTerms || isGeneratingId || isFetchingAnyLocation) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isSubmitting ? "Submitting..." : (isLoadingTerms || isGeneratingId || isFetchingAnyLocation ? "Processing..." : "Confirm & Submit Registration")}
            </Button>
             <div className="w-full flex justify-end pt-2"> {/* Manage Zones Dialog (keep existing) */} </div>
          </CardFooter>
        </Card>
        )}

        {showReceipt && lastSuccessfulRegistrationData && (
          <Card className="shadow-lg rounded-xl overflow-hidden print-area" ref={receiptContentRef}>
            <CardHeader className="bg-primary/10 p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-primary flex items-center">
                            <Droplets className="mr-3 h-8 w-8" />DropPurity
                        </h1>
                        <p className="text-sm text-muted-foreground">Pure Water, Pure Life</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-semibold text-foreground/90">Registration Receipt</p>
                        <p className="text-sm text-muted-foreground">No: {lastSuccessfulRegistrationData.receiptNumber}</p>
                        <p className="text-sm text-muted-foreground">Date: {format(new Date(lastSuccessfulRegistrationData.registeredAt), "PPP")}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <section>
                    <h3 className="text-lg font-semibold mb-2 border-b pb-1 text-primary">Customer Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <p><strong>Name:</strong> {lastSuccessfulRegistrationData.customerName}</p>
                        <p><strong>Customer ID:</strong> {lastSuccessfulRegistrationData.generatedCustomerId}</p>
                        <p><strong>Phone:</strong> {lastSuccessfulRegistrationData.customerPhone}</p>
                        {lastSuccessfulRegistrationData.altMobileNo && <p><strong>Alt. Phone:</strong> {lastSuccessfulRegistrationData.altMobileNo}</p>}
                        {lastSuccessfulRegistrationData.emailId && <p><strong>Email:</strong> {lastSuccessfulRegistrationData.emailId}</p>}
                        <p className="sm:col-span-2"><strong>Address:</strong> {`${lastSuccessfulRegistrationData.customerAddress}, ${lastSuccessfulRegistrationData.landmark ? lastSuccessfulRegistrationData.landmark + ', ' : ''}${lastSuccessfulRegistrationData.city}, ${lastSuccessfulRegistrationData.stateName} - ${lastSuccessfulRegistrationData.pincode}`}</p>
                        {lastSuccessfulRegistrationData.confirmedMapLink && <p className="sm:col-span-2"><strong>Map Link:</strong> <a href={lastSuccessfulRegistrationData.confirmedMapLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Map</a></p>}
                    </div>
                </section>

                <section>
                    <h3 className="text-lg font-semibold mb-2 border-b pb-1 text-primary">Installation & Plan</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <p><strong>Model Installed:</strong> {lastSuccessfulRegistrationData.modelInstalled}</p>
                        <p><strong>Serial Number:</strong> {lastSuccessfulRegistrationData.serialNumber}</p>
                        <p><strong>Installation:</strong> {format(new Date(lastSuccessfulRegistrationData.installationDate), "PPP")} at {lastSuccessfulRegistrationData.installationTime}</p>
                        <p><strong>Plan:</strong> {lastSuccessfulRegistrationData.planName}</p>
                        <p><strong>Plan Price:</strong> ₹{Number(lastSuccessfulRegistrationData.planPrice || 0).toFixed(2)}</p>
                        <p><strong>Security Deposit:</strong> ₹{Number(lastSuccessfulRegistrationData.securityAmount).toFixed(2)}</p>
                        <p><strong>Payment Type:</strong> {lastSuccessfulRegistrationData.paymentType}</p>
                        <p className="font-semibold text-md sm:col-span-2 mt-1"><strong>Total Paid: ₹{(Number(lastSuccessfulRegistrationData.planPrice || 0) + Number(lastSuccessfulRegistrationData.securityAmount)).toFixed(2)}</strong></p>
                    </div>
                </section>
                
                {(lastSuccessfulRegistrationData.aadhaarFrontDataUrl || lastSuccessfulRegistrationData.aadhaarBackDataUrl) && (
                <section>
                    <h3 className="text-lg font-semibold mb-2 border-b pb-1 text-primary">Documents</h3>
                    <div className="flex flex-wrap gap-4">
                        {lastSuccessfulRegistrationData.aadhaarFrontDataUrl && <div className="text-sm"><p className="mb-1"><strong>Aadhaar (Front):</strong></p><Image src={lastSuccessfulRegistrationData.aadhaarFrontDataUrl} alt="Aadhaar Front" width={150} height={90} className="rounded border" data-ai-hint="ID card"/></div>}
                        {lastSuccessfulRegistrationData.aadhaarBackDataUrl && <div className="text-sm"><p className="mb-1"><strong>Aadhaar (Back):</strong></p><Image src={lastSuccessfulRegistrationData.aadhaarBackDataUrl} alt="Aadhaar Back" width={150} height={90} className="rounded border" data-ai-hint="ID card"/></div>}
                    </div>
                </section>
                )}
                
                {lastSuccessfulRegistrationData.customerPhotoDataUrl && (
                 <section>
                     <h3 className="text-lg font-semibold mb-2 border-b pb-1 text-primary">Customer Photograph</h3>
                     <Image src={lastSuccessfulRegistrationData.customerPhotoDataUrl} alt="Customer Photograph" width={150} height={150} className="rounded border" data-ai-hint="customer photo"/>
                 </section>
                )}

                {lastSuccessfulRegistrationData.signatureDataUrl && (
                  <section className="mt-6">
                    <h3 className="text-lg font-semibold mb-2 border-b pb-1 text-primary">Customer Signature</h3>
                    <div className="p-2 border rounded-md inline-block bg-white">
                        <Image src={lastSuccessfulRegistrationData.signatureDataUrl} alt="Customer Signature" width={200} height={100} className="rounded" data-ai-hint="signature drawing"/>
                    </div>
                  </section>
                )}

                {termsContent && lastSuccessfulRegistrationData.termsAgreed && (
                  <section className="mt-6 text-xs text-muted-foreground">
                    <h4 className="font-semibold text-sm text-foreground/80 mb-1">Terms & Conditions Agreed:</h4>
                    <div className="max-h-20 overflow-y-auto p-2 border rounded bg-muted/20 text-[0.65rem] leading-tight space-y-0.5">
                      {termsContent.contentBlocks.map((block, index) => (<p key={index}>{block}</p>))}
                    </div>
                  </section>
                )}
            </CardContent>
            <CardFooter className="p-6 border-t bg-muted/30 print-hidden">
                <div className="flex flex-wrap gap-3 justify-end w-full">
                    <Button variant="outline" onClick={() => resetFormFieldsAndReceipt()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Registration
                    </Button>
                    {receiptDriveLink ? (
                       <Button variant="outline" asChild>
                           <a href={receiptDriveLink} target="_blank" rel="noopener noreferrer">
                               <Download className="mr-2 h-4 w-4" /> View Receipt on Drive
                           </a>
                       </Button>
                    ) : (
                        <Button variant="outline" onClick={() => handleSaveReceiptToDrive(lastSuccessfulRegistrationData)} disabled={isSavingReceiptToDrive}>
                           {isSavingReceiptToDrive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                           {isSavingReceiptToDrive ? "Saving..." : "Save to Drive"}
                        </Button>
                    )}
                    <Button onClick={handlePrintReceipt}><MessageCircle className="mr-2 h-4 w-4" /> Print / Send Receipt</Button>
                </div>
            </CardFooter>
          </Card>
        )}
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto print-hidden">
        © {new Date().getFullYear()} DropPurity. All rights reserved.
      </footer>
    </div>
  );
}
