
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Droplets, LogOut, LayoutDashboard, ShoppingCartIcon } from 'lucide-react';

const isAuthenticatedClientSide = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  }
  return false;
};

export default function SalePartsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

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

  if (!isClient || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-lg text-muted-foreground">Loading Sale Parts...</p>
        </div>
      </div>
    );
  }

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
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <ShoppingCartIcon className="mr-3 h-6 w-6 text-primary" />
              Sale Parts
            </CardTitle>
            <CardDescription>Manage inventory and sale of parts.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="p-8 text-center border-2 border-dashed rounded-lg min-h-[250px] flex flex-col justify-center items-center">
              <ShoppingCartIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Parts sales management features are under development.</p>
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground mt-auto">
        © {new Date().getFullYear()} DropPurity. All rights reserved.
      </footer>
    </div>
  );
}
