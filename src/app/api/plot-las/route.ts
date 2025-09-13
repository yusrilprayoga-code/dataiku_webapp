// src/app/api/plot-las/route.ts

import { NextResponse } from 'next/server';

interface LASPlotRequest {
  file_path: string;
  sequence: string[];
  title: string;
}

export async function POST(request: Request) {
  try {
    const body: LASPlotRequest = await request.json();
    const { file_path, sequence, title } = body;
    
    if (!file_path) {
      return NextResponse.json(
        { error: 'File path is required' },
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

    // Make request to backend server
    const backendEndpoint = `${backendUrl}/api/plot-las`;
    
    try {
      console.log(`Requesting plot from backend: ${backendEndpoint}`);
      console.log('Request payload:', { file_path, sequence, title });
      
      const response = await fetch(backendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path,
          sequence,
          title
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Backend error (${response.status}):`, errorText);
        
        // Check if we got an HTML error page
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
          throw new Error(`Backend service unavailable - received HTML error page (status: ${response.status})`);
        }
        
        throw new Error(`Backend responded with status: ${response.status} - ${errorText}`);
      }

      // Check if response is actually JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Backend returned non-JSON response:', textResponse);
        throw new Error('Backend returned non-JSON response (possibly HTML error page)');
      }

      const backendData = await response.json();
      
      // Forward the backend response directly
      console.log('Plot data received from backend');
      return NextResponse.json(backendData);
      
    } catch (err) {
      console.error('Error fetching plot from backend:', err);
      
      // More specific error messages
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        if (err.message.includes('Unexpected token')) {
          errorMessage = 'Backend returned invalid response (possibly HTML error page)';
        } else {
          errorMessage = err.message;
        }
      }
      
      return NextResponse.json(
        { 
          error: `Failed to generate plot from backend: ${errorMessage}`,
          details: 'Check if backend server is running and accessible'
        },
        { status: 502 }
      );
    }
    
  } catch (error) {
    console.error('Error in plot-las API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
