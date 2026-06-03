import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqzcmveicihvmqfcjlkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxemNtdmVpY2lodm1xZmNqbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjMxMzIsImV4cCI6MjA5NDkzOTEzMn0.GafvX4InY9vxa004H3nCnY1_dkzAPUAxa2Q7-G_EobE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testGroqProxy() {
  console.log("Invoking generate-roadmap Edge Function...");
  try {
    const { data, error } = await supabase.functions.invoke('generate-roadmap', {
      body: { skill: 'Docker' }
    });

    if (error) {
      console.log("Invocation Error:", error);
    } else {
      console.log("Success response data:", data);
    }
  } catch (e) {
    console.log("Exception:", e.message);
  }
}

testGroqProxy();
