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
    const backendEndpoint = `${backendUrl}/api/structures/search`;
    
    console.log(`Proxying search request to backend: ${backendEndpoint}`);
    console.log('Search body:', body);
    
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
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in structures search API proxy:', error);
    
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
      { error: 'Failed to search structures from backend' },
      { status: 502 }
    );
  }
}

// Also support GET requests for search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get backend API URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend API URL is not configured' },
        { status: 500 }
      );
    }

    // Forward search parameters to backend
    const backendEndpoint = `${backendUrl}/api/structures/search?${searchParams.toString()}`;
    
    console.log(`Proxying GET search request to backend: ${backendEndpoint}`);
    
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
    console.error('Error in structures search GET API proxy:', error);
    
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
      { error: 'Failed to search structures from backend' },
      { status: 502 }
    );
  }
}