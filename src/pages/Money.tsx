import { useState } from 'react';
import type { Bill, Expense, SavingsGoal } from '../types';
import { MONEY_CATEGORIES } from '../types';
import { useStore } from '../store';
import { EmptyState, Icon, Modal, ProgressBar } from '../components/ui';
import { addMonths, fmtMonth, fmtShort, startOfMonth, today } from '../lib/dates';
import { gbp, monthOf, nextBillDate } from '../lib/life';

const amt = (v: string) => (Number.isFinite(Number(v)) && v.trim() !== '' ? Math.round(Number(v) * 100) / 100 : 0);

function ExpenseModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const { actions } = useStore();
  const [date, setDate] = useState(expense?.date ?? today());
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '');
  const [category, setCategory] = useState(expense?.category ?? 'Groceries');
  const [note, setNote] = useState(expense?.note ?? '');
  const save = () => {
    if (amt(amount) <= 0) return;
    actions.save('expenses', { id: expense?.id, date, amount: amt(amount), category, note: note.trim() });
    onClose();
  };
  return (
    <Modal title={expense ? 'Edit Spending' : 'Add Spending'} onClose={onClose}>
      <div className="stack">
        <div className="grid-2">
          <label className="field"><span>Amount (£)</span><input className="input" autoFocus type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></label>
          <label className="field"><span>Date</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <label className="field"><span>Category</span><select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>{MONEY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="field"><span>What For</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></label>
      </div>
      <div className="modal-foot">
        {expense && <button className="btn btn-danger spread" onClick={() => { actions.remove('expenses', expense.id); onClose(); }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={amt(amount) <= 0}>Save</button>
      </div>
    </Modal>
  );
}

function BudgetModal({ onClose }: { onClose: () => void }) {
  const { state, actions } = useStore();
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(MONEY_CATEGORIES.map((c) => [c, state.budgets[c] ? String(state.budgets[c]) : ''])));
  const save = () => {
    actions.setBudgets(Object.fromEntries(MONEY_CATEGORIES.map((c) => [c, amt(vals[c])]).filter(([, v]) => (v as number) > 0)));
    onClose();
  };
  return (
    <Modal title="Monthly Budgets" onClose={onClose}>
      <p className="muted-note">How much you want to spend each month in each category. Leave blank for no budget.</p>
      <div className="stack">
        {MONEY_CATEGORIES.map((c) => (
          <label key={c} className="field"><span>{c} (£)</span><input className="input" type="number" min="0" value={vals[c]} onChange={(e) => setVals({ ...vals, [c]: e.target.value })} /></label>
        ))}
      </div>
      <div className="modal-foot"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div>
    </Modal>
  );
}

function BillModal({ bill, onClose }: { bill: Bill | null; onClose: () => void }) {
  const { actions } = useStore();
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill?.amount?.toString() ?? '');
  const [day, setDay] = useState(bill?.day?.toString() ?? '1');
  const save = () => {
    if (!name.trim() || amt(amount) <= 0) return;
    actions.save('bills', { id: bill?.id, name: name.trim(), amount: amt(amount), day: Math.min(31, Math.max(1, Math.round(Number(day)) || 1)) });
    onClose();
  };
  return (
    <Modal title={bill ? 'Edit Bill' : 'New Monthly Bill'} onClose={onClose}>
      <div className="stack">
        <label className="field"><span>Bill</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="grid-2">
          <label className="field"><span>Amount (£)</span><input className="input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <label className="field"><span>Day Of The Month</span><input className="input" type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} /></label>
        </div>
      </div>
      <div className="modal-foot">
        {bill && <button className="btn btn-danger spread" onClick={() => { actions.remove('bills', bill.id); onClose(); }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!name.trim() || amt(amount) <= 0}>Save</button>
      </div>
    </Modal>
  );
}

function SavingsModal({ goal, onClose }: { goal: SavingsGoal | null; onClose: () => void }) {
  const { actions } = useStore();
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal?.target?.toString() ?? '');
  const [saved, setSaved] = useState(goal?.saved?.toString() ?? '0');
  const [due, setDue] = useState(goal?.due ?? '');
  const save = () => {
    if (!name.trim() || amt(target) <= 0) return;
    actions.save('savings', { id: goal?.id, name: name.trim(), target: amt(target), saved: amt(saved), due });
    onClose();
  };
  return (
    <Modal title={goal ? 'Edit Savings Goal' : 'New Savings Goal'} onClose={onClose}>
      <div className="stack">
        <label className="field"><span>What You’re Saving For</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="grid-3">
          <label className="field"><span>Target (£)</span><input className="input" type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          <label className="field"><span>Saved So Far (£)</span><input className="input" type="number" min="0" value={saved} onChange={(e) => setSaved(e.target.value)} /></label>
          <label className="field"><span>By</span><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
        </div>
      </div>
      <div className="modal-foot">
        {goal && <button className="btn btn-danger spread" onClick={() => { actions.remove('savings', goal.id); onClose(); }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!name.trim() || amt(target) <= 0}>Save</button>
      </div>
    </Modal>
  );
}

export function MoneyPage() {
  const { state, actions } = useStore();
  const now = today();
  const [month, setMonth] = useState(startOfMonth(now));
  const [editExp, setEditExp] = useState<Expense | 'new' | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editBill, setEditBill] = useState<Bill | 'new' | null>(null);
  const [editSav, setEditSav] = useState<SavingsGoal | 'new' | null>(null);
  const [topUp, setTopUp] = useState<Record<string, string>>({});

  const monthExpenses = state.expenses.filter((e) => monthOf(e.date) === monthOf(month)).sort((a, b) => b.date.localeCompare(a.date));
  const spentBy = (cat: string) => monthExpenses.filter((e) => e.category === cat).reduce((n, e) => n + e.amount, 0);
  const spent = monthExpenses.reduce((n, e) => n + e.amount, 0);
  const budgetTotal = Object.values(state.budgets).reduce((n, v) => n + v, 0);
  const billsTotal = state.bills.reduce((n, b) => n + b.amount, 0);
  const cats = MONEY_CATEGORIES.filter((c) => state.budgets[c] || spentBy(c) > 0);

  return (
    <>
      <div className="page-head">
        <div><h1>Money</h1><div className="sub">Spending against your budgets, regular bills and savings goals. You enter the figures yourself, nothing connects to your bank.</div></div>
        <div className="row">
          <div className="week-nav">
            <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}><Icon name="chevL" /></button>
            <div className="range">{fmtMonth(month)}</div>
            <button className="icon-btn" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><Icon name="chevR" /></button>
          </div>
          <button className="btn btn-primary" onClick={() => setEditExp('new')}><Icon name="plus" size={16} /> Add Spending</button>
        </div>
      </div>

      <div className="stat-row" style={{ maxWidth: 640 }}>
        <div className="stat"><b>{gbp(spent)}</b><span>Spent</span></div>
        <div className="stat"><b>{budgetTotal > 0 ? gbp(Math.max(0, budgetTotal - spent)) : '–'}</b><span>{budgetTotal > 0 && spent > budgetTotal ? 'Over budget' : 'Left to spend'}</span></div>
        <div className="stat"><b>{gbp(billsTotal)}</b><span>Bills each month</span></div>
      </div>

      <div className="two-col">
        <div>
          <section className="panel" style={{ marginBottom: 22 }}>
            <div className="panel-head"><div><h2>Budgets</h2><div className="panel-sub">{fmtMonth(month)}</div></div><button className="btn btn-sm" onClick={() => setBudgetOpen(true)}>Set Budgets</button></div>
            {cats.length === 0 ? <div className="card"><EmptyState title="No Budgets Set">Press Set Budgets to say how much you want to spend each month.</EmptyState></div> : (
              <div className="card list">
                {cats.map((c) => {
                  const b = state.budgets[c] ?? 0; const s = spentBy(c); const pct = b ? (s / b) * 100 : 0;
                  return (
                    <div key={c} className="item" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="cov-text"><span className="item-name">{c}</span><span>{gbp(s)}{b ? ` of ${gbp(b)}` : ''}</span></div>
                      {b > 0 && <ProgressBar pct={pct} tone={pct > 100 ? 'red' : pct > 85 ? 'terra' : 'accent'} />}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><div><h2>Spending</h2><div className="panel-sub">{monthExpenses.length} {monthExpenses.length === 1 ? 'entry' : 'entries'}</div></div></div>
            {monthExpenses.length === 0 ? <div className="card"><EmptyState title="Nothing Logged This Month" /></div> : (
              <div className="card list">
                {monthExpenses.map((e) => (
                  <div key={e.id} className="item" style={{ gridTemplateColumns: '1fr auto auto' }}>
                    <div><div className="item-name">{e.note || e.category}</div><div className="item-meta"><span>{fmtShort(e.date)}</span><span className="tag">{e.category}</span></div></div>
                    <b>{gbp(e.amount)}</b>
                    <button className="icon-btn" aria-label={`Edit ${e.note || e.category}`} onClick={() => setEditExp(e)}><Icon name="edit" size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div>
          <section className="panel" style={{ marginBottom: 22 }}>
            <div className="panel-head"><div><h2>Bills</h2><div className="panel-sub">Every month</div></div><button className="btn btn-sm" onClick={() => setEditBill('new')}><Icon name="plus" size={14} /> Add</button></div>
            {state.bills.length === 0 ? <div className="card"><EmptyState title="No Bills Yet" /></div> : (
              <div className="card list">
                {[...state.bills].sort((a, b) => nextBillDate(a.day, now).localeCompare(nextBillDate(b.day, now))).map((b) => (
                  <div key={b.id} className="item" style={{ gridTemplateColumns: '1fr auto auto' }}>
                    <div><div className="item-name">{b.name}</div><div className="item-meta"><span>Next: {fmtShort(nextBillDate(b.day, now))}</span></div></div>
                    <b>{gbp(b.amount)}</b>
                    <button className="icon-btn" aria-label={`Edit ${b.name}`} onClick={() => setEditBill(b)}><Icon name="edit" size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><div><h2>Savings Goals</h2></div><button className="btn btn-sm" onClick={() => setEditSav('new')}><Icon name="plus" size={14} /> Add</button></div>
            {state.savings.length === 0 ? <div className="card"><EmptyState title="No Savings Goals Yet" /></div> : (
              <div className="card list">
                {state.savings.map((g) => (
                  <div key={g.id} className="item" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="cov-text"><button className="link-plain item-name" onClick={() => setEditSav(g)}>{g.name}</button><span>{gbp(g.saved)} of {gbp(g.target)}</span></div>
                    <ProgressBar pct={g.target ? (g.saved / g.target) * 100 : 0} />
                    <form className="add-row" style={{ gridTemplateColumns: '1fr auto' }} onSubmit={(e) => { e.preventDefault(); const n = amt(topUp[g.id] ?? ''); if (n <= 0) return; actions.save('savings', { ...g, saved: Math.round((g.saved + n) * 100) / 100 }); setTopUp({ ...topUp, [g.id]: '' }); }}>
                      <input className="input" type="number" min="0" step="0.01" placeholder="Add money (£)" aria-label={`Add money to ${g.name}`} value={topUp[g.id] ?? ''} onChange={(e) => setTopUp({ ...topUp, [g.id]: e.target.value })} />
                      <button className="btn btn-sm" type="submit">Add</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {editExp && <ExpenseModal expense={editExp === 'new' ? null : editExp} onClose={() => setEditExp(null)} />}
      {budgetOpen && <BudgetModal onClose={() => setBudgetOpen(false)} />}
      {editBill && <BillModal bill={editBill === 'new' ? null : editBill} onClose={() => setEditBill(null)} />}
      {editSav && <SavingsModal goal={editSav === 'new' ? null : editSav} onClose={() => setEditSav(null)} />}
    </>
  );
}
