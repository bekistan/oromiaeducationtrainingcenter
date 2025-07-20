"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { StoreItem } from '@/types';
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
import * as z from "zod";
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date-utils';

const STORE_ITEMS_QUERY_KEY = "storeItems";
const LOW_STOCK_THRESHOLD = 10;

const itemSchema = z.object({
  name: z.string().min(2, { message: "Item name must be at least 2 characters." }),
  category: z.string().min(2, { message: "Category is required." }),
  quantity: z.coerce.number().min(0, { message: "Quantity must be a non-negative number." }),
  unit: z.string().min(1, { message: "Unit (e.g., pcs, kg) is required." }),
  notes: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

const fetchStoreItems = async (): Promise<StoreItem[]> => {
  const querySnapshot = await getDocs(collection(db, "store_items"));
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
    lastUpdated: (docSnap.data().lastUpdated as Timestamp).toDate().toISOString(),
  } as StoreItem));
};

export default function ManageStockPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StoreItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<StoreItem | null>(null);

  const { data: storeItems = [], isLoading, error } = useQuery<StoreItem[], Error>({
    queryKey: [STORE_ITEMS_QUERY_KEY],
    queryFn: fetchStoreItems,
  });

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", category: "", quantity: 0, unit: "pcs", notes: "" },
  });

  const mutation = useMutation<void, Error, { values: ItemFormValues; id?: string }>({
    mutationFn: async ({ values, id }) => {
      const itemData = {
        ...values,
        lastUpdated: serverTimestamp(),
      };
      if (id) {
        await updateDoc(doc(db, "store_items", id), itemData);
      } else {
        await addDoc(collection(db, "store_items"), itemData);
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [STORE_ITEMS_QUERY_KEY] });
      toast({ title: t('success'), description: id ? t('itemUpdatedSuccessfully') : t('itemAddedSuccessfully') });
      setIsFormOpen(false);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: t('error'), description: err.message });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (itemId) => {
      await deleteDoc(doc(db, "store_items", itemId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE_ITEMS_QUERY_KEY] });
      toast({ title: t('success'), description: t('itemDeletedSuccessfully') });
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
    data: storeItems,
    rowsPerPage: 10,
    searchKeys: ['name', 'category'],
    initialSort: { key: 'name', direction: 'ascending' },
  });

  const getSortIndicator = (columnKey: keyof StoreItem) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  const openFormForNew = () => {
    setItemToEdit(null);
    form.reset({ name: "", category: "", quantity: 0, unit: "pcs", notes: "" });
    setIsFormOpen(true);
  };

  const openFormForEdit = (item: StoreItem) => {
    setItemToEdit(item);
    form.reset(item);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (item: StoreItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (values: ItemFormValues) => {
    mutation.mutate({ values, id: itemToEdit?.id });
  };

  if (error) {
    return <div className="text-destructive">{t('errorFetchingStoreItems')}: {error.message}</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('manageStock')}</h1>
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('addNewItem')}
          </Button>
        </div>

        <Input
          placeholder={t('searchItems')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        {isLoading ? <div className="flex justify-center h-40 items-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
          <Card>
            <CardHeader>
              <CardTitle>{t('stockList')}</CardTitle>
              <CardDescription>{t('manageStockDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('name')} className="cursor-pointer group">{t('name')}{getSortIndicator('name')}</TableHead>
                    <TableHead onClick={() => requestSort('category')} className="cursor-pointer group">{t('category')}{getSortIndicator('category')}</TableHead>
                    <TableHead onClick={() => requestSort('quantity')} className="cursor-pointer group">{t('quantity')}{getSortIndicator('quantity')}</TableHead>
                    <TableHead onClick={() => requestSort('unit')} className="cursor-pointer group">{t('unit')}{getSortIndicator('unit')}</TableHead>
                    <TableHead onClick={() => requestSort('lastUpdated')} className="cursor-pointer group">{t('lastUpdated')}{getSortIndicator('lastUpdated')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        {item.quantity < LOW_STOCK_THRESHOLD ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3"/> {item.quantity}
                          </Badge>
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{formatDate(item.lastUpdated, 'MMM d, yy HH:mm')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openFormForEdit(item)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteConfirm(item)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center">{searchTerm ? t('noItemsMatchSearch') : t('noItemsInStock')}</TableCell></TableRow>
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
            <DialogTitle>{itemToEdit ? t('editItem') : t('addNewItem')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('itemName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>{t('category')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>{t('initialQuantity')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="unit" render={({ field }) => (<FormItem><FormLabel>{t('unitOfMeasurement')}</FormLabel><FormControl><Input placeholder="e.g., pcs, kg, liters" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{t('notes')} ({t('optional')})</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
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
            <AlertDialogDescription>{t('areYouSureDeleteItem', { itemName: itemToDelete?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)} className="bg-destructive hover:bg-destructive/90" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
