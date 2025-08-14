import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateProject } from '@/lib/supabase/validation'

/**
 * GET /api/projects
 * Returns projects the user owns OR is a member of.
 * Optional query param includeMembers=true will perform a second query to
 * fetch the caller's membership role per project (without doing a recursive join
 * that previously triggered RLS infinite recursion).
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const includeMembers = searchParams.get('includeMembers') === 'true'

    // Fetch projects user owns OR is member of (policy handles access)
    let { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      if (error.code === '42P17') {
        // Infinite recursion due to existing circular RLS policies: fallback with admin client (service role)
        console.warn('[projects API] Detected recursive RLS (42P17). Using admin fallback.')
        const admin = createAdminClient()
        // Collect owned projects
        const ownedRes = await admin
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
        if (ownedRes.error) {
          console.error('Admin fallback (owned) failed:', ownedRes.error)
          return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
        }
        // Collect membership project ids (only need ids)
        const memberRes = await admin
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id)
        if (memberRes.error) {
          console.error('Admin fallback (memberships) failed:', memberRes.error)
          return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
        }
        const memberProjectIds = new Set(memberRes.data.map(m => m.project_id))
        // If membership already includes owned, union with owned ids
        const allIds = new Set<string>([...ownedRes.data.map(p => p.id), ...memberProjectIds])
        // If some membership projects not owned, fetch their project rows
        const missingIds = [...allIds].filter(id => !ownedRes.data.find(p => p.id === id))
        let extra: any[] = []
        if (missingIds.length) {
          const extraRes = await admin
            .from('projects')
            .select('*')
            .in('id', missingIds)
          if (extraRes.error) {
            console.error('Admin fallback (extra projects) failed:', extraRes.error)
            return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
          }
            extra = extraRes.data || []
        }
        projects = [...ownedRes.data, ...extra]
      } else {
        console.error('Error fetching projects:', error)
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
      }
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ projects: [] })
    }

    // Optionally enrich with caller's role (only their own membership row)
    if (includeMembers) {
      const projectIds = projects.map(p => p.id)
      const { data: memberships, error: memberError } = await supabase
        .from('project_members')
        .select('project_id, role')
        .in('project_id', projectIds)
        .eq('user_id', user.id)

      if (memberError) {
        console.warn('Warning fetching memberships (non-fatal):', memberError)
      } else if (memberships) {
        const roleByProject: Record<string,string> = {}
        memberships.forEach(m => { roleByProject[m.project_id] = m.role })
        for (const p of projects) {
          ;(p as any).current_user_role = roleByProject[p.id] || (p.user_id === user.id ? 'owner' : undefined)
        }
      }
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Unexpected error in GET /api/projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    
    try {
      const validatedProject = validateProject(body)
      
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          ...validatedProject,
          user_id: user.id,
        })
        .select()
        .single()

      if (projectError) {
        console.error('Error creating project:', projectError)
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
      }

      // Create the project owner membership
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: 'owner',
          permissions: {
            canEdit: true,
            canDelete: true,
            canInvite: true,
          },
        })

      if (memberError) {
        console.error('Error creating project membership:', memberError)
        // Clean up the project if membership creation fails
        await supabase.from('projects').delete().eq('id', project.id)
        return NextResponse.json({ error: 'Failed to create project membership' }, { status: 500 })
      }

      // Return the created project (simplified to avoid RLS issues)
      return NextResponse.json({ project }, { status: 201 })
    } catch (validationError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationError instanceof Error ? validationError.message : 'Invalid data'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}