"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import type { Booking } from "@/types";
import { Eye, Edit, Trash2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


// Placeholder data
const sampleBookings: Booking[] = [
  { id: "b001", type: "dormitory", itemId: "d001", guestName: "John Doe", startDate: "2024-08-01", endDate: "2024-08-05", totalCost: 2000, paymentStatus: "paid", bookedAt: "2024-07-15" },
  { id: "b002", type: "hall", itemId: "h001", companyName: "Tech Solutions Inc.", startDate: "2024-09-10", endDate: "2024-09-10", totalCost: 5000, paymentStatus: "pending", bookedAt: "2024-07-20" },
  { id: "b003", type: "dormitory", itemId: "d003", guestName: "Jane Smith", startDate: "2024-08-15", endDate: "2024-08-20", totalCost: 2750, paymentStatus: "paid", bookedAt: "2024-07-22" },
];

export default function AdminBookingsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageBookings')}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" /> {t('filterBookings')} {/* Add to JSON */}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>{t('bookingStatus')}</DropdownMenuLabel> {/* Add to JSON */}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>{t('all')}</DropdownMenuCheckboxItem> {/* Add to JSON */}
            <DropdownMenuCheckboxItem>{t('paid')}</DropdownMenuCheckboxItem> {/* Add to JSON */}
            <DropdownMenuCheckboxItem>{t('pending')}</DropdownMenuCheckboxItem> {/* Add to JSON */}
            <DropdownMenuCheckboxItem>{t('failed')}</DropdownMenuCheckboxItem> {/* Add to JSON */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('bookingList')}</CardTitle> {/* Add to JSON */}
          <CardDescription>{t('viewAndManageAllBookings')}</CardDescription> {/* Add to JSON */}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bookingId')}</TableHead> {/* Add to JSON */}
                <TableHead>{t('type')}</TableHead> {/* Add to JSON */}
                <TableHead>{t('customer')}</TableHead> {/* Add to JSON */}
                <TableHead>{t('dates')}</TableHead> {/* Add to JSON */}
                <TableHead>{t('totalCost')}</TableHead>
                <TableHead>{t('paymentStatus')}</TableHead> {/* Add to JSON */}
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.id}</TableCell>
                  <TableCell className="capitalize">{t(booking.type)}</TableCell> {/* Add dormitory/hall to JSON */}
                  <TableCell>{booking.guestName || booking.companyName}</TableCell>
                  <TableCell>{booking.startDate} - {booking.endDate}</TableCell>
                  <TableCell>{booking.totalCost} ETB</TableCell>
                  <TableCell>
                    <Badge 
                        variant={booking.paymentStatus === 'paid' ? 'default' : (booking.paymentStatus === 'pending' ? 'secondary' : 'destructive')}
                        className={booking.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 
                                   booking.paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' : 
                                   'bg-red-500/20 text-red-700 border-red-500/30'}
                    >
                      {t(booking.paymentStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                       <span className="sr-only">{t('viewDetails')}</span> {/* Add to JSON */}
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                       <span className="sr-only">{t('edit')}</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive">
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
    </div>
  );
}
