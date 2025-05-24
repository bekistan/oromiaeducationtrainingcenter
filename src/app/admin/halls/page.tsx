"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import type { Hall } from "@/types";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Placeholder data
const sampleHalls: Hall[] = [
  { id: "h001", name: "Grand Meeting Hall A", capacity: 100, isAvailable: true, rentalCost: 5000 },
  { id: "h002", name: "Training Section Alpha", capacity: 30, isAvailable: true, rentalCost: 2000 },
  { id: "h003", name: "Small Meeting Room B", capacity: 15, isAvailable: false, rentalCost: 1000 },
];

export default function AdminHallsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageHalls')}</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('addHall')} {/* Add to JSON */}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('hallList')}</CardTitle> {/* Add to JSON */}
          <CardDescription>{t('viewAndManageHalls')}</CardDescription> {/* Add to JSON */}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('hallName')}</TableHead>
                <TableHead>{t('capacity')}</TableHead>
                <TableHead>{t('rentalCost')}</TableHead>
                <TableHead>{t('availability')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleHalls.map((hall) => (
                <TableRow key={hall.id}>
                  <TableCell className="font-medium">{hall.name}</TableCell>
                  <TableCell>{hall.capacity}</TableCell>
                  <TableCell>{hall.rentalCost} ETB</TableCell>
                  <TableCell>
                    <Badge variant={hall.isAvailable ? "default" : "destructive"}
                           style={hall.isAvailable ? {} : { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
                    >
                      {hall.isAvailable ? t('available') : t('unavailable')}
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
