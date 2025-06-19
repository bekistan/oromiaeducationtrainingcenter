"use client";

import Script from 'next/script';
// Removed useEffect import as it's no longer used

const TAWK_TO_PROPERTY_ID = '684ca64dea835c190b6d6d04';
const TAWK_TO_WIDGET_ID = '1itlmj8if';

export function TawkToWidget() {
  // useEffect for Tawk_API and Tawk_LoadStart initialization has been removed.
  // The initialization is now part of the __html string.

  return (
    <Script
      id="tawkto-script"
      strategy="lazyOnload" // Load after all other resources
      dangerouslySetInnerHTML={{
        __html: `
          var Tawk_API = window.Tawk_API || {};
          var Tawk_LoadStart = window.Tawk_LoadStart || new Date();

          (function(){
            var s1 = document.createElement("script");
            var s0 = document.getElementsByTagName("script")[0];
            s1.async = true;
            s1.src = 'https://embed.tawk.to/${TAWK_TO_PROPERTY_ID}/${TAWK_TO_WIDGET_ID}';
            s1.charset = 'UTF-8';
            s1.setAttribute('crossorigin','*');
            if (s0 && s0.parentNode) {
              s0.parentNode.insertBefore(s1, s0);
            } else if (document.head) {
              document.head.appendChild(s1);
            } else if (document.body) {
              document.body.appendChild(s1);
            } else {
              // Fallback, should be extremely rare for documentElement to not exist
              document.documentElement.appendChild(s1);
            }
          })();
        `,
      }}
    />
  );
}
