
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

// Default terms in Afan Oromo
const afanOromoDefaultTerms = `
Kutaa 1: Ibsa Waliigalaa
Waliigalteen kun haalawwan kireeffama mooraa fi tajaajila MBLQBO (Mana Barumsaa, Leenjii fi Qorannoo Biiroo Oromiyaa) bulchuuf kan gargaarudha.

Kutaa 2: Tajaajila Kennamu
MBLQBO tajaajiloota armaan gadii ni kenna:
- Kireeffama galmawwanii fi kutaalee addaa walgahiiwwaniif.
- Tajaajila nyaataa fi dhugaatii akka barbaachisummaa isaatti.
- Iddoo jireenyaa yeroo gabaabaaf (dormitories).

Kutaa 3: Dirqama Kireeffataa (Client)
- Kireeffataan qabeenya kiraan fudhateef kunuunsa gochuu qaba.
- Kaffaltii waliigalame yeroon kaffaluu.
- Seeraa fi qajeelfama giddugalichaa kabajuu.

Kutaa 4: Dirqama MBLQBO
- Iddoo qulqulluu fi mijaa'aa ta'e kireeffataadhaaf qopheessuu.
- Nageenya naannoo mooraa eeguu.
- Tajaajila waliigalame akkuma karoorfame kennuu.

Kutaa 5: Kaffaltii
Kaffaltiin tajaajila argame hunda dura yookaan akkuma waliigaltetti raawwatama. Kaffaltiin yeroon hin kaffalamne yoo jiraate, MBLQBO waliigaltee kana addaan kutuu ni danda'a.

Kutaa 6: Addaan Kutuu Waliigaltee
Gartuun kamiyyuu haalawwan waliigaltee kana keessatti ibsaman yoo cabse, gartuun kaan beeksisa barreeffamaa guyyaa 15 dura kennuun waliigaltee kana addaan kutuu ni danda'a.
`;


