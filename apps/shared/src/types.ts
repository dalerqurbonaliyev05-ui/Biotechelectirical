// Supabase sxemasi (supabase/migrations/0005_uyovqat_schema.sql) bilan mos turlar.
export type Role = 'buyer' | 'seller' | 'courier' | 'admin';
export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'handed_to_courier' | 'delivered' | 'rejected' | 'cancelled';
export type PayMethod = 'cash' | 'card';
export type DeliveryStatus = 'assigned' | 'picked_up' | 'on_the_way' | 'delivered';
export type Availability = 'free' | 'busy';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  shop_name: string | null;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
}

export interface SellerPublic {
  id: string;
  display_name: string;
  rating_avg: number;
  rating_count: number;
}

export interface FoodItem {
  id: string;
  seller_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_per_portion: number;
  prep_minutes: number;
  min_portions: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  people_count: number;
  ready_at: string;
  payment_method: PayMethod;
  paid: boolean;
  promo_code: string | null;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  food_id: string | null;
  name: string;
  unit_price: number;
  portions: number;
  line_total: number;
}

export interface StatusLogRow { order_id: string; status: OrderStatus; created_at: string }

export interface Courier {
  id: string;
  availability: Availability;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  vehicle: string | null;
}

export interface CourierAssignment {
  id: string;
  order_id: string;
  courier_id: string;
  delivery_status: DeliveryStatus;
  distance_km: number | null;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
}

export interface Review {
  id: string;
  order_id: string;
  target_kind: 'seller' | 'courier';
  target_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface SellerEarning { id: string; order_id: string; gross: number; commission: number; net: number; created_at: string }
export interface SellerBonus { id: string; rule_id: string; milestone: number; amount: number; created_at: string }
export interface BonusRule { id: string; name: string; every_n_orders: number; bonus_type: 'percent' | 'fixed'; bonus_value: number; is_active: boolean }
export interface PromoPreview { valid: boolean; discount: number; message: string }
