import { NextResponse } from 'next/server';
import twilio from 'twilio';
import fs from 'fs';
import path from 'path';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function formatPhone(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '92' + digits.slice(1);
  if (!digits.startsWith('+')) digits = '+' + digits;
  return 'whatsapp:' + digits;
}

export async function POST(request) {
  let tempFilePath = null;

  try {
    const body = await request.json();
    const { imageBase64, phone, bill } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const toPhone = phone || bill?.customer?.cus_phone_no;
    const formattedTo = formatPhone(toPhone);

    if (!formattedTo) {
      return NextResponse.json({ error: 'No valid phone number found' }, { status: 400 });
    }

    // Save base64 image to public/temp/
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const fileName = `receipt-${Date.now()}.png`;
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    tempFilePath = path.join(tempDir, fileName);

    fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));

    const mediaUrl = `${APP_URL}/temp/${fileName}`;
    const isReturn = bill?.is_return || bill?.bill_type === 'SALE_RETURN';
    const caption = isReturn
      ? `🔄 Sale Return Invoice #${bill?.sale_id} - ${bill?.customer?.cus_name || ''}`
      : `🧾 Sale Invoice #${bill?.sale_id} - ${bill?.customer?.cus_name || ''}`;

    const result = await client.messages.create({
      from: FROM,
      to: formattedTo,
      body: caption,
      mediaUrl: [mediaUrl]
    });

    // Delete temp file after 60 seconds (enough time for Twilio to fetch it)
    setTimeout(() => {
      try {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {
        console.error('Failed to delete temp file:', e.message);
      }
    }, 60000);

    return NextResponse.json({
      success: true,
      sid: result.sid,
      to: formattedTo,
      status: result.status
    });

  } catch (error) {
    // Clean up temp file on error
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (e) {}

    console.error('❌ WhatsApp send error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to send WhatsApp message'
    }, { status: 500 });
  }
}
