-- =====================================================================
-- "Uy ovqatlari bozori" (Home Food Marketplace): jadvallar va turlar.
-- Mavjud profiles/settings jadvallariga TEGMAYDI: bu ilovaning jadvallari
-- alohida (uy_profiles, uy_settings, ...). Tartib: 0005 sxema, 0006 funksiyalar,
-- 0007 RLS/Storage/Realtime.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Turlar -----------------------------------------------------
create type public.uy_role            as enum ('buyer', 'seller', 'courier', 'admin');
-- Xaridor ko'radigan bosqichlar: new/accepted = "qabul qilindi", preparing = "tayyorlanmoqda",
-- handed_to_courier = "yo'lda", delivered = "yetkazildi".
create type public.uy_order_status    as enum ('new', 'accepted', 'preparing', 'handed_to_courier', 'delivered', 'rejected', 'cancelled');
create type public.uy_pay_method      as enum ('cash', 'card');
create type public.uy_delivery_status as enum ('assigned', 'picked_up', 'on_the_way', 'delivered');
create type public.uy_availability    as enum ('free', 'busy');
create type public.uy_review_target   as enum ('seller', 'courier');
create type public.uy_bonus_type      as enum ('percent', 'fixed');

-- ---------- Profillar --------------------------------------------------
-- auth.users bilan 1:1. Ro'li ro'yxatdan o'tishda belgilanadi (admin faqat qo'lda: SQL orqali).
create table public.uy_profiles (
    id           uuid primary key references auth.users (id) on delete cascade,
    role         public.uy_role not null,
    full_name    text not null default '',
    phone        text,
    address      text,
    lat          double precision check (lat between -90 and 90),
    lng          double precision check (lng between -180 and 180),
    shop_name    text,                                   -- faqat sotuvchi
    avatar_url   text,
    rating_avg   numeric(3,2) not null default 0,        -- reviews triggeri yangilaydi
    rating_count integer not null default 0,
    is_active    boolean not null default true,
    created_at   timestamptz not null default now()
);
create index uy_profiles_role_idx on public.uy_profiles (role);

-- ---------- Kategoriyalar (ikki daraja: parent_id) ---------------------
create table public.categories (
    id         uuid primary key default gen_random_uuid(),
    parent_id  uuid references public.categories (id) on delete restrict,
    name       text not null,
    slug       text not null unique,
    icon       text,                                     -- emoji yoki qisqa belgi
    sort_order integer not null default 0,
    is_active  boolean not null default true,
    created_at timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);

-- ---------- Taomlar ----------------------------------------------------
create table public.food_items (
    id                uuid primary key default gen_random_uuid(),
    seller_id         uuid not null references public.uy_profiles (id) on delete cascade,
    category_id       uuid not null references public.categories (id),
    name              text not null check (length(trim(name)) between 2 and 120),
    description       text,
    price_per_portion numeric(12,2) not null check (price_per_portion > 0),   -- bir kishilik porsiya narxi
    prep_minutes      integer not null default 60 check (prep_minutes between 5 and 2880),
    min_portions      integer not null default 1 check (min_portions between 1 and 500),
    image_url         text,
    is_available      boolean not null default true,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);
create index food_items_seller_idx   on public.food_items (seller_id);
create index food_items_category_idx on public.food_items (category_id) where is_available;

-- ---------- Promokodlar ------------------------------------------------
create table public.promo_codes (
    id               uuid primary key default gen_random_uuid(),
    code             text not null unique check (code = upper(code) and length(code) between 3 and 32),
    discount_percent numeric(5,2) check (discount_percent > 0 and discount_percent <= 100),
    discount_amount  numeric(12,2) check (discount_amount > 0),
    min_order_total  numeric(12,2) not null default 0,
    valid_from       timestamptz not null default now(),
    valid_until      timestamptz,
    usage_limit      integer check (usage_limit > 0),        -- null = cheksiz
    used_count       integer not null default 0,
    is_active        boolean not null default true,
    created_by       uuid references public.uy_profiles (id) on delete set null,
    created_at       timestamptz not null default now(),
    constraint promo_exactly_one_kind check ((discount_percent is null) <> (discount_amount is null))
);

-- ---------- Buyurtmalar ------------------------------------------------
create table public.orders (
    id              uuid primary key default gen_random_uuid(),
    buyer_id        uuid not null references public.uy_profiles (id),
    seller_id       uuid not null references public.uy_profiles (id),
    status          public.uy_order_status not null default 'new',
    people_count    integer not null check (people_count > 0),   -- eng katta porsiya miqdori (masalan "10 kishiga")
    ready_at        timestamptz not null,                        -- xaridor belgilagan kerakli tayyor bo'lish vaqti
    payment_method  public.uy_pay_method not null,
    paid            boolean not null default false,
    promo_id        uuid references public.promo_codes (id),
    promo_code      text,
    subtotal        numeric(12,2) not null check (subtotal >= 0),
    discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
    delivery_fee    numeric(12,2) not null default 0 check (delivery_fee >= 0),
    total           numeric(12,2) not null check (total >= 0),
    delivery_address text not null,
    delivery_lat    double precision,
    delivery_lng    double precision,
    pickup_lat      double precision,                            -- sotuvchi joylashuvi (buyurtma paytida nusxalanadi)
    pickup_lng      double precision,
    note            text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index orders_buyer_idx  on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
    id          uuid primary key default gen_random_uuid(),
    order_id    uuid not null references public.orders (id) on delete cascade,
    food_id     uuid references public.food_items (id) on delete set null,
    name        text not null,                                   -- buyurtma paytidagi nomi
    unit_price  numeric(12,2) not null,
    portions    integer not null check (portions > 0),           -- kishilar soni
    line_total  numeric(12,2) not null
);
create index order_items_order_idx on public.order_items (order_id);

