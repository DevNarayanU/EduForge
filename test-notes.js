import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqzcmveicihvmqfcjlkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxemNtdmVpY2lodm1xZmNqbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjMxMzIsImV4cCI6MjA5NDkzOTEzMn0.GafvX4InY9vxa004H3nCnY1_dkzAPUAxa2Q7-G_EobE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotes() {
  console.log("Checking columns via public query...");
  try {
    const { data, error } = await supabase.from('notes').select('*');
    console.log("Data:", data);
    console.log("Error:", error);
  } catch (e) {
    console.log("Exception:", e.message);
  }
}

checkNotes();
