
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import type { Hall } from "@/types";
import { PlusCircle, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, ArrowUpDown, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as ShadFormDescription } from "@/components/ui/form";
import { useSimpleTable } from '@/hooks/use-simple-table';
import { PLACEHOLDER_IMAGE_SIZE } from '@/constants';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

// lunchServiceCost and refreshmentServiceCost removed as they are now global tiered prices
const hallSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  itemType: z.enum(["hall", "section"], { required_error: "Item type is required."}),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1." }),
  rentalCost: z.coerce.number().nonnegative({ message: "Rental cost must be zero or positive."}).optional().or(z.literal('')), // Made optional
  isAvailable: z.boolean().default(true),
  ledProjectorCost: z.coerce.number().nonnegative({ message: "LED Projector cost must be zero or positive." }).optional().or(z.literal('')), // Remains optional
  images: z.string().url({ message: "Please enter a valid URL for the image." }).optional().or(z.literal('')),
  dataAiHint: z.string().max(50, { message: "Hint cannot exceed 50 characters."}).optional(),
  description: z.string().max(300, { message: "Description cannot exceed 300 characters." }).optional(),
});
type HallFormValues = z.infer<typeof hallSchema>;

const HALLS_QUERY_KEY = "adminHalls";

const fetchHallsFromDb = async (): Promise<Hall[]> => {
  const q = query(collection(db, "halls"), firestoreOrderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Hall));
};

