
"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Loader2, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import type { Employee, AttendanceRecord } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date-utils';

export default function AttendanceScannerPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastScan, setLastScan] = useState<{ employee: Employee; record: AttendanceRecord } | null>(null);

    const handleScan = async (result: string) => {
        if (result && !isProcessing) {
            setIsProcessing(true);
            const employeeId = result;

            if (!employeeId) {
                toast({ variant: 'destructive', title: t('scanError'), description: t('invalidBarcodeData') });
                setIsProcessing(false);
                return;
            }

            try {
                const q = query(collection(db, 'employees'), where('employeeId', '==', employeeId), limit(1));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error(t('employeeNotFound'));
                }

                const employeeDoc = querySnapshot.docs[0];
                const employee = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;
                
                const attendanceQuery = query(collection(db, 'attendance'), where('employeeId', '==', employeeId), orderBy('timestamp', 'desc'), limit(1));
                const attendanceSnapshot = await getDocs(attendanceQuery);

                let newRecordType: 'check-in' | 'check-out' = 'check-in';
                if (!attendanceSnapshot.empty) {
                    const lastRecord = attendanceSnapshot.docs[0].data() as AttendanceRecord;
                    if (lastRecord.type === 'check-in') {
                        newRecordType = 'check-out';
                    }
                }
                
                const newRecord: Omit<AttendanceRecord, 'id'> = {
                    employeeId: employeeId,
                    employeeName: employee.name,
                    type: newRecordType,
                    timestamp: serverTimestamp() as any,
                };
                
                const docRef = await addDoc(collection(db, 'attendance'), newRecord);
                
                const displayRecord: AttendanceRecord = {
                    ...newRecord,
                    id: docRef.id,
                    timestamp: new Date().toISOString() as any, 
                };
                
                setLastScan({ employee, record: displayRecord });
                toast({ title: t('success'), description: `${employee.name} ${t('successfully')} ${t(newRecordType)}` });
            
            } catch (error: any) {
                toast({ variant: 'destructive', title: t('error'), description: error.message || t('failedToProcessScan') });
            } finally {
                setTimeout(() => setIsProcessing(false), 2000); 
            }
        }
    };

    const handleError = (error: any) => {
        console.error('QR Scanner Error:', error);
        toast({ variant: 'destructive', title: t('cameraError'), description: t('failedToAccessCamera') });
        setIsCameraOn(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('attendanceScanner')}</CardTitle>
                    <CardDescription>{t('scanEmployeeIdBarcode')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="w-full max-w-md aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center relative">
                        {isCameraOn ? (
                             <QrScanner
                                onDecode={handleScan}
                                onError={handleError}
                                containerStyle={{ width: '100%', height: '100%' }}
                                videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <CameraOff className="h-16 w-16 mx-auto mb-2" />
                                <p>{t('cameraIsOff')}</p>
                            </div>
                        )}
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                <Loader2 className="h-12 w-12 animate-spin text-white" />
                            </div>
                        )}
                    </div>
                    <Button onClick={() => setIsCameraOn(!isCameraOn)} variant="outline">
                        {isCameraOn ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                        {isCameraOn ? t('turnOffCamera') : t('turnOnCamera')}
                    </Button>
                </CardContent>
            </Card>

            {lastScan && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('lastScanDetails')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant={lastScan.record.type === 'check-in' ? 'default' : 'destructive'} className={lastScan.record.type === 'check-in' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                             <div className={`flex items-center ${lastScan.record.type === 'check-in' ? 'text-green-600' : 'text-red-600'}`}>
                                {lastScan.record.type === 'check-in' ? <ArrowRight className="h-5 w-5 mr-2" /> : <ArrowLeft className="h-5 w-5 mr-2" />}
                                <AlertTitle className="text-lg">{t(lastScan.record.type)}</AlertTitle>
                            </div>
                            <AlertDescription className="mt-2 text-foreground">
                                <p><strong>{t('employee')}:</strong> {lastScan.employee.name}</p>
                                <p><strong>{t('time')}:</strong> {formatDate(lastScan.record.timestamp, 'HH:mm:ss')}</p>
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
