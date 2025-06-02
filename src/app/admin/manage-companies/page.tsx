
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth"; 
import type { User } from "@/types";
import { ShieldAlert, CheckCircle, XCircle, Hourglass, Loader2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore'; 
import { useSimpleTable } from '@/hooks/use-simple-table';

export default function ManageCompaniesPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading, updateUserDocument } = useAuth(); 
  const router = useRouter();
  const { toast } = useToast();
  const [allCompanies, setAllCompanies] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "company_representative"));
      const querySnapshot = await getDocs(q);
      const companiesData = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
      setAllCompanies(companiesData);
    } catch (error) {
      console.error("Error fetching companies: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingCompanies') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (!authLoading && (user?.role === 'admin' || user?.role === 'superadmin')) {
      fetchCompanies();
    } else if (!authLoading) {
      setIsLoading(false); 
    }
  }, [authLoading, user, fetchCompanies]);

  const {
    paginatedData: displayedCompanies,
    setSearchTerm,
    searchTerm,
    currentPage,
    pageCount,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    totalItems,
    requestSort,
    sortConfig,
  } = useSimpleTable<User>({
      initialData: allCompanies,
      rowsPerPage: 10,
      searchKeys: ['companyName', 'name', 'email'], 
      initialSort: { key: 'companyName', direction: 'ascending'},
  });

  const getSortIndicator = (columnKey: keyof User) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  const handleApproval = async (companyId: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateUserDocument(companyId, { approvalStatus: newStatus });
      toast({
        title: t('statusUpdated'),
        description: t('companyStatusUpdated', { companyId: companyId.substring(0,6)+"...", status: t(newStatus) }),
      });
      fetchCompanies(); 
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

  if (authLoading || (isLoading && !allCompanies.length)) { 
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
       <div className="mb-4">
          <Input
            placeholder={t('searchCompanies')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
      </div>
      
      {isLoading && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

      {!isLoading && displayedCompanies.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>{searchTerm ? t('noCompaniesMatchSearch') : t('noCompaniesFoundAdmin')}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && displayedCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('registeredCompaniesList')}</CardTitle>
            <CardDescription>{t('viewAndApproveCompanies')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('companyName')} className="cursor-pointer group">{t('companyName')}{getSortIndicator('companyName')}</TableHead>
                    <TableHead onClick={() => requestSort('name')} className="cursor-pointer group">{t('contactPerson')}{getSortIndicator('name')}</TableHead>
                    <TableHead onClick={() => requestSort('email')} className="cursor-pointer group">{t('email')}{getSortIndicator('email')}</TableHead>
                    <TableHead onClick={() => requestSort('approvalStatus')} className="cursor-pointer group">{t('approvalStatus')}{getSortIndicator('approvalStatus')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCompanies.map((company) => (
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
            </div>
            <div className="flex items-center justify-between py-4">
                <span className="text-sm text-muted-foreground">
                    {t('page')} {pageCount > 0 ? currentPage + 1 : 0} {t('of')} {pageCount} ({totalItems} {t('itemsTotal')})
                </span>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={previousPage}
                        disabled={!canPreviousPage}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> {t('previous')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={nextPage}
                        disabled={!canNextPage}
                    >
                        {t('next')} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    