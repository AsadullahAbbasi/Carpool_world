import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json(
    { message: 'Logged out successfully' },
    {
      headers: {
        'Set-Cookie': 'token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      },
    }
  );
  
  return response;
}