-- Holatlar tarixi (xaridor timeline'i uchun vaqtlar)
create table public.order_status_log (
    id         bigint generated always as identity primary key,
    order_id   uuid not null references public.orders (id) on delete cascade,
    status     public.uy_order_status not null,
    created_at timestamptz not null default now()
);
create index order_status_log_order_idx on public.order_status_log (order_id);

-- ---------- Kuryerlar --------------------------------------------------
create table public.couriers (
    id                  uuid primary key references public.uy_profiles (id) on delete cascade,
    availability        public.uy_availability not null default 'busy',   -- bo'sh / band
    lat                 double precision check (lat between -90 and 90),
    lng                 double precision check (lng between -180 and 180),
    location_updated_at timestamptz,
    vehicle             text
);

-- Buyurtma kuryerga avtomatik (eng yaqin bo'sh kuryer) biriktiriladi: uy_assign_courier()
create table public.courier_assignments (
    id              uuid primary key default gen_random_uuid(),
    order_id        uuid not null unique references public.orders (id) on delete cascade,
    courier_id      uuid not null references public.couriers (id),
    delivery_status public.uy_delivery_status not null default 'assigned',
    distance_km     numeric(8,2),
    assigned_at     timestamptz not null default now(),
    picked_up_at    timestamptz,
    delivered_at    timestamptz
);
create index courier_assignments_courier_idx on public.courier_assignments (courier_id, assigned_at desc);

-- ---------- Sharhlar ---------------------------------------------------
create table public.reviews (
    id          uuid primary key default gen_random_uuid(),
    order_id    uuid not null references public.orders (id) on delete cascade,
    reviewer_id uuid not null references public.uy_profiles (id),
    target_kind public.uy_review_target not null,
    target_id   uuid not null references public.uy_profiles (id),   -- triggerda buyurtmadan aniqlanadi
    rating      smallint not null check (rating between 1 and 5),
    comment     text check (length(comment) <= 1000),
    created_at  timestamptz not null default now(),
    unique (order_id, target_kind)
);
create index reviews_target_idx on public.reviews (target_id);

-- ---------- Sozlamalar, daromad, bonus --------------------------------
create table public.uy_settings (
    key   text primary key,
    value jsonb not null
);
insert into public.uy_settings (key, value) values
    ('delivery_fee',          '8000'::jsonb),   -- so'm, har buyurtmaga (SOZLANG)
    ('commission_pct',        '10'::jsonb),     -- platforma ulushi, % (SOZLANG)
    ('max_assign_radius_km',  '30'::jsonb);     -- kuryer qidiruv radiusi

create table public.seller_earnings (
    id         uuid primary key default gen_random_uuid(),
    seller_id  uuid not null references public.uy_profiles (id),
    order_id   uuid not null unique references public.orders (id),
    gross      numeric(12,2) not null,           -- taomlar summasi
    commission numeric(12,2) not null,
    net        numeric(12,2) not null,           -- sotuvchiga tushgan
    created_at timestamptz not null default now()
);
create index seller_earnings_seller_idx on public.seller_earnings (seller_id, created_at desc);

-- Bonus qoidasi: har every_n_orders ta yetkazilgan buyurtmadan keyin bonus.
-- percent: oxirgi N ta buyurtma sof daromadidan foiz; fixed: qat'iy summa.
create table public.bonus_rules (
    id             uuid primary key default gen_random_uuid(),
    name           text not null,
    every_n_orders integer not null check (every_n_orders > 0),
    bonus_type     public.uy_bonus_type not null,
    bonus_value    numeric(12,2) not null check (bonus_value >= 0),
    is_active      boolean not null default true,
    created_at     timestamptz not null default now()
);
-- Boshlang'ich qiymat: har 50 ta buyurtmadan keyin 5% (aniq foizni admin paneldan sozlang).
insert into public.bonus_rules (name, every_n_orders, bonus_type, bonus_value)
values ('Har 50 ta buyurtmaga bonus', 50, 'percent', 5);

create table public.seller_bonuses (
    id         uuid primary key default gen_random_uuid(),
    seller_id  uuid not null references public.uy_profiles (id),
    rule_id    uuid not null references public.bonus_rules (id),
    milestone  integer not null,                 -- nechanchi buyurtmada berildi (50, 100, ...)
    amount     numeric(12,2) not null,
    created_at timestamptz not null default now(),
    unique (seller_id, rule_id, milestone)
);

-- ---------- Boshlang'ich kategoriyalar ---------------------------------
with top as (
    insert into public.categories (name, slug, icon, sort_order) values
        ('Suyuq taomlar',  'suyuq',   '🍲', 1),
        ('Xamirli taomlar','xamirli', '🥟', 2)
    returning id, slug
)
insert into public.categories (parent_id, name, slug, icon, sort_order)
select t.id, c.name, c.slug, c.icon, c.ord
from top t
join (values
    ('suyuq',   'Sho''rva',    'shorva',    '🥣', 1),
    ('suyuq',   'Mastava',     'mastava',   '🍲', 2),
    ('suyuq',   'Lag''mon',    'lagmon',    '🍜', 3),
    ('xamirli', 'Manti',       'manti',     '🥟', 1),
    ('xamirli', 'Xonim',       'xonim',     '🌯', 2),
    ('xamirli', 'Chuchvara',   'chuchvara', '🥟', 3),
    ('xamirli', 'Somsa',       'somsa',     '🥧', 4)
) as c (parent_slug, name, slug, icon, ord) on c.parent_slug = t.slug;
