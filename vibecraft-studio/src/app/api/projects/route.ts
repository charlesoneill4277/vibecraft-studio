import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateProject } from '@/lib/supabase/validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's projects with member information
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members!inner(
          role,
          user_id,
          users(full_name, email)
        )
      `)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
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

      // Return the created project with member information
      const { data: createdProject, error: fetchError } = await supabase
        .from('projects')
        .select(`
          *,
          project_members(
            role,
            user_id,
            users(full_name, email, avatar_url)
          )
        `)
        .eq('id', project.id)
        .single()

      if (fetchError) {
        console.error('Error fetching created project:', fetchError)
        return NextResponse.json({ error: 'Project created but failed to fetch details' }, { status: 500 })
      }

      return NextResponse.json({ project: createdProject }, { status: 201 })
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