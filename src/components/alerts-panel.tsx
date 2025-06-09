"use client";

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import type { AlertMessage } from '@/types'; // Assuming AlertMessage type is defined here
import { Info, ShieldAlert, TriangleAlert, X } from 'lucide-react';

interface AlertsPanelProps {
  alerts: AlertMessage[];
  onDismissAlert?: (id: string) => void;
}

const AlertIcon: React.FC<{type: AlertMessage['type']}> = ({ type }) => {
  switch (type) {
    case 'destructive':
      return <ShieldAlert className="h-5 w-5 text-destructive-foreground" />;
    case 'warning':
      return <TriangleAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />; // Custom color for warning
    case 'default':
    default:
      return <Info className="h-5 w-5 text-primary" />;
  }
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onDismissAlert }) => {
  if (!alerts || alerts.length === 0) {
    return null; // Don't render if no alerts
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Alert key={alert.id} variant={alert.type === 'warning' ? 'default' : alert.type} className={`relative ${alert.type === 'warning' ? 'border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30' : ''}`}>
           <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              {alert.icon ? alert.icon : <AlertIcon type={alert.type} />}
            </div>
            <div className="ml-3 flex-1">
              <AlertTitle className={`font-semibold ${alert.type === 'warning' ? 'text-yellow-700 dark:text-yellow-300' : ''}`}>{alert.title}</AlertTitle>
              {alert.description && (
                <AlertDescription className={`text-sm ${alert.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                  {alert.description}
                </AlertDescription>
              )}
            </div>
            {onDismissAlert && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 p-1 h-auto text-foreground/70 hover:text-foreground"
                onClick={() => onDismissAlert(alert.id)}
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default AlertsPanel;
