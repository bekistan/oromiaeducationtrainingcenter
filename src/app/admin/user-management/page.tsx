
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/types";
import { Edit, Trash2, Loader2, ChevronLeft, ChevronRight, AlertTriangle, ArrowUpDown, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSimpleTable } from '@/hooks/use-simple-table';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

const userEditSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['superadmin', 'admin', 'keyholder', 'store_manager', 'company_representative', 'individual']),
  buildingAssignment: z.enum(['ifaboru', 'buuraboru', 'none']).optional(),
}).refine(data => data.role === 'admin' ? data.buildingAssignment !== undefined : true, {
    message: "Building assignment is required for admins.",
    path: ["buildingAssignment"],
});

type UserFormValues = z.infer<typeof userEditSchema>;

const USERS_QUERY_KEY = "allUsers";

const fetchUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
};

export default function UserManagementPage() {
  const { t } = useLanguage();
  const { user: currentUser, loading: authLoading, updateUserDocument } = useAuth();
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();
  const router = useRouter();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data: allUsers = [], isLoading: isLoadingUsers, error: usersError } = useQuery<User[], Error>({
    queryKey: [USERS_QUERY_KEY],
    queryFn: fetchUsers,
    enabled: !authLoading && currentUser?.role === 'superadmin',
  });
  
  const editUserMutation = useMutation<void, Error, { id: string; values: UserFormValues }>({
    mutationFn: async ({ id, values }) => {
        const updateData: Partial<User> = {
            name: values.name,
            phone: values.phone || '',
            role: values.role,
        };
        if (values.role === 'admin') {
            updateData.buildingAssignment = values.buildingAssignment === 'none' ? null : values.buildingAssignment;
        } else {
            updateData.buildingAssignment = null;
        }
        await updateUserDocument(id, updateData);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        toast({ title: t('success'), description: t('userUpdatedSuccessfully') });
        setIsEditDialogOpen(false);
    },
    onError: (error) => {
        toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingUser') });
    }
  });

  const deleteUserMutation = useMutation<void, Error, string>({
    mutationFn: async (userId: string) => {
      // NOTE: This only deletes the Firestore document, not the Firebase Auth user.
      await deleteDoc(doc(db, "users", userId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast({ title: t('success'), description: t('userDeletedSuccessfully') });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorDeletingUser') });
    },
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userEditSchema),
  });
  
  const watchedRole = form.watch("role");

  const {
    paginatedData: displayedUsers,
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
      data: allUsers,
      rowsPerPage: 10,
      searchKeys: ['name', 'email', 'phone', 'role', 'companyName'],
      initialSort: { key: 'name', direction: 'ascending' },
  });

  const getSortIndicator = (columnKey: keyof User) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  const handleEdit = (user: User) => {
    setCurrentUserToEdit(user);
    form.reset({
        name: user.name || '',
        phone: user.phone || '',
        role: user.role,
        buildingAssignment: user.buildingAssignment || 'none',
    });
    setIsEditDialogOpen(true);
  };
  
  function onEditSubmit(values: UserFormValues) {
    if (!currentUserToEdit) return;
    editUserMutation.mutate({ id: currentUserToEdit.id, values });
  }

  const openDeleteDialog = (user: User) => {
    if (currentUser?.id === user.id) {
        toast({ variant: 'destructive', title: t('error'), description: t('cannotDeleteSelf') });
        return;
    }
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    deleteUserMutation.mutate(userToDelete.id);
  };

  const roleBadges: Record<User['role'], React.ReactNode> = {
    superadmin: <Badge className="bg-red-200 text-red-800">{t('superadmin')}</Badge>,
    admin: <Badge className="bg-purple-200 text-purple-800">{t('admin')}</Badge>,
    keyholder: <Badge className="bg-blue-200 text-blue-800">{t('keyholder')}</Badge>,
    store_manager: <Badge className="bg-orange-200 text-orange-800">{t('storeManager')}</Badge>,
    company_representative: <Badge className="bg-green-200 text-green-800">{t('companyRepresentative')}</Badge>,
    individual: <Badge className="bg-gray-200 text-gray-800">{t('individual')}</Badge>,
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (currentUser?.role !== 'superadmin') {
     return (
      <Card className="w-full max-w-md mx-auto my-8">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('superAdminOnlyPage')}</p>
          <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
        </CardContent>
      </Card>
    );
  }

  if (usersError) {
     return <p className="text-destructive">{t('errorFetchingUsers')}: {usersError.message}</p>;
  }

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('userManagement')}</h1>
        <Input
          placeholder={t('searchUsers')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        {isLoadingUsers && <div className="flex justify-center h-40 items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        
        {!isLoadingUsers && (
          <Card>
            <CardHeader><CardTitle>{t('allUsers')}</CardTitle><CardDescription>{t('viewAndManageAllUsers')}</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('name')} className="cursor-pointer group">{t('name')}{getSortIndicator('name')}</TableHead>
                    <TableHead onClick={() => requestSort('email')} className="cursor-pointer group">{t('email')}{getSortIndicator('email')}</TableHead>
                    <TableHead onClick={() => requestSort('phone')} className="cursor-pointer group">{t('phone')}{getSortIndicator('phone')}</TableHead>
                    <TableHead onClick={() => requestSort('role')} className="cursor-pointer group">{t('role')}{getSortIndicator('role')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name || t('notAvailable')}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || t('notProvided')}</TableCell>
                      <TableCell>{roleBadges[user.role] || user.role}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} disabled={editUserMutation.isPending}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(user)} disabled={deleteUserMutation.isPending || currentUser?.id === user.id}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between py-4">
                <span className="text-sm text-muted-foreground">{t('page')} {pageCount > 0 ? currentPage + 1 : 0} {t('of')} {pageCount} ({totalItems} {t('itemsTotal')})</span>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={previousPage} disabled={!canPreviousPage}>{t('previous')}</Button>
                  <Button variant="outline" size="sm" onClick={nextPage} disabled={!canNextPage}>{t('next')}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('editUser')}</DialogTitle><DialogDescription>{t('editUserDetailsBelow')}</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('fullName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>{t('role')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.keys(roleBadges).map(role => (<SelectItem key={role} value={role}>{t(role)}</SelectItem>))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              {watchedRole === 'admin' && (
                <FormField control={form.control} name="buildingAssignment" render={({ field }) => (
                  <FormItem><FormLabel>{t('buildingAssignment')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t('generalAdminNoSpecificBuilding')}</SelectItem>
                        <SelectItem value="ifaboru">{t('ifaBoruBuilding')}</SelectItem>
                        <SelectItem value="buuraboru">{t('buuraBoruBuilding')}</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={editUserMutation.isPending}>{editUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('saveChanges')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive" />{t('confirmUserDeletion')}</AlertDialogTitle>
            <AlertDialogDescription>
                {t('confirmUserDeletionMessage', {email: userToDelete?.email || ''})}
                <br /><br />
                <span className="font-semibold text-destructive">{t('deleteUserWarning')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive hover:bg-destructive/90" disabled={deleteUserMutation.isPending}>{deleteUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('deleteUser')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
