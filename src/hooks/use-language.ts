
"use client";

import { useContext, useCallback } from 'react'; // Added useCallback
import { LanguageContext } from '@/contexts/language-context';

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  // Wrap t function with useCallback to prevent unnecessary re-renders if context object identity changes
  // but t function itself (based on translations and locale) hasn't.
  // However, LanguageContext.Provider already provides a stable `t` via its own useCallback.
  // This is more about ensuring the consuming component gets a stable `t` if it were destructured
  // and passed down, though direct usage `const { t } = useLanguage()` is typical.
  // For this specific setup, the `t` from context is already memoized.
  // Re-wrapping here is mostly for illustration or if the context structure was different.
  // Given the current context, this specific useCallback might be redundant but harmless.

  const t = useCallback(context.t, [context.t]);

  return {
    ...context,
    t, // Provide the potentially re-memoized t
  };
};
