import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqzcmveicihvmqfcjlkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxemNtdmVpY2lodm1xZmNqbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjMxMzIsImV4cCI6MjA5NDkzOTEzMn0.GafvX4InY9vxa004H3nCnY1_dkzAPUAxa2Q7-G_EobE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabase() {
  console.log("Checking Supabase connection...");
  try {
    const { data, error, status } = await supabase.from('profiles').select('*').limit(5);
    if (error) {
      console.log("Supabase Error:", error);
    } else {
      console.log("Supabase Connection Successful! Profiles found:", data.length);
      console.log("Profiles:", data);
    }
  } catch (e) {
    console.log("Exception:", e.message);
  }
}

checkSupabase();
