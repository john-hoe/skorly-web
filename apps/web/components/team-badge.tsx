import Image from "next/image";

export function TeamBadge({
  name,
  logo,
  code,
  size = 28,
  showName = true,
  reverse = false,
}: {
  name: string;
  logo?: string | null;
  code?: string | null;
  size?: number;
  showName?: boolean;
  reverse?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 min-w-0 ${reverse ? "flex-row-reverse" : ""}`}
    >
      {logo ? (
        <Image
          src={logo}
          alt={name}
          width={size}
          height={size}
          className="shrink-0 object-contain"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--border)] text-[10px] font-semibold"
          style={{ width: size, height: size }}
        >
          {code ?? name.slice(0, 3).toUpperCase()}
        </span>
      )}
      {showName && (
        <span
          className={`min-w-0 break-words text-sm font-medium leading-tight ${reverse ? "text-right" : "text-left"}`}
        >
          {name}
        </span>
      )}
    </span>
  );
}
