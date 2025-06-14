
"use client";

import Script from 'next/script';
import { useEffect } from 'react';

const TAWK_TO_PROPERTY_ID = '684ca64dea835c190b6d6d04'; // This remains the same
const TAWK_TO_WIDGET_ID = '1itlmj8if'; // Updated to match the new script's widget ID

export function TawkToWidget() {
  useEffect(() => {
    // This ensures Tawk_API is available globally for customization if needed
    // and Tawk_LoadStart is set, as per Tawk.to's standard script.
    if (typeof window !== 'undefined') {
      (window as any).Tawk_API = (window as any).Tawk_API || {};
      (window as any).Tawk_LoadStart = new Date();
    }
  }, []);

  return (
    <Script
      id="tawkto-script"
      strategy="lazyOnload" // Load after all other resources
      dangerouslySetInnerHTML={{
        __html: `
          (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='https://embed.tawk.to/${TAWK_TO_PROPERTY_ID}/${TAWK_TO_WIDGET_ID}';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
          })();
        `,
      }}
    />
  );
}
