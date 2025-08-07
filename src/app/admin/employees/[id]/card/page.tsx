
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { Loader2, AlertTriangle, ArrowLeft, Printer, User, Building, Phone } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';
import Barcode from 'react-barcode';

const fetchEmployee = async (id: string): Promise<Employee | null> => {
    if (!db) return null;
    const docRef = doc(db, "employees", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Employee : null;
};

export default function EmployeeIdCardPage() {
    const params = useParams();
    const router = useRouter();
    const employeeId = params.id as string;
    const { t } = useLanguage();
    const printRef = useRef(null);

    const { data: employee, isLoading, error } = useQuery<Employee | null, Error>({
        queryKey: ['employee', employeeId],
        queryFn: () => fetchEmployee(employeeId),
        enabled: !!employeeId,
    });

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error || !employee) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-lg text-destructive mb-6">{error ? error.message : t('employeeNotFound')}</p>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> {t('goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-slate-100 min-h-screen py-8 px-2 flex flex-col items-center gap-8 print:bg-white print:p-0">
             <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .printable-card-wrapper {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                }
                @page {
                    size: 85.60mm 53.98mm; /* Standard ID card size */
                    margin: 0;
                }
            `}</style>
            
            <div className="w-full max-w-lg flex justify-between items-center no-print">
                 <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToEmployees')}
                </Button>
                 <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> {t('printIdCard')}
                </Button>
            </div>
            
            <div className="printable-card-wrapper">
                <div ref={printRef} className="w-[336px] h-[211px] bg-white shadow-2xl rounded-xl p-4 flex flex-col justify-between border print:shadow-none print:border-none">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <Logo className="h-10 w-auto" />
                        <div className="text-right">
                           <h1 className="text-xs font-bold text-primary">Oromia Education</h1>
                           <h2 className="text-[10px] font-semibold text-gray-700">Research & Training Center</h2>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex items-center gap-3">
                        <div className="w-20 h-24 rounded-md overflow-hidden border-2 border-primary/50 flex-shrink-0">
                            <Image
                                src={'https://placehold.co/80x96.png'}
                                alt={employee.name}
                                width={80}
                                height={96}
                                className="object-cover"
                                data-ai-hint="person portrait"
                            />
                        </div>
                        <div className="text-xs space-y-1">
                            <p className="font-bold text-base leading-tight text-gray-800">{employee.name}</p>
                            <p className="text-gray-600">{employee.position}</p>
                            <p className="text-gray-600"><strong>ID:</strong> {employee.employeeId}</p>
                        </div>
                    </div>
                    
                    {/* Footer / Barcode */}
                    <div className="flex flex-col items-center">
                       {employee.employeeId && (
                           <Barcode value={employee.employeeId} height={30} width={1.5} fontSize={10} margin={0} />
                       )}
                    </div>
                </div>
            </div>

        </div>
    );
}
