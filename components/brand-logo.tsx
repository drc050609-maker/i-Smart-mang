import Image from "next/image";

export function BrandLogo({
  className = "h-auto w-full",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/ismart-music-center-logo.png"
      alt="iSmart Music Center"
      width={840}
      height={218}
      className={className}
      priority={priority}
    />
  );
}
