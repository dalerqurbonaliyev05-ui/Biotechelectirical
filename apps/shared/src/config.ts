// Supabase ulanishi. URL va anon/publishable kalit ommaviy (brauzerga mo'ljallangan);
// ma'lumotlarni RLS qoidalari himoya qiladi. service_role kaliti bu yerga HECH QACHON qo'yilmaydi.
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || 'https://vcbdzfwvavxkedgmbrvf.supabase.co';

export const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYmR6Znd2YXZ4a2VkZ21icnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzI2OTQsImV4cCI6MjEwNjYwODY5NH0.NX3G2a61D1kFQFqExicCFQGLYJfabiunFlPpYmGpbgQ';

export const FOOD_IMAGES_BUCKET = 'food-images';
