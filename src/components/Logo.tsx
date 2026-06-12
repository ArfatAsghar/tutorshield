import type { SVGProps } from "react";

export function LogoIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" /> {/* Emerald/Green */}
          <stop offset="100%" stopColor="#d97706" /> {/* Gold/Amber */}
        </linearGradient>
      </defs>
      {/* Shield shape */}
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="url(#logo-gradient)"
      />
      {/* Checkmark representing verification */}
      <path
        d="M9 11l2 2 4-4"
        stroke="url(#logo-gradient)"
      />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center border border-border shadow-sm">
        <LogoIcon className="w-5 h-5" />
      </div>
      <span className="font-display font-semibold text-xl tracking-tight text-foreground">
        Tutor<span className="text-emerald-500 font-bold">Shield</span>
      </span>
    </div>
  );
}
