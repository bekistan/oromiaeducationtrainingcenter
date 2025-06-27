import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2" aria-label="Homepage">
      <Image
        src="https://i.ibb.co/Q8bBqfW/image.png"
        alt="Oromia Education Training Center Logo"
        width={281}
        height={214}
        priority
        className="h-12 w-auto"
      />
    </Link>
  );
}
