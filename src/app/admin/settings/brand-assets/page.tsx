
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Palette, Save, Loader2, AlertCircle, ShieldAlert, Image as ImageIcon, UploadCloud, Trash2 } from "lucide-react";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BrandAssets } from '@/types';
import { BRAND_ASSETS_DOC_PATH } from '@/constants';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const BRAND_ASSETS_QUERY_KEY = "brandAssetsSettings";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const brandAssetsSchema = z.object({
  signature: z.any().refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max file size is 2MB.`).refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), ".jpg, .png, and .webp files are accepted.").optional(),
  stamp: z.any().refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max file size is 2MB.`).refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), ".jpg, .png, and .webp files are accepted.").optional(),
});

type BrandAssetsFormValues = z.infer<typeof brandAssetsSchema>;

const fetchBrandAssets = async (): Promise<BrandAssets> => {
  const docRef = doc(db, BRAND_ASSETS_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as BrandAssets;
  }
  return { id: 'brand_assets', signatureUrl: '', stampUrl: '' };
};

export default function AdminBrandAssetsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [previews, setPreviews] = useState({ signature: '', stamp: '' });

  const canAccessPage = useMemo(() => {
    if (!user) return false;
    return user.role === 'superadmin' || (user.role === 'admin' && !user.buildingAssignment);
  }, [user]);

  const { data: currentAssets, isLoading: isLoadingAssets, error: assetsError } = useQuery<BrandAssets, Error>({
    queryKey: [BRAND_ASSETS_QUERY_KEY],
    queryFn: fetchBrandAssets,
    enabled: !authLoading && canAccessPage,
  });

  useEffect(() => {
    if (currentAssets) {
      setPreviews({ signature: currentAssets.signatureUrl || '', stamp: currentAssets.stampUrl || '' });
    }
  }, [currentAssets]);
  
  const mutation = useMutation<void, Error, { assetType: 'signature' | 'stamp'; file: File }>({
      mutationFn: async ({ assetType, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('assetType', assetType);

        const response = await fetch('/api/upload-brand-asset', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
        }
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [BRAND_ASSETS_QUERY_KEY] });
          toast({ title: t('success'), description: t('brandAssetUpdatedSuccess') });
      },
      onError: (err) => {
          toast({ variant: "destructive", title: t('error'), description: err.message });
      },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'signature' | 'stamp') => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > MAX_FILE_SIZE) {
              toast({ variant: 'destructive', title: t('fileTooLargeTitle'), description: `File must be smaller than 2MB.`});
              return;
          }
          if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
              toast({ variant: 'destructive', title: t('invalidFileTypeTitle'), description: `Please select a PNG, JPG, or WEBP file.`});
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              setPreviews(p => ({ ...p, [fieldName]: reader.result as string }));
          };
          reader.readAsDataURL(file);
          mutation.mutate({ assetType: fieldName, file });
      }
  };


  if (authLoading || (isLoadingAssets && canAccessPage)) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canAccessPage) {
    return (
      <Card className="w-full max-w-md mx-auto my-8">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('settingsAccessRestricted')}</p>
          <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageBrandAssets')}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="mr-2 h-6 w-6 text-primary" />
            {t('officialSignatureAndStamp')}
          </CardTitle>
          <CardDescription>{t('brandAssetsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {assetsError && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive border border-destructive rounded-md flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              {t('errorFetchingAssets')}: {assetsError.message}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {['signature', 'stamp'].map((assetType) => (
                <div key={assetType} className="space-y-4">
                    <h3 className="text-lg font-medium">{t(assetType)}</h3>
                    <Card className="p-4">
                       <div className="relative w-full min-h-[150px] border border-dashed rounded-lg flex items-center justify-center bg-muted/50 mb-4">
                           {mutation.isPending && mutation.variables?.assetType === assetType ? (
                               <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                           ) : previews[assetType as keyof typeof previews] ? (
                               <Image src={previews[assetType as keyof typeof previews]} alt={t(assetType)} layout="fill" objectFit="contain" className="p-2"/>
                           ) : (
                               <div className="text-center text-muted-foreground p-4">
                                   <ImageIcon className="mx-auto h-12 w-12 mb-2"/>
                                   <p className="text-sm">{t('noImageUploaded')}</p>
                               </div>
                           )}
                       </div>
                       <label htmlFor={`${assetType}-upload`} className="w-full">
                           <Button asChild className="w-full">
                               <span><UploadCloud className="mr-2 h-4 w-4"/> {t('uploadNewImage')}</span>
                           </Button>
                           <input id={`${assetType}-upload`} type="file" className="hidden" accept={ACCEPTED_IMAGE_TYPES.join(',')} onChange={(e) => handleFileChange(e, assetType as 'signature' | 'stamp')} />
                       </label>
                    </Card>
                </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
