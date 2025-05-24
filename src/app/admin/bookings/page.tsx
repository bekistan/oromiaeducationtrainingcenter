
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import type { Booking } from "@/types";
import { Eye, Edit, Trash2, Filter, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";


// Placeholder data
const sampleBookings: Booking[] = [
  { 
    id: "b001", 
    bookingCategory: "dormitory", 
    items: [{ id: "d001", name: "Room 101A", itemType: "dormitory" }], 
    guestName: "John Doe", 
    startDate: "2024-08-01", 
    endDate: "2024-08-05", 
    totalCost: 2000, 
    paymentStatus: "paid", 
    approvalStatus: "approved", 
    bookedAt: "2024-07-15T10:00:00Z",
    userId: "indUser456" 
  },
  { 
    id: "b002", 
    bookingCategory: "facility", 
    items: [{ id: "h001", name: "Grand Meeting Hall A", itemType: "hall" }], 
    companyName: "Tech Solutions Inc.", 
    contactPerson: "Jane Smith (Rep)",
    email: "jane@techsolutions.com",
    phone: "555-0101",
    startDate: "2024-09-10", 
    endDate: "2024-09-10", 
    totalCost: 5000, 
    paymentStatus: "pending", 
    approvalStatus: "pending", 
    bookedAt: "2024-07-20T14:30:00Z",
    userId: "compUser123",
    companyId: "comp001",
    numberOfAttendees: 50,
    serviceDetails: { lunch: 'level1' }
  },
  { 
    id: "b003", 
    bookingCategory: "facility", 
    items: [
        { id: "s001", name: "Training Section Alpha", itemType: "section" },
        { id: "s002", name: "Workshop Area Beta", itemType: "section" }
    ], 
    companyName: "Innovate LLC", 
    contactPerson: "Mike Lee (Rep)",
    email: "mike@innovate.com",
    phone: "555-0202",
    startDate: "2024-08-15", 
    endDate: "2024-08-16", 
    totalCost: 3750, 
    paymentStatus: "paid", 
    approvalStatus: "approved", 
    bookedAt: "2024-07-22T09:15:00Z",
    userId: "compUser789",
    companyId: "comp002",
    numberOfAttendees: 25,
    serviceDetails: { refreshment: 'level2' }
  },
    { 
    id: "b004", 
    bookingCategory: "facility", 
    items: [{ id: "s003", name: "Seminar Room Gamma", itemType: "section" }], 
    companyName: "Education First",
    contactPerson: "Sarah Connor (Rep)",
    email: "sarah@educationfirst.com",
    phone: "555-0303",
    startDate: "2024-09-01", 
    endDate: "2024-09-01", 
    totalCost: 2800, 
    paymentStatus: "failed", 
    approvalStatus: "rejected", 
    bookedAt: "2024-08-05T11:00:00Z",
    userId: "compUserABC",
    companyId: "comp003",
    numberOfAttendees: 40,
  },
];

export default function AdminBookingsPage() {
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [bookings, setBookings] = useState<Booking[]>(sampleBookings);

  const handleApprovalChange = (bookingId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    setBookings(currentBookings => 
      currentBookings.map(b => b.id === bookingId ? { ...b, approvalStatus: newStatus } : b)
    );
    // TODO: API call to update status
    console.log(`Booking ${bookingId} approval status changed to ${newStatus}`);
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
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200">{t(status)}</Badge>; // Add 'approved' to JSON
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200">{t(status)}</Badge>; // Add 'pendingApproval' to JSON
      case 'rejected':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200">{t(status)}</Badge>; // Add 'rejected' to JSON
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageBookings')}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" /> {t('filterBookings')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>{t('bookingStatus')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>{t('all')}</DropdownMenuCheckboxItem>
            <DropdownMenuLabel>{t('paymentStatus')}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem>{t('paid')}</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>{t('pending')}</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>{t('failed')}</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('approvalStatus')}</DropdownMenuLabel> {/* Add to JSON */}
            <DropdownMenuCheckboxItem>{t('approved')}</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>{t('pending')}</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>{t('rejected')}</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('bookingList')}</CardTitle>
          <CardDescription>{t('viewAndManageAllBookings')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bookingId')}</TableHead>
                <TableHead>{t('category')}</TableHead> {/* Add to JSON */}
                <TableHead>{t('itemsBooked')}</TableHead> {/* Add to JSON */}
                <TableHead>{t('customer')}</TableHead>
                <TableHead>{t('dates')}</TableHead>
                <TableHead>{t('totalCost')}</TableHead>
                <TableHead>{t('paymentStatus')}</TableHead>
                <TableHead>{t('approvalStatus')}</TableHead> {/* Add to JSON */}
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.id}</TableCell>
                  <TableCell className="capitalize">{t(booking.bookingCategory)}</TableCell>
                  <TableCell>
                    {booking.items.map(item => item.name).join(', ')} ({booking.items.length})
                  </TableCell>
                  <TableCell>
                    {booking.bookingCategory === 'dormitory' ? booking.guestName : booking.companyName}
                    {booking.userId && <span className="text-xs text-muted-foreground block"> (User ID: {booking.userId})</span>}
                  </TableCell>
                  <TableCell>{booking.startDate} - {booking.endDate}</TableCell>
                  <TableCell>{booking.totalCost} ETB</TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(booking.paymentStatus)}
                  </TableCell>
                  <TableCell>
                    {getApprovalStatusBadge(booking.approvalStatus)}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" title={t('viewDetails')}>
                      <Eye className="h-4 w-4" />
                       <span className="sr-only">{t('viewDetails')}</span>
                    </Button>
                    <Button variant="ghost" size="icon" title={t('edit')}>
                      <Edit className="h-4 w-4" />
                       <span className="sr-only">{t('edit')}</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title={t('moreActions')}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">{t('moreActions')}</span> {/* Add to JSON */}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('setApprovalStatus')}</DropdownMenuLabel> {/* Add to JSON */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'approved')} disabled={booking.approvalStatus === 'approved'}>
                                {t('approveBooking')} {/* Add to JSON */}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'pending')} disabled={booking.approvalStatus === 'pending'}>
                                {t('setAsPending')} {/* Add to JSON */}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'rejected')} disabled={booking.approvalStatus === 'rejected'} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                {t('rejectBooking')} {/* Add to JSON */}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
