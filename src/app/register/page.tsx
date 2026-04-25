'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LeafIcon } from '@/components/icons';
import { Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react';

type Step = 'register' | 'otp';

export default function RegisterPage() {
  const { register, verifyOtp } = useAuth();
  const router = useRouter();

  const [step,      setStep]     = useState<Step>('register');
  const [email,     setEmail]    = useState('');
  const [password,  setPassword] = useState('');
  const [fullName,  setFullName] = useState('');
  const [otpCode,   setOtpCode]  = useState('');
  const [error,     setError]    = useState('');
  const [success,   setSuccess]  = useState('');
  const [busy,      setBusy]     = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true);
    const res = await register(email, password, fullName);
    setBusy(false);
    if (res.success) {
      setSuccess('Account created! Check your email (or backend terminal) for the 6-digit OTP.');
      setStep('otp');
    } else {
      setError(res.message ?? 'Registration failed.');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setBusy(true);
    const res = await verifyOtp(email, otpCode.trim());
    setBusy(false);
    if (res.success) {
      setSuccess('Account activated! Redirecting to login…');
      setTimeout(() => router.push('/login'), 2000);
    } else {
      setError(res.message ?? 'Invalid OTP. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl bg-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <LeafIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-bold text-primary">Sampoorna Krishi</h1>
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 'register' ? '🌱 Create Your Account' : '📧 Verify Your Email'}
          </CardTitle>
          <CardDescription>
            {step === 'register'
              ? 'Join thousands of farmers using AI-powered tools.'
              : `We sent a 6-digit code to ${email}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${step === 'register' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}`}>
              {step !== 'register' && <CheckCircle2 className="h-3 w-3" />} 1. Register
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${step === 'otp' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <Mail className="h-3 w-3" /> 2. Verify OTP
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-700 dark:text-green-400 mb-4">
              <CheckCircle2 className="h-4 w-4 shrink-0" />{success}
            </div>
          )}

          {/* ── Step 1: Register ── */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" required placeholder="e.g. Ramu Reddy"
                  value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" required placeholder="farmer@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required placeholder="Min. 6 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={busy}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : 'Create Account'}
              </Button>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit OTP Code</Label>
                <Input
                  id="otp" required maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="• • • • • •"
                  value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Can&apos;t find it? Check the backend terminal window — the code is printed there if email isn&apos;t configured.
                </p>
              </div>
              <Button type="submit" className="w-full mt-2" disabled={busy || otpCode.length < 6}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : 'Verify & Activate Account'}
              </Button>
              <Button variant="ghost" type="button" className="w-full" onClick={() => { setStep('register'); setError(''); setSuccess(''); setOtpCode(''); }}>
                ← Back to Registration
              </Button>
            </form>
          )}

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold underline-offset-4 hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
