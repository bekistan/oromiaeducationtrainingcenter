
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import type { Hall } from "@/types";
import { PlusCircle, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSimpleTable } from '@/hooks/use-simple-table';
import { PLACEHOLDER_IMAGE_SIZE } from '@/constants';

const hallSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  itemType: z.enum(["hall", "section"], { required_error: "Item type is required."}),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1." }),
  rentalCost: z.coerce.number().min(0, { message: "Rental cost must be a positive number." }),
  isAvailable: z.boolean().default(true),
  lunchServiceCost: z.coerce.number().nonnegative({ message: "Cost must be zero or positive." }).optional().or(z.literal('')),
  refreshmentServiceCost: z.coerce.number().nonnegative({ message: "Cost must be zero or positive." }).optional().or(z.literal('')),
  images: z.string().url({ message: "Please enter a valid URL for the image." }).optional().or(z.literal('')),
  dataAiHint: z.string().max(50, { message: "Hint cannot exceed 50 characters."}).optional(),
  description: z.string().max(300, { message: "Description cannot exceed 300 characters." }).optional(),
});
type HallFormValues = z.infer<typeof hallSchema>;

export default function AdminHallsAndSectionsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [allItems, setAllItems] = useState<Hall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Hall | null>(null);

  const defaultImage = `https://placehold.co/${PLACEHOLDER_IMAGE_SIZE}.png`;

  const form = useForm<HallFormValues>({
    resolver: zodResolver(hallSchema),
    defaultValues: {
      name: "",
      itemType: "hall",
      capacity: 50,
      rentalCost: 1000,
      isAvailable: true,
      lunchServiceCost: undefined,
      refreshmentServiceCost: undefined,
      images: "",
      dataAiHint: "meeting space",
      description: ""
    },
  });

  const editForm = useForm<HallFormValues>({
    resolver: zodResolver(hallSchema),
  });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "halls"));
      const itemsData = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Hall));
      setAllItems(itemsData);
    } catch (error) {
      console.error("Error fetching halls/sections: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingHalls') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
      initialData: allItems,
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
    setIsSubmitting(true);
    console.log("Hall/Section Add - Form values:", values);
    console.log("Hall/Section Add - isAvailable from form values:", values.isAvailable);
    try {
      const itemData = {
        ...values,
        images: values.images ? [values.images] : [defaultImage],
        dataAiHint: values.dataAiHint || (values.itemType === 'hall' ? "conference hall" : "meeting section"),
        lunchServiceCost: values.lunchServiceCost === '' ? null : Number(values.lunchServiceCost) || null,
        refreshmentServiceCost: values.refreshmentServiceCost === '' ? null : Number(values.refreshmentServiceCost) || null,
      };
      console.log("Hall/Section Add - Data being sent to Firestore:", itemData);
      await addDoc(collection(db, "halls"), itemData);
      toast({ title: t('success'), description: t('itemAddedSuccessfully') });
      fetchItems();
      form.reset({
        name: "",
        itemType: "hall",
        capacity: 50,
        rentalCost: 1000,
        isAvailable: true,
        lunchServiceCost: undefined,
        refreshmentServiceCost: undefined,
        images: "",
        dataAiHint: "meeting space",
        description: ""
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding item: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorAddingItem') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleEdit = (item: Hall) => {
    setCurrentItem(item);
    editForm.reset({
        ...item,
        images: item.images?.[0] || "",
        dataAiHint: item.dataAiHint || (item.itemType === 'hall' ? "conference hall" : "meeting section"),
        lunchServiceCost: item.lunchServiceCost ?? undefined,
        refreshmentServiceCost: item.refreshmentServiceCost ?? undefined,
        description: item.description || "",
    });
    setIsEditDialogOpen(true);
  };

  async function onEditSubmit(values: HallFormValues) {
    if (!currentItem) return;
    setIsSubmitting(true);
    console.log("Hall/Section Edit - Form values:", values);
    console.log("Hall/Section Edit - isAvailable from form values:", values.isAvailable);
    try {
      const itemRef = doc(db, "halls", currentItem.id);
      const updatedData = {
          ...values,
          images: values.images ? [values.images] : [defaultImage],
          dataAiHint: values.dataAiHint || (values.itemType === 'hall' ? "conference hall" : "meeting section"),
          lunchServiceCost: values.lunchServiceCost === '' ? null : Number(values.lunchServiceCost) || null,
          refreshmentServiceCost: values.refreshmentServiceCost === '' ? null : Number(values.refreshmentServiceCost) || null,
      };
      console.log("Hall/Section Edit - Data being sent to Firestore:", updatedData);
      await updateDoc(itemRef, updatedData);
      toast({ title: t('success'), description: t('itemUpdatedSuccessfully') });
      fetchItems();
      setIsEditDialogOpen(false);
      setCurrentItem(null);
    } catch (error) {
      console.error("Error updating item: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorUpdatingItem') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm(t('confirmDeleteItem'))) return;
    try {
        await deleteDoc(doc(db, "halls", itemId));
        toast({ title: t('success'), description: t('itemDeletedSuccessfully') });
        fetchItems();
    } catch (error) {
        console.error("Error deleting item: ", error);
        toast({ variant: "destructive", title: t('error'), description: t('errorDeletingItem') });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageHallsAndSections')}</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              form.reset({
                name: "",
                itemType: "hall",
                capacity: 50,
                rentalCost: 1000,
                isAvailable: true,
                lunchServiceCost: undefined,
                refreshmentServiceCost: undefined,
                images: "",
                dataAiHint: "meeting space",
                description: ""
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
                <FormField control={form.control} name="rentalCost" render={({ field }) => ( <FormItem><FormLabel>{t('rentalCost')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="lunchServiceCost" render={({ field }) => ( <FormItem><FormLabel>{t('lunchServiceCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('exampleCostLunch')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="refreshmentServiceCost" render={({ field }) => ( <FormItem><FormLabel>{t('refreshmentServiceCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('exampleCostRefreshment')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                <FormField control={form.control} name="images" render={({ field }) => ( <FormItem><FormLabel>{t('imageUrl')} ({t('optional')})</FormLabel><FormControl><Input placeholder={defaultImage} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="dataAiHint" render={({ field }) => ( <FormItem><FormLabel>{t('imageAiHint')} ({t('optional')})</FormLabel><FormControl><Input placeholder={form.getValues("itemType") === "hall" ? t('placeholderConferenceHall') : t('placeholderMeetingSpace')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>{t('description')} ({t('optional')})</FormLabel><FormControl><Textarea placeholder={t('enterDescriptionHere')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

      {isLoading && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

      {!isLoading && displayedItems.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>{searchTerm ? t('noHallsMatchSearch') : t('noHallsFoundPleaseAdd')}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && displayedItems.length > 0 && (
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
                      <TableCell>{item.rentalCost} {t('currencySymbol')}</TableCell>
                      <TableCell>
                        <Badge
                            variant={item.isAvailable ? "default" : "destructive"}
                            className={item.isAvailable ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'}
                        >
                          {item.isAvailable ? t('available') : t('unavailable')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">{t('edit')}</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => handleDelete(item.id)}>
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
                <FormField control={editForm.control} name="rentalCost" render={({ field }) => ( <FormItem><FormLabel>{t('rentalCost')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="lunchServiceCost" render={({ field }) => ( <FormItem><FormLabel>{t('lunchServiceCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('exampleCostLunch')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="refreshmentServiceCost" render={({ field }) => ( <FormItem><FormLabel>{t('refreshmentServiceCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" placeholder={t('exampleCostRefreshment')} {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                <FormField control={editForm.control} name="images" render={({ field }) => ( <FormItem><FormLabel>{t('imageUrl')} ({t('optional')})</FormLabel><FormControl><Input placeholder={defaultImage} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="dataAiHint" render={({ field }) => ( <FormItem><FormLabel>{t('imageAiHint')} ({t('optional')})</FormLabel><FormControl><Input placeholder={editForm.getValues("itemType") === "hall" ? t('placeholderConferenceHall') : t('placeholderMeetingSpace')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>{t('description')} ({t('optional')})</FormLabel><FormControl><Textarea placeholder={t('enterDescriptionHere')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('saveChanges')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

    