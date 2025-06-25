

'use client';

import type { Booking, BookingItem } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { SITE_NAME } from '@/constants'; 
import { formatDateForDisplay, formatDualDate } from '@/lib/date-utils';

interface AgreementTemplateProps {
  booking: Booking | null;
  customTerms?: string; 
}

export function AgreementTemplate({ booking, customTerms }: AgreementTemplateProps) {
  const { t } = useLanguage();

  if (!booking) {
    return <p>{t('loadingAgreementDetails')}</p>; 
  }

  if (booking.bookingCategory !== 'facility') {
    return <p>{t('agreementNotApplicable')}</p>; 
  }
  
  const agreementDate = formatDualDate(new Date(), 'MMMM dd, yyyy', 'MMMM D, YYYY ERA');
  
  const startDateObj = booking.startDate instanceof Timestamp ? booking.startDate.toDate() : parseISO(booking.startDate as string);
  const endDateObj = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : parseISO(booking.endDate as string);

  const startDateFormatted = formatDualDate(startDateObj, 'MMMM dd, yyyy', 'MMMM D, YYYY ERA');
  const endDateFormatted = formatDualDate(endDateObj, 'MMMM dd, yyyy', 'MMMM D, YYYY ERA');
  const numberOfDays = differenceInCalendarDays(endDateObj, startDateObj) + 1;
  
  const numberOfAttendees = booking.numberOfAttendees || 0;

  // These are just for display in the table, the final cost is taken from booking.totalCost
  const facilityItemCosts = booking.items.map(item => {
    const itemRentalCost = (item.rentalCost || 0) * (numberOfDays > 0 ? numberOfDays : 1);
    return { name: item.name, cost: itemRentalCost, type: item.itemType };
  });

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
          body * {
            visibility: hidden;
          }
          .printable-agreement, .printable-agreement * {
            visibility: visible;
          }
          .printable-agreement {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px; 
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 20mm; 
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="text-center">
              <div className="h-12 border-b-2 border-gray-400 mb-2"></div>
              <p className="text-sm text-gray-600">{t('signatureOfBidGiver')}</p>
              <p className="text-sm font-medium text-gray-800">{SITE_NAME}</p>
            </div>
            <div className="text-center">
              <div className="h-12 border-b-2 border-gray-400 mb-2"></div>
              <p className="text-sm text-gray-600">{t('signatureOfBidTaker')}</p>
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
