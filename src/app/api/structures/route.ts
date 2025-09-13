import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get backend API URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      console.error('Backend API URL is not configured');
      return NextResponse.json(
        { 
          error: 'Backend API URL is not configured',
          details: 'NEXT_PUBLIC_API_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Make request to backend server for structures summary
    const backendEndpoint = `${backendUrl}/api/get-structures-summary`;
    
    console.log(`[API] Proxying request to backend: ${backendEndpoint}`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(backendEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Backend error: ${response.status} - ${errorText}`);
      
      // Check if the response is HTML (error page)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        return NextResponse.json(
          { 
            error: `Backend service unavailable. Status: ${response.status}`,
            details: 'Backend returned HTML error page instead of JSON'
          },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `Backend responded with status: ${response.status}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[API] Successfully fetched structures data`);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[API] Error in structures API proxy:', error);
    
    // Handle different types of errors
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { 
            error: 'Backend request timeout',
            details: 'Backend took too long to respond (>10s)'
          },
          { status: 504 }
        );
      }
      
      if (error.message.includes('Unexpected token')) {
        return NextResponse.json(
          { 
            error: 'Backend returned invalid response (likely HTML error page)',
            details: error.message
          },
          { status: 502 }
        );
      }
      
      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { 
            error: 'Failed to connect to backend',
            details: 'Network error or backend service is down'
          },
          { status: 502 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch structures data from backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 502 }
    );
  }
}