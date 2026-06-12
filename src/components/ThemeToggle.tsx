import { Moon, Sun, Monitor, Palette, Check } from "lucide-react";
import { useTheme, accents, type Accent } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const { theme, setTheme, accent, setAccent, resolved } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon" className="relative" aria-label="Theme">
          <Sun className={`w-4 h-4 transition-all ${resolved === "dark" ? "scale-0 -rotate-90" : "scale-100 rotate-0"}`} />
          <Moon className={`absolute w-4 h-4 transition-all ${resolved === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90"}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">Appearance</DropdownMenuLabel>
        {([
          { v: "light", label: "Light", icon: Sun },
          { v: "dark", label: "Dark", icon: Moon },
          { v: "system", label: "System", icon: Monitor },
        ] as const).map((o) => (
          <DropdownMenuItem key={o.v} onClick={() => setTheme(o.v)} className="gap-2">
            <o.icon className="w-4 h-4" />
            <span className="flex-1">{o.label}</span>
            {theme === o.v && <Check className="w-3.5 h-3.5 text-gold" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Palette className="w-3 h-3" /> Theme
        </DropdownMenuLabel>
        {accents.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => setAccent(a.id as Accent)} className="gap-2">
            <div className="flex gap-0.5">
              {a.swatch.map((c) => (
                <span key={c} className="w-2.5 h-4 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <span className="flex-1 text-sm">{a.label}</span>
            {accent === a.id && <Check className="w-3.5 h-3.5 text-gold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
