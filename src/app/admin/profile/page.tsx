
"use client";

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { UserCircle, Save, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().min(7, { message: "Valid phone number is required."}).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function AdminProfilePage() {
  const { t } = useLanguage();
  const { user, updateUserDocument, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user, form]);
  
  async function onSubmit(data: ProfileFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: t('error'), description: t('userNotAuthenticated')});
        return;
    }
    setIsSaving(true);
    try {
        await updateUserDocument(user.id, {
            name: data.name,
            phone: data.phone || '',
        });
        toast({ title: t('success'), description: t('profileUpdatedSuccessfully')});
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ variant: "destructive", title: t('error'), description: t('failedToUpdateProfile')});
    } finally {
        setIsSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground">{t('userProfile')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('profileInformation')}</CardTitle>
          <CardDescription>{t('updateYourProfileDetails')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={`https://placehold.co/100x100.png`} alt={user?.name || "User"} data-ai-hint="profile avatar" />
                        <AvatarFallback>
                        <UserCircle className="h-10 w-10 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" type="button">{t('changeAvatar')}</Button>
                </div>

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('fullName')}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('enterFullName')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-2">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input id="email" type="email" value={user?.email || ""} readOnly disabled />
                </div>
                
                 <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('phone')}</FormLabel>
                            <FormControl>
                                <Input type="tel" placeholder={t('enterPhoneForSms')} {...field} />
                            </FormControl>
                             <FormDescription>
                                {t('phoneForSmsDescription')}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('saveChanges')}
                </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
