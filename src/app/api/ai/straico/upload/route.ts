import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAPIErrorHandling } from '@/lib/errors';
import { uploadFileToStraico, uploadBufferToStraico } from '@/lib/ai/straico-utils';
import { aiProviderService } from '@/lib/ai/service';

/**
 * POST /api/ai/straico/upload
 * Upload a file to Straico for use in chat completions
 */
export const POST = withAPIErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the user's Straico provider configuration
  const providers = await aiProviderService.getProviders(user.id);
  const straicoProvider = providers.find(p => p.provider === 'straico' && p.isActive);

  if (!straicoProvider) {
    return NextResponse.json(
      { error: 'No active Straico provider found. Please configure your Straico API key first.' },
      { status: 400 }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data for file uploads' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please include a file in the request.' },
        { status: 400 }
      );
    }

    // Validate file size (e.g., max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate file type (basic validation)
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/json',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Get the decrypted API key
    const apiKey = await aiProviderService.getDecryptedApiKey(straicoProvider.id);
    
    // Upload file to Straico
    const uploadResult = await uploadFileToStraico(apiKey, file);
    
    return NextResponse.json({
      success: true,
      file_id: uploadResult.file_id,
      filename: uploadResult.filename,
      size: uploadResult.size,
      content_type: uploadResult.content_type,
      message: 'File uploaded successfully to Straico'
    });
  } catch (error) {
    console.error('Error uploading file to Straico:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Invalid Straico API key. Please check your configuration.' },
          { status: 401 }
        );
      } else if (error.message.includes('403')) {
        return NextResponse.json(
          { error: 'Straico API key does not have permission to upload files.' },
          { status: 403 }
        );
      } else if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Straico API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload file to Straico' },
      { status: 500 }
    );
  }
});