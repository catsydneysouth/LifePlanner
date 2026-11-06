import { useState } from 'react';
import type { Trip } from '../types';
import { useStore, uid } from '../store';
import { EmptyState, Icon, Modal } from '../components/ui';
import { fmtShort, today } from '../lib/dates';
import { tripCountdown } from '../lib/life';

const STATUS_LABEL: Record<Trip['status'], string> = { idea: 'Idea', planned: 'Planned', booked: 'Booked', done: 'Done' };
const dates = (t: Trip) => (t.start ? `${fmtShort(t.start)}${t.end ? ' – ' + fmtShort(t.end) : ''}` : 'Dates not set');

function TripModal({ trip, onClose, onDeleted }: { trip: Trip | null; onClose: () => void; onDeleted?: () => void }) {
  const { actions } = useStore();
  const [name, setName] = useState(trip?.name ?? '');
  const [destination, setDestination] = useState(trip?.destination ?? '');
  const [start, setStart] = useState(trip?.start ?? '');
  const [end, setEnd] = useState(trip?.end ?? '');
  const [status, setStatus] = useState<Trip['status']>(trip?.status ?? 'idea');
  const [notes, setNotes] = useState(trip?.notes ?? '');
  const save = () => {
    if (!name.trim()) return;
    actions.save('trips', { id: trip?.id, name: name.trim(), destination: destination.trim(), start, end, status, notes: notes.trim(), itinerary: trip?.itinerary ?? [], bookings: trip?.bookings ?? [], packing: trip?.packing ?? [] });
    onClose();
  };
  return (
    <Modal title={trip ? 'Edit Trip' : 'New Trip'} onClose={onClose}>
      <div className="stack">
        <label className="field"><span>Trip Name</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Where</span><input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} /></label>
        <div className="grid-3">
          <label className="field"><span>From</span><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="field"><span>To</span><input className="input" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></label>
          <label className="field"><span>Status</span><select className="select" value={status} onChange={(e) => setStatus(e.target.value as Trip['status'])}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </div>
        <label className="field"><span>Notes</span><textarea className="textarea" style={{ minHeight: 80 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
      <div className="modal-foot">
        {trip && <button className="btn btn-danger spread" onClick={() => { if (window.confirm(`Delete “${trip.name}”?`)) { actions.remove('trips', trip.id); onClose(); onDeleted?.(); } }}><Icon name="trash" size={16} /> Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!name.trim()}>Save</button>
      </div>
    </Modal>
  );
}

function TripDetail({ id }: { id: string }) {
  const { state, actions } = useStore();
  const now = today();
  const trip = state.trips.find((t) => t.id === id);
  const [editing, setEditing] = useState(false);
  const [itDate, setItDate] = useState('');
  const [itText, setItText] = useState('');
  const [bkWhat, setBkWhat] = useState('');
  const [bkRef, setBkRef] = useState('');
  const [bkDate, setBkDate] = useState('');
  const [pk, setPk] = useState('');

  if (!trip) return <div className="card"><EmptyState title="Trip Not Found" action={<a className="btn" href="#/travel">Back To Travel</a>} /></div>;
  const update = (patch: Partial<Trip>) => actions.save('trips', { ...trip, ...patch });
  const packed = trip.packing.filter((p) => p.packed).length;
  const itinerary = [...trip.itinerary].sort((a, b) => a.date.localeCompare(b.date));
  const bookings = [...trip.bookings].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <a className="muted-link" href="#/travel">← All Trips</a>
      <div className="page-head" style={{ marginTop: 10 }}>
        <div>
          <h1>{trip.name}</h1>
          <div className="sub">{[trip.destination, dates(trip), tripCountdown(trip, now)].filter(Boolean).join(' · ')}</div>
        </div>
        <button className="btn" onClick={() => setEditing(true)}><Icon name="edit" size={16} /> Edit Trip</button>
      </div>
      {trip.notes && <p className="trip-notes">{trip.notes}</p>}

      <div className="trip-cols">
        <section className="panel">
          <div className="panel-head"><h2>Itinerary</h2></div>
          <div className="card list">
            {itinerary.map((i) => (
              <div key={i.id} className="item" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                <span className="event-time">{i.date ? fmtShort(i.date) : 'Any day'}</span><span>{i.text}</span>
                <button className="icon-btn" aria-label={`Remove ${i.text}`} onClick={() => update({ itinerary: trip.itinerary.filter((x) => x.id !== i.id) })}><Icon name="x" size={16} /></button>
              </div>
            ))}
            <form className="item add-row" onSubmit={(e) => { e.preventDefault(); if (!itText.trim()) return; update({ itinerary: [...trip.itinerary, { id: uid(), date: itDate, text: itText.trim() }] }); setItText(''); }}>
              <input className="input" type="date" value={itDate} onChange={(e) => setItDate(e.target.value)} aria-label="Itinerary date" />
              <input className="input" placeholder="Add a plan" value={itText} onChange={(e) => setItText(e.target.value)} />
              <button className="btn btn-sm" type="submit"><Icon name="plus" size={14} /> Add</button>
            </form>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Bookings</h2></div>
          <div className="card list">
            {bookings.map((b) => (
              <div key={b.id} className="item" style={{ gridTemplateColumns: '1fr auto' }}>
                <div><div className="item-name">{b.what}</div><div className="item-meta">{b.ref && <span>Ref {b.ref}</span>}{b.date && <span>{fmtShort(b.date)}</span>}</div></div>
                <button className="icon-btn" aria-label={`Remove ${b.what}`} onClick={() => update({ bookings: trip.bookings.filter((x) => x.id !== b.id) })}><Icon name="x" size={16} /></button>
              </div>
            ))}
            <form className="item add-row" onSubmit={(e) => { e.preventDefault(); if (!bkWhat.trim()) return; update({ bookings: [...trip.bookings, { id: uid(), what: bkWhat.trim(), ref: bkRef.trim(), date: bkDate }] }); setBkWhat(''); setBkRef(''); setBkDate(''); }}>
              <input className="input" placeholder="What (e.g. Flights)" value={bkWhat} onChange={(e) => setBkWhat(e.target.value)} />
              <input className="input" placeholder="Reference" value={bkRef} onChange={(e) => setBkRef(e.target.value)} />
              <input className="input" type="date" value={bkDate} onChange={(e) => setBkDate(e.target.value)} aria-label="Booking date" />
              <button className="btn btn-sm" type="submit"><Icon name="plus" size={14} /> Add</button>
            </form>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Packing</h2><div className="panel-sub">{packed} of {trip.packing.length} packed</div></div>
            {packed > 0 && <button className="btn btn-sm btn-ghost" onClick={() => update({ packing: trip.packing.map((p) => ({ ...p, packed: false })) })}>Untick All</button>}</div>
          <div className="card list">
            {trip.packing.map((p) => (
              <div key={p.id} className={'item task' + (p.packed ? ' is-done' : '')}>
                <button className={'tick' + (p.packed ? ' on' : '')} aria-label={`Toggle ${p.text}`} onClick={() => update({ packing: trip.packing.map((x) => (x.id === p.id ? { ...x, packed: !x.packed } : x)) })}>{p.packed && <Icon name="check" size={14} />}</button>
                <div className="task-title">{p.text}</div>
                <button className="icon-btn" aria-label={`Remove ${p.text}`} onClick={() => update({ packing: trip.packing.filter((x) => x.id !== p.id) })}><Icon name="x" size={16} /></button>
              </div>
            ))}
            <form className="item" style={{ gridTemplateColumns: '1fr auto' }} onSubmit={(e) => { e.preventDefault(); if (!pk.trim()) return; update({ packing: [...trip.packing, { id: uid(), text: pk.trim(), packed: false }] }); setPk(''); }}>
              <input className="input" placeholder="Add something to pack" value={pk} onChange={(e) => setPk(e.target.value)} />
              <button className="btn btn-sm" type="submit"><Icon name="plus" size={14} /> Add</button>
            </form>
          </div>
        </section>
      </div>
      {editing && <TripModal trip={trip} onClose={() => setEditing(false)} onDeleted={() => { window.location.hash = '#/travel'; }} />}
    </>
  );
}

