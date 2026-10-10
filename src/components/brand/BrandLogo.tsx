type BrandLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface BrandLogoProps {
  size?: BrandLogoSize;
  showName?: boolean;
  className?: string;
  textClassName?: string;
  imageClassName?: string;
}

const imageSizes: Record<BrandLogoSize, string> = {
  xs: "h-6 w-6 rounded-lg",
  sm: "h-7 w-7 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
  xl: "h-14 w-14 rounded-2xl",
};

const textSizes: Record<BrandLogoSize, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl",
};

export function BrandName({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-bold tracking-tight text-agri-text ${className}`}
      style={{ fontFamily: "var(--font-outfit)" }}
    >
      <span className="text-accent-green">Agri</span>
      <span>Trust</span>
    </span>
  );
}

export default function BrandLogo({
  size = "md",
  showName = true,
  className = "",
  textClassName = "",
  imageClassName = "",
}: BrandLogoProps) {
  return (
    <div className={`flex shrink-0 items-center gap-2.5 ${className}`}>
      <img
        src="/agritrust-logo.png"
        alt="AgriTrust"
        className={`${imageSizes[size]} shrink-0 object-cover ${imageClassName}`}
      />
      {showName ? (
        <BrandName className={`${textSizes[size]} ${textClassName}`} />
      ) : null}
    </div>
  );
}
