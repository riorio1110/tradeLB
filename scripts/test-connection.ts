import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase URL or Key in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
    console.log('Testing Supabase Connection...')
    console.log('URL:', supabaseUrl)

    try {
        const { data, error } = await supabase.from('trades').select('*').limit(1)

        if (error) {
            console.error('❌ Connection Failed:', error.message)
            console.error(error)
        } else {
            console.log('✅ Connection Successful!')
            console.log('Fetched rows:', data.length)
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err)
    }
}

testConnection()
