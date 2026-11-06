import { useEffect, useId, type ReactNode } from 'react';
import { expiryInfo } from '../lib/dates';

type IconName = 'week' | 'pantry' | 'recipes' | 'cart' | 'plus' | 'x' | 'check' | 'search' | 'trash' | 'edit' | 'download' | 'upload' | 'leaf' | 'chevL' | 'chevR' | 'clock' | 'users' | 'sun' | 'list' | 'calendar' | 'spark';

const PATHS: Record<IconName, ReactNode> = {
  week: (<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  pantry: (<><path d="M4 8.5 12 4l8 4.5v9L12 22l-8-4.5z" /><path d="M4 8.5 12 13l8-4.5M12 13v9" /></>),
  recipes: (<><path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10M9 8h5" /></>),
  cart: (<><path d="M3.5 4.5h2.2l2 11h10.2l1.9-7.5H6.4" /><circle cx="9.5" cy="19.2" r="1.3" /><circle cx="17" cy="19.2" r="1.3" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  x: (<path d="M6 6l12 12M18 6 6 18" />),
  check: (<path d="m5 12.5 4.5 4.5L19 7.5" />),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>),
  trash: (<><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7" /></>),
  edit: (<><path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>),
  download: (<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" />),
  upload: (<path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 20h14" />),
  leaf: (<><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" /><path d="M5 19c3-4 6-6.5 9-8" /></>),
  chevL: (<path d="m14.5 6-6 6 6 6" />),
  chevR: (<path d="m9.5 6 6 6-6 6" />),
  clock: (<><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>),
  users: (<><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5M16 6.5a3 3 0 0 1 0 5.8M18 14.3c1.7.6 2.7 2.2 3 4.7" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>),
  list: (<><path d="m4.5 6.5 1.5 1.5 2.5-3M4.5 12.5 6 14l2.5-3M4.5 18.5 6 20l2.5-3M12 7h8M12 13h8M12 19h8" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.4" /></>),
  spark: (<path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2" />),
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ExpiryBadge({ expiry, now }: { expiry: string; now: string }) {
  const info = expiryInfo(expiry, now);
  return <span className={`badge badge-${info.level}`}>{info.label}</span>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-mark"><Icon name="leaf" size={22} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export const COMMON_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'tin', 'pack', 'pot', 'jar', 'bag', 'bottle', 'bunch', 'clove', 'slice'];
