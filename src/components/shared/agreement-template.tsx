
'use client';

import type { Booking, BookingItem, BrandAssets } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { SITE_NAME, BRAND_ASSETS_DOC_PATH } from '@/constants'; 
import { formatDate } from '@/lib/date-utils';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';

interface AgreementTemplateProps {
  booking: Booking | null;
  customTerms?: string; 
}

const BRAND_ASSETS_QUERY_KEY = "brandAssetsForAgreement";

const fetchBrandAssets = async (): Promise<BrandAssets | null> => {
  if (!db) {
    console.warn("Database not configured. Cannot fetch brand assets.");
    return null;
  }
  const docRef = doc(db, BRAND_ASSETS_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as BrandAssets;
  }
  return null;
};

export function AgreementTemplate({ booking, customTerms }: AgreementTemplateProps) {
  const { t } = useLanguage();

  const { data: brandAssets } = useQuery<BrandAssets | null>({
      queryKey: [BRAND_ASSETS_QUERY_KEY],
      queryFn: fetchBrandAssets,
      staleTime: 1000 * 60 * 10, // 10 minutes
  });

  if (!booking) {
    return <p>{t('loadingAgreementDetails')}</p>; 
  }

  if (booking.bookingCategory !== 'facility') {
    return <p>{t('agreementNotApplicable')}</p>; 
  }
  
  const agreementDate = formatDate(new Date(), 'MMMM dd, yyyy');
  
  const startDateObj = booking.startDate instanceof Timestamp ? booking.startDate.toDate() : parseISO(booking.startDate as string);
  const endDateObj = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : parseISO(booking.endDate as string);

  const startDateFormatted = formatDate(startDateObj, 'MMMM dd, yyyy');
  const endDateFormatted = formatDate(endDateObj, 'MMMM dd, yyyy');
  const numberOfDays = differenceInCalendarDays(endDateObj, startDateObj) + 1;
  
  const numberOfAttendees = booking.numberOfAttendees || 0;

  const totalBookingCostFromRecord = booking.totalCost; 

  const termsToRender = customTerms || t('defaultAgreementTermsNotSet');
  const facilitiesBookedString = booking.items.map(item => `${item.name} (${t(item.itemType)})`).join(', ');

  const replacePlaceholders = (template: string) => {
    let replaced = template;
    const replacements: Record<string, string | number> = {
      '{{{clientName}}}': booking.companyName || t('notAvailable'),
      '{{{clientContactPerson}}}': booking.contactPerson || t('notAvailable'),
      '{{{clientEmail}}}': booking.email || t('notAvailable'),
      '{{{clientPhone}}}': booking.phone || t('notAvailable'),
      '{{{facilitiesBooked}}}': facilitiesBookedString,
      '{{{startDate}}}': startDateFormatted,
      '{{{endDate}}}': endDateFormatted,
      '{{{numberOfDays}}}': numberOfDays,
      '{{{numberOfAttendees}}}': numberOfAttendees,
      '{{{totalCost}}}': `${totalBookingCostFromRecord.toFixed(2)} ${t('currencySymbol')}`,
      '{{{agreementDate}}}': agreementDate,
      '{{{providerName}}}': SITE_NAME,
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      replaced = replaced.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return replaced;
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-md print:shadow-none print:p-4">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm; 
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .printable-agreement {
            width: 100%;
            height: 100%;
            page-break-after: avoid;
            page-break-before: avoid;
            font-size: 10pt; /* Make font smaller for print */
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="printable-agreement">
        <header className="text-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">{t('facilityRentalAgreement')}</h1>
          <p className="text-sm text-gray-500">{t('agreementDate')}: {agreementDate}</p>
        </header>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('partiesInvolved')}</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700">{t('serviceProvider')}</h3>
              <p className="text-sm">{SITE_NAME}</p>
              <p className="text-sm">{t('providerAddressPlaceholder')}</p>
              <p className="text-sm">{t('providerContactPlaceholder')}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">{t('clientBidTaker')}</h3>
              <p className="text-sm">{booking.companyName || t('notAvailable')}</p>
              <p className="text-sm">{t('clientAddressPlaceholder', { companyName: booking.companyName || t('unknownCompany') })}</p>
              <p className="text-sm">{t('clientContactPlaceholder', { contactPerson: booking.contactPerson || t('notAvailable') })}</p>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">{t('serviceDetails')}</h2>
          <div className="space-y-1 bg-slate-50 p-4 rounded-md border border-slate-200">
            <p className="text-sm"><strong>{t('facilityBooked')}:</strong> {facilitiesBookedString}</p>
            <p className="text-sm"><strong>{t('bookingPeriod')}:</strong> {startDateFormatted} {t('to')} {endDateFormatted} ({numberOfDays} {numberOfDays === 1 ? t('day') : t('days')})</p> 
            <p className="text-sm"><strong>{t('numberOfAttendees')}:</strong> {booking.numberOfAttendees || t('notSpecified')}</p>
          </div>
        </section>
        
        <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">{t('termsAndConditions')}</h2>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-2 text-xs border border-gray-300 p-4 rounded-md bg-slate-50 whitespace-pre-wrap">
                {replacePlaceholders(termsToRender)}
            </div>
        </section>

        <section className="mt-16 pt-8 border-t border-gray-300">
          <h2 className="text-xl font-semibold text-gray-700 mb-8 text-center">{t('signatures')}</h2>
          <div className="grid grid-cols-2 gap-16">
            <div className="text-center">
              <div className="relative h-24 mb-2 flex items-center justify-center">
                {brandAssets?.signatureUrl && <Image src={brandAssets.signatureUrl} alt="Official Signature" layout="fill" objectFit="contain" />}
                {brandAssets?.stampUrl && <Image src={brandAssets.stampUrl} alt="Official Stamp" layout="fill" objectFit="contain" className="opacity-50" />}
              </div>
              <div className="h-1 border-b-2 border-gray-400"></div>
              <p className="text-sm text-gray-600 mt-2">{t('signatureOfBidGiver')}</p>
              <p className="text-sm font-medium text-gray-800">{SITE_NAME}</p>
            </div>
            <div className="text-center">
              <div className="h-24 border-b-2 border-gray-400 mb-2 flex items-center justify-center">
                <span className="text-gray-400 text-xs italic">{t('clientSignatureGoesHere')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{t('signatureOfBidTaker')}</p>
              <p className="text-sm font-medium text-gray-800">{booking.companyName || t('clientCompanyNamePlaceholder')}</p>
            </div>
          </div>
        </section>

        <footer className="mt-16 text-center text-xs text-gray-500 no-print">
          <p>{t('thankYouForBusiness')}</p>
        </footer>
      </div>
    </div>
  );
}
