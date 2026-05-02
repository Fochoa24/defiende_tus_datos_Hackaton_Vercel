type StructuredCardProps = {
  label: string
  title: string
  description?: string
  accentColor: string
}

export function StructuredCard({
  label,
  title,
  description,
  accentColor,
}: StructuredCardProps) {
  return (
    <div
      className="mt-3 rounded-md bg-muted/60 pl-3 pr-3 py-2.5 border-l-[3px]"
      style={{ borderLeftColor: accentColor }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: accentColor }}
      >
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold text-foreground leading-snug">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
