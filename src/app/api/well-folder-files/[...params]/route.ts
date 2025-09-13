import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { params: string[] } }
) {
  try {
    const pathParams = params.params || [];
    
    if (pathParams.length === 0) {
      return NextResponse.json(
        { error: 'Path parameters are required' },
        { status: 400 }
      );
    }

    // Get backend API URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend API URL is not configured' },
        { status: 500 }
      );
    }

    // Construct backend endpoint with all path parameters
    const backendEndpoint = `${backendUrl}/api/well-folder-files/${pathParams.join('/')}`;
    
    console.log(`Proxying request to backend: ${backendEndpoint}`);
    
    const response = await fetch(backendEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error: ${response.status} - ${errorText}`);
      
      // Check if the response is HTML (error page)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        return NextResponse.json(
          { error: `Backend service unavailable. Status: ${response.status}` },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { error: `Backend responded with status: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in well-folder-files API proxy:', error);
    
    // Check if it's a network error or parsing error
    if (error instanceof Error) {
      if (error.message.includes('Unexpected token')) {
        return NextResponse.json(
          { error: 'Backend returned invalid response (likely HTML error page)' },
          { status: 502 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch data from backend' },
      { status: 502 }
    );
  }
}