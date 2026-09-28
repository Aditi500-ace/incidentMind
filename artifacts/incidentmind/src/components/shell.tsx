import { Bell, BookOpen, BrainCircuit, ChevronRight, FileText, LayoutDashboard, Menu, RadioTower, Search, ShieldCheck, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

const nav = [
  { href: '/', label: 'Command center', icon: LayoutDashboard },
  { href: '/incidents', label: 'Incidents', icon: RadioTower },
  { href: '/memory', label: 'Hindsight memory', icon: BrainCircuit },
  { href: '/runbooks', label: 'Runbooks', icon: BookOpen },
  { href: '/postmortems', label: 'Post-mortems', icon: FileText },
];

export function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  return (
    <div className="grain min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
            <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_0_5px_hsl(var(--sidebar-primary)/.12)]">
              <ShieldCheck size={19} strokeWidth={2.4} />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
            </div>
            <div><div className="font-display text-[17px] font-bold tracking-tight">IncidentMind</div><div className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/50">Production memory</div></div>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground/60 md:hidden" data-testid="button-close-nav" aria-label="Close navigation"><X size={19} /></button>
        </div>
        <div className="px-4 pt-7">
          <div className="mb-3 px-3 font-mono-ui text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/40">Workspace</div>
          <nav className="space-y-1">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = location === href || (href !== '/' && location.startsWith(href));
              return <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
                <span className="flex items-center gap-3"><Icon size={17} strokeWidth={active ? 2.2 : 1.7} /><span>{label}</span></span>
                {active && <ChevronRight size={14} className="text-sidebar-primary" />}
              </Link>;
            })}
          </nav>
        </div>
        <div className="mt-auto px-4 pb-5">
          <Link href="/demo" data-testid="link-demo" className="group block overflow-hidden rounded-2xl border border-sidebar-primary/25 bg-sidebar-primary/10 p-4 transition-colors hover:bg-sidebar-primary/15">
            <div className="mb-3 flex items-center justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-sidebar-primary">Guided demo</span><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-sidebar-primary" /></div>
            <p className="text-[12px] leading-relaxed text-sidebar-foreground/70">Watch memory turn a familiar failure into a faster answer.</p>
            <div className="mt-3 text-[11px] font-semibold text-sidebar-primary">Run the 60-second story →</div>
          </Link>
          <div className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-4"><div className="grid h-8 w-8 place-items-center rounded-full bg-sidebar-accent font-display text-xs font-bold text-sidebar-primary">IC</div><div className="min-w-0"><div className="truncate text-xs font-semibold">Incident commander</div><div className="font-mono-ui text-[10px] text-sidebar-foreground/45">on call · UTC</div></div><Bell size={15} className="ml-auto text-sidebar-foreground/40" /></div>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-overlay" aria-label="Close menu" />}
      <main className="min-h-[100dvh] md:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md md:px-9">
          <div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-muted md:hidden" data-testid="button-open-nav" aria-label="Open navigation"><Menu size={19} /></button><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Operational workspace <span className="mx-2 text-border">/</span> <span className="text-primary">{location === '/' ? 'overview' : location.slice(1)}</span></div></div>
          <div className="flex items-center gap-2"><button className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex" data-testid="button-global-search"><Search size={14} /> Search workspace <kbd className="ml-4 rounded border border-border px-1.5 font-mono-ui text-[9px]">⌘ K</kbd></button><div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card font-display text-xs font-bold text-primary">IC</div></div>
        </header>
        <div className="mx-auto max-w-[1460px] px-5 py-7 md:px-9 md:py-9">{children}</div>
      </main>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) { return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />; }
export function LoadingBlock() { return <div className="space-y-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-80" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><Skeleton className="h-72 w-full" /></div>; }
export function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="surface-grid rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><BrainCircuit size={22} /></div><h3 className="font-display text-lg font-bold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{detail}</p></div>; }
export function ErrorState({ retry }: { retry?: () => void }) { return <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center"><p className="font-display font-bold text-destructive">The signal dropped.</p><p className="mt-1 text-sm text-muted-foreground">IncidentMind could not reach the workspace right now.</p>{retry && <button onClick={retry} className="mt-4 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground" data-testid="button-retry">Retry connection</button>}</div>; }
export function PageIntro({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) { return <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">{eyebrow}</div><h1 className="font-display text-3xl font-bold tracking-[-.04em] text-foreground md:text-[42px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{detail}</p></div>{action}</div>; }
export function StatusPill({ value }: { value: string }) { const red = value === 'SEV-1' || value === 'critical' || value === 'active'; const amber = value === 'SEV-2' || value === 'investigating' || value === 'warning'; return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono-ui text-[10px] uppercase tracking-wider ${red ? 'border-destructive/20 bg-destructive/8 text-destructive' : amber ? 'border-accent/40 bg-accent/15 text-foreground' : 'border-primary/20 bg-primary/8 text-primary'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{value}</span>; }
export function SectionLabel({ children }: { children: ReactNode }) { return <div className="mb-3 font-mono-ui text-[10px] uppercase tracking-[.17em] text-muted-foreground">{children}</div>; }