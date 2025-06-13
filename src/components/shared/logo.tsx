
import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2" aria-label="Homepage">
      <Image
        src="/logo.png" // Path relative to the 'public' directory
        alt="Oromia Education Training Center Logo"
        width={180} // Adjust width as needed for your design
        height={50} // Adjust height to maintain aspect ratio, or set for specific design
        priority // Add priority if the logo is above the fold (LCP)
        className="h-auto" // Added to ensure responsiveness while maintaining aspect ratio set by width/height props
      />
    </Link>
  );
}