export function AgreementTemplate({ booking, customTerms }: AgreementTemplateProps) {
  const { t } = useLanguage();

  const { data: brandAssets } = useQuery<BrandAssets | null>({
      queryKey: [BRAND_ASSETS_QUERY_KEY],
      queryFn: fetchBrandAssets,
      staleTime: 1000 * 60 * 10, // 10 minutes
  });

  if (!booking) {
    return <p>Waliigaltee fe'aa jira...</p>; 
  }

  if (booking.bookingCategory !== 'facility') {
    return <p>Waliigalteen kun tajaajila kanaaf hin hojjetu.</p>; 
  }
  
  const agreementDate = formatDate(new Date(), 'MMMM dd, yyyy');
  
  const startDateObj = booking.startDate instanceof Timestamp ? booking.startDate.toDate() : parseISO(booking.startDate as string);
  const endDateObj = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : parseISO(booking.endDate as string);

  const startDateFormatted = formatDate(startDateObj, 'MMMM dd, yyyy');
  const endDateFormatted = formatDate(endDateObj, 'MMMM dd, yyyy');
  const numberOfDays = differenceInCalendarDays(endDateObj, startDateObj) + 1;
  
  const numberOfAttendees = booking.numberOfAttendees || 0;

  const totalBookingCostFromRecord = booking.totalCost; 

  const termsToRender = customTerms || afanOromoDefaultTerms;
  const facilitiesBookedString = booking.items.map(item => `${item.name} (${t(item.itemType)})`).join(', ');

  const replacePlaceholders = (template: string) => {
    let replaced = template;
    const replacements: Record<string, string | number> = {
      '{{{clientName}}}': booking.companyName || 'Maamila',
      '{{{clientContactPerson}}}': booking.contactPerson || 'Nama Qunnamtii',
      '{{{clientEmail}}}': booking.email || 'Email hin jiru',
      '{{{clientPhone}}}': booking.phone || 'Lakkoofsa bilbilaa hin jiru',
      '{{{facilitiesBooked}}}': facilitiesBookedString,
      '{{{startDate}}}': startDateFormatted,
      '{{{endDate}}}': endDateFormatted,
      '{{{numberOfDays}}}': numberOfDays,
      '{{{numberOfAttendees}}}': numberOfAttendees,
      '{{{totalCost}}}': `${totalBookingCostFromRecord.toFixed(2)} ETB`,
      '{{{agreementDate}}}': agreementDate,
      '{{{providerName}}}': SITE_NAME,
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      replaced = replaced.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return replaced;
  };

  const getFacilityName = (id: string): string => {
    const facility = booking.items.find(item => item.id === id);
    return facility ? facility.name : id;
  };


  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-md print:shadow-none print:p-4 printable-agreement">
      <style jsx global>{`
        @media print {
          body > *:not(.printable-agreement-wrapper),
          .no-print {
            display: none !important;
          }
          .printable-agreement-wrapper {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
          .printable-agreement {
            box-shadow: none;
            border: none;
            width: 100%;
            height: auto; /* Change to auto */
            page-break-inside: avoid; /* Prevent breaking inside the component */
          }
          .schedule-table {
            page-break-inside: auto; /* Allow table to break across pages if needed */
          }
          .schedule-table tr {
            page-break-inside: avoid; /* Avoid breaking inside a row */
          }
          @page {
            size: A4 portrait;
            margin: 15mm; 
          }
        }
      `}</style>
      <div className="printable-agreement-content">
        <header className="text-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">Waliigaltee Kiraa Mooraa</h1>
          <p className="text-sm text-gray-500">Guyyaa Waliigaltee: {agreementDate}</p>
        </header>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Gartuuwwan Waliigalan</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700">Tajaajila Kan Kennu</h3>
              <p className="text-sm">{SITE_NAME}</p>
              <p className="text-sm">Teessoo: Finfinnee, Oromiyaa</p>
              <p className="text-sm">Bilbila: +251-XXX-XXXXXX</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Kireeffataa (Maamila)</h3>
              <p className="text-sm">{booking.companyName || 'Maamila hin beekamne'}</p>
              <p className="text-sm">Teessoo: {booking.companyName || 'Teessoo hin beekamne'}</p>
              <p className="text-sm">Nama Qunnamtii: {booking.contactPerson || 'Hin jiru'}</p>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Ibsa Tajaajilaa</h2>
          <div className="space-y-1 bg-slate-50 p-4 rounded-md border border-slate-200">
            <p className="text-sm"><strong>Mooraa Qabame (Waliigala):</strong> {facilitiesBookedString}</p>
            <p className="text-sm"><strong>Bara Tajaajilaa:</strong> {startDateFormatted} hanga {endDateFormatted} ({numberOfDays} {numberOfDays === 1 ? 'guyyaa' : 'guyyoota'})</p> 
            <p className="text-sm"><strong>Baay'ina Hirmaattotaa:</strong> {booking.numberOfAttendees || 'Hin ibsamne'}</p>
          </div>
        </section>

        {booking.schedule && booking.schedule.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">Sagantaa Guyyaa Guyyaan</h2>
            <div className="overflow-x-auto bg-slate-50 p-4 rounded-md border border-slate-200">
              <table className="w-full text-sm text-left table-auto schedule-table">
                <thead className="bg-slate-200">
                  <tr>
                    <th className="p-2 font-semibold">Guyyaa</th>
                    <th className="p-2 font-semibold">Mooraa Qabame</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.schedule.map((daySchedule, index) => (
                    daySchedule.itemIds && daySchedule.itemIds.length > 0 && (
                      <tr key={index} className="border-b last:border-b-0">
                        <td className="p-2 align-top font-medium whitespace-nowrap">{formatDate(new Date(daySchedule.date), 'EEEE, MMMM dd, yyyy')}</td>
                        <td className="p-2 align-top">{daySchedule.itemIds.map((itemId: string) => getFacilityName(itemId)).join(', ')}</td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        
        <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">Haalawwanii fi Seerota</h2>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-2 text-xs border border-gray-300 p-4 rounded-md bg-slate-50 whitespace-pre-wrap">
                {replacePlaceholders(termsToRender)}
            </div>
        </section>

        <section className="mt-16 pt-8 border-t border-gray-300">
          <h2 className="text-xl font-semibold text-gray-700 mb-8 text-center">Mallattoo</h2>
          <div className="grid grid-cols-2 gap-16">
            <div className="text-center">
              <div className="relative h-24 mb-2 flex items-center justify-center">
                {brandAssets?.signatureUrl && <Image src={brandAssets.signatureUrl} alt="Mallattoo" layout="fill" objectFit="contain" />}
                {brandAssets?.stampUrl && <Image src={brandAssets.stampUrl} alt="Chaappaa" layout="fill" objectFit="contain" className="opacity-50" />}
              </div>
              <div className="h-1 border-b-2 border-gray-400"></div>
              <p className="text-sm text-gray-600 mt-2">Mallattoo Bakka Bu'aa Kennu</p>
              <p className="text-sm font-medium text-gray-800">{SITE_NAME}</p>
            </div>
            <div className="text-center">
              <div className="h-24 border-b-2 border-gray-400 mb-2 flex items-center justify-center">
                <span className="text-gray-400 text-xs italic">Iddoo mallattoo maamilaa</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Mallattoo Bakka Bu'aa Kireeffataa</p>
              <p className="text-sm font-medium text-gray-800">{booking.companyName || 'Maqaa Dhaabbataa'}</p>
            </div>
          </div>
        </section>

        <footer className="mt-16 text-center text-xs text-gray-500 no-print">
          <p>Wajjin hojjechuu keenyaaf isin galateeffanna!</p>
        </footer>
      </div>
    </div>
  );
}
