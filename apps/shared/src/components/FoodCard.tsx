import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { money, prepLabel } from '../format';
import { foodImageUrl } from '../supabase';
import type { Category, FoodItem } from '../types';

export function FoodImage({ item, category }: { item: Pick<FoodItem, 'image_url' | 'name'>; category?: Category | null }) {
  const url = foodImageUrl(item.image_url);
  return url ? <img src={url} alt={item.name} loading="lazy" /> : <span aria-hidden="true">{category?.icon ?? '🍲'}</span>;
}

export function FoodCard({ item, sellerName, rating, category, onOpen, onAdd }: {
  item: FoodItem; sellerName?: string; rating?: number; category?: Category | null;
  onOpen: () => void; onAdd?: () => void;
}) {
  return (
    <motion.div className="u-food" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="u-food-imgwrap">
        <button className="u-food-img" onClick={onOpen} aria-label={item.name}>
          <FoodImage item={item} category={category} />
          <span className="u-food-time"><Icon name="clock" size={13} />{prepLabel(item.prep_minutes)}</span>
          {!item.is_available && <div className="u-food-off">Mavjud emas</div>}
        </button>
        {onAdd && item.is_available && (
          <button className="u-food-add" aria-label="Savatga qo'shish" onClick={onAdd}><Icon name="plus" size={20} /></button>
        )}
      </div>
      <button className="u-food-body" onClick={onOpen}>
        <div className="u-food-price">{money(item.price_per_portion)}<small>/ kishi</small></div>
        <div className="u-food-name">{item.name}</div>
        <div className="u-food-meta">
          {rating ? <><Icon name="star" size={13} filled className="star" />{rating.toFixed(1)} · </> : null}
          {sellerName ?? ''}
        </div>
      </button>
    </motion.div>
  );
}