export default function AdminHallsAndSectionsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Hall | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hallToDeleteId, setHallToDeleteId] = useState<string | null>(null);

  const defaultImage = `https://placehold.co/${PLACEHOLDER_IMAGE_SIZE}.png`;

  const { data: allItemsFromDb = [], isLoading: isLoadingHalls, error: hallsError } = useQuery<Hall[], Error>({
    queryKey: [HALLS_QUERY_KEY],
    queryFn: fetchHallsFromDb,
  });

  const addHallMutation = useMutation<void, Error, HallFormValues>({
    mutationFn: async (values) => {
      const itemData = {
        ...values,
        images: values.images ? [values.images] : [defaultImage],
        dataAiHint: values.dataAiHint || (values.itemType === 'hall' ? "conference hall" : "meeting section"),
        rentalCost: values.rentalCost === '' ? null : Number(values.rentalCost),
        ledProjectorCost: values.itemType === 'section' && values.ledProjectorCost !== '' ? Number(values.ledProjectorCost) : null,
      };
      await addDoc(collection(db, "halls"), itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HALLS_QUERY_KEY] });
      toast({ title: t('success'), description: t('itemAddedSuccessfully') });
      setIsAddDialogOpen(false);
      form.reset({
        name: "", itemType: "hall", capacity: 50, rentalCost: undefined, isAvailable: true,
        ledProjectorCost: undefined,
        images: "", dataAiHint: "meeting space", description: ""
      });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorAddingItem') });
    },
  });

  const editHallMutation = useMutation<void, Error, { id: string; values: HallFormValues }>({
    mutationFn: async ({ id, values }) => {
      const itemRef = doc(db, "halls", id);
      const updatedData = {
          ...values,
          images: values.images ? [values.images] : [defaultImage],
          dataAiHint: values.dataAiHint || (values.itemType === 'hall' ? "conference hall" : "meeting section"),
          rentalCost: values.rentalCost === '' ? null : Number(values.rentalCost),
          ledProjectorCost: values.itemType === 'section' && values.ledProjectorCost !== '' ? Number(values.ledProjectorCost) : null,
      };
      await updateDoc(itemRef, updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HALLS_QUERY_KEY] });
      toast({ title: t('success'), description: t('itemUpdatedSuccessfully') });
      setIsEditDialogOpen(false);
      setCurrentItem(null);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingItem') });
    },
  });

  const deleteHallMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await deleteDoc(doc(db, "halls", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HALLS_QUERY_KEY] });
      toast({ title: t('success'), description: t('itemDeletedSuccessfully') });
      setIsDeleteDialogOpen(false);
      setHallToDeleteId(null);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorDeletingItem') });
    },
  });

  const form = useForm<HallFormValues>({
    resolver: zodResolver(hallSchema),
    defaultValues: {
      name: "", itemType: "hall", capacity: 50, rentalCost: undefined, isAvailable: true,
      ledProjectorCost: undefined,
      images: "", dataAiHint: "meeting space", description: ""
    },
  });

  const editForm = useForm<HallFormValues>({
    resolver: zodResolver(hallSchema),
  });

  const watchedItemType = form.watch("itemType");
  const watchedEditItemType = editForm.watch("itemType");

  const {
    paginatedData: displayedItems,
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
  } = useSimpleTable<Hall>({
      data: allItemsFromDb, 
      rowsPerPage: 10,
      searchKeys: ['name', 'itemType', 'description'],
      initialSort: { key: 'name', direction: 'ascending' },
  });

  const getSortIndicator = (columnKey: keyof Hall) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  async function onSubmit(values: HallFormValues) {
    addHallMutation.mutate(values);
  }

  const handleEdit = (item: Hall) => {
    setCurrentItem(item);
    editForm.reset({
        ...item,
        rentalCost: item.rentalCost ?? undefined,
        images: item.images?.[0] || "",
        dataAiHint: item.dataAiHint || (item.itemType === 'hall' ? "conference hall" : "meeting section"),
        ledProjectorCost: item.ledProjectorCost ?? undefined,
        description: item.description || "",
    });
    setIsEditDialogOpen(true);
  };

  async function onEditSubmit(values: HallFormValues) {
    if (!currentItem) return;
    editHallMutation.mutate({ id: currentItem.id, values });
  }

  const openDeleteDialog = (hallId: string) => {
    setHallToDeleteId(hallId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteHall = async () => {
    if (!hallToDeleteId) return;
    deleteHallMutation.mutate(hallToDeleteId);
  };

  if (hallsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive">{t('errorFetchingHalls')}: {hallsError.message}</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageHallsAndSections')}</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              form.reset({
                name: "", itemType: "hall", capacity: 50, rentalCost: undefined, isAvailable: true,
                ledProjectorCost: undefined,
                images: "", dataAiHint: "meeting space", description: ""
              });
              setIsAddDialogOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('addHallOrSection')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addNewHallOrSection')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>{t('name')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="itemType" render={({ field }) => ( <FormItem><FormLabel>{t('type')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('selectType')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="hall">{t('hall')}</SelectItem><SelectItem value="section">{t('section')}</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>{t('capacity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="rentalCost" render={({ field }) => ( <FormItem><FormLabel>{t('rentalCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('leaveBlankForDefaultPrice')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><ShadFormDescription>{t('priceOverrideInfoFacility')}</ShadFormDescription><FormMessage /></FormItem> )} />
                {/* Removed lunchServiceCost and refreshmentServiceCost fields */}
                {watchedItemType === 'section' && (
                  <FormField control={form.control} name="ledProjectorCost" render={({ field }) => ( <FormItem><FormLabel>{t('ledProjectorCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('leaveBlankForDefaultPrice')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><ShadFormDescription>{t('priceOverrideInfoFacility')}</ShadFormDescription><FormMessage /></FormItem> )} />
                )}
                <FormField control={form.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                <FormField control={form.control} name="images" render={({ field }) => ( <FormItem><FormLabel>{t('imageUrl')} ({t('optional')})</FormLabel><FormControl><Input placeholder={defaultImage} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="dataAiHint" render={({ field }) => ( <FormItem><FormLabel>{t('imageAiHint')} ({t('optional')})</FormLabel><FormControl><Input placeholder={form.getValues("itemType") === "hall" ? t('placeholderConferenceHall') : t('placeholderMeetingSpace')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>{t('description')} ({t('optional')})</FormLabel><FormControl><Textarea placeholder={t('enterDescriptionHere')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" disabled={addHallMutation.isPending}>
                    {addHallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            placeholder={t('searchHallsSections')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
      </div>

      {isLoadingHalls && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

      {!isLoadingHalls && displayedItems.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>{searchTerm ? t('noHallsMatchSearch') : t('noHallsFoundPleaseAdd')}</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingHalls && displayedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('listHallsAndSections')}</CardTitle>
            <CardDescription>{t('viewAndManageHallsAndSections')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('name')} className="cursor-pointer group">{t('name')}{getSortIndicator('name')}</TableHead>
                    <TableHead onClick={() => requestSort('itemType')} className="cursor-pointer group">{t('type')}{getSortIndicator('itemType')}</TableHead>
                    <TableHead onClick={() => requestSort('capacity')} className="cursor-pointer group">{t('capacity')}{getSortIndicator('capacity')}</TableHead>
                    <TableHead onClick={() => requestSort('rentalCost')} className="cursor-pointer group">{t('rentalCost')}{getSortIndicator('rentalCost')}</TableHead>
                    <TableHead onClick={() => requestSort('ledProjectorCost')} className="cursor-pointer group">{t('ledProjectorCost')}{getSortIndicator('ledProjectorCost')}</TableHead>
                    <TableHead onClick={() => requestSort('isAvailable')} className="cursor-pointer group">{t('availability')}{getSortIndicator('isAvailable')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="capitalize">{t(item.itemType)}</TableCell>
                      <TableCell>{item.capacity}</TableCell>
                      <TableCell>{item.rentalCost ? `${item.rentalCost} ${t('currencySymbol')}` : t('usesDefaultPrice')}</TableCell>
                      <TableCell>{item.itemType === 'section' && item.ledProjectorCost ? `${item.ledProjectorCost} ${t('currencySymbol')}` : (item.itemType === 'section' ? t('usesDefaultPrice') : t('notApplicableShort'))}</TableCell>
                      <TableCell>
                        <Badge
                            variant={item.isAvailable ? "default" : "destructive"}
                            className={item.isAvailable ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'}
                        >
                          {item.isAvailable ? t('available') : t('unavailable')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={editHallMutation.isPending || deleteHallMutation.isPending}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">{t('edit')}</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => openDeleteDialog(item.id)} disabled={editHallMutation.isPending || deleteHallMutation.isPending}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t('delete')}</span>
                        </Button>
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

       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editItem')}</DialogTitle>
          </DialogHeader>
          {currentItem && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField control={editForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>{t('name')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="itemType" render={({ field }) => ( <FormItem><FormLabel>{t('type')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('selectType')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="hall">{t('hall')}</SelectItem><SelectItem value="section">{t('section')}</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>{t('capacity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="rentalCost" render={({ field }) => ( <FormItem><FormLabel>{t('rentalCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('leaveBlankForDefaultPrice')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><ShadFormDescription>{t('priceOverrideInfoFacility')}</ShadFormDescription><FormMessage /></FormItem> )} />
                 {/* Removed lunchServiceCost and refreshmentServiceCost fields */}
                {watchedEditItemType === 'section' && (
                  <FormField control={editForm.control} name="ledProjectorCost" render={({ field }) => ( <FormItem><FormLabel>{t('ledProjectorCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('leaveBlankForDefaultPrice')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><ShadFormDescription>{t('priceOverrideInfoFacility')}</ShadFormDescription><FormMessage /></FormItem> )} />
                )}
                <FormField control={editForm.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                <FormField control={editForm.control} name="images" render={({ field }) => ( <FormItem><FormLabel>{t('imageUrl')} ({t('optional')})</FormLabel><FormControl><Input placeholder={defaultImage} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="dataAiHint" render={({ field }) => ( <FormItem><FormLabel>{t('imageAiHint')} ({t('optional')})</FormLabel><FormControl><Input placeholder={editForm.getValues("itemType") === "hall" ? t('placeholderConferenceHall') : t('placeholderMeetingSpace')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>{t('description')} ({t('optional')})</FormLabel><FormControl><Textarea placeholder={t('enterDescriptionHere')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" disabled={editHallMutation.isPending}>
                    {editHallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('saveChanges')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
              {t('confirmDeleteItemTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('confirmDeleteItemMessage')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setHallToDeleteId(null)}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteHall}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteHallMutation.isPending}
          >
            {deleteHallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
    
