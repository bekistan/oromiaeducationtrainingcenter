
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import type { Hall } from "@/types";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Placeholder data for halls and sections
const sampleManageableItems: Hall[] = [
  { id: "h001", name: "Grand Meeting Hall A (Hall)", capacity: 100, isAvailable: true, rentalCost: 5000, lunchServiceCost: 300, refreshmentServiceCost: 100 },
  { id: "s001", name: "Training Section Alpha (Section)", capacity: 30, isAvailable: true, rentalCost: 2000, refreshmentServiceCost: 80 },
  { id: "s002", name: "Workshop Area Beta (Section)", capacity: 20, isAvailable: false, rentalCost: 1500 },
];

export default function AdminHallsAndSectionsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageHallsAndSections')}</h1> {/* Add to JSON */}
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('addHallOrSection')} {/* Add to JSON */}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('listHallsAndSections')}</CardTitle> {/* Add to JSON */}
          <CardDescription>{t('viewAndManageHallsAndSections')}</CardDescription> {/* Add to JSON */}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead> {/* Add to JSON or use existing 'hallName' if suitable */}
                <TableHead>{t('capacity')}</TableHead>
                <TableHead>{t('rentalCost')}</TableHead>
                <TableHead>{t('availability')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleManageableItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.capacity}</TableCell>
                  <TableCell>{item.rentalCost} ETB</TableCell>
                  <TableCell>
                    <Badge variant={item.isAvailable ? "default" : "destructive"}
                           style={item.isAvailable ? {} : { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
                    >
                      {item.isAvailable ? t('available') : t('unavailable')}
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
