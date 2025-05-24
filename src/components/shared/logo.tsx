import Link from 'next/link';
import { SITE_NAME } from '@/constants';

export function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2">
      {/* You can replace this with an SVG or Image component later */}
      <span className="text-2xl font-bold text-primary">{SITE_NAME}</span>
    </Link>
  );
}
