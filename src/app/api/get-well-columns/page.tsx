import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get backend API URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend API URL is not configured' },
        { status: 500 }
      );
    }

    // Make request to backend server
    const backendEndpoint = `${backendUrl}/api/get-well-columns`;
    
    console.log(`Proxying request to backend: ${backendEndpoint}`);
    console.log('Request body:', body);
    
    const response = await fetch(backendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    
    // Validate that we got valid data
    if (typeof data !== 'object' || data === null || Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Backend returned empty or invalid well columns data' },
        { status: 502 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in get-well-columns API proxy:', error);
    
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
      { error: 'Failed to fetch well columns from backend' },
      { status: 502 }
    );
  }
}