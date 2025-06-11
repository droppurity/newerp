
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

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

const DEFAULT_LATITUDE = 23.3441; // Ranchi Latitude
const DEFAULT_LONGITUDE = 85.3096; // Ranchi Longitude

const initialSampleZones = [
  { value: "JH09", label: "JH09", stateNameMatch: "Jharkhand" },
  { value: "JH10", label: "JH10", stateNameMatch: "Jharkhand" },
  { value: "JH11", label: "JH11", stateNameMatch: "Jharkhand" },
  { value: "BR01", label: "BR01", stateNameMatch: "Bihar" },
  { value: "UP70", label: "UP70", stateNameMatch: "Uttar Pradesh" },
  { value: "DL03", label: "DL03", stateNameMatch: "Delhi" },
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

export default function NewRegistrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  // Customer details state - PREFILLED
  const [customerName, setCustomerName] = useState<string>('Test Customer');
  const [fatherSpouseName, setFatherSpouseName] = useState<string>('Test Father');
  const [customerPhone, setCustomerPhone] = useState<string>('1234567890');
  const [altMobileNo, setAltMobileNo] = useState<string>('0987654321');
  const [emailId, setEmailId] = useState<string>('test@example.com');

  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);
  const [customerPhotoDataUrl, setCustomerPhotoDataUrl] = useState<string | null>(null);
  // Address details state - PREFILLED
  const [customerAddress, setCustomerAddress] = useState<string>('123 Test Street, Test Area');
  const [landmark, setLandmark] = useState<string>('Near Test Park');
  const [pincode, setPincode] = useState<string>('834001'); // Example Pincode for Ranchi, Jharkhand
  const [city, setCity] = useState<string>('');
  const [stateName, setStateName] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [isFetchingPincodeLocation, setIsFetchingPincodeLocation] = useState<boolean>(false);
  const [pincodeLocationError, setPincodeLocationError] = useState<string | null>(null);

  // Geolocation state
  const [mapLatitude, setMapLatitude] = useState<number>(DEFAULT_LATITUDE);
  const [mapLongitude, setMapLongitude] = useState<number>(DEFAULT_LONGITUDE);
  const [isFetchingGeoLocation, setIsFetchingGeoLocation] = useState<boolean>(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string>(`Map shows default location (Ranchi). Click "Fetch My Current Location" for accuracy or enter Pincode.`);
  const [pincodeDerivedAddressQuery, setPincodeDerivedAddressQuery] = useState<string | null>(null);
  const [generatedMapLink, setGeneratedMapLink] = useState<string>('');
  const [confirmedMapLink, setConfirmedMapLink] = useState<string | null>(null);

  // Identity Verification - PREFILLED
  const [aadhaarNo, setAadhaarNo] = useState<string>('123456789012');
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<File | null>(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null);
  const [aadhaarFrontDataUrl, setAadhaarFrontDataUrl] = useState<string | null>(null);
  const [aadhaarBackDataUrl, setAadhaarBackDataUrl] = useState<string | null>(null);

  // Administrative Details
  const [currentSampleZones, setCurrentSampleZones] = useState(initialSampleZones);
  const [selectedZone, setSelectedZone] = useState<string>('JH09');
  const [filteredZones, setFilteredZones] = useState(initialSampleZones);
  const [zonePlaceholder, setZonePlaceholder] = useState<string>("Select Zone");
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [generatedCustomerId, setGeneratedCustomerId] = useState<string>('');

  // Installation & Plan Details - PREFILLED
  const [modelInstalled, setModelInstalled] = useState<string>('Alpha');
  const [serialNumber, setSerialNumber] = useState<string>('SN12345ALPHA');
  const [installationDate, setInstallationDate] = useState<Date | undefined>(new Date());
  const [installationTime, setInstallationTime] = useState<string>('10:00');
  const [tdsBefore, setTdsBefore] = useState<string>('350');
  const [tdsAfter, setTdsAfter] = useState<string>('50');
  const [paymentType, setPaymentType] = useState<string>('Online');
  const [securityAmount, setSecurityAmount] = useState<string>('1500');

  // Plan Selected State
  const [planSelected, setPlanSelected] = useState<string>('Basic'); // Default to Basic

  // Terms & Conditions
  const [termsContent, setTermsContent] = useState<TermsAndConditionsContent | null>(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState<boolean>(true);
  const [termsFetchError, setTermsFetchError] = useState<string | null>(null);
  const [termsAgreed, setTermsAgreed] = useState<boolean>(true);

  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  // Manage Zones Dialog State
  const [isManageZoneDialogOpen, setIsManageZoneDialogOpen] = useState(false);
  const [newZoneNameToAdd, setNewZoneNameToAdd] = useState("");
  const [zoneToEdit, setZoneToEdit] = useState("");
  const [editedZoneLabel, setEditedZoneLabel] = useState("");

  // Receipt State
  const [lastSuccessfulRegistrationData, setLastSuccessfulRegistrationData] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const receiptContentRef = useRef<HTMLDivElement>(null);
  const [isSavingReceiptToDrive, setIsSavingReceiptToDrive] = useState<boolean>(false);
  const [receiptDriveLink, setReceiptDriveLink] = useState<string | null>(null);


  useEffect(() => {
    setIsClient(true);
  }, []);


  // Fetch Terms and Conditions
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
    if (isClient) {
      if (!isAuthenticatedClientSide()) {
        router.replace('/login');
      } else {
        setIsAuthenticating(false);
        if (pincode.length === 6) {
          handlePincodeChange({ target: { value: pincode } } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, isClient]);


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
          setLocationStatusMessage(`Map shows default location (Ranchi). Use "Fetch My Current Location" or enter Pincode.`);
      }
    }
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      addAlert('destructive', 'Geolocation Error', 'Geolocation is not supported by your browser.');
      setLocationStatusMessage('Geolocation not supported. Map shows default location (Ranchi).');
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
            setLocationStatusMessage(`${message} Map shows default location (Ranchi).`);
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
        reader.onloadend = () => {
          setAadhaarFrontDataUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        addAlert('default', 'Aadhaar Front Selected', `Selected file: ${file.name}`);
      } else {
        setAadhaarBackFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAadhaarBackDataUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        addAlert('default', 'Aadhaar Back Selected', `Selected file: ${file.name}`);
      }
    } else {
      if (type === 'front') {
        setAadhaarFrontFile(null);
        setAadhaarFrontDataUrl(null);
      } else {
        setAadhaarBackFile(null);
        setAadhaarBackDataUrl(null);
      }
    }
  };

   const handleCustomerPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setCustomerPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomerPhotoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCustomerPhotoFile(null);
      setCustomerPhotoDataUrl(null);
    }
  };
  const handleZoneChange = (value: string) => {
    setSelectedZone(value);
  };

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
        throw new Error(data.message || 'Failed to get next sequential number from API.');
      }
    } catch (error: any) {
      console.error("Error generating customer ID:", error);
      setGeneratedCustomerId('');
      addAlert('destructive', 'ID Generation Failed', error.message || "Could not generate customer ID. Please try again.");
    } finally {
      setIsGeneratingId(false);
    }
  };

  const resetFormFieldsAndReceipt = () => {
    setCustomerName('Test Customer');
    setFatherSpouseName('Test Father');
    setCustomerPhone('1234567890');
    setAltMobileNo('0987654321');
    setEmailId('test@example.com');
    const customerPhotoInput = document.getElementById('customerPhotoFile') as HTMLInputElement | null;
    if (customerPhotoInput) customerPhotoInput.value = "";
    setCustomerPhotoFile(null);
    setCustomerPhotoDataUrl(null);
    setCustomerAddress('123 Test Street, Test Area');
    setLandmark('Near Test Park');
    setPincode('834001');
    setCity('');
    setStateName('');
    setCountry('');
    setPincodeLocationError(null);
    setPincodeDerivedAddressQuery(null);
    setMapLatitude(DEFAULT_LATITUDE);
    setMapLongitude(DEFAULT_LONGITUDE);
    setLocationStatusMessage(`Map shows default location (Ranchi). Use "Fetch My Current Location" or enter Pincode.`);
    setGeneratedMapLink('');
    setConfirmedMapLink(null);

    setAadhaarNo('123456789012');
    const aadhaarFrontInput = document.getElementById('aadhaarFrontFile') as HTMLInputElement | null;
    if (aadhaarFrontInput) aadhaarFrontInput.value = "";
    setAadhaarFrontFile(null);
    setAadhaarFrontDataUrl(null);
    const aadhaarBackInput = document.getElementById('aadhaarBackFile') as HTMLInputElement | null;
    if (aadhaarBackInput) aadhaarBackInput.value = "";
    setAadhaarBackFile(null);
    setAadhaarBackDataUrl(null);

    setSelectedZone('JH09');
    setSelectedDivision(''); // Will be set by pincode change
    if (pincode.length === 6) { // Re-trigger pincode logic if it was prefilled
        handlePincodeChange({ target: { value: pincode } } as React.ChangeEvent<HTMLInputElement>);
    }
    setGeneratedCustomerId('');
    updateFilteredZones(null, currentSampleZones);

    setModelInstalled('Alpha');
    setSerialNumber('SN12345ALPHA');
    setInstallationDate(new Date());
    setInstallationTime('10:00');
    setTdsBefore('350');
    setTdsAfter('50');
    setPaymentType('Online');
    setSecurityAmount('1500');

    setPlanSelected('Basic'); // Default to Basic

    setTermsAgreed(true);
    setSavedSignature(null);

    if (typeof (window as any).customerSignatureClear === 'function') {
      (window as any).customerSignatureClear();
    }

    setShowReceipt(false);
    setLastSuccessfulRegistrationData(null);
    setIsSubmitting(false);
    setIsSavingReceiptToDrive(false);
    setReceiptDriveLink(null);
  };

  const handleFormSubmitAttempt = async () => {
    // Validation checks
    if (!customerName.trim()) { addAlert('destructive', 'Validation Error', 'Customer Name is required.'); return; }
    if (!fatherSpouseName.trim()) { addAlert('destructive', 'Validation Error', "Father's/Spouse's Name is required."); return; }
    if (!customerPhone.trim() || !/^\d{10}$/.test(customerPhone)) { addAlert('destructive', 'Validation Error', 'Valid 10-digit Mobile Number is required.'); return; }
    if (altMobileNo.trim() && !/^\d{10}$/.test(altMobileNo)) { addAlert('destructive', 'Validation Error', 'Valid 10-digit Alternate Mobile Number is required if provided.'); return; }
    if (!emailId.trim() || !/\S+@\S+\.\S+/.test(emailId)) { addAlert('destructive', 'Validation Error', 'Valid Email ID is required.'); return; }
    if (!customerAddress.trim()) { addAlert('destructive', 'Validation Error', 'Complete Address is required.'); return; }
    if (!pincode.trim() || pincode.length !== 6) { addAlert('destructive', 'Validation Error', 'Valid 6-digit Pincode is required.'); return; }
    if (pincodeLocationError) { addAlert('destructive', 'Validation Error', 'Please resolve the Pincode error.'); return; }
    if (!city || !stateName || !country) { addAlert('warning', 'Missing Location Info', 'City, State, or Country could not be auto-fetched. Please check Pincode and ensure it is valid.'); return; }
    if (!confirmedMapLink) { addAlert('destructive', 'Map Link Not Confirmed', 'Please review and confirm the service location map link.'); return;}
    if (!aadhaarNo.trim() || !/^\d{12}$/.test(aadhaarNo)) { addAlert('destructive', 'Validation Error', 'Valid 12-digit Aadhaar Number is required.'); return; }

    if (!selectedZone) { addAlert('destructive', 'Validation Error', 'Zone selection is required.'); return; }
    if (!selectedDivision || selectedDivision.length !== 3) { addAlert('destructive', 'Validation Error', 'Valid 3-digit Division Code (from Pincode) is required.'); return; }
    if (!generatedCustomerId) { addAlert('destructive', 'Validation Error', 'Customer ID must be generated.'); return; }

    if (!modelInstalled) { addAlert('destructive', 'Validation Error', 'Model Installed is required.'); return; }
    if (!serialNumber.trim()) { addAlert('destructive', 'Validation Error', 'Serial Number is required.'); return; }
    if (!installationDate) { addAlert('destructive', 'Validation Error', 'Installation Date is required.'); return; }
    if (!installationTime.trim()) { addAlert('destructive', 'Validation Error', 'Installation Time is required.'); return; }
    if (!tdsBefore.trim()) { addAlert('destructive', 'Validation Error', 'TDS Before is required.'); return; }
    if (!tdsAfter.trim()) { addAlert('destructive', 'Validation Error', 'TDS After is required.'); return; }
    if (!paymentType) { addAlert('destructive', 'Validation Error', 'Payment Type is required.'); return; }
    if (!securityAmount.trim()) { addAlert('destructive', 'Validation Error', 'Security Amount is required.'); return; }
    if (!planSelected) { addAlert('destructive', 'Validation Error', 'Plan Selected is required.'); return; }

    if (!termsAgreed) { addAlert('destructive', 'Validation Error', 'You must agree to the Terms & Conditions.'); return; }
    if (!savedSignature) { addAlert('destructive', 'Validation Error', 'Customer signature is required.'); return; }

    const receiptNo = `RCPT-${Date.now() % 1000000}`;

    const registrationData = {
      receiptNumber: receiptNo,
      customerName, fatherSpouseName, customerPhone, altMobileNo, emailId,
      customerAddress, landmark, pincode, city, stateName, country,
      mapLatitude: mapLatitude === DEFAULT_LATITUDE ? null : mapLatitude,
      mapLongitude: mapLongitude === DEFAULT_LONGITUDE ? null : mapLongitude,
      confirmedMapLink,
      aadhaarNo,
      aadhaarFrontPhotoDataUrl: aadhaarFrontDataUrl,
      customerPhotoDataUrl: customerPhotoDataUrl,
      aadhaarBackPhotoDataUrl: aadhaarBackDataUrl,
      selectedZone, selectedDivision, generatedCustomerId,
      modelInstalled, serialNumber, installationDate: installationDate ? format(installationDate, 'yyyy-MM-dd') : null, installationTime,
      tdsBefore, tdsAfter, paymentType, securityAmount,
      planSelected, // This will be "Basic" or "Commercial"
      planName: planSelected, // Use the selected value as the name
      planPrice: 0, // Set price to 0 for static plans
      termsAgreed,
      termsContentSnapshot: termsContent ? { title: termsContent.title, contentBlocks: termsContent.contentBlocks } : null,
      signatureDataUrl: savedSignature,
      registeredAt: new Date().toISOString(),
    };

    console.log("Form data to submit to /api/register-customer:", Object.keys(registrationData));
    addAlert('default', 'Submitting Registration...', 'Please wait.');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/register-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json().catch(() => ({
        success: false,
        message: 'Received non-JSON response from server.',
        details: response.statusText
      }));

      setIsSubmitting(false);

      if (response.ok && result.success) {
        addAlert('default', 'Registration Successful!', `Customer ${registrationData.customerName} registered with ID: ${registrationData.generatedCustomerId}. Receipt No: ${receiptNo}`);
        setLastSuccessfulRegistrationData(registrationData);
        setShowReceipt(true);
        handleSaveReceiptToDrive(registrationData);
      } else {
        addAlert('destructive', 'Registration Failed', result.details || result.message || `Server responded with status: ${response.status}.`);
        console.error("Submission error response from API route:", result);
      }
    } catch (error: any) {
      setIsSubmitting(false);
      addAlert('destructive', 'Submission Error', `An error occurred: ${error.message}. Please check the console and ensure the backend API route is working.`);
      console.error("Submission fetch error to API route:", error);
    }
  };

  const handleSaveReceiptToDrive = async (dataToSave: any) => {
    if (!dataToSave) {
      addAlert('warning', 'No Data to Save', 'No registration data available to save receipt.');
      return;
    }
    setIsSavingReceiptToDrive(true);
    setReceiptDriveLink(null);
    addAlert('default', 'Saving Receipt to Drive...', 'Please wait.');

    try {
      const response = await fetch('/api/generate-and-save-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      const result = await response.json().catch(() => ({
        success: false,
        message: 'Non-JSON response from receipt saving API.',
        details: `Status: ${response.status}`
      }));

      if (response.ok && result.success && result.receiptUrl) {
        toast({
          title: "Receipt Saved to Drive",
          description: (
            <div>
              <p>File: {result.fileName}</p>
              <p className="text-xs text-muted-foreground">
                The PDF saved to Drive should be a professionally formatted receipt.
                The link provided is to the actual file on Google Drive.
              </p>
            </div>
          ),
          duration: 15000,
        });
        toast({
           title: "Registration Complete",
           description: "Customer registered successfully and receipt generated.",
           duration: 5000,
           variant: "success",
        });

        setReceiptDriveLink(result.receiptUrl);
      } else {
        toast({
          variant: 'destructive',
          title: "Failed to Save Receipt to Drive",
          description: result.message || result.details || "Unknown error from receipt saving API. Check server logs.",
        });
        console.error("Error from /api/generate-and-save-receipt:", JSON.stringify(result))
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error Saving Receipt",
        description: `An error occurred: ${error.message}`,
      });
    } finally {
      setIsSavingReceiptToDrive(false);
    }
  };

  useEffect(() => {
    if (selectedZone === '' || !selectedDivision || selectedDivision.length !== 3) {
        setGeneratedCustomerId('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZone, selectedDivision, setGeneratedCustomerId]);

  useEffect(() => {
    if (zoneToEdit) {
      const zone = currentSampleZones.find(z => z.value === zoneToEdit);
      setEditedZoneLabel(zone ? zone.label : "");
    } else {
      setEditedZoneLabel("");
    }
  }, [zoneToEdit, currentSampleZones]);

  const handleAddNewZone = () => {
    const newZoneValue = newZoneNameToAdd.trim().toUpperCase();
    if (newZoneValue === "") {
      toast({ title: "Error", description: "New zone name cannot be empty.", variant: "destructive"});
      return;
    }
    const zoneExists = currentSampleZones.some(zone => zone.value.toUpperCase() === newZoneValue || zone.label.toUpperCase() === newZoneValue);
    if (zoneExists) {
      toast({ title: "Error", description: `Zone "${newZoneValue}" already exists.`, variant: "destructive"});
      return;
    }
    const newZone = { value: newZoneValue, label: newZoneValue, stateNameMatch: "" };
    setCurrentSampleZones(prevZones => [...prevZones, newZone]);
    toast({ title: "Zone Added", description: `Zone "${newZoneValue}" has been added.` });
    setNewZoneNameToAdd("");
  };

  const handleUpdateZone = () => {
    const newLabel = editedZoneLabel.trim().toUpperCase();
    if (!zoneToEdit) {
      toast({ title: "Error", description: "No zone selected to update.", variant: "destructive"});
      return;
    }
    if (newLabel === "") {
      toast({ title: "Error", description: "New zone label cannot be empty.", variant: "destructive"});
      return;
    }
    const originalZone = currentSampleZones.find(z => z.value === zoneToEdit);
    if (!originalZone) {
        toast({ title: "Error", description: "Original zone not found.", variant: "destructive"});
        return;
    }

    const valueExists = currentSampleZones.some(zone => zone.value.toUpperCase() === newLabel && zone.value !== zoneToEdit);
    if (valueExists) {
      toast({ title: "Error", description: `Zone code/value "${newLabel}" already exists.`, variant: "destructive"});
      return;
    }

    setCurrentSampleZones(prevZones =>
      prevZones.map(zone =>
        zone.value === zoneToEdit ? { ...zone, value: newLabel, label: newLabel } : zone
      )
    );

    if (selectedZone === zoneToEdit) {
      setSelectedZone(newLabel);
    }

    toast({ title: "Zone Updated", description: `Zone "${originalZone.label}" updated to "${newLabel}".` });
    setZoneToEdit("");
    setEditedZoneLabel("");
  };

  const handleDeleteZone = () => {
    if (!zoneToEdit) {
      toast({ title: "Error", description: "No zone selected to delete.", variant: "destructive"});
      return;
    }
    const zoneLabelToDelete = currentSampleZones.find(z => z.value === zoneToEdit)?.label || zoneToEdit;
    setCurrentSampleZones(prevZones => prevZones.filter(zone => zone.value !== zoneToEdit));

    if (selectedZone === zoneToEdit) {
      setSelectedZone('');
    }

    toast({ title: "Zone Deleted", description: `Zone "${zoneLabelToDelete}" has been deleted.` });
    setZoneToEdit("");
    setEditedZoneLabel("");
  };

  const handlePrintReceipt = () => {
    const printContent = receiptContentRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Print Receipt</title>');

        const styles =
          '<style>' +
            "body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; color: #333; font-size: 12px; line-height: 1.6; }" +
            '.receipt-container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); background-color: #fff; }' +
            '.receipt-header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #ddd; }' +
            '.receipt-header .company-logo { margin-right: 10px; height: 40px; width: 40px; display: inline-block; vertical-align: middle; }' +
            '.receipt-header .company-name { font-size: 28px; font-weight: bold; color: hsl(var(--primary)); display: inline-block; vertical-align: middle; }' +
            ".receipt-header .company-tagline { font-size: 12px; color: #777; margin-top: 2px; }" +
            ".receipt-header .receipt-title { font-size: 22px; font-weight: 600; color: #333; margin-top: 15px; text-transform: uppercase; letter-spacing: 1px;}" +
            '.receipt-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; padding-bottom:15px; border-bottom: 1px solid #eee;}' +
            ".info-column h3 { font-size: 13px; font-weight: bold; color: #555; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px;}" +
            ".info-column p { margin: 0 0 5px 0; font-size: 12px; }" +
            ".info-column strong { font-weight: 600; color: #444; min-width: 100px; display: inline-block; }" +
            ".text-right { text-align: right; }" +
            '.receipt-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }' +
            ".receipt-table th, .receipt-table td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }" +
            ".receipt-table th { background-color: #f8f8f8; font-weight: bold; color: #444; }" +
            ".receipt-table .amount-col { text-align: right; }" +
            ".receipt-table tfoot td { font-weight: bold; }" +
            ".receipt-table tfoot .total-label { text-align: right; padding-right: 10px; }" +
            '.details-section { margin-bottom: 20px; padding-bottom:15px; border-bottom: 1px solid #eee; }' +
            ".details-section:last-of-type { border-bottom: none; }" +
            ".details-section h3 { font-size: 13px; font-weight: bold; color: #555; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px;}" +
            ".details-section p { margin: 0 0 5px 0; font-size: 12px; }" +
            ".details-section strong { font-weight: 600; color: #444; min-width: 120px; display: inline-block; }" +
            '.signature-section { margin-top: 30px; padding-top: 20px; display: flex; justify-content: space-between; border-top: 1px solid #ddd; }' +
            ".signature-block { width: 45%; text-align: center; }" +
            ".signature-block img { border: 1px solid #ddd; border-radius: 4px; padding: 5px; max-width: 180px; height: auto; margin-bottom:5px; background: #fff; display: block; margin-left: auto; margin-right: auto; }" +
            ".signature-block p { font-size: 11px; color: #666; margin-top: 60px; border-top: 1px solid #aaa; padding-top: 5px; }" +
            ".signature-block .placeholder-sign { height: 70px; display:flex; align-items:center; justify-content:center; color: #aaa; font-style: italic;}" +
            '.receipt-footer { text-align: center; margin-top: 30px; font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 15px; }' +
            ".receipt-footer p { margin: 0 0 3px 0; }" +
            ".print-hidden { display: none !important; }" +
            "@media print {" +
              "body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; font-size: 10pt; }" +
              ".receipt-container { box-shadow: none; border: none; margin: 0; padding: 0; width: 100%;}" +
              ".print-hidden { display: none !important; }" +
              ".receipt-info-grid { grid-template-columns: 1fr 1fr; }" +
            "}";

        printWindow.document.write('<style>' + styles + '</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();

        printWindow.focus();
        setTimeout(() => {
            try {
                printWindow.print();
            } catch (e) {
                console.error("Print error:", e);
                toast({variant: "destructive", title: "Print Error", description: "Could not open print dialog."});
            }
        }, 500);
      } else {
        toast({variant: "destructive", title: "Print Error", description: "Could not open print window. Check browser pop-up blocker."});
      }
    }
  };


  if (!isClient || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg text-muted-foreground">Loading New Registration...</p>
        </div>
      </div>
    );
  }

  const isFetchingAnyLocation = isFetchingPincodeLocation || isFetchingGeoLocation;
  const canGenerateId = !!selectedZone && !!selectedDivision && selectedDivision.length === 3 && !isGeneratingId;
  const isFormSubmittable = !isFetchingAnyLocation && !isSubmitting && !isLoadingTerms && !isGeneratingId;

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
        {!showReceipt && (
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <UserPlus className="mr-3 h-6 w-6 text-primary" />
               New Customer Registration
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
                    <a href={`tel:${customerPhone}`}><Input id="customerPhone" type="tel" placeholder="Enter primary mobile number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0,10))} maxLength={10} /></a>
                  </div>
                  <div>
                    <Label htmlFor="altMobileNo" className="flex items-center"><PhoneCall className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Alternate Mobile Number (Optional)</Label>
                    <a href={`tel:${altMobileNo}`}><Input id="altMobileNo" type="tel" placeholder="Enter alternate mobile number" value={altMobileNo} onChange={(e) => setAltMobileNo(e.target.value.replace(/\D/g, '').slice(0,10))} maxLength={10} /></a>
                  </div>
                </div>
                <div>
                  <Label htmlFor="emailId" className="flex items-center"><Mail className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Email ID</Label>
                  <Input id="emailId" type="email" placeholder="Enter email address" value={emailId} onChange={(e) => setEmailId(e.target.value)} />
                </div>
                {/* Customer Photo Upload */}
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
                  {isFetchingGeoLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Locate className="mr-2 h-4 w-4" />} Fetch My Current Location
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
                      <Save className="mr-2 h-4 w-4" /> {confirmedMapLink === generatedMapLink ? "Link Confirmed" : "Confirm This Link"}
                    </Button>
                  </div>
                   {confirmedMapLink && <p className="text-xs text-green-600 mt-1">Map link confirmed for submission.</p>}
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
                      <div className="mt-2 p-2 border rounded-md">
                        <Image src={aadhaarFrontDataUrl} alt="Aadhaar Front Preview" width={200} height={120} className="rounded" data-ai-hint="ID card"/>
                      </div>
                    )}
                  </div>
                   <div>
                    <Label htmlFor="aadhaarBackFile" className="flex items-center"><ImagePlus className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Upload Aadhaar Photo (Back)</Label>
                    <Input id="aadhaarBackFile" type="file" accept="image/*" onChange={(e) => handleAadhaarFileChange(e, 'back')} />
                    {aadhaarBackDataUrl && (
                       <div className="mt-2 p-2 border rounded-md">
                        <Image src={aadhaarBackDataUrl} alt="Aadhaar Back Preview" width={200} height={120} className="rounded" data-ai-hint="ID card"/>
                      </div>
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
                  <Select
                    value={selectedZone}
                    onValueChange={handleZoneChange}
                    disabled={filteredZones.length === 0 && zonePlaceholder.startsWith("No zones for")}
                  >
                    <SelectTrigger id="zoneSelect">
                      <SelectValue placeholder={filteredZones.length === 0 ? zonePlaceholder : "Select Zone"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredZones.map(zone => <SelectItem key={zone.value} value={zone.value}>{zone.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="divisionCode">Division Code</Label>
                  <Input
                    id="divisionCode"
                    value={selectedDivision}
                    readOnly
                    className="bg-muted/50"
                    placeholder="From Pincode"
                  />
                </div>
              </div>
            </section>

            {/* Customer ID Generation */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <UserSquare2 className="mr-2 h-5 w-5 text-primary/80" /> Customer ID Generation
              </h3>
              <div className="flex items-end gap-4">
                <div className="flex-grow">
                  <Label htmlFor="generatedCustomerId">Generated Customer ID</Label>
                  <Input id="generatedCustomerId" placeholder="Click button to generate ID" value={generatedCustomerId} readOnly className="bg-muted/50" />
                </div>
                <Button onClick={handleGenerateCustomerId} variant="outline" disabled={!canGenerateId || isGeneratingId}>
                  {isGeneratingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {isGeneratingId ? "Generating..." : "Generate ID"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ensure Zone and Division Code (from Pincode) are set. Sequential part auto-increments per Zone+Division from database.</p>
            </section>

            {/* Installation & Plan Details */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <Wrench className="mr-2 h-5 w-5 text-primary/80" /> Installation &amp; Plan Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="modelInstalled" className="flex items-center"><Package className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Model Installed</Label>
                    <Input
                      id="modelInstalled"
                      placeholder="Enter model name (e.g., Alpha, Pro)"
                      value={modelInstalled}
                      onChange={(e) => setModelInstalled(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="serialNumber" className="flex items-center"><NotebookPen className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Serial Number</Label>
                    <Input id="serialNumber" placeholder="Enter device serial number" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="installationDate" className="flex items-center"><CalendarDays className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Installation Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={`w-full justify-start text-left font-normal ${!installationDate && "text-muted-foreground"}`}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {installationDate ? format(installationDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={installationDate}
                          onSelect={setInstallationDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="installationTime" className="flex items-center"><ClockIcon className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Installation Time</Label>
                    <Input id="installationTime" type="time" placeholder="HH:MM" value={installationTime} onChange={(e) => setInstallationTime(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tdsBefore" className="flex items-center"><Droplet className="inline-block mr-1.5 h-4 w-4 text-primary/70" />TDS Before Installation</Label>
                    <Input id="tdsBefore" type="number" placeholder="Enter TDS value" value={tdsBefore} onChange={(e) => setTdsBefore(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="tdsAfter" className="flex items-center"><Droplet className="inline-block mr-1.5 h-4 w-4 text-primary/70" />TDS After Installation</Label>
                    <Input id="tdsAfter" type="number" placeholder="Enter TDS value" value={tdsAfter} onChange={(e) => setTdsAfter(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentType" className="flex items-center"><Banknote className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Payment Type</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger id="paymentType">
                        <SelectValue placeholder="Select Payment Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="securityAmount" className="flex items-center"><ShieldQuestion className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Security Amount</Label>
                    <Input id="securityAmount" type="number" placeholder="Enter amount" value={securityAmount} onChange={(e) => setSecurityAmount(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="planSelected" className="flex items-center"><ListChecks className="inline-block mr-1.5 h-4 w-4 text-primary/70" />Plan Selected</Label>
                   <Select
                    value={planSelected}
                    onValueChange={setPlanSelected}
                  >
                    <SelectTrigger id="planSelected">
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basic">Basic Plan</SelectItem>
                      <SelectItem value="Commercial">Commercial Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

             {/* Terms & Conditions */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <ScrollText className="mr-2 h-5 w-5 text-primary/80" />
                {isLoadingTerms ? "Loading Terms & Conditions..." : (termsContent?.title || "Terms & Conditions")}
              </h3>
              <div className="space-y-4">
                {isLoadingTerms ? (
                  <div className="h-32 flex items-center justify-center p-3 border rounded-md bg-muted/30 text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading T&C...
                  </div>
                ) : termsFetchError || !termsContent ? (
                   <Alert variant="warning" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Failed to Load Terms & Conditions</AlertTitle>
                    <AlertDescription>
                      {termsFetchError || "T&C content not found."}
                       <br/>
                       Ensure T&C are initialized in the database by visiting (once):
                         <Button variant="link" asChild className="p-0 h-auto font-medium text-primary hover:underline block mt-1">
                           <Link href="/api/initialize-collections" target="_blank">Initialize Database Collections</Link>
                        </Button>
                       After visiting, refresh this page. If the problem persists, check server logs.
                    </AlertDescription>
                  </Alert>
                ) : termsContent?.contentBlocks && termsContent.contentBlocks.length > 0 ? (
                  <div className="h-32 overflow-y-auto p-3 border rounded-md bg-muted/30 text-sm text-muted-foreground space-y-1">
                    {termsContent.contentBlocks.map((block, index) => (
                      <p key={index} className="text-xs">{block}</p>
                    ))}
                  </div>
                ) : (
                   <div className="h-32 flex items-center justify-center p-3 border rounded-md bg-muted/30 text-muted-foreground">
                    Terms & Conditions content not available.
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="termsAgreed"
                    checked={termsAgreed}
                    onCheckedChange={(checked) => setTermsAgreed(checked as boolean)}
                    disabled={isLoadingTerms || !!termsFetchError || !termsContent}
                  />
                  <Label htmlFor="termsAgreed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I have read and agree to the Terms &amp; Conditions.
                  </Label>
                </div>
              </div>
            </section>

            {/* Customer Confirmation */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center text-foreground/90">
                <Edit3Icon className="mr-2 h-5 w-5 text-primary/80" /> Customer Confirmation
              </h3>
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
            <Button
              onClick={handleFormSubmitAttempt}
              className="w-full font-semibold text-lg py-3"
              size="lg"
              disabled={!isFormSubmittable}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isLoadingTerms || isGeneratingId || isFetchingAnyLocation ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null)}
              {isSubmitting ? "Submitting..." : (isLoadingTerms || isGeneratingId || isFetchingAnyLocation ? "Processing..." : "Confirm & Submit Registration")}
            </Button>
             <div className="w-full flex justify-end pt-2">
              <Dialog open={isManageZoneDialogOpen} onOpenChange={setIsManageZoneDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ListPlus className="mr-2 h-4 w-4" /> Manage Zones
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Manage Zones</DialogTitle>
                    <DialogDescription>
                      Add, edit, or delete available service zones. Changes are client-side for this demo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2 p-4 border rounded-md">
                      <Label htmlFor="new-zone-name" className="flex items-center text-md font-semibold"><PlusCircle className="mr-2 h-5 w-5 text-primary" />Add New Zone</Label>
                      <div className="flex gap-2 items-center">
                        <Input id="new-zone-name" placeholder="Enter new zone (e.g., BR02)" value={newZoneNameToAdd} onChange={(e) => setNewZoneNameToAdd(e.target.value)} />
                        <Button onClick={handleAddNewZone} size="sm"><PlusCircle className="mr-1.5 h-4 w-4" /> Add</Button>
                      </div>
                    </div>

                    <div className="space-y-2 p-4 border rounded-md">
                       <Label htmlFor="edit-zone-select" className="flex items-center text-md font-semibold"><Edit className="mr-2 h-5 w-5 text-primary" />Edit / Delete Zone</Label>
                       <Select value={zoneToEdit} onValueChange={setZoneToEdit}>
                          <SelectTrigger id="edit-zone-select">
                            <SelectValue placeholder="Select zone to manage" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentSampleZones.map(zone => <SelectItem key={zone.value} value={zone.value}>{zone.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {zoneToEdit && (
                          <div className="space-y-2 mt-3">
                            <Label htmlFor="edited-zone-label">New Zone Label/Code</Label>
                            <Input
                              id="edited-zone-label"
                              placeholder="Enter new label/code"
                              value={editedZoneLabel}
                              onChange={(e) => setEditedZoneLabel(e.target.value)}
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              <Button onClick={handleUpdateZone} size="sm" variant="outline" disabled={!editedZoneLabel.trim()}><RefreshCw className="mr-1.5 h-4 w-4" /> Update</Button>
                              <Button onClick={handleDeleteZone} size="sm" variant="destructive"><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">
                        Close
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardFooter>
        </Card>
        )}

        {showReceipt && lastSuccessfulRegistrationData && (
           <div className="bg-background p-4 sm:p-6 rounded-lg shadow-xl">
            <style jsx global>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                .print-receipt-container, .print-receipt-container * {
                  visibility: visible;
                }
                .print-receipt-container {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 0;
                  border: none;
                  box-shadow: none;
                }
                .print-hidden {
                  display: none !important;
                }
              }
            `}</style>
            <div ref={receiptContentRef} className="receipt-container bg-card p-6 sm:p-8 rounded-md border border-border shadow-lg max-w-3xl mx-auto">
              {/* Header */}
              <div className="receipt-header text-center mb-6 pb-4 border-b border-border">
                <div className="flex items-center justify-center text-primary mb-2">
                  <Droplets className="company-logo h-10 w-10 sm:h-12 sm:w-12 mr-3" />
                  <span className="company-name text-3xl sm:text-4xl font-bold">DropPurity</span>
                </div>
                <p className="company-tagline text-sm text-muted-foreground">Pure Water, Pure Life</p>
                <p className="receipt-title text-2xl sm:text-3xl font-semibold text-foreground mt-4">REGISTRATION RECEIPT</p>
              </div>

              {/* Customer and Receipt Info Grid */}
              <div className="receipt-info-grid grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6 pb-4 border-b border-border">
                {/* Customer Photo Section - Centered above details */}
                {lastSuccessfulRegistrationData.customerPhotoDataUrl && (
                  <div className="col-span-1 md:col-span-2 text-center mb-4">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">CUSTOMER PHOTOGRAPH:</h3>
                    <Image src={lastSuccessfulRegistrationData.customerPhotoDataUrl} alt="Customer Photograph" width={150} height={150} className="rounded object-contain mx-auto border border-border p-1" data-ai-hint="customer photo" />
                  </div>
                )}

                <div className="info-column">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">BILLED TO:</h3>
                  <p><strong>Customer Name:</strong> {lastSuccessfulRegistrationData.customerName}</p>
                  <p><strong>S/o / W/o:</strong> {lastSuccessfulRegistrationData.fatherSpouseName}</p>
                  <p><strong>Address:</strong> {`${lastSuccessfulRegistrationData.customerAddress}${lastSuccessfulRegistrationData.landmark ? `, ${lastSuccessfulRegistrationData.landmark}` : ''}`}</p>
                  <p><strong>City/State:</strong> {`${lastSuccessfulRegistrationData.city}, ${lastSuccessfulRegistrationData.stateName} - ${lastSuccessfulRegistrationData.pincode}`}</p>
                  <p><strong>Phone:</strong> {lastSuccessfulRegistrationData.customerPhone}</p>
                  {lastSuccessfulRegistrationData.emailId && <p><strong>Email:</strong> {lastSuccessfulRegistrationData.emailId}</p>}
                  {lastSuccessfulRegistrationData.confirmedMapLink &&
                    <p>
                      <strong>Map Link:</strong>
                      <a href={lastSuccessfulRegistrationData.confirmedMapLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                        View Location
                      </a>
                    </p>
                  }
                </div>
                <div className="info-column md:text-right">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 md:text-left">RECEIPT DETAILS:</h3>
                  <p><strong className="md:w-auto">Receipt No:</strong> {lastSuccessfulRegistrationData.receiptNumber}</p>
                  <p><strong className="md:w-auto">Customer ID:</strong> {lastSuccessfulRegistrationData.generatedCustomerId}</p>
                  <p><strong className="md:w-auto">Registration Date:</strong> {format(new Date(lastSuccessfulRegistrationData.registeredAt || Date.now()), "PPP")}</p>
                  {lastSuccessfulRegistrationData.installationDate &&
                      <p><strong className="md:w-auto">Installation:</strong> {format(new Date(lastSuccessfulRegistrationData.installationDate + 'T00:00:00'), "PPP")} at {lastSuccessfulRegistrationData.installationTime}</p>
                  }
                </div>
              </div>

              {/* Items Table */}
              <div className="details-section mb-6 pb-4 border-b border-border">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">SERVICE & PLAN DETAILS:</h3>
                <div className="overflow-x-auto">
                  <table className="receipt-table w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Description</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Details</th>
                        <th className="py-2 px-3 text-right font-semibold text-muted-foreground amount-col">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-2 px-3">Model Installed</td>
                        <td className="py-2 px-3">{lastSuccessfulRegistrationData.modelInstalled} (S/N: {lastSuccessfulRegistrationData.serialNumber})</td>
                        <td className="py-2 px-3 amount-col">-</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-2 px-3">Plan Selected</td>
                        <td className="py-2 px-3">{lastSuccessfulRegistrationData.planName || lastSuccessfulRegistrationData.planSelected}</td>
                        <td className="py-2 px-3 amount-col">{parseFloat(lastSuccessfulRegistrationData.planPrice || '0').toFixed(2)}</td>
                      </tr>
                       <tr className="border-b border-border">
                        <td className="py-2 px-3">Security Deposit</td>
                        <td className="py-2 px-3">Refundable security deposit</td>
                        <td className="py-2 px-3 amount-col">{parseFloat(lastSuccessfulRegistrationData.securityAmount).toFixed(2)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-foreground">
                        <td colSpan={2} className="py-3 px-3 text-right font-bold text-foreground text-base total-label">TOTAL AMOUNT PAID</td>
                        <td className="py-3 px-3 text-right font-bold text-foreground text-base amount-col">₹{(parseFloat(lastSuccessfulRegistrationData.securityAmount || '0') + parseFloat(lastSuccessfulRegistrationData.planPrice || '0')).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Other Details Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6 pb-4 border-b border-border">
                <div className="details-section !border-b-0 md:!border-b !pb-0 md:!pb-4">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">PAYMENT DETAILS:</h3>
                    <p><strong>Payment Method:</strong> {lastSuccessfulRegistrationData.paymentType}</p>
                    <p><strong>Status:</strong> Paid</p>
                    <p><strong>Aadhaar No.:</strong> {lastSuccessfulRegistrationData.aadhaarNo}</p>
                </div>
                 <div className="details-section !border-b-0 !pb-0">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">WATER QUALITY:</h3>
                    <p><strong>TDS Before:</strong> {lastSuccessfulRegistrationData.tdsBefore} ppm</p>
                    <p><strong>TDS After:</strong> {lastSuccessfulRegistrationData.tdsAfter} ppm</p>
                </div>
              </div>

              <div className="details-section mb-6 pb-4 border-b border-border">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">AGREEMENT:</h3>
                <p><strong>Terms Agreed:</strong> {lastSuccessfulRegistrationData.termsAgreed ? 'Yes' : 'No'}</p>
                {lastSuccessfulRegistrationData.aadhaarFrontPhotoDataUrl && (
                    <p><strong>Aadhaar (Front):</strong> Image Captured</p>
                )}
                {lastSuccessfulRegistrationData.aadhaarBackPhotoDataUrl && (
                    <p><strong>Aadhaar (Back):</strong> Image Captured</p>
                )}
              </div>

              {/* Signatures */}
              <div className="signature-section mt-8 pt-6">
                <div className="signature-block">
                  {lastSuccessfulRegistrationData.signatureDataUrl ? (
                    <Image src={lastSuccessfulRegistrationData.signatureDataUrl} alt="Customer Signature" width={180} height={90} className="mx-auto" data-ai-hint="signature drawing" />
                  ) : (
                    <div className="placeholder-sign h-[90px] w-[180px] border border-dashed mx-auto flex items-center justify-center">Not Captured</div>
                  )}
                  <p>Customer Signature</p>
                </div>
                <div className="signature-block">
                  <div className="placeholder-sign h-[90px] w-[180px] mx-auto flex items-center justify-center"> {/* Adjusted height to match image potential */}
                     {/* Placeholder for authorized signature stamp/image if available */}
                  </div>
                  <p>Authorised Signature for DropPurity</p>
                </div>
              </div>

              {/* Footer */}
              <div className="receipt-footer mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
                <p>This is a computer-generated receipt. For any queries, please contact DropPurity support.</p>
                <p>Email: official@droppurity.com | Phone: 7979784087</p>
                <p className="mt-2 font-semibold">Thank you for choosing DropPurity!</p>
              </div>
            </div>

            {/* Action Buttons - Not part of the printable receipt content */}
            <CardFooter className="print-hidden p-6 mt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/30 rounded-b-lg">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default" // Changed to default variant for prominence
                  onClick={() => {
                    const customerPhoneNumber = lastSuccessfulRegistrationData.customerPhone.replace(/\D/g, '');
 let message = `Dear ${lastSuccessfulRegistrationData.customerName},
\nYour User ID: ${lastSuccessfulRegistrationData.generatedCustomerId}
\nRegistration Summary:
\nModel Installed: ${lastSuccessfulRegistrationData.modelInstalled}
\nPlan Selected: ${lastSuccessfulRegistrationData.planName || lastSuccessfulRegistrationData.planSelected}
\nTotal Amount Paid: Rs ${(parseFloat(lastSuccessfulRegistrationData.securityAmount || '0') + parseFloat(lastSuccessfulRegistrationData.planPrice || '0')).toFixed(2)}
\n
\nYour Receipt Link: ${receiptDriveLink}
\n
\nThank you for choosing DropPurity!
`;

                    const internationalPhoneNumber = customerPhoneNumber.startsWith('91') ? customerPhoneNumber : `91${customerPhoneNumber}`;

                    const whatsappBaseUrl = /Mobi|Android/i.test(navigator.userAgent) ? 'wa.me' : 'web.whatsapp.com/send';
                    const whatsappUrl = `https://${whatsappBaseUrl}/?phone=${internationalPhoneNumber}&text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Share on WhatsApp
                </Button>
                <Button variant="outline" onClick={handlePrintReceipt}>
                  <Download className="mr-2 h-4 w-4" /> Download/Print Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSaveReceiptToDrive(lastSuccessfulRegistrationData)}
                  disabled={isSavingReceiptToDrive}
                >
                  {isSavingReceiptToDrive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {isSavingReceiptToDrive ? 'Saving to Drive...' : 'Save to Drive'}
                </Button>
              </div>
              <Button onClick={resetFormFieldsAndReceipt}>
                <UserPlus className="mr-2 h-4 w-4" /> Start New Registration
              </Button>
            </CardFooter>
            {receiptDriveLink && (
              <div className="print-hidden p-4 text-center text-sm text-muted-foreground">
                <p>Receipt saved to Google Drive.
                  The link provided previously was to the actual file, please check your Google Drive.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto print-hidden">
        © {new Date().getFullYear()} DropPurity. All rights reserved.
      </footer>
    </div>
  );
}
