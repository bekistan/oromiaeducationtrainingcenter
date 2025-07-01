"use client";

import Script from 'next/script';

const TAWK_TO_PROPERTY_ID = '664ca64dea835c190b6d6d04';
const TAWK_TO_WIDGET_ID = '1hvlmj8if';

export function TawkToWidget() {
  return (
    <Script
      id="tawkto-script"
      strategy="lazyOnload" // Load after all other resources
      dangerouslySetInnerHTML={{
        __html: `
          window.Tawk_API = window.Tawk_API || {};
          window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

          (function(){
            var s1 = document.createElement("script");
            var s0 = document.getElementsByTagName("script")[0];
            s1.async = true;
            s1.src = 'https://embed.tawk.to/${TAWK_TO_PROPERTY_ID}/${TAWK_TO_WIDGET_ID}';
            s1.charset = 'UTF-8';
            s1.setAttribute('crossorigin','*');
            s1.onerror = function() {
              console.error("[OromiaEduRent Tawk.to] Tawk.to script failed to load. Potential issues: network connectivity, adblocker, incorrect Property ID or Widget ID, or Tawk.to service interruption.");
            };
            
            if (s0 && s0.parentNode) {
              s0.parentNode.insertBefore(s1, s0);
            } else if (document.head) {
              document.head.appendChild(s1);
            } else if (document.body) {
              document.body.appendChild(s1);
            } else {
              document.documentElement.appendChild(s1);
            }
          })();
        `,
      }}
    />
  );
}
