import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"

const supabaseUrl = "https://fuxlzfvfqcyduyxffovd.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eGx6ZnZmcWN5ZHV5eGZmb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjkyMzEsImV4cCI6MjA5MjM0NTIzMX0.HKnYMjBsfY8z5daONfL5g_rOqUWfhBAjPfvCZz14JuI"

export const supabase = createClient(supabaseUrl, supabaseKey)