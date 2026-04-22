// import { NextRequest, NextResponse } from 'next/server';
// import { otpStore } from '../send-otp/route';
// import { createClient } from '@supabase/supabase-js';

// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function POST(req: NextRequest) {
//   const { email, otp } = await req.json();

//   const record = otpStore.get(email);

//   if (!record) {
//     return NextResponse.json({ error: 'OTP not found' }, { status: 400 });
//   }

//   if (Date.now() > record.expiry) {
//     otpStore.delete(email);
//     return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
//   }

//   if (record.otp !== otp) {
//     return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
//   }

//   otpStore.delete(email);

//   // Create Supabase session for user
//   const { data, error } = await supabaseAdmin.auth.admin.generateLink({
//     type: 'magiclink',
//     email,
//   });

//   if (error) {
//     return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });
//   }

//   return NextResponse.json({ 
//     success: true,
//     url: data.properties?.action_link 
//   });
// }

import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '../send-otp/route';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email, otp } = await req.json();

  if (!email || !otp) {
    return NextResponse.json({ error: 'Email and OTP required' }, { status: 400 });
  }

  const stored = otpStore.get(email);

  if (!stored) {
    return NextResponse.json({ error: 'OTP not found. Please request a new one.' }, { status: 400 });
  }

  if (Date.now() > stored.expiry) {
    otpStore.delete(email);
    return NextResponse.json({ error: 'OTP expired. Please request a new one.' }, { status: 400 });
  }

  if (stored.otp !== otp) {
    return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 });
  }

  // OTP is valid — delete it
  otpStore.delete(email);

  try {
    // Sign in user via Supabase admin
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      link: data.properties?.action_link,
    });

  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}