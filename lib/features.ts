// Login methods are switched on per environment, so the UI never shows a
// button for something that isn't configured in Supabase yet.
export const authFeatures = {
  email: true,
  phone: process.env.NEXT_PUBLIC_AUTH_PHONE === "1",       // needs an SMS provider in Supabase Auth
  facebook: process.env.NEXT_PUBLIC_AUTH_FACEBOOK === "1", // needs a Meta app + Supabase provider
};
