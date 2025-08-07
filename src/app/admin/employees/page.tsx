
"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, orderBy } from 'firebase/firestore';
import type { Employee } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from 'react-hook-form';
import * as z from "zod";
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight, Users, Eye } from "lucide-react";
import { formatDate } from '@/lib/date-utils';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const EMPLOYEES_QUERY_KEY = "employees";

const employeeSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().min(7, { message: "A valid phone number is required." }),
  position: z.string().min(2, { message: "Position is required." }),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

const fetchEmployees = async (): Promise<Employee[]> => {
  const q = query(collection(db, "employees"), orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: (docSnap.data().createdAt as Timestamp)?.toDate().toISOString(),
  } as Employee));
};

export default function ManageEmployeesPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const { data: employees = [], isLoading, error } = useQuery<Employee[], Error>({
    queryKey: [EMPLOYEES_QUERY_KEY],
    queryFn: fetchEmployees,
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: "", phone: "", position: "" },
  });

  const mutation = useMutation<void, Error, { values: EmployeeFormValues; id?: string }>({
    mutationFn: async ({ values, id }) => {
      if (id) {
        await updateDoc(doc(db, "employees", id), values);
      } else {
        const employeeId = `OEC-${uuidv4().slice(0, 8).toUpperCase()}`;
        await addDoc(collection(db, "employees"), { ...values, employeeId, createdAt: serverTimestamp() });
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
      toast({ title: t('success'), description: id ? t('employeeUpdatedSuccessfully') : t('employeeAddedSuccessfully') });
      setIsFormOpen(false);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: t('error'), description: err.message });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (employeeId) => deleteDoc(doc(db, "employees", employeeId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
      toast({ title: t('success'), description: t('employeeDeletedSuccessfully') });
      setIsDeleteDialogOpen(false);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: t('error'), description: err.message });
    },
  });

  const {
    paginatedData,
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
  } = useSimpleTable({
    data: employees,
    rowsPerPage: 10,
    searchKeys: ['name', 'phone', 'position', 'employeeId'],
  });

  const getSortIndicator = (columnKey: keyof Employee) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  const openFormForNew = () => {
    setEmployeeToEdit(null);
    form.reset({ name: "", phone: "", position: "" });
    setIsFormOpen(true);
  };

  const openFormForEdit = (employee: Employee) => {
    setEmployeeToEdit(employee);
    form.reset(employee);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (values: EmployeeFormValues) => {
    mutation.mutate({ values, id: employeeToEdit?.id });
  };
  
  if (authLoading) {
    return <div className="flex justify-center h-40 items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (error) {
    return <div className="text-destructive">{t('errorFetchingEmployees')}: {error.message}</div>;
  }
  
  const canAccess = user?.role === 'superadmin' || user?.role === 'hr_director';
  if (!canAccess) {
      router.push('/admin/dashboard');
      return <div className="flex justify-center h-40 items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('manageEmployees')}</h1>
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('addEmployee')}
          </Button>
        </div>

        <Input
          placeholder={t('searchEmployees')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        {isLoading ? <div className="flex justify-center h-40 items-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
          <Card>
            <CardHeader>
              <CardTitle>{t('employeeList')}</CardTitle>
              <CardDescription>{t('manageEmployeesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('name')} className="cursor-pointer group">{t('name')}{getSortIndicator('name')}</TableHead>
                    <TableHead onClick={() => requestSort('employeeId')} className="cursor-pointer group">{t('employeeId')}{getSortIndicator('employeeId')}</TableHead>
                    <TableHead onClick={() => requestSort('phone')} className="cursor-pointer group">{t('phone')}{getSortIndicator('phone')}</TableHead>
                    <TableHead onClick={() => requestSort('position')} className="cursor-pointer group">{t('position')}{getSortIndicator('position')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? paginatedData.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.employeeId || 'N/A'}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" asChild>
                           <Link href={`/admin/employees/${employee.id}/card`}>
                               <Eye className="h-4 w-4" />
                           </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openFormForEdit(employee)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteConfirm(employee)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">{searchTerm ? t('noEmployeesMatchSearch') : t('noEmployeesAdded')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {pageCount > 1 && (
                <div className="flex items-center justify-between py-4">
                  <span className="text-sm text-muted-foreground">{t('page')} {currentPage + 1} {t('of')} {pageCount}</span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={previousPage} disabled={!canPreviousPage}><ChevronLeft className="h-4 w-4 mr-1"/>{t('previous')}</Button>
                    <Button variant="outline" size="sm" onClick={nextPage} disabled={!canNextPage}>{t('next')}<ChevronRight className="h-4 w-4 ml-1"/></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{employeeToEdit ? t('editEmployee') : t('addEmployee')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('fullName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="position" render={({ field }) => (<FormItem><FormLabel>{t('position')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('save')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeletion')}</AlertDialogTitle>
            <AlertDialogDescription>{t('areYouSureDeleteEmployee', { employeeName: employeeToDelete?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => employeeToDelete && deleteMutation.mutate(employeeToDelete.id)} className="bg-destructive hover:bg-destructive/90" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
