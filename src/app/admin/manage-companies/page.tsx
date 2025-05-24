
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { useAuth, getMockRegisteredCompanies, updateMockCompanyStatus } from "@/hooks/use-auth"; // Import mock data functions
import type { User } from "@/types";
import { ShieldAlert, CheckCircle, XCircle, Hourglass } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function ManageCompaniesPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<User[]>([]);

  useEffect(() => {
    if (!authLoading && (user?.role === 'admin' || user?.role === 'superadmin')) {
      setCompanies(getMockRegisteredCompanies());
    }
  }, [authLoading, user]);

  const handleApproval = (companyId: string, newStatus: 'approved' | 'rejected') => {
    const success = updateMockCompanyStatus(companyId, newStatus);
    if (success) {
      setCompanies(getMockRegisteredCompanies()); // Refresh list from mock data source
      toast({
        title: t('statusUpdated'), // Add to JSON e.g., "Status Updated"
        description: t('companyStatusUpdated', { companyId, status: t(newStatus) }), // Add to JSON e.g., "Company {companyId} status set to {status}."
      });
    } else {
      toast({ variant: "destructive", title: t('error'), description: t('failedToUpdateStatus') }); // Add to JSON
    }
  };

  const getStatusBadge = (status: User['approvalStatus']) => {
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


  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>{t('loading')}...</p></div>;
  }

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">{t('accessDenied')}</h1>
        <p className="text-muted-foreground">{t('adminOrSuperAdminOnlyPage')}</p> {/* Add to JSON */}
        <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('manageCompaniesTitle')}</h1> {/* Add to JSON e.g., "Manage Companies" */}
      
      <Card>
        <CardHeader>
          <CardTitle>{t('registeredCompaniesList')}</CardTitle> {/* Add to JSON e.g., "Registered Companies" */}
          <CardDescription>{t('viewAndApproveCompanies')}</CardDescription> {/* Add to JSON e.g., "View and approve/reject company registrations." */}
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
              {companies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">{t('noCompaniesFound')}</TableCell> {/* Add to JSON */}
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
                          <CheckCircle className="mr-1 h-4 w-4" /> {t('approveButton')} {/* Add 'approveButton' to JSON */}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleApproval(company.id, 'rejected')} className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700">
                           <XCircle className="mr-1 h-4 w-4" /> {t('rejectButton')} {/* Add 'rejectButton' to JSON */}
                        </Button>
                      </>
                    )}
                     {company.approvalStatus !== 'pending' && (
                        <span className="text-xs text-muted-foreground italic">{t('actionTaken')}</span> /* Add to JSON: e.g. "Action already taken" */
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
