import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyoasgmdnqcbkfckjgeq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5b2FzZ21kbnFjYmtmY2tqZ2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTg3NjgsImV4cCI6MjA5Nzg3NDc2OH0.MGvuHHYiexkp4o5v1eEh5r1rEs4vu3ufT9_ysNPl98c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});
