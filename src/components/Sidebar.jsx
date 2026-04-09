import { T } from '../lib/i18n';
import Icon from './Icon';

export default function Sidebar({ page, setPage, user, onLogout, lang, setLang, leadCount, trialCount, bookingCount, isOpen, onClose }) {
  const t = T[lang];

  const navItems = [
    { key: 'dashboard', icon: 'grid', label: t.dashboard },
    { key: 'clients', icon: 'users', label: t.clients },
    { key: 'leads', icon: 'zap', label: t.leadsMetaTitle, badge: leadCount },
    { key: 'trials', icon: 'user', label: t.trialSessions, badge: trialCount },
    { key: 'planning', icon: 'cal', label: t.planning, badge: bookingCount },
    { key: 'nutrition', icon: 'heart', label: t.nutrition },
    { key: 'settings', icon: 'gear', label: t.settings },
  ];

  return (
    <aside className={`sb ${isOpen ? 'open' : ''}`}>
      <div className="sb-hd">
        <h1>BODY<em>FIT</em></h1>
        <p>Campo de Ourique</p>
      </div>
      <nav className="sb-nav" role="navigation" aria-label="Main navigation">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`sb-i ${page === item.key ? 'on' : ''}`}
            onClick={() => { setPage(item.key); onClose(); }}
            {...(page === item.key ? { 'aria-current': 'page' } : {})}
          >
            <Icon n={item.icon} />
            {item.label}
            {item.badge > 0 && <span className="sb-bg">{item.badge}</span>}
          </button>
        ))}
      </nav>
      <div className="sb-ft">
        <div className="lsw">
          {['fr', 'pt', 'en'].map(x => (
            <button key={x} className={`lb ${lang === x ? 'on' : ''}`} onClick={() => setLang(x)}>
              {x.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="sb-u">
          <div className="sb-av">{user.name[0]}</div>
          <div className="sb-ui">
            <p>{user.name}</p>
            <span>{t[user.role]}</span>
          </div>
          <button className="bg0" onClick={onLogout} title={t.logout}>
            <Icon n="out" s={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
