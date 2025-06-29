
import { Suspense } from 'react';
import LoginPageContent from './content';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

// This is the new page component. It's a Server Component by default.
export default function LoginPage() {
  return (
    // The Suspense boundary will show a server-rendered fallback
    // while the client-side component (LoginPageContent) loads.
    <Suspense fallback={
        <Card className="w-full max-w-md shadow-2xl flex items-center justify-center h-[520px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </Card>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
