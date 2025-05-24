
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import type { Hall } from "@/types";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Placeholder data for seeding
const sampleManageableItemsForSeed: Omit<Hall, 'id'>[] = [
  { name: "Grand Meeting Hall A", itemType: "hall", capacity: 100, isAvailable: true, rentalCost: 5000, lunchServiceCost: 300, refreshmentServiceCost: 100, images: ["https://placehold.co/600x400.png"], dataAiHint: "conference hall", description: "Main hall for large events" },
  { name: "Training Section Alpha", itemType: "section", capacity: 30, isAvailable: true, rentalCost: 2000, refreshmentServiceCost: 80, images: ["https://placehold.co/600x400.png"], dataAiHint: "training room", description: "Section for training" },
  { name: "Workshop Area Beta", itemType: "section", capacity: 20, isAvailable: false, rentalCost: 1500, images: ["https://placehold.co/600x400.png"], dataAiHint: "workshop space", description: "Section for workshops" },
];

const hallSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  itemType: z.enum(["hall", "section"], { required_error: "Item type is required."}),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1." }),
  rentalCost: z.coerce.number().min(0, { message: "Rental cost must be a positive number." }),
  isAvailable: z.boolean().default(true),
  lunchServiceCost: z.coerce.number().optional(),
  refreshmentServiceCost: z.coerce.number().optional(),
  images: z.string().optional(),
  dataAiHint: z.string().optional(),
  description: z.string().optional(),
});
type HallFormValues = z.infer<typeof hallSchema>;

export default function AdminHallsAndSectionsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<Hall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Hall | null>(null);


  const form = useForm<HallFormValues>({
    resolver: zodResolver(hallSchema),
    defaultValues: {
      name: "",
      itemType: "hall",
      capacity: 50,
      rentalCost: 1000,
      isAvailable: true,
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
      const querySnapshot = await getDocs(collection(db, "halls")); // Firestore collection named 'halls'
      const itemsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hall));
      setItems(itemsData);
    } catch (error) {
      console.error("Error fetching halls/sections: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingHalls') }); // Add to JSON
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      sampleManageableItemsForSeed.forEach(item => {
        const docRef = doc(collection(db, "halls"));
        batch.set(docRef, item);
      });
      await batch.commit();
      toast({ title: t('success'), description: t('hallsDataSeeded') }); // Add to JSON
      fetchItems();
    } catch (error) {
      console.error("Error seeding halls/sections: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorSeedingHalls') }); // Add to JSON
    } finally {
      setIsSeeding(false);
    }
  };
  
  async function onSubmit(values: HallFormValues) {
    setIsSubmitting(true);
    try {
      const itemData = { ...values, images: values.images ? [values.images] : [] };
      await addDoc(collection(db, "halls"), itemData);
      toast({ title: t('success'), description: t('itemAddedSuccessfully') }); // Add to JSON
      fetchItems();
      form.reset();
      // Close dialog
    } catch (error) {
      console.error("Error adding item: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorAddingItem') }); // Add to JSON
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleEdit = (item: Hall) => {
    setCurrentItem(item);
    editForm.reset({
        ...item,
        images: item.images?.[0] || "",
        lunchServiceCost: item.lunchServiceCost ?? undefined, // Handle optional number
        refreshmentServiceCost: item.refreshmentServiceCost ?? undefined, // Handle optional number
    });
    setIsEditDialogOpen(true);
  };

  async function onEditSubmit(values: HallFormValues) {
    if (!currentItem) return;
    setIsSubmitting(true);
    try {
      const itemRef = doc(db, "halls", currentItem.id);
      const updatedData = { 
          ...values, 
          images: values.images ? [values.images] : [],
          lunchServiceCost: values.lunchServiceCost || null, // Store as null if empty
          refreshmentServiceCost: values.refreshmentServiceCost || null, // Store as null if empty
      };
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
    if (!confirm(t('confirmDeleteItem'))) return; // Add to JSON
    try {
        await deleteDoc(doc(db, "halls", itemId));
        toast({ title: t('success'), description: t('itemDeletedSuccessfully') });
        fetchItems();
    } catch (error) {
        console.error("Error deleting item: ", error);
        toast({ variant: "destructive", title: t('error'), description: t('errorDeletingItem') });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageHallsAndSections')}</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('addHallOrSection')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addNewHallOrSection')}</DialogTitle> {/* Add to JSON */}
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>{t('name')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="itemType" render={({ field }) => ( <FormItem><FormLabel>{t('type')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('selectType')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="hall">{t('hall')}</SelectItem><SelectItem value="section">{t('section')}</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>{t('capacity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="rentalCost" render={({ field }) => ( <FormItem><FormLabel>{t('rentalCost')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="lunchServiceCost" render={({ field }) => ( <FormItem><FormLabel>{t('lunchServiceCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="refreshmentServiceCost" render={({ field }) => ( <FormItem><FormLabel>{t('refreshmentServiceCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                <FormField control={form.control} name="images" render={({ field }) => ( <FormItem><FormLabel>{t('imageUrl')}</FormLabel><FormControl><Input placeholder="https://placehold.co/600x400.png" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="dataAiHint" render={({ field }) => ( <FormItem><FormLabel>{t('imageAiHint')}</FormLabel><FormControl><Input placeholder="meeting space" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>{t('description')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <DialogFooter>
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
      
      {items.length === 0 && !isLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4">{t('noHallsFoundCta')}</p> {/* Add to JSON: "No halls or sections found. Would you like to add some initial sample data?" */}
            <Button onClick={handleSeedData} disabled={isSeeding}>
              {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('seedInitialHalls')} {/* Add to JSON */}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('listHallsAndSections')}</CardTitle>
          <CardDescription>{t('viewAndManageHallsAndSections')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('capacity')}</TableHead>
                <TableHead>{t('rentalCost')}</TableHead>
                <TableHead>{t('availability')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="capitalize">{t(item.itemType)}</TableCell>
                  <TableCell>{item.capacity}</TableCell>
                  <TableCell>{item.rentalCost} ETB</TableCell>
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editItem')}</DialogTitle> {/* Add to JSON */}
          </DialogHeader>
          {currentItem && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField control={editForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>{t('name')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="itemType" render={({ field }) => ( <FormItem><FormLabel>{t('type')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('selectType')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="hall">{t('hall')}</SelectItem><SelectItem value="section">{t('section')}</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>{t('capacity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="rentalCost" render={({ field }) => ( <FormItem><FormLabel>{t('rentalCost')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="lunchServiceCost" render={({ field }) => ( <FormItem><FormLabel>{t('lunchServiceCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="refreshmentServiceCost" render={({ field }) => ( <FormItem><FormLabel>{t('refreshmentServiceCost')} ({t('optional')})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="isAvailable" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('available')}</FormLabel></div></FormItem> )} />
                <FormField control={editForm.control} name="images" render={({ field }) => ( <FormItem><FormLabel>{t('imageUrl')}</FormLabel><FormControl><Input placeholder="https://placehold.co/600x400.png" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="dataAiHint" render={({ field }) => ( <FormItem><FormLabel>{t('imageAiHint')}</FormLabel><FormControl><Input placeholder="meeting space" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={editForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>{t('description')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
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
