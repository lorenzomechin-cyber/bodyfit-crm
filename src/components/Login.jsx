import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { T } from '../lib/i18n';
import Icon from './Icon';

export default function Login({ onLogin }) {
  const [lang, setLang] = useState('fr');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = T[lang];

  const go = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setError(res.error.message);
        setLoading(false);
        return;
      }
      onLogin(
        { username: email, role: 'admin', name: email.split('@')[0], id: res.data.user.id },
        lang
      );
    } catch {
      setError('Erreur de connexion');
      setLoading(false);
    }
  };

  return (
    <div className="lgc">
      <div className="lgk fin">
        <h1 style={{ fontFamily: 'var(--fm)', fontSize: 20, marginBottom: 4 }}>
          BODY<em style={{ color: 'var(--ac)', fontStyle: 'normal' }}>FIT</em>
        </h1>
        <p style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 24 }}>
          Campo de Ourique
        </p>
        <div className="lsw" style={{ justifyContent: 'center', marginBottom: 20 }}>
          {['fr', 'pt', 'en'].map(x => (
            <button key={x} className={`lb ${lang === x ? 'on' : ''}`} onClick={() => setLang(x)}>
              {x.toUpperCase()}
            </button>
          ))}
        </div>
        {error && (
          <div style={{ background: 'var(--erg)', color: 'var(--er)', padding: 6, borderRadius: 5, fontSize: 11, marginBottom: 10 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="fg">
            <label className="fl">Email</label>
            <input className="fi" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder="votre@email.com" />
          </div>
          <div className="fg">
            <label className="fl">{t.password}</label>
            <input className="fi" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
          </div>
          <button className="bt bp" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading} onClick={go}>
            <Icon n="zap" s={14} />
            {loading ? 'Connexion...' : t.login}
          </button>
        </div>
      </div>
    </div>
  );
}
