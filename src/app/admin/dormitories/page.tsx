
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import type { Dormitory } from "@/types";
import { PlusCircle, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, AlertTriangle, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as ShadFormDescription } from "@/components/ui/form";
import { useSimpleTable } from '@/hooks/use-simple-table';
import { STATIC_IMAGES } from '@/constants';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ScrollAnimate } from '@/components/shared/scroll-animate';

const dormitorySchema = z.object({
  roomNumber: z.string().min(1, { message: "Room number is required." }),
  floor: z.coerce.number().min(0, { message: "Floor must be a positive number." }),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1." }),
  pricePerDay: z.coerce.number().nonnegative({ message: "Price must be zero or positive."}).optional().or(z.literal('')),
  isAvailable: z.boolean().default(true),
  buildingName: z.enum(['ifaboru', 'buuraboru'], { required_error: "Building name is required." }),
  images: z.string({ required_error: "An image is required."}).optional(),
  dataAiHint: z.string().max(50, { message: "Hint cannot exceed 50 characters."}).optional(),
});
type DormitoryFormValues = z.infer<typeof dormitorySchema>;

const DORMITORIES_QUERY_KEY = "dormitories";

const fetchDormitoriesFromDb = async (): Promise<Dormitory[]> => {
  const q = query(collection(db, "dormitories"), firestoreOrderBy("buildingName"), firestoreOrderBy("floor", "asc"), firestoreOrderBy("roomNumber", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Dormitory));
};

