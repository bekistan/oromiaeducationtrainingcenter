
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import type { Booking, User } from '@/types';
import { AlertCircle, CheckCircle, Hourglass, Building, CalendarDays, Utensils, Coffee, DollarSign, Loader2, ShoppingBag, Info } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function CompanyDashboardPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  const fetchBookings = useCallback(async (companyId: string) => {
    setIsLoadingBookings(true);
    try {
      const q = query(collection(db, "bookings"), where("companyId", "==", companyId));
      const querySnapshot = await getDocs(q);
      const bookingsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : data.bookedAt,
          startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : data.startDate,
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString().split('T')[0] : data.endDate,
        } as Booking;
      });
      setBookings(bookingsData.sort((a,b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime()));
    } catch (error) {
      console.error("Error fetching company bookings: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingYourBookings') }); // Add to JSON
    } finally {
      setIsLoadingBookings(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (user && user.role === 'company_representative' && user.approvalStatus === 'approved' && user.companyId) {
      fetchBookings(user.companyId);
    } else if (user && user.role === 'company_representative' && user.approvalStatus !== 'approved') {
        setIsLoadingBookings(false); // Not approved, no bookings to fetch
    }
  }, [user, fetchBookings]);

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (!user || user.role !== 'company_representative') {
    return (
      <PublicLayout>
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
          <Card className="w-full max-w-md shadow-xl text-center">
            <CardHeader>
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl text-destructive">{t('accessDenied')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{t('mustBeLoggedInAsCompanyDashboard')}</p> {/* Add to JSON */}
              <Link href="/auth/login" passHref>
                <Button>{t('login')}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  const getStatusMessageAndIcon = () => {
    switch (user.approvalStatus) {
      case 'pending':
        return {
          icon: <Hourglass className="w-12 h-12 text-yellow-500 mx-auto mb-4" />,
          title: t('registrationPendingTitle'), // Add to JSON
          message: t('registrationPendingMessage'), // Add to JSON
          cardClass: "border-yellow-500 bg-yellow-50"
        };
      case 'rejected':
        return {
          icon: <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />,
          title: t('registrationRejectedTitle'), // Add to JSON
          message: t('registrationRejectedMessage'), // Add to JSON
          cardClass: "border-destructive bg-red-50"
        };
      default: // Should not happen if role is company_representative
        return {
          icon: <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
          title: t('statusUnknownTitle'), // Add to JSON
          message: t('statusUnknownMessage'), // Add to JSON
          cardClass: "border-muted"
        };
    }
  };
  
  const getPaymentStatusBadge = (status: Booking['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200">{t(status)}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200">{t(status)}</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-200">{t(status)}</Badge>;
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
  };

  const getApprovalStatusBadge = (status: Booking['approvalStatus']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200">{t(status)}</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200">{t(status)}</Badge>;
      case 'rejected':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200">{t(status)}</Badge>;
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
  };


  if (user.approvalStatus !== 'approved') {
    const { icon, title, message, cardClass } = getStatusMessageAndIcon();
    return (
      <PublicLayout>
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
          <Card className={`w-full max-w-lg shadow-xl text-center ${cardClass}`}>
            <CardHeader>
              {icon}
              <CardTitle className="text-2xl">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{message}</p>
              {user.approvalStatus === 'rejected' && (
                 <p className="mt-2 text-sm">{t('contactSupportForAssistance')}</p> // Add to JSON
              )}
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto py-8 px-4 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-primary">{t('companyDashboardTitle')}</h1> {/* Add to JSON */}
                <p className="text-muted-foreground">{t('welcomeBack')}, {user.companyName || user.name}!</p> {/* Add to JSON */}
            </div>
            <Link href="/halls" passHref>
                 <Button variant="outline">
                    <Building className="mr-2 h-4 w-4" /> {t('bookNewFacility')} {/* Add to JSON */}
                 </Button>
            </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingBag className="mr-2 h-6 w-6 text-primary" />
              {t('yourBookingsTitle')} {/* Add to JSON */}
            </CardTitle>
            <CardDescription>{t('yourBookingsDescription')}</CardDescription> {/* Add to JSON */}
          </CardHeader>
          <CardContent>
            {isLoadingBookings ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-10">
                <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">{t('noBookingsFound')}</p> {/* Add to JSON */}
                <Link href="/halls" passHref>
                    <Button className="mt-4">{t('makeYourFirstBooking')}</Button> {/* Add to JSON */}
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('bookingId')}</TableHead>
                      <TableHead>{t('itemsBooked')}</TableHead>
                      <TableHead>{t('dates')}</TableHead>
                      <TableHead>{t('services')}</TableHead>
                      <TableHead>{t('totalCost')}</TableHead>
                      <TableHead>{t('payment')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs">{booking.id.substring(0, 8)}...</TableCell>
                        <TableCell>{booking.items.map(item => item.name).join(', ')}</TableCell>
                        <TableCell>
                          {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            {booking.serviceDetails?.lunch && (
                              <span className="flex items-center">
                                <Utensils className="w-3 h-3 mr-1 text-muted-foreground" /> {t('lunch')}: {t(booking.serviceDetails.lunch)}
                              </span>
                            )}
                            {booking.serviceDetails?.refreshment && (
                              <span className="flex items-center">
                                <Coffee className="w-3 h-3 mr-1 text-muted-foreground" /> {t('refreshment')}: {t(booking.serviceDetails.refreshment)}
                              </span>
                            )}
                            {(!booking.serviceDetails || (Object.keys(booking.serviceDetails).length === 0)) && (
                                <span className="text-muted-foreground italic">{t('serviceLevelNone')}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{booking.totalCost} ETB</TableCell>
                        <TableCell>{getPaymentStatusBadge(booking.paymentStatus)}</TableCell>
                        <TableCell>{getApprovalStatusBadge(booking.approvalStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
