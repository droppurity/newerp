import type React from 'react';

export interface AlertMessage {
  id: string;
  type: "default" | "destructive" | "warning";
  title: string;
  description?: string;
  icon?: React.ReactNode;
}
