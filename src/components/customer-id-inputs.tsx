"use client";

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal } from 'lucide-react';

interface CustomerIdInputsProps {
  adminCodes: string[];
  deviceCodes: string[];
  selectedAdminCode: string;
  onAdminCodeChange: (value: string) => void;
  selectedDeviceCode: string;
  onDeviceCodeChange: (value: string) => void;
}

const CustomerIdInputs: React.FC<CustomerIdInputsProps> = ({
  adminCodes,
  deviceCodes,
  selectedAdminCode,
  onAdminCodeChange,
  selectedDeviceCode,
  onDeviceCodeChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="admin-code-select" className="text-sm font-medium text-foreground/80 mb-1.5 flex items-center">
          <SlidersHorizontal className="h-4 w-4 mr-2 text-primary" /> Admin Code
        </Label>
        <Select value={selectedAdminCode} onValueChange={onAdminCodeChange}>
          <SelectTrigger id="admin-code-select" className="w-full">
            <SelectValue placeholder="Select Admin Code" />
          </SelectTrigger>
          <SelectContent>
            {adminCodes.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="device-code-select" className="text-sm font-medium text-foreground/80 mb-1.5 flex items-center">
          <SlidersHorizontal className="h-4 w-4 mr-2 text-primary" /> Device Code
        </Label>
        <Select value={selectedDeviceCode} onValueChange={onDeviceCodeChange}>
          <SelectTrigger id="device-code-select" className="w-full">
            <SelectValue placeholder="Select Device Code" />
          </SelectTrigger>
          <SelectContent>
            {deviceCodes.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CustomerIdInputs;
