// src/app/api/select-structure/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { field_name, structure_name } = body;
    
    // Log the structure selection for debugging
    console.log('Structure selected:', { field_name, structure_name });
    
    // Here you can add logic to:
    // 1. Store the selected structure in a database
    // 2. Update session/user preferences
    // 3. Make calls to your backend system
    // 4. Prepare data for the dashboard
    
    // For now, just return a success response
    return NextResponse.json({ 
      success: true, 
      message: `Successfully selected structure: ${structure_name} in field: ${field_name}`,
      field_name,
      structure_name
    });
    
  } catch (error) {
    console.error('Error in select-structure API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to select structure' },
      { status: 500 }
    );
  }
}
