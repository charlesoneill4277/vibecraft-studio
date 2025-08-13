import { createClient } from '@supabase/supabase-js'

// Admin client with service role key for server-side operations
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Helper function for admin operations
export async function withAdminClient<T>(
  operation: (client: ReturnType<typeof createAdminClient>) => Promise<T>
): Promise<T> {
  const adminClient = createAdminClient()
  try {
    return await operation(adminClient)
  } finally {
    // Clean up if needed
  }
}