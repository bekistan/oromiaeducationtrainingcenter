
import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2" aria-label="Homepage">
      <Image
        src="https://i.ibb.co/23Qfp0rX/logo-oroedu-removebg-preview.png" // Updated image URL
        alt="Oromia Education Training Center Logo"
        width={150}
        height={42}
        priority
        className="h-9 w-auto"
      />
    </Link>
  );
}
