// import { NextRequest, NextResponse } from 'next/server';
// import nodemailer from 'nodemailer';
// import { createClient } from '@supabase/supabase-js';

// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_APP_PASSWORD,
//   },
//   tls: {
//     rejectUnauthorized: false
//   }
// });

// export async function POST(req: NextRequest) {
//   const { email } = await req.json();

//   if (!email) {
//     return NextResponse.json({ error: 'Email required' }, { status: 400 });
//   }

//   try {
//     // Generate OTP via Supabase
//     const { error } = await supabaseAdmin.auth.admin.generateLink({
//       type: 'magiclink',
//       email,
//     });

//     if (error) throw error;

//     // Generate 6-digit OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

//     // Store OTP temporarily (in-memory for simplicity)
//     otpStore.set(email, { otp, expiry });

//     // Send email via Gmail
//     await transporter.sendMail({
//       from: `"SplitEasy" <${process.env.GMAIL_USER}>`,
//       to: email,
//       subject: 'Your SplitEasy verification code',
//       html: `
//         <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
//           <h2 style="color: #6366f1;">SplitEasy</h2>
//           <p>Your verification code is:</p>
//           <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1; padding: 20px 0;">
//             ${otp}
//           </div>
//           <p style="color: #888;">This code expires in 10 minutes.</p>
//           <p style="color: #888; font-size: 12px;">If you didn't request this, ignore this email.</p>
//         </div>
//       `,
//     });

//     return NextResponse.json({ success: true });
//   } catch (err) {
//     console.error('OTP send error:', err);
//     return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
//   }
// }

// // Simple in-memory OTP store
// const otpStore = new Map<string, { otp: string; expiry: number }>();
// export { otpStore };


import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Move store outside to persist during session
const otpStore = new Map<string, { otp: string; expiry: number }>();
export { otpStore };

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email, { otp, expiry });

    // Send email via Gmail
    await transporter.sendMail({
      from: `"SplitEasy" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your SplitEasy verification code',
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:420px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;">
          
          <div style="background:linear-gradient(135deg,#534AB7,#1D9E75);padding:32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:28px;font-weight:700;">SplitEasy</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Split bills. Not friendships.</p>
          </div>

          <div style="padding:32px;">
            <p style="color:#333;font-size:16px;margin:0 0 8px;">Your verification code:</p>
            
            <div style="background:#f5f3ff;border:2px dashed #534AB7;border-radius:12px;padding:24px;text-align:center;margin:16px 0;">
              <span style="font-size:42px;font-weight:700;letter-spacing:12px;color:#534AB7;">
                ${otp}
              </span>
            </div>

            <p style="color:#888;font-size:13px;text-align:center;">
              ⏱ This code expires in <strong>10 minutes</strong>
            </p>
            <p style="color:#bbb;font-size:12px;text-align:center;margin-top:24px;">
              If you didn't request this, ignore this email.
            </p>
          </div>

          <div style="background:#f8f7ff;padding:16px;text-align:center;border-top:1px solid #f0effe;">
            <p style="color:#aaa;font-size:11px;margin:0;">
              Made with ❤️ in Durgapur · SplitEasy
            </p>
          </div>

        </div>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('OTP send error:', err);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}