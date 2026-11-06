import { useEffect, useRef, useState } from 'react';
import type { PantryItem } from '../types';
import { ShoppingPanel } from './Shopping';
import { BulkModal, ItemModal, PantryPanel, UseItUpBanner } from './Pantry';

/** Kitchen page: "Use It Up" across the top, then what you need (left) beside what you've got (right). */
export function KitchenPage() {
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<PantryItem | 'new' | null>(null);
  const [bulk, setBulk] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onBought = (ids: string[]) => {
    setFlashIds(ids);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashIds([]), 3500);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Kitchen</h1>
          <div className="sub">What you need on the left, what you’ve got on the right. Tick something off to move it across.</div>
        </div>
      </div>
      <UseItUpBanner onEdit={setEditing} />
      <div className="kitchen-layout">
        <ShoppingPanel onBought={onBought} />
        <PantryPanel flashIds={flashIds} onEdit={setEditing} onBulk={() => setBulk(true)} />
      </div>
      {editing && <ItemModal item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {bulk && <BulkModal onClose={() => setBulk(false)} />}
    </>
  );
}
