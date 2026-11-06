import { useEffect, useRef, useState } from 'react';
import { ShoppingPanel } from './Shopping';
import { PantryPanel } from './Pantry';

/** Kitchen page: what you need on the left, what you've got on the right. Buying something moves it across. */
export function KitchenPage() {
  const [flashIds, setFlashIds] = useState<string[]>([]);
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
      <div className="kitchen-layout">
        <ShoppingPanel onBought={onBought} />
        <PantryPanel flashIds={flashIds} />
      </div>
    </>
  );
}