export function TravelPage({ arg }: { arg: string | null }) {
  const { state } = useStore();
  const now = today();
  const [creating, setCreating] = useState(false);
  if (arg) return <TripDetail id={arg} />;

  const dated = (t: Trip) => t.start || '9999';
  const upcoming = state.trips.filter((t) => t.status !== 'idea' && t.status !== 'done' && (!t.end || t.end >= now)).sort((a, b) => dated(a).localeCompare(dated(b)));
  const ideas = state.trips.filter((t) => t.status === 'idea');
  const past = state.trips.filter((t) => t.status === 'done' || (t.status !== 'idea' && t.end && t.end < now));
  const sections = [{ title: 'Upcoming', trips: upcoming }, { title: 'Ideas', trips: ideas }, { title: 'Past Trips', trips: past }].filter((s) => s.trips.length > 0);

  return (
    <>
      <div className="page-head">
        <div><h1>Travel</h1><div className="sub">Trips, plans, bookings and packing lists.</div></div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={16} /> New Trip</button>
      </div>
      {sections.length === 0 ? (
        <div className="card"><EmptyState title="No Trips Yet">Add a trip you’re planning, or just somewhere you’d love to go.</EmptyState></div>
      ) : sections.map((s) => (
        <section key={s.title} style={{ marginBottom: 26 }}>
          <div className="group-head"><h3>{s.title}</h3><span className="pill-n">{s.trips.length}</span></div>
          <div className="recipe-grid">
            {s.trips.map((t) => (
              <a key={t.id} href={`#/travel/${t.id}`} className="recipe-card">
                <h3>{t.name}</h3>
                <div className="recipe-meta" style={{ flexWrap: 'wrap' }}>
                  {t.destination && <span>{t.destination}</span>}<span>{dates(t)}</span>
                </div>
                <div className="cov-text"><span className="tag">{STATUS_LABEL[t.status]}</span><span>{tripCountdown(t, now)}</span></div>
              </a>
            ))}
          </div>
        </section>
      ))}
      {creating && <TripModal trip={null} onClose={() => setCreating(false)} />}
    </>
  );
}
