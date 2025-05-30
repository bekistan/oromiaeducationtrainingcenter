
'use client';

import type { Booking, BookingItem } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { SITE_NAME } from '@/constants'; // Import SITE_NAME

interface AgreementTemplateProps {
  booking: Booking | null;
  customTerms?: string; 
}

// Consistent pricing with BookingForm (per person per day)
const LUNCH_PRICES_PER_DAY = { level1: 150, level2: 250 }; 
const REFRESHMENT_PRICES_PER_DAY = { level1: 50, level2: 100 };

const DEFAULT_TERMS_KEYS = [
  'termsPlaceholder1',
  'termsPlaceholder2',
  'termsPlaceholder3',
  'termsPlaceholder4',
];

export function AgreementTemplate({ booking, customTerms }: AgreementTemplateProps) {
  const { t } = useLanguage();

  if (!booking) {
    return <p>{t('loadingAgreementDetails')}</p>; 
  }

  if (booking.bookingCategory !== 'facility') {
    return <p>{t('agreementNotApplicable')}</p>; 
  }

  const agreementDate = format(new Date(), 'MMMM dd, yyyy');
  
  const startDateObj = booking.startDate instanceof Timestamp ? booking.startDate.toDate() : parseISO(booking.startDate as string);
  const endDateObj = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : parseISO(booking.endDate as string);

  const startDate = format(startDateObj, 'MMMM dd, yyyy');
  const endDate = format(endDateObj, 'MMMM dd, yyyy');
  const numberOfDays = differenceInCalendarDays(endDateObj, startDateObj) + 1;
  
  const numberOfAttendees = booking.numberOfAttendees || 0;

  let calculatedFacilityRentalCost = 0;
  booking.items.forEach(item => {
    calculatedFacilityRentalCost += (item.rentalCost || 0) * (numberOfDays > 0 ? numberOfDays : 1);
  });

  let calculatedLunchServiceCost = 0;
  if (booking.serviceDetails?.lunch && booking.serviceDetails.lunch !== 'none' && numberOfAttendees > 0 && numberOfDays > 0) {
    const pricePerPersonPerDay = LUNCH_PRICES_PER_DAY[booking.serviceDetails.lunch];
    calculatedLunchServiceCost = pricePerPersonPerDay * numberOfAttendees * numberOfDays;
  }

  let calculatedRefreshmentServiceCost = 0;
  if (booking.serviceDetails?.refreshment && booking.serviceDetails.refreshment !== 'none' && numberOfAttendees > 0 && numberOfDays > 0) {
    const pricePerPersonPerDay = REFRESHMENT_PRICES_PER_DAY[booking.serviceDetails.refreshment];
    calculatedRefreshmentServiceCost = pricePerPersonPerDay * numberOfAttendees * numberOfDays;
  }
  
  // booking.totalCost should be the authoritative source from the booking record
  const totalBookingCostFromRecord = booking.totalCost;

  const termsToRender = customTerms || DEFAULT_TERMS_KEYS.map(key => t(key)).join('\n\n');

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
            padding: 20px; /* Adjust print padding as needed */
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 20mm; /* Standard A4 margins */
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
            <p className="text-sm"><strong>{t('facilityBooked')}:</strong> {booking.items.map(item => item.name).join(', ')}</p>
            <p className="text-sm"><strong>{t('bookingPeriod')}:</strong> {startDate} {t('to')} {endDate} ({numberOfDays} {numberOfDays === 1 ? t('day') : t('days')})</p> {/* Add 'days' to JSON */}
            <p className="text-sm"><strong>{t('numberOfAttendees')}:</strong> {booking.numberOfAttendees || t('notSpecified')}</p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">{t('agreedServicesAndCosts')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 p-2">{t('serviceItem')}</th>
                  <th className="border border-slate-300 p-2">{t('details')}</th>
                  <th className="border border-slate-300 p-2 text-right">{t('cost')} (ETB)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2">{t('facilityRental')}</td>
                  <td className="border border-slate-300 p-2">{booking.items.map(item => item.name).join(', ')} ({numberOfDays} {numberOfDays === 1 ? t('day') : t('days')})</td>
                  <td className="border border-slate-300 p-2 text-right">{calculatedFacilityRentalCost.toFixed(2)}</td>
                </tr>
                {booking.serviceDetails?.lunch && booking.serviceDetails.lunch !== 'none' && numberOfAttendees > 0 && (
                  <tr>
                    <td className="border border-slate-300 p-2">{t('lunchService')}</td>
                    <td className="border border-slate-300 p-2">{t(booking.serviceDetails.lunch)} - {numberOfAttendees} {t('persons')} x {numberOfDays} {numberOfDays === 1 ? t('day') : t('days')}</td>
                    <td className="border border-slate-300 p-2 text-right">{calculatedLunchServiceCost.toFixed(2)}</td>
                  </tr>
                )}
                {booking.serviceDetails?.refreshment && booking.serviceDetails.refreshment !== 'none' && numberOfAttendees > 0 && (
                   <tr>
                    <td className="border border-slate-300 p-2">{t('refreshmentService')}</td>
                    <td className="border border-slate-300 p-2">{t(booking.serviceDetails.refreshment)} - {numberOfAttendees} {t('persons')} x {numberOfDays} {numberOfDays === 1 ? t('day') : t('days')}</td>
                    <td className="border border-slate-300 p-2 text-right">{calculatedRefreshmentServiceCost.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="font-bold bg-slate-100">
                  <td colSpan={2} className="border border-slate-300 p-2 text-right">{t('totalBookingCost')}</td>
                  <td className="border border-slate-300 p-2 text-right">{totalBookingCostFromRecord.toFixed(2)} ETB</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        
        <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">{t('termsAndConditions')}</h2>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-1 text-xs border border-gray-300 p-3 rounded-md h-32 overflow-y-auto bg-slate-50 whitespace-pre-wrap">
                {termsToRender}
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

    
