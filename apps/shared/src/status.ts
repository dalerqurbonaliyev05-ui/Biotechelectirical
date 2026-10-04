import type { DeliveryStatus, OrderStatus } from './types';

/** Xaridor ko'radigan 4 bosqichli timeline: qabul qilindi → tayyorlanmoqda → yo'lda → yetkazildi. */
export const TIMELINE_STEPS = [
  { key: 'accepted', label: 'Qabul qilindi' },
  { key: 'preparing', label: 'Tayyorlanmoqda' },
  { key: 'handed_to_courier', label: 'Yo\'lda' },
  { key: 'delivered', label: 'Yetkazildi' },
] as const;

/** Joriy holat timeline'ning nechanchi bosqichida (0..3); -1 = hali sotuvchi qabul qilmagan. */
export function timelineIndex(s: OrderStatus): number {
  switch (s) {
    case 'new': return -1;
    case 'accepted': return 0;
    case 'preparing': return 1;
    case 'handed_to_courier': return 2;
    case 'delivered': return 3;
    default: return -1;
  }
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Yangi',
  accepted: 'Qabul qilindi',
  preparing: 'Tayyorlanmoqda',
  handed_to_courier: 'Yo\'lda',
  delivered: 'Yetkazildi',
  rejected: 'Rad etildi',
  cancelled: 'Bekor qilindi',
};

/** Sotuvchi tomonidagi nomlar. */
export const SELLER_STATUS_LABEL: Record<OrderStatus, string> = {
  ...STATUS_LABEL,
  new: 'Yangi buyurtma',
  accepted: 'Qabul qilindi',
  handed_to_courier: 'Kuryerga berildi',
};

export const STATUS_HEADLINE: Record<OrderStatus, string> = {
  new: 'Sotuvchi javobini kutyapmiz',
  accepted: 'Buyurtmangiz qabul qilindi',
  preparing: 'Taomingiz tayyorlanmoqda',
  handed_to_courier: 'Kuryer yo\'lda',
  delivered: 'Yetkazildi. Yoqimli ishtaha!',
  rejected: 'Sotuvchi buyurtmani rad etdi',
  cancelled: 'Buyurtma bekor qilindi',
};

export const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  assigned: 'Biriktirildi',
  picked_up: 'Oldim',
  on_the_way: 'Yo\'lda',
  delivered: 'Yetkazildi',
};

export function statusTone(s: OrderStatus): 'brand' | 'success' | 'danger' | 'plain' {
  if (s === 'delivered') return 'success';
  if (s === 'rejected' || s === 'cancelled') return 'danger';
  if (s === 'new') return 'plain';
  return 'brand';
}

export const isActiveOrder = (s: OrderStatus) => s === 'new' || s === 'accepted' || s === 'preparing' || s === 'handed_to_courier';
