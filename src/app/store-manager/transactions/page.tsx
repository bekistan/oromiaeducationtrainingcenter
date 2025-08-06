
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp, Timestamp, runTransaction, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { StoreItem, StoreTransaction, Employee } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from 'react-hook-form';
import * as z from "zod";
import { PlusCircle, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, ArrowRightLeft } from "lucide-react";
import { formatDate } from '@/lib/date-utils';

const STORE_ITEMS_QUERY_KEY = "storeItemsForTransaction";
const STORE_TRANSACTIONS_QUERY_KEY = "storeTransactions";
const EMPLOYEES_QUERY_KEY_FOR_TRANSACTION = "employeesForTransaction";

const transactionSchema = z.object({
  itemId: z.string().min(1, { message: "Please select an item." }),
  type: z.enum(['in', 'out'], { required_error: "Please select a transaction type." }),
  quantityChange: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  reason: z.string().min(2, { message: "A reason is required." }).max(100, { message: "Reason cannot exceed 100 characters." }),
  responsibleEmployeeId: z.string().optional(),
}).refine(data => data.type === 'out' ? !!data.responsibleEmployeeId : true, {
    message: "An employee must be selected when stock is taken out.",
    path: ["responsibleEmployeeId"],
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const fetchStoreItems = async (): Promise<StoreItem[]> => {
  const querySnapshot = await getDocs(collection(db, "store_items"));
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as StoreItem));
};

const fetchEmployees = async (): Promise<Employee[]> => {
    const q = query(collection(db, "employees"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
}

export default function ManageTransactionsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactions, setTransactions] = useState<StoreTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  const { data: storeItems = [], isLoading: isLoadingItems, error: itemsError } = useQuery<StoreItem[], Error>({
    queryKey: [STORE_ITEMS_QUERY_KEY],
    queryFn: fetchStoreItems,
  });

  const { data: employees = [], isLoading: isLoadingEmployees, error: employeesError } = useQuery<Employee[], Error>({
    queryKey: [EMPLOYEES_QUERY_KEY_FOR_TRANSACTION],
    queryFn: fetchEmployees,
  });

  useEffect(() => {
    const q = query(collection(db, "store_transactions"), orderBy("transactionDate", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const transactionsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            transactionDate: (doc.data().transactionDate as Timestamp).toDate().toISOString(),
        } as StoreTransaction));
        setTransactions(transactionsData);
        setIsLoadingTransactions(false);
    }, (error) => {
        console.error("Error fetching transactions:", error);
        toast({ variant: "destructive", title: t('error'), description: t('errorFetchingTransactions') });
        setIsLoadingTransactions(false);
    });

    return () => unsubscribe();
  }, [t, toast]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { itemId: "", type: "out", quantityChange: 1, reason: "", responsibleEmployeeId: undefined },
  });
  
  const watchedTransactionType = form.watch("type");

  const transactionMutation = useMutation<void, Error, TransactionFormValues>({
    mutationFn: async (values) => {
      if (!user) throw new Error("User not authenticated.");

      const itemRef = doc(db, "store_items", values.itemId);
      const transactionRef = doc(collection(db, "store_transactions"));

      await runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
          throw new Error("Item not found. It may have been deleted.");
        }

        const currentItemData = itemDoc.data() as StoreItem;
        const currentQuantity = currentItemData.quantity;
        const change = values.quantityChange;

        let newQuantity;
        if (values.type === 'in') {
          newQuantity = currentQuantity + change;
        } else {
          if (currentQuantity < change) {
            throw new Error(`Cannot process transaction: insufficient stock for ${currentItemData.name}. Available: ${currentQuantity}, Requested: ${change}.`);
          }
          newQuantity = currentQuantity - change;
        }

        transaction.update(itemRef, {
          quantity: newQuantity,
          lastUpdated: serverTimestamp(),
        });
        
        let responsibleEmployeeName: string | undefined = undefined;
        if(values.type === 'out' && values.responsibleEmployeeId) {
            const employee = employees.find(e => e.id === values.responsibleEmployeeId);
            responsibleEmployeeName = employee?.name;
        }

        transaction.set(transactionRef, {
          itemId: values.itemId,
          itemName: currentItemData.name,
          type: values.type,
          quantityChange: change,
          reason: values.reason,
          recordedBy: user.id,
          transactionDate: serverTimestamp(),
          responsibleEmployeeId: values.responsibleEmployeeId || null,
          responsibleEmployeeName: responsibleEmployeeName || null,
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE_ITEMS_QUERY_KEY] });
      // No need to invalidate transactions query as it's real-time
      toast({ title: t('success'), description: t('transactionRecordedSuccessfully') });
      setIsFormOpen(false);
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
  } = useSimpleTable({
    data: transactions,
    rowsPerPage: 10,
    searchKeys: ['itemName', 'reason', 'type', 'responsibleEmployeeName'],
    initialSort: { key: 'transactionDate' as any, direction: 'descending'}
  });

  const onSubmit = (values: TransactionFormValues) => {
    transactionMutation.mutate(values);
  };
  
  const isLoading = isLoadingItems || isLoadingTransactions || isLoadingEmployees;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('manageTransactions')}</h1>
          <Button onClick={() => {
            form.reset({ itemId: "", type: "out", quantityChange: 1, reason: "" });
            setIsFormOpen(true);
          }}>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('newTransaction')}
          </Button>
        </div>

        <Input
          placeholder={t('searchTransactions')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        {isLoading ? <div className="flex justify-center h-40 items-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
          <Card>
            <CardHeader>
              <CardTitle>{t('transactionHistory')}</CardTitle>
              <CardDescription>{t('transactionHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('item')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('quantity')}</TableHead>
                    <TableHead>{t('reason')}</TableHead>
                    <TableHead>{t('responsibleEmployee')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? paginatedData.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">{formatDate(tx.transactionDate, 'MMM d, yy HH:mm')}</TableCell>
                      <TableCell className="font-medium">{tx.itemName}</TableCell>
                       <TableCell>
                        <span className={`font-semibold px-2 py-1 rounded-full text-xs ${tx.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t(tx.type)}
                        </span>
                      </TableCell>
                      <TableCell>{tx.type === 'in' ? '+' : '-'}{tx.quantityChange}</TableCell>
                      <TableCell>{tx.reason}</TableCell>
                      <TableCell>{tx.responsibleEmployeeName || 'N/A'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center">{t('noTransactionsFound')}</TableCell></TableRow>
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
            <DialogTitle>{t('newTransaction')}</DialogTitle>
            <DialogDescription>{t('newTransactionDescription')}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="itemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('item')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingItems}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingItems ? t('loadingItems') : t('selectItemPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {storeItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({t('currentStock')}: {item.quantity} {item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('transactionType')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="out">{t('outStockUsage')}</SelectItem>
                        <SelectItem value="in">{t('inStockRestock')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="quantityChange" render={({ field }) => (<FormItem><FormLabel>{t('quantity')}</FormLabel><FormControl><Input type="number" {...field} min="1" /></FormControl><FormMessage /></FormItem>)} />
              {watchedTransactionType === 'out' && (
                <FormField
                  control={form.control}
                  name="responsibleEmployeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('responsibleEmployee')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingEmployees}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingEmployees ? t('loadingEmployees') : t('selectEmployeePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name} ({employee.position})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>{t('reason')}</FormLabel><FormControl><Input placeholder={t('reasonPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={transactionMutation.isPending}>{transactionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('recordTransaction')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
