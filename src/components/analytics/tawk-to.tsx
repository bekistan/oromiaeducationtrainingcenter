
"use client";

import Script from 'next/script';

// To enable the Tawk.to chat widget, add the following to your .env.local file
// with your actual Property and Widget IDs from your Tawk.to dashboard.
// NEXT_PUBLIC_TAWK_TO_PROPERTY_ID=your_property_id
// NEXT_PUBLIC_TAWK_TO_WIDGET_ID=your_widget_id
// If these are not set, the widget will not be rendered.

const TAWK_TO_PROPERTY_ID = process.env.NEXT_PUBLIC_TAWK_TO_PROPERTY_ID;
const TAWK_TO_WIDGET_ID = process.env.NEXT_PUBLIC_TAWK_TO_WIDGET_ID;

export function TawkToWidget() {

  if (!TAWK_TO_PROPERTY_ID || !TAWK_TO_WIDGET_ID) {
    // If IDs are not set in environment variables, do not render the widget.
    // This prevents 404 errors for users who have not configured Tawk.to.
    if (process.env.NODE_ENV === 'development') {
      console.log("[OromiaEduRent Tawk.to] Widget not rendered. Set NEXT_PUBLIC_TAWK_TO_PROPERTY_ID and NEXT_PUBLIC_TAWK_TO_WIDGET_ID in .env.local to enable.");
    }
    return null;
  }

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
              console.error("[OromiaEduRent Tawk.to] Tawk.to script failed to load. Please verify that your NEXT_PUBLIC_TAWK_TO_PROPERTY_ID ('${TAWK_TO_PROPERTY_ID}') and NEXT_PUBLIC_TAWK_TO_WIDGET_ID ('${TAWK_TO_WIDGET_ID}') are correct in your .env.local file. Other causes could be network issues or ad-blockers.");
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
