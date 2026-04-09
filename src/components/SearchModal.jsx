import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Icon from './Icon';

const CATEGORIES = [
  { key: 'clients', icon: 'user', label: 'Clients' },
  { key: 'leads', icon: 'zap', label: 'Leads' },
  { key: 'trials', icon: 'activity', label: 'Trials' },
  { key: 'bookings', icon: 'cal', label: 'Bookings' },
];

const MAX_PER_CAT = 5;

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchesQuery(item, q, fields) {
  const nq = normalize(q);
  return fields.some(f => normalize(item[f]).includes(nq));
}

export default function SearchModal({ clients, leads, trials, bookings, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const backdropRef = useRef(null);

  // Trigger entrance animation
  useEffect(() => {
    const af = requestAnimationFrame(() => setVisible(true));
    inputRef.current?.focus();
    return () => cancelAnimationFrame(af);
  }, []);

  // Filter results grouped by category
  const grouped = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const groups = [];

    // Clients
    const cResults = (clients || [])
      .filter(c => matchesQuery(c, q, ['name', 'phone', 'email']))
      .slice(0, MAX_PER_CAT)
      .map(c => ({ id: c.id, title: c.name, sub: [c.phone, c.email].filter(Boolean).join(' \u00b7 '), page: 'clients', badge: c.status }));
    if (cResults.length) groups.push({ ...CATEGORIES[0], results: cResults });

    // Leads
    const lResults = (leads || [])
      .filter(l => matchesQuery(l, q, ['name', 'phone', 'email']))
      .slice(0, MAX_PER_CAT)
      .map(l => ({ id: l.id, title: l.name, sub: [l.phone, l.email].filter(Boolean).join(' \u00b7 '), page: 'leads', badge: l.stage }));
    if (lResults.length) groups.push({ ...CATEGORIES[1], results: lResults });

    // Trials
    const tResults = (trials || [])
      .filter(t => matchesQuery(t, q, ['name', 'phone', 'email']))
      .slice(0, MAX_PER_CAT)
      .map(t => ({ id: t.id, title: t.name, sub: [t.phone, t.email].filter(Boolean).join(' \u00b7 '), page: 'trials', badge: t.stage }));
    if (tResults.length) groups.push({ ...CATEGORIES[2], results: tResults });

    // Bookings
    const bResults = (bookings || [])
      .filter(b => matchesQuery(b, q, ['clientName', 'clientPhone']))
      .slice(0, MAX_PER_CAT)
      .map(b => ({ id: b.id, title: b.clientName, sub: [b.date, b.timeSlot].filter(Boolean).join(' \u00b7 '), page: 'planning', badge: b.status }));
    if (bResults.length) groups.push({ ...CATEGORIES[3], results: bResults });

    return groups;
  }, [query, clients, leads, trials, bookings]);

  // Flat list of all results for keyboard navigation
  const flatResults = useMemo(() => {
    return grouped.flatMap(g => g.results);
  }, [grouped]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIdx(0);
  }, [flatResults.length, query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const handleSelect = useCallback((result) => {
    onNavigate(result.page, result.id);
    onClose();
  }, [onNavigate, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => (i + 1) % Math.max(flatResults.length, 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => (i - 1 + Math.max(flatResults.length, 1)) % Math.max(flatResults.length, 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults[activeIdx]) handleSelect(flatResults[activeIdx]);
      return;
    }
  }, [flatResults, activeIdx, handleSelect, onClose]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

  const totalResults = flatResults.length;
  const hasQuery = query.trim().length > 0;

  // Styles
  const s = {
    backdrop: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.4)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 1000,
      paddingTop: '12vh',
      backdropFilter: 'blur(6px)',
      opacity: visible ? 1 : 0,
      transition: 'opacity .15s ease',
    },
    modal: {
      background: 'var(--b2)',
      border: '1px solid var(--bd)',
      borderRadius: 'var(--r)',
      width: '100%',
      maxWidth: 560,
      maxHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 24px 80px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.04)',
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      opacity: visible ? 1 : 0,
      transition: 'transform .2s ease, opacity .15s ease',
      overflow: 'hidden',
    },
    inputWrap: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 16px',
      borderBottom: '1px solid var(--bd)',
    },
    inputIcon: {
      color: 'var(--t2)',
      flexShrink: 0,
    },
    input: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'none',
      fontSize: 14,
      fontFamily: 'var(--f)',
      color: 'var(--t0)',
      caretColor: 'var(--ac)',
    },
    escBadge: {
      flexShrink: 0,
      padding: '2px 7px',
      borderRadius: 4,
      background: 'var(--b1)',
      border: '1px solid var(--bd)',
      fontSize: 9,
      fontFamily: 'var(--fm)',
      fontWeight: 600,
      color: 'var(--t2)',
      cursor: 'pointer',
    },
    body: {
      flex: 1,
      overflowY: 'auto',
      padding: '4px 0',
    },
    groupHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 16px 4px',
      fontSize: 9.5,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.8px',
      color: 'var(--t2)',
    },
    resultItem: (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 16px',
      cursor: 'pointer',
      background: isActive ? 'var(--acg)' : 'transparent',
      transition: 'background .08s ease',
      borderLeft: isActive ? '2px solid var(--ac)' : '2px solid transparent',
    }),
    resultIcon: {
      width: 30,
      height: 30,
      borderRadius: 'var(--rs)',
      background: 'var(--b1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--t1)',
      flexShrink: 0,
    },
    resultBody: {
      flex: 1,
      minWidth: 0,
    },
    resultTitle: {
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--t0)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    resultSub: {
      fontSize: 10.5,
      color: 'var(--t2)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      marginTop: 1,
    },
    resultBadge: {
      flexShrink: 0,
      padding: '2px 8px',
      borderRadius: 14,
      fontSize: 9,
      fontWeight: 600,
      background: 'var(--b1)',
      color: 'var(--t1)',
    },
    footer: {
      borderTop: '1px solid var(--bd)',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontSize: 10,
      color: 'var(--t2)',
    },
    kbd: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1px 5px',
      borderRadius: 3,
      background: 'var(--b1)',
      border: '1px solid var(--bd)',
      fontSize: 9,
      fontFamily: 'var(--fm)',
      fontWeight: 600,
      color: 'var(--t2)',
      minWidth: 18,
      lineHeight: '16px',
    },
    hintGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    empty: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      color: 'var(--t2)',
    },
    emptyIcon: {
      color: 'var(--bd)',
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 12,
      fontWeight: 500,
    },
    emptyHint: {
      fontSize: 10.5,
      marginTop: 4,
      color: 'var(--t2)',
      opacity: 0.7,
    },
  };

  // Track flat index across groups
  let flatIdx = 0;

  return (
    <div ref={backdropRef} style={s.backdrop} onClick={handleBackdropClick}>
      <div style={s.modal} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-label="Search">
        {/* Search input */}
        <div style={s.inputWrap}>
          <div style={s.inputIcon}>
            <Icon n="search" s={18} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search clients, leads, trials, bookings..."
            style={s.input}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              style={{ ...s.escBadge, background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', color: 'var(--t2)' }}
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear search"
            >
              <Icon n="x" s={14} />
            </button>
          )}
          <span style={s.escBadge} onClick={onClose}>ESC</span>
        </div>

        {/* Results body */}
        <div style={s.body} ref={listRef}>
          {hasQuery && totalResults === 0 && (
            <div style={s.empty}>
              <div style={s.emptyIcon}>
                <Icon n="search" s={36} />
              </div>
              <p style={s.emptyText}>No results found</p>
              <p style={s.emptyHint}>Try a different name, phone, or email</p>
            </div>
          )}

          {!hasQuery && (
            <div style={s.empty}>
              <div style={s.emptyIcon}>
                <Icon n="search" s={36} />
              </div>
              <p style={s.emptyText}>Start typing to search</p>
              <p style={s.emptyHint}>Search by name, phone, or email across all records</p>
            </div>
          )}

          {grouped.map(group => {
            const groupIcon = group.icon;
            return (
              <div key={group.key}>
                <div style={s.groupHeader}>
                  <Icon n={groupIcon} s={12} />
                  <span>{group.label}</span>
                  <span style={{ fontFamily: 'var(--fm)', opacity: 0.6 }}>({group.results.length})</span>
                </div>
                {group.results.map(result => {
                  const idx = flatIdx++;
                  const isActive = idx === activeIdx;
                  return (
                    <div
                      key={result.id}
                      style={s.resultItem(isActive)}
                      data-active={isActive ? 'true' : undefined}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      role="option"
                      aria-selected={isActive}
                    >
                      <div style={s.resultIcon}>
                        <Icon n={groupIcon} s={14} />
                      </div>
                      <div style={s.resultBody}>
                        <div style={s.resultTitle}>{result.title}</div>
                        {result.sub && <div style={s.resultSub}>{result.sub}</div>}
                      </div>
                      {result.badge && <span style={s.resultBadge}>{result.badge}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer with keyboard hints */}
        <div style={s.footer}>
          <div style={s.hintGroup}>
            <span style={s.kbd}>&uarr;</span>
            <span style={s.kbd}>&darr;</span>
            <span>navigate</span>
          </div>
          <div style={s.hintGroup}>
            <span style={s.kbd}>&crarr;</span>
            <span>select</span>
          </div>
          <div style={s.hintGroup}>
            <span style={s.kbd}>esc</span>
            <span>close</span>
          </div>
          {totalResults > 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--fm)' }}>
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
