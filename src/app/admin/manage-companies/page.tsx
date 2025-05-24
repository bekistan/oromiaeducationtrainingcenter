
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/types";
import { ShieldAlert, CheckCircle, XCircle, Hourglass, Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';

// Placeholder data for seeding (from useAuth previously)
const MOCK_COMPANY_USER_APPROVED_SEED: Omit<User, 'id' | 'role'> = {
  email: 'company@example.com',
  name: 'Approved Company Rep (Seeded)',
  companyId: 'comp001_seeded',
  companyName: 'Tech Solutions Inc. (Seeded)',
  approvalStatus: 'approved',
};

const MOCK_COMPANY_USER_PENDING_SEED: Omit<User, 'id' | 'role'> = {
  email: 'pending.company@example.com',
  name: 'Pending Company Rep (Seeded)',
  companyId: 'comp002_seeded',
  companyName: 'New Ventures LLC (Seeded)',
  approvalStatus: 'pending',
};

export default function ManageCompaniesPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch users with role 'company_representative' OR directly from a 'companies' collection if you structure it that way.
      // For now, assuming companies are users with a specific role and approvalStatus.
      const q = query(collection(db, "users"), where("role", "==", "company_representative"));
      const querySnapshot = await getDocs(q);
      const companiesData = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
      setCompanies(companiesData);
    } catch (error) {
      console.error("Error fetching companies: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingCompanies') }); // Add to JSON
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (!authLoading && (user?.role === 'admin' || user?.role === 'superadmin')) {
      fetchCompanies();
    } else if (!authLoading) {
      setIsLoading(false); // Not an admin, so stop loading
    }
  }, [authLoading, user, fetchCompanies]);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      const companiesToSeed = [MOCK_COMPANY_USER_APPROVED_SEED, MOCK_COMPANY_USER_PENDING_SEED];
      
      companiesToSeed.forEach(companyData => {
        const userRef = doc(collection(db, "users"));
        batch.set(userRef, { ...companyData, role: 'company_representative' });
      });
      
      await batch.commit();
      toast({ title: t('success'), description: t('companyDataSeeded') }); // Add to JSON
      fetchCompanies();
    } catch (error) {
      console.error("Error seeding companies: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorSeedingCompanies') }); // Add to JSON
    } finally {
      setIsSeeding(false);
    }
  };


  const handleApproval = async (companyId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const companyRef = doc(db, "users", companyId); // Assuming companies are in 'users' collection
      await updateDoc(companyRef, { approvalStatus: newStatus });
      toast({
        title: t('statusUpdated'),
        description: t('companyStatusUpdated', { companyId: companyId.substring(0,6)+"...", status: t(newStatus) }),
      });
      fetchCompanies(); // Refresh list
    } catch (error) {
      console.error("Error updating company status: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('failedToUpdateStatus') });
    }
  };

  const getStatusBadge = (status?: User['approvalStatus']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200"><CheckCircle className="mr-1 h-3 w-3" />{t(status)}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200"><Hourglass className="mr-1 h-3 w-3" />{t(status)}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-200"><XCircle className="mr-1 h-3 w-3" />{t(status)}</Badge>;
      default:
        return <Badge variant="secondary">{t('unknown')}</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">{t('loading')}...</p></div>;
  }

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">{t('accessDenied')}</h1>
        <p className="text-muted-foreground">{t('adminOrSuperAdminOnlyPage')}</p>
        <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('manageCompaniesTitle')}</h1>
      
      {companies.length === 0 && !isLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4">{t('noCompaniesFoundAdminCta')}</p> {/* Add to JSON: "No companies found. Would you like to add some initial sample company data?" */}
            <Button onClick={handleSeedData} disabled={isSeeding}>
              {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('seedInitialCompanies')} {/* Add to JSON */}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('registeredCompaniesList')}</CardTitle>
          <CardDescription>{t('viewAndApproveCompanies')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('companyName')}</TableHead>
                <TableHead>{t('contactPerson')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('approvalStatus')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">{t('noCompaniesFound')}</TableCell>
                </TableRow>
              )}
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.companyName || t('notAvailable')}</TableCell>
                  <TableCell>{company.name || t('notAvailable')}</TableCell>
                  <TableCell>{company.email}</TableCell>
                  <TableCell>{getStatusBadge(company.approvalStatus)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {company.approvalStatus === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleApproval(company.id, 'approved')} className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
                          <CheckCircle className="mr-1 h-4 w-4" /> {t('approveButton')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleApproval(company.id, 'rejected')} className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700">
                           <XCircle className="mr-1 h-4 w-4" /> {t('rejectButton')}
                        </Button>
                      </>
                    )}
                     {company.approvalStatus !== 'pending' && (
                        <span className="text-xs text-muted-foreground italic">{t('actionTaken')}</span>
                     )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
