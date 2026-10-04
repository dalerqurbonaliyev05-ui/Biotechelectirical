import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon, type IconName } from './Icon';

export interface TabDef { to: string; label: string; icon: IconName; badge?: number; end?: boolean }

export function BottomTabs({ tabs }: { tabs: TabDef[] }) {
  return (
    <nav className="u-tabbar" aria-label="Asosiy navigatsiya">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end ?? t.to === '/'} className={({ isActive }) => `u-tab ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              <span className="u-tab-ico">
                {isActive && <motion.span layoutId="tab-pill" className="u-tab-pill" transition={{ type: 'spring', damping: 26, stiffness: 340 }} />}
                <Icon name={t.icon} filled={false} />
                {!!t.badge && t.badge > 0 && <span className="u-tab-badge">{t.badge > 99 ? '99+' : t.badge}</span>}
              </span>
              {t.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
