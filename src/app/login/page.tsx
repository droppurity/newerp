
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplets, LogInIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast"; // Added toast import

const HARDCODED_EMAIL = "9835397924";
const HARDCODED_PASSWORD = "6203739882";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast(); // Initialized toast

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); // Clear previous errors

    if (!email || !password) {
      setError('Email and password are required.');
      toast({ // Added toast for error
        variant: "destructive",
        title: "Login Error",
        description: "Email and password are required.",
      });
      return;
    }

    if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
      console.log('Login successful for:', { email });
      // In a real app, you'd set some auth state here (e.g., context, cookie, token)
      // For this prototype, we'll use sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.setItem('isAuthenticated', 'true');
      }
      toast({ // Added toast for success
        title: "Login Successful",
        description: "Redirecting to dashboard...",
      });
      router.push('/'); 
    } else {
      console.log('Login failed for:', { email });
      setError('Invalid email or password.');
      toast({ // Added toast for invalid credentials
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password.",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="absolute top-8 left-8 flex items-center text-2xl font-bold text-primary">
        <Droplets className="mr-2 h-7 w-7" />
        DropPurity
      </div>
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center">
            <LogInIcon className="mr-2 h-7 w-7" /> Login
          </CardTitle>
          <CardDescription className="text-md pt-1">
            Access your DropPurity dashboard. Use '9835397924' for email and '6203739882' for password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email (use 9835397924)</Label>
              <Input
                id="email"
                type="text" // Changed to text to allow numbers, but still labeled as email for now
                placeholder="9835397924"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (use 6203739882)</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full font-semibold text-lg py-3">
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm text-muted-foreground pt-4">
          <p>© {new Date().getFullYear()} DropPurity. All rights reserved.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
