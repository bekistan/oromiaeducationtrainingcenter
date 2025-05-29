
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/use-language";
import type { Dormitory } from "@/types";
import { PlusCircle, Edit, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSimpleTable } from '@/hooks/use-simple-table';
import { PLACEHOLDER_THUMBNAIL_SIZE } from '@/constants';

const dormitorySchema = z.object({
  roomNumber: z.string().min(1, { message: "Room number is required." }),
  floor: z.coerce.number().min(0, { message: "Floor must be a positive number." }),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1." }),
  pricePerDay: z.coerce.number().min(0, { message: "Price must be a positive number." }),
  isAvailable: z.boolean().default(true),
  images: z.string().url({ message: "Please enter a valid URL for the image." }).optional().or(z.literal('')),
  dataAiHint: z.string().max(50, { message: "Hint cannot exceed 50 characters."}).optional(),
});
type DormitoryFormValues = z.infer<typeof dormitorySchema>;

export default function AdminDormitoriesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [allDormitories, setAllDormitories] = useState<Dormitory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentDormitory, setCurrentDormitory] = useState<Dormitory | null>(null);

  const defaultImage = `https://placehold.co/${PLACEHOLDER_THUMBNAIL_SIZE}.png`;

  const form = useForm<DormitoryFormValues>({
    resolver: zodResolver(dormitorySchema),
    defaultValues: {
      roomNumber: "",
      floor: 1,
      capacity: 2,
      pricePerDay: 500,
      isAvailable: true,
      images: "",
      dataAiHint: "dormitory room",
    },
  });

  const editForm = useForm<DormitoryFormValues>({
    resolver: zodResolver(dormitorySchema),
  });

  const fetchDormitories = useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "dormitories"));
      const dormsData = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Dormitory));
      setAllDormitories(dormsData.sort((a,b) => (a.floor - b.floor) || a.roomNumber.localeCompare(b.roomNumber)));
    } catch (error) {
      console.error("Error fetching dormitories: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingDormitories') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchDormitories();
  }, [fetchDormitories]);

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
  } = useSimpleTable<Dormitory>({
      initialData: allDormitories,
      rowsPerPage: 10,
      searchKeys: ['roomNumber', 'floor'],
  });

  async function onSubmit(values: DormitoryFormValues) {
    setIsSubmitting(true);
    try {
      const dormData = {
        ...values,
        images: values.images ? [values.images] : [defaultImage],
        dataAiHint: values.dataAiHint || "dormitory room",
      };
      await addDoc(collection(db, "dormitories"), dormData);
      toast({ title: t('success'), description: t('dormitoryAddedSuccessfully') });
      fetchDormitories();
      form.reset({
        roomNumber: "",
        floor: 1,
        capacity: 2,
        pricePerDay: 500,
        isAvailable: true,
        images: "",
        dataAiHint: "dormitory room",
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding dormitory: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorAddingDormitory') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleEdit = (dorm: Dormitory) => {
    setCurrentDormitory(dorm);
    editForm.reset({
        ...dorm,
        images: dorm.images?.[0] || "",
        dataAiHint: dorm.dataAiHint || "dormitory room",
    });
    setIsEditDialogOpen(true);
  };

  async function onEditSubmit(values: DormitoryFormValues) {
    if (!currentDormitory) return;
    setIsSubmitting(true);
    try {
      const dormRef = doc(db, "dormitories", currentDormitory.id);
      const updatedData = {
        ...values,
        images: values.images ? [values.images] : [defaultImage],
        dataAiHint: values.dataAiHint || "dormitory room",
      };
      await updateDoc(dormRef, updatedData);
      toast({ title: t('success'), description: t('dormitoryUpdatedSuccessfully') });
      fetchDormitories();
      setIsEditDialogOpen(false);
      setCurrentDormitory(null);
    } catch (error) {
      console.error("Error updating dormitory: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorUpdatingDormitory') });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async (dormId: string) => {
    if (!confirm(t('confirmDeleteDormitory'))) return;
    try {
        await deleteDoc(doc(db, "dormitories", dormId));
        toast({ title: t('success'), description: t('dormitoryDeletedSuccessfully') });
        fetchDormitories();
    } catch (error) {
        console.error("Error deleting dormitory: ", error);
        toast({ variant: "destructive", title: t('error'), description: t('errorDeletingDormitory') });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageDormitories')}</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              form.reset(); // Reset form to default values when opening
              setIsAddDialogOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('addDormitory')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addNewDormitory')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="roomNumber" render={({ field }) => ( <FormItem><FormLabel>{t('roomNumber')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="floor" render={({ field }) => ( <FormItem><FormLabel>{t('floor')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>{t('capacity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="pricePerDay" render={({ field }) => ( <FormItem><FormLabel>{t('pricePerDay')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                <FormField control={form.control} name="images" render={({ field }) => ( <FormItem><FormLabel>{t('imageUrl')} ({t('optional')})</FormLabel><FormControl><Input placeholder={defaultImage} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="dataAiHint" render={({ field }) => ( <FormItem><FormLabel>{t('imageAiHint')} ({t('optional')})</FormLabel><FormControl><Input placeholder="modern dormitory room" {...field} /></FormControl><FormMessage /></FormItem> )} />
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
            placeholder={t('searchDormitories')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
      </div>

      {isLoading && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

      {!isLoading && displayedDormitories.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>{searchTerm ? t('noDormitoriesMatchSearch') : t('noDormitoriesFoundPleaseAdd')}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && displayedDormitories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dormitoryList')}</CardTitle>
            <CardDescription>{t('viewAndManageDormitories')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('roomNumber')}</TableHead>
                    <TableHead>{t('floor')}</TableHead>
                    <TableHead>{t('capacity')}</TableHead>
                    <TableHead>{t('pricePerDay')}</TableHead>
                    <TableHead>{t('availability')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedDormitories.map((dorm) => (
                    <TableRow key={dorm.id}>
                      <TableCell className="font-medium">{dorm.roomNumber}</TableCell>
                      <TableCell>{dorm.floor}</TableCell>
                      <TableCell>{dorm.capacity}</TableCell>
                      <TableCell>{dorm.pricePerDay} ETB</TableCell>
                      <TableCell>
                        <Badge
                            variant={dorm.isAvailable ? "default" : "destructive"}
                            className={dorm.isAvailable ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'}
                        >
                          {dorm.isAvailable ? t('available') : t('unavailable')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(dorm)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">{t('edit')}</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => handleDelete(dorm.id)}>
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
            <DialogTitle>{t('editDormitory')}</DialogTitle>
          </DialogHeader>
          {currentDormitory && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField control={editForm.control} name="roomNumber" render={({ field }) => ( <FormItem><FormLabel>{t('roomNumber')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="floor" render={({ field }) => ( <FormItem><FormLabel>{t('floor')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>{t('capacity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="pricePerDay" render={({ field }) => ( <FormItem><FormLabel>{t('pricePerDay')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                <FormField control={editForm.control} name="images" render={({ field }) => ( <FormItem><FormLabel>{t('imageUrl')} ({t('optional')})</FormLabel><FormControl><Input placeholder={defaultImage} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="dataAiHint" render={({ field }) => ( <FormItem><FormLabel>{t('imageAiHint')} ({t('optional')})</FormLabel><FormControl><Input placeholder="modern dormitory room" {...field} /></FormControl><FormMessage /></FormItem> )} />
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

    