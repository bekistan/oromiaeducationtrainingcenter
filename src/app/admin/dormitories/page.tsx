
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import type { Dormitory } from "@/types";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Placeholder data
const sampleDormitories: Dormitory[] = [
  { id: "d001", floor: 1, roomNumber: "101A", capacity: 2, isAvailable: true, pricePerDay: 500 },
  { id: "d002", floor: 1, roomNumber: "102B", capacity: 4, isAvailable: false, pricePerDay: 700 },
  { id: "d003", floor: 2, roomNumber: "201A", capacity: 2, isAvailable: true, pricePerDay: 550 },
];

export default function AdminDormitoriesPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageDormitories')}</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('addDormitory')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('dormitoryList')}</CardTitle>
          <CardDescription>{t('viewAndManageDormitories')}</CardDescription>
        </CardHeader>
        <CardContent>
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
              {sampleDormitories.map((dorm) => (
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

