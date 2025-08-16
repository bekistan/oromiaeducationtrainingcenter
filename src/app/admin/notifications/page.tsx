"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import type { AdminNotification } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Bell, Check, Eye, ExternalLink, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils'; // Added this import

const NOTIFICATIONS_QUERY_KEY = "adminNotifications";

const fetchNotifications = async (userRole: AdminNotification['recipientRole'] | undefined): Promise<AdminNotification[]> => {
  if (!userRole) return [];
  const q = query(
    collection(db, "notifications"),
    where("recipientRole", "in", [userRole, "admin"]), // Fetch for specific role or generic admin
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AdminNotification));
};

export default function AdminNotificationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();

  const { data: notifications = [], isLoading, error } = useQuery<AdminNotification[], Error>({
    queryKey: [NOTIFICATIONS_QUERY_KEY, user?.role],
    queryFn: () => fetchNotifications(user?.role as AdminNotification['recipientRole']),
    enabled: !!user,
  });

  const markAsReadMutation = useMutation<void, Error, string>({
    mutationFn: async (notificationId: string) => {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, { isRead: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, user?.role] });
      toast({ title: t('success'), description: t('notificationMarkedAsRead') });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: t('error'), description: err.message || t('errorUpdatingNotification') });
    },
  });

  const markAllAsReadMutation = useMutation<void, Error, AdminNotification[]>({
    mutationFn: async (unreadNotifications: AdminNotification[]) => {
      if (unreadNotifications.length === 0) return;
      const batch = writeBatch(db);
      unreadNotifications.forEach(notif => {
        const notificationRef = doc(db, "notifications", notif.id);
        batch.update(notificationRef, { isRead: true });
      });
      await batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, user?.role] });
      toast({ title: t('success'), description: t('allNotificationsMarkedAsRead') });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: t('error'), description: err.message || t('errorMarkingAllNotificationsRead') });
    },
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">{t('loadingNotifications')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>{t('errorFetchingNotifications')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('notifications')}</h1>
        {unreadNotifications.length > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate(unreadNotifications)}
            disabled={markAllAsReadMutation.isPending}
            variant="outline"
          >
            {markAllAsReadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Check className="mr-2 h-4 w-4" /> {t('markAllAsRead')} ({unreadNotifications.length})
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-6 w-6 text-primary" />
            {t('notificationList')}
          </CardTitle>
          <CardDescription>{t('notificationsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('noNotificationsFound')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('message')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id} className={cn(!notification.isRead && "bg-primary/5 font-semibold")}>
                    <TableCell>
                      <Badge variant={notification.isRead ? "secondary" : "default"} className={notification.isRead ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                        {notification.isRead ? t('read') : t('unread')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{notification.message}</TableCell>
                    <TableCell className="capitalize">{t(notification.type)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(notification.createdAt, 'MMM d, yy HH:mm')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {!notification.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          disabled={markAsReadMutation.isPending && markAsReadMutation.variables === notification.id}
                        >
                          {markAsReadMutation.isPending && markAsReadMutation.variables === notification.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Eye className="mr-1 h-3 w-3" />}
                          {t('markAsRead')}
                        </Button>
                      )}
                      {notification.link && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={notification.link}>
                            <ExternalLink className="mr-1 h-3 w-3" />
                            {t('viewDetails')}
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
