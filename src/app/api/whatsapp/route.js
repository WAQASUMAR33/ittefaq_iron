import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { v2 as cloudinary } from 'cloudinary';

function formatPhone(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '92' + digits.slice(1);
  if (!digits.startsWith('+')) digits = '+' + digits;
  return 'whatsapp:' + digits;
}

export async function POST(request) {
  let cloudinaryPublicId = null;

  // Initialize clients inside the handler so env vars are available at runtime
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  console.log('🔍 FROM:', FROM);
  console.log('🔍 SID starts with AC:', process.env.TWILIO_ACCOUNT_SID?.startsWith('AC'));

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

    // Upload base64 image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(imageBase64, {
      folder: 'ittefaq-receipts',
      public_id: `receipt-${bill?.sale_id || Date.now()}`,
      overwrite: true,
      resource_type: 'image',
    });

    cloudinaryPublicId = uploadResult.public_id;
    const mediaUrl = uploadResult.secure_url;

    // Send via Twilio
    const isReturn = bill?.is_return || bill?.bill_type === 'SALE_RETURN';
    const caption = isReturn
      ? `🔄 Sale Return #${bill?.sale_id} - ${bill?.customer?.cus_name || ''}`
      : `🧾 Invoice #${bill?.sale_id} - ${bill?.customer?.cus_name || ''}`;

    const result = await client.messages.create({
      from: FROM,
      to: formattedTo,
      body: caption,
      mediaUrl: [mediaUrl]
    });

    // Delete from Cloudinary after 5 minutes
    setTimeout(async () => {
      try {
        await cloudinary.uploader.destroy(cloudinaryPublicId);
      } catch (e) {
        console.error('Cloudinary cleanup error:', e.message);
      }
    }, 5 * 60 * 1000);

    return NextResponse.json({
      success: true,
      sid: result.sid,
      to: formattedTo,
      status: result.status
    });

  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to send WhatsApp message'
    }, { status: 500 });
  }
}
