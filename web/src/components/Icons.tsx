interface IconProps {
  size?: number;
  className?: string;
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Svg({
  size = 18,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...strokeProps}
    >
      {children}
    </svg>
  );
}

export function PlusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function SendIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Svg>
  );
}

export function CopyIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H17" />
    </Svg>
  );
}

export function CheckIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function MenuIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function CloseIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  );
}

export function TrashIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3.5 6h17M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
      <path d="M18.5 6l-.8 12.1a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 6" />
      <path d="M10 10.5v6M14 10.5v6" />
    </Svg>
  );
}

export function PanelIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </Svg>
  );
}

export function ChatIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M20.5 12a7.5 7.5 0 0 1-7.5 7.5H8L4 21l.9-3.2A7.5 7.5 0 1 1 20.5 12Z" />
    </Svg>
  );
}

export function AlertIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.75v5M12 16.2h.01" />
    </Svg>
  );
}

export function SparkIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 3.5l1.85 4.9 4.9 1.85-4.9 1.85L12 17l-1.85-4.9L5.25 10.25l4.9-1.85z" />
      <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </Svg>
  );
}

/** Brand mark — the only gradient in the interface. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="currentColor" focusable="false">
        <path d="M12 2.8l2.2 5.9 5.9 2.2-5.9 2.2L12 19l-2.2-5.9L3.9 10.9l5.9-2.2z" />
        <circle cx="18.6" cy="17.6" r="2.4" />
      </svg>
    </span>
  );
}