export default function AdminDormitoriesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentDormitory, setCurrentDormitory] = useState<Dormitory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dormitoryToDeleteId, setDormitoryToDeleteId] = useState<string | null>(null);

  const defaultImage = STATIC_IMAGES.find(img => img.path.includes('dorm_room'))?.path || STATIC_IMAGES[0]?.path || '';

  const { data: allDormitoriesFromDb = [], isLoading: isLoadingDormitories, error: dormitoriesError } = useQuery<Dormitory[], Error>({
    queryKey: [DORMITORIES_QUERY_KEY],
    queryFn: fetchDormitoriesFromDb,
  });

  const filteredDormitoriesForAdmin = useMemo(() => {
    if (isLoadingDormitories || !allDormitoriesFromDb) return [];
    
    if (user?.role === 'admin' && user.buildingAssignment) {
      return allDormitoriesFromDb.filter(dorm => dorm.buildingName === user.buildingAssignment);
    }
    
    if (user?.role === 'superadmin' || (user?.role === 'admin' && !user.buildingAssignment)) {
        return allDormitoriesFromDb;
    }

    return [];
  }, [allDormitoriesFromDb, user, isLoadingDormitories]);

  const addDormitoryMutation = useMutation<void, Error, DormitoryFormValues>({
    mutationFn: async (values) => {
      const dormData = {
        ...values,
        buildingName: (user?.role === 'admin' && user.buildingAssignment) ? user.buildingAssignment : values.buildingName,
        images: values.images ? [values.images] : [defaultImage],
        dataAiHint: values.dataAiHint || "dormitory room",
        pricePerDay: values.pricePerDay === '' ? null : Number(values.pricePerDay),
      };
      await addDoc(collection(db, "dormitories"), dormData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DORMITORIES_QUERY_KEY] });
      toast({ title: t('success'), description: t('dormitoryAddedSuccessfully') });
      setIsAddDialogOpen(false);
      form.reset({
        roomNumber: "", floor: 1, capacity: 2, pricePerDay: undefined, isAvailable: true, images: defaultImage, dataAiHint: "dormitory room",
        buildingName: user?.role === 'admin' && user.buildingAssignment ? user.buildingAssignment : undefined,
      });
    },
    onError: (error) => {
      console.error("Error adding dormitory: ", error);
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorAddingDormitory') });
    },
  });

  const editDormitoryMutation = useMutation<void, Error, { id: string; values: DormitoryFormValues }>({
    mutationFn: async ({ id, values }) => {
      const dormRef = doc(db, "dormitories", id);
      const updatedData: Partial<Dormitory> = {
        ...values,
        buildingName: (user?.role === 'admin' && user.buildingAssignment) ? user.buildingAssignment : values.buildingName,
        images: values.images ? [values.images] : [defaultImage],
        dataAiHint: values.dataAiHint || "dormitory room",
        pricePerDay: values.pricePerDay === '' ? null : Number(values.pricePerDay),
      };
      await updateDoc(dormRef, updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DORMITORIES_QUERY_KEY] });
      toast({ title: t('success'), description: t('dormitoryUpdatedSuccessfully') });
      setIsEditDialogOpen(false);
      setCurrentDormitory(null);
    },
    onError: (error) => {
      console.error("Error updating dormitory: ", error);
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingDormitory') });
    },
  });

  const deleteDormitoryMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await deleteDoc(doc(db, "dormitories", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DORMITORIES_QUERY_KEY] });
      toast({ title: t('success'), description: t('dormitoryDeletedSuccessfully') });
      setIsDeleteDialogOpen(false);
      setDormitoryToDeleteId(null);
    },
    onError: (error) => {
      console.error("Error deleting dormitory: ", error);
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorDeletingDormitory') });
    },
  });


  const form = useForm<DormitoryFormValues>({
    resolver: zodResolver(dormitorySchema),
    defaultValues: {
      roomNumber: "", floor: 1, capacity: 2, pricePerDay: undefined, isAvailable: true, images: defaultImage, dataAiHint: "dormitory room",
      buildingName: user?.role === 'admin' && user.buildingAssignment ? user.buildingAssignment : undefined,
    },
  });

  const editForm = useForm<DormitoryFormValues>({
    resolver: zodResolver(dormitorySchema),
  });

  const {
    paginatedData: displayedDormitories,
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
  } = useSimpleTable<Dormitory>({
      data: filteredDormitoriesForAdmin, 
      rowsPerPage: 10,
      searchKeys: ['roomNumber', 'floor', 'buildingName'],
      initialSort: { key: 'buildingName', direction: 'ascending' },
  });

  const getSortIndicator = (columnKey: keyof Dormitory) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  async function onSubmit(values: DormitoryFormValues) {
    addDormitoryMutation.mutate(values);
  }

  const handleEdit = (dorm: Dormitory) => {
    setCurrentDormitory(dorm);
    editForm.reset({
        ...dorm,
        pricePerDay: dorm.pricePerDay ?? undefined,
        images: dorm.images?.[0] || "",
        dataAiHint: dorm.dataAiHint || "dormitory room",
        buildingName: dorm.buildingName,
    });
    setIsEditDialogOpen(true);
  };

  async function onEditSubmit(values: DormitoryFormValues) {
    if (!currentDormitory) return;
    editDormitoryMutation.mutate({ id: currentDormitory.id, values });
  }

  const openDeleteDialog = (dormId: string) => {
    setDormitoryToDeleteId(dormId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteDormitory = async () => {
    if (!dormitoryToDeleteId) return;
    deleteDormitoryMutation.mutate(dormitoryToDeleteId);
  };

  if (dormitoriesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive">{t('errorFetchingDormitories')}: {dormitoriesError.message}</p>
      </div>
    );
  }

  return (
    <>
    <ScrollAnimate className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageDormitories')}</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              form.reset({
                roomNumber: "", floor: 1, capacity: 2, pricePerDay: undefined, isAvailable: true, images: defaultImage, dataAiHint: "dormitory room",
                buildingName: user?.role === 'admin' && user.buildingAssignment ? user.buildingAssignment : undefined,
              });
              setIsAddDialogOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('addDormitory')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addNewDormitory')}</DialogTitle>
              <DialogDescription>
                Fill in the details to register a new dormitory room.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="roomNumber" render={({ field }) => ( <FormItem><FormLabel>{t('roomNumber')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField
                  control={form.control}
                  name="buildingName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('buildingNameLabel')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={user?.role === 'admin' && !!user.buildingAssignment}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectBuildingNamePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ifaboru">{t('ifaBoruBuilding')}</SelectItem>
                          <SelectItem value="buuraboru">{t('buuraBoruBuilding')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="floor" render={({ field }) => ( <FormItem><FormLabel>{t('floor')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>{t('capacity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="pricePerDay" render={({ field }) => ( <FormItem><FormLabel>{t('pricePerDay')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('leaveBlankForDefaultPrice')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><ShadFormDescription>{t('priceOverrideInfo')}</ShadFormDescription><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                 <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('featuredImage')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectAnImage')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATIC_IMAGES.map((image) => (
                            <SelectItem key={image.path} value={image.path}>
                              {image.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" disabled={addDormitoryMutation.isPending}>
                    {addDormitoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('submit')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
          <Input
            placeholder={t('searchDormitories')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
      </div>

      {isLoadingDormitories && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

      {!isLoadingDormitories && displayedDormitories.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>{searchTerm ? t('noDormitoriesMatchSearch') : t('noDormitoriesFoundPleaseAdd')}</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingDormitories && displayedDormitories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dormitoryList')}</CardTitle>
            <CardDescription>{t('viewAndManageDormitories')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => requestSort('roomNumber')} className="cursor-pointer group">{t('roomNumber')}{getSortIndicator('roomNumber')}</TableHead>
                  <TableHead onClick={() => requestSort('buildingName')} className="cursor-pointer group">{t('buildingNameLabel')}{getSortIndicator('buildingName')}</TableHead>
                  <TableHead onClick={() => requestSort('floor')} className="cursor-pointer group">{t('floor')}{getSortIndicator('floor')}</TableHead>
                  <TableHead onClick={() => requestSort('capacity')} className="cursor-pointer group">{t('capacity')}{getSortIndicator('capacity')}</TableHead>
                  <TableHead onClick={() => requestSort('pricePerDay')} className="cursor-pointer group">{t('pricePerDay')}{getSortIndicator('pricePerDay')}</TableHead>
                  <TableHead onClick={() => requestSort('isAvailable')} className="cursor-pointer group">{t('availability')}{getSortIndicator('isAvailable')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedDormitories.map((dorm) => (
                  <TableRow key={dorm.id}>
                    <TableCell className="font-medium">{dorm.roomNumber}</TableCell>
                    <TableCell>{t(dorm.buildingName === 'ifaboru' ? 'ifaBoruBuilding' : 'buuraBoruBuilding')}</TableCell>
                    <TableCell>{dorm.floor}</TableCell>
                    <TableCell>{dorm.capacity}</TableCell>
                    <TableCell>{dorm.pricePerDay ? `${dorm.pricePerDay} ${t('currencySymbol')}` : t('usesDefaultPrice')}</TableCell>
                    <TableCell>
                      <Badge
                          variant={dorm.isAvailable ? "default" : "destructive"}
                          className={dorm.isAvailable ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'}
                      >
                        {dorm.isAvailable ? t('available') : t('unavailable')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dorm)} disabled={editDormitoryMutation.isPending}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">{t('edit')}</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => openDeleteDialog(dorm.id)} disabled={deleteDormitoryMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t('delete')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editDormitory')}</DialogTitle>
            <DialogDescription>
              Update the details for the selected dormitory room.
            </DialogDescription>
          </DialogHeader>
          {currentDormitory && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField control={editForm.control} name="roomNumber" render={({ field }) => ( <FormItem><FormLabel>{t('roomNumber')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField
                  control={editForm.control}
                  name="buildingName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('buildingNameLabel')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={user?.role === 'admin' && !!user.buildingAssignment}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectBuildingNamePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ifaboru">{t('ifaBoruBuilding')}</SelectItem>
                          <SelectItem value="buuraboru">{t('buuraBoruBuilding')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={editForm.control} name="floor" render={({ field }) => ( <FormItem><FormLabel>{t('floor')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>{t('capacity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="pricePerDay" render={({ field }) => ( <FormItem><FormLabel>{t('pricePerDay')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('leaveBlankForDefaultPrice')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><ShadFormDescription>{t('priceOverrideInfo')}</ShadFormDescription><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                <FormField
                  control={editForm.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('featuredImage')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectAnImage')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATIC_IMAGES.map((image) => (
                            <SelectItem key={image.path} value={image.path}>
                              {image.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" disabled={editDormitoryMutation.isPending}>
                    {editDormitoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('saveChanges')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </ScrollAnimate>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                {t('confirmDeleteDormitoryTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteDormitoryMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDormitoryToDeleteId(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDormitory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDormitoryMutation.isPending}
            >
              {deleteDormitoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
