'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { apiGetProfile, apiUpdateProfile, type ProfileData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { User, Upload, Loader2, CheckCircle2, AlertCircle, Sprout, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PageHeaderIcon = () => (
  <div className="bg-accent rounded-full p-3 mr-4">
    <User className="h-6 w-6 text-primary" />
  </div>
);

const CROPS  = ['Rice', 'Wheat', 'Sugarcane', 'Cotton', 'Maize', 'Millet', 'Soybean', 'Groundnut', 'Vegetables', 'Other'];
const STAGES = ['Land Preparation', 'Sowing', 'Growing', 'Flowering', 'Harvest', 'Post-Harvest'];
const STATES = ['Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Other'];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [profile,    setProfile]    = useState<ProfileData | null>(null);
  const [isEditing,  setIsEditing]  = useState(false);
  const [formData,   setFormData]   = useState<Partial<ProfileData>>({});
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [message,    setMessage]    = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [photoSrc,   setPhotoSrc]   = useState<string>('https://picsum.photos/seed/farmer/128/128');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiGetProfile();
      setProfile(data);
      setFormData(data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load profile.' });
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof ProfileData, v: string | number) =>
    setFormData((prev) => ({ ...prev, [k]: v }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMessage({ type: 'error', text: 'Image must be under 2 MB.' }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMessage(null);
    try {
      // Clean up formData: remove fields that should not be in the update request
      // (FastAPI schema ProfileUpdate doesn't include these, and they are already in the user table)
      const { id: _id, email: _email, is_admin: _is_admin, ...updateData } = formData;
      
      await apiUpdateProfile(updateData);
      await fetchProfile();
      await refreshUser(); 
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully! 🎉' });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center p-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <>
      <PageHeader title="My Profile" description="Manage your farmer account and personal information.">
        <PageHeaderIcon />
      </PageHeader>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm mb-2 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400' : 'bg-destructive/10 border border-destructive/30 text-destructive'}`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Image src={photoSrc} alt="Profile" width={80} height={80} className="rounded-full object-cover w-20 h-20 border-4 border-primary/20" />
              {isEditing && (
                <label htmlFor="photo-upload" className="absolute bottom-0 right-0 flex items-center justify-center w-7 h-7 bg-primary rounded-full text-primary-foreground cursor-pointer hover:bg-primary/90">
                  <Upload className="w-3.5 h-3.5" />
                  <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>
            <div>
              <CardTitle className="text-xl">{profile?.full_name || 'Farmer'}</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1">
                {user?.email}
                {user?.is_admin && <Badge variant="secondary" className="ml-1 text-xs">Admin</Badge>}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!isEditing ? (
            /* ─ View mode ─ */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: User,   label: 'Full Name',        val: profile?.full_name },
                  { icon: Phone,  label: 'Phone Number',      val: profile?.phone },
                  { icon: MapPin, label: 'Village',           val: profile?.village },
                  { icon: MapPin, label: 'District',          val: profile?.district },
                  { icon: MapPin, label: 'State',             val: profile?.state },
                  { icon: Sprout, label: 'Primary Crop',      val: profile?.crop_type },
                  { icon: Sprout, label: 'Land Holding',      val: profile?.land_holding_acres ? `${profile.land_holding_acres} acres` : undefined },
                  { icon: Sprout, label: 'Farming Stage',     val: profile?.farming_stage },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={val ? 'text-foreground' : 'text-muted-foreground italic'}>{val || 'Not set'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto px-8">Edit Profile</Button>
            </div>
          ) : (
            /* ─ Edit mode ─ */
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" placeholder="Ramu Reddy" value={formData.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+91 98765 43210" value={formData.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="village">Village</Label>
                  <Input id="village" placeholder="Your village" value={formData.village ?? ''} onChange={(e) => set('village', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="district">District</Label>
                  <Input id="district" placeholder="Your district" value={formData.district ?? ''} onChange={(e) => set('district', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Select value={formData.state ?? ''} onValueChange={(v) => set('state', v)}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Primary Crop</Label>
                  <Select value={formData.crop_type ?? ''} onValueChange={(v) => set('crop_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                    <SelectContent>{CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="land">Land Holding (acres)</Label>
                  <Input id="land" type="number" step="0.5" min="0" placeholder="e.g. 2.5"
                    value={formData.land_holding_acres ?? ''} onChange={(e) => set('land_holding_acres', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Farming Stage</Label>
                  <Select value={formData.farming_stage ?? ''} onValueChange={(v) => set('farming_stage', v)}>
                    <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                    <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setFormData(profile ?? {}); }}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
