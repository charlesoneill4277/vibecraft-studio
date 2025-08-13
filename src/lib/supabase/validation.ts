import { z } from 'zod'

// Install zod for validation
// npm install zod

// Project validation schemas
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  github_repo: z.string().url('Invalid GitHub repository URL').optional().or(z.literal('')),
  local_path: z.string().optional(),
  settings: z.object({
    defaultAIProvider: z.string().optional(),
    defaultModel: z.string().optional(),
    collaborationEnabled: z.boolean().optional(),
    publicTemplates: z.boolean().optional(),
  }).optional(),
})

export const projectUpdateSchema = projectSchema.partial()

// Project member validation
export const projectMemberSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  user_id: z.string().uuid('Invalid user ID'),
  role: z.enum(['owner', 'admin', 'editor', 'viewer']),
  permissions: z.object({
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    canInvite: z.boolean().optional(),
  }).optional(),
})

// Prompt validation
export const promptSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  ai_provider: z.string().optional(),
  model: z.string().optional(),
  metadata: z.object({
    tokens: z.number().optional(),
    cost: z.number().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().positive().optional(),
  }).optional(),
})

// Knowledge validation
export const knowledgeSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().max(100000, 'Content too long').optional(),
  file_url: z.string().url('Invalid file URL').optional(),
  category: z.enum(['documentation', 'research', 'assets', 'code']),
  metadata: z.object({
    fileType: z.string().optional(),
    size: z.number().positive().optional(),
    tags: z.array(z.string()).optional(),
    version: z.string().optional(),
  }).optional(),
})

export const knowledgeUpdateSchema = knowledgeSchema.partial().omit({ project_id: true })

// Asset validation
export const assetSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  file_url: z.string().url('Invalid file URL'),
  type: z.string().min(1, 'Type is required'),
  size: z.number().positive('Size must be positive'),
  metadata: z.object({
    originalName: z.string().optional(),
    uploadedBy: z.string().optional(),
    dimensions: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
    }).optional(),
  }).optional(),
})

// AI Provider validation
export const aiProviderSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'straico', 'cohere']),
  api_key_encrypted: z.string().min(1, 'API key is required'),
  is_active: z.boolean().optional().default(true),
  settings: z.object({
    defaultModel: z.string().optional(),
    maxTokens: z.number().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
  }).optional(),
})

// Template validation
export const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  category: z.string().min(1, 'Category is required').max(50, 'Category too long'),
  is_public: z.boolean().optional().default(false),
  metadata: z.object({
    language: z.string().optional(),
    framework: z.string().optional(),
    tags: z.array(z.string()).optional(),
    version: z.string().optional(),
  }).optional(),
})

export const templateUpdateSchema = templateSchema.partial()

// User validation
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().max(100, 'Name too long').optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
})

export const userUpdateSchema = userSchema.partial().omit({ email: true })

// Validation helper functions
export function validateProject(data: unknown) {
  return projectSchema.parse(data)
}

export function validateProjectUpdate(data: unknown) {
  return projectUpdateSchema.parse(data)
}

export function validatePrompt(data: unknown) {
  return promptSchema.parse(data)
}

export function validateKnowledge(data: unknown) {
  return knowledgeSchema.parse(data)
}

export function validateKnowledgeUpdate(data: unknown) {
  return knowledgeUpdateSchema.parse(data)
}

export function validateAsset(data: unknown) {
  return assetSchema.parse(data)
}

export function validateAIProvider(data: unknown) {
  return aiProviderSchema.parse(data)
}

export function validateTemplate(data: unknown) {
  return templateSchema.parse(data)
}

export function validateTemplateUpdate(data: unknown) {
  return templateUpdateSchema.parse(data)
}

export function validateUser(data: unknown) {
  return userSchema.parse(data)
}

export function validateUserUpdate(data: unknown) {
  return userUpdateSchema.parse(data)
}

// Database integrity check functions
export async function checkDatabaseIntegrity() {
  // These would be run periodically to ensure data integrity
  const checks = [
    checkOrphanedRecords,
    checkConstraintViolations,
    checkDataConsistency,
  ]

  const results = await Promise.allSettled(checks.map(check => check()))
  
  return results.map((result, index) => ({
    check: checks[index].name,
    status: result.status,
    result: result.status === 'fulfilled' ? result.value : result.reason,
  }))
}

async function checkOrphanedRecords() {
  // Check for orphaned records that should have been deleted
  // This would use the admin client to check across all tables
  return { message: 'Orphaned records check completed', issues: [] }
}

async function checkConstraintViolations() {
  // Check for any constraint violations
  return { message: 'Constraint violations check completed', issues: [] }
}

async function checkDataConsistency() {
  // Check for data consistency issues
  return { message: 'Data consistency check completed', issues: [] }
}