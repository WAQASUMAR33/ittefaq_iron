import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { v2 as cloudinary } from 'cloudinary';

// ─────────────────────────────────────────────────────────────────────────────
// Twilio WhatsApp — sandbox vs. live (Content Templates)
// ─────────────────────────────────────────────────────────────────────────────
// Mode resolution (in order):
//   1. TWILIO_WHATSAPP_MODE === 'sandbox' | 'live' → forced
//   2. TWILIO_WHATSAPP_FROM contains the sandbox number → 'sandbox'
//   3. Default: 'live' if content SIDs are configured, else 'sandbox'
//
// In SANDBOX we send freeform body + mediaUrl (works for opted-in sandbox
// members only). In LIVE we MUST use a pre-approved Content Template with a
// contentSid + contentVariables; freeform sends will be rejected by Meta
// outside the 24-hour customer-care window.
//
// Supported templateKeys → env var containing the Twilio Content SID (HXxxxx):
//   sale_receipt             → TWILIO_CONTENT_SID_SALE_RECEIPT
//   sale_return_receipt      → TWILIO_CONTENT_SID_SALE_RETURN_RECEIPT
//   purchase_receipt         → TWILIO_CONTENT_SID_PURCHASE_RECEIPT
//   purchase_return_receipt  → TWILIO_CONTENT_SID_PURCHASE_RETURN_RECEIPT
//   order_receipt            → TWILIO_CONTENT_SID_ORDER_RECEIPT
//   finance_receipt          → TWILIO_CONTENT_SID_FINANCE_RECEIPT
//   stock_report             → TWILIO_CONTENT_SID_STOCK_REPORT
//   customer_list            → TWILIO_CONTENT_SID_CUSTOMER_LIST
//
// Template variable convention used by this API (configure your Twilio
// templates to match):
//   {{1}} = recipient / customer / supplier / user name
//   {{2}} = reference number (invoice / order / payment id, or "—")
//   {{3}} = amount or item count (human readable, e.g. "PKR 12,500" or "42 items")
//   {{4}} = date (e.g. "2026-04-23")
//
// Templates should include a DOCUMENT (or IMAGE) header. We attach the
// uploaded Cloudinary URL as `mediaUrl` on the message — Twilio accepts that
// alongside `contentSid` and uses it to fill the template's media header.

const SANDBOX_FROM = 'whatsapp:+14155238886';

const TEMPLATE_ENV_KEYS = {
  sale_receipt: 'TWILIO_CONTENT_SID_SALE_RECEIPT',
  sale_return_receipt: 'TWILIO_CONTENT_SID_SALE_RETURN_RECEIPT',
  purchase_receipt: 'TWILIO_CONTENT_SID_PURCHASE_RECEIPT',
  purchase_return_receipt: 'TWILIO_CONTENT_SID_PURCHASE_RETURN_RECEIPT',
  order_receipt: 'TWILIO_CONTENT_SID_ORDER_RECEIPT',
  finance_receipt: 'TWILIO_CONTENT_SID_FINANCE_RECEIPT',
  stock_report: 'TWILIO_CONTENT_SID_STOCK_REPORT',
  customer_list: 'TWILIO_CONTENT_SID_CUSTOMER_LIST',
};

// Human-readable label for each flow, injected as {{2}} in the generic
// template so a single approved template renders naturally for every flow.
const TEMPLATE_FLOW_LABELS = {
  sale_receipt: 'Sale receipt',
  sale_return_receipt: 'Sale return receipt',
  purchase_receipt: 'Purchase receipt',
  purchase_return_receipt: 'Purchase return receipt',
  order_receipt: 'Order receipt',
  finance_receipt: 'Finance receipt',
  stock_report: 'Stock report',
  customer_list: 'Accounts list',
};

function formatPhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '92' + digits.slice(1);
  if (!digits.startsWith('+')) digits = '+' + digits;
  return 'whatsapp:' + digits;
}

function anyTemplateConfigured() {
  if (process.env.TWILIO_CONTENT_SID_GENERIC) return true;
  return Object.values(TEMPLATE_ENV_KEYS).some((k) => !!process.env[k]);
}

function resolveMode(fromNumber) {
  const forced = (process.env.TWILIO_WHATSAPP_MODE || '').toLowerCase();
  if (forced === 'sandbox' || forced === 'live') return forced;
  if (fromNumber === SANDBOX_FROM) return 'sandbox';
  return anyTemplateConfigured() ? 'live' : 'sandbox';
}

function resolveContentSid(templateKey) {
  // 1. Exact match for the flow-specific SID (most specific wins).
  if (templateKey) {
    const envKey = TEMPLATE_ENV_KEYS[templateKey];
    if (envKey && process.env[envKey]) return process.env[envKey];
  }
  // 2. Fall back to the generic template that works for every flow.
  if (process.env.TWILIO_CONTENT_SID_GENERIC) {
    return process.env.TWILIO_CONTENT_SID_GENERIC;
  }
  return null;
}

// Auto-infer templateKey from bill shape when the caller didn't pass one
// (keeps old callers working in live mode once env vars are set).
function inferTemplateKey(bill) {
  if (!bill) return null;
  const billType = String(bill.bill_type || '').toUpperCase();
  const saleId = String(bill.sale_id || '');

  if (saleId.startsWith('stock-')) return 'stock_report';
  if (saleId.startsWith('store-stock-')) return 'stock_report';
  if (saleId.startsWith('customers-')) return 'customer_list';

  if (bill.is_return && billType.includes('PURCHASE')) return 'purchase_return_receipt';
  if (bill.is_return) return 'sale_return_receipt';

  if (billType === 'PURCHASE' || billType === 'PURCHASES') return 'purchase_receipt';
  if (billType === 'PURCHASE_RETURN') return 'purchase_return_receipt';
  if (billType === 'SALE_RETURN') return 'sale_return_receipt';
  if (billType === 'ORDER' || billType === 'QUOTATION') return 'order_receipt';
  if (billType === 'FINANCE_IN' || billType === 'FINANCE_OUT') return 'finance_receipt';
  if (billType === 'SALE' || billType === 'BILL') return 'sale_receipt';

  return null;
}

function buildDefaultVariables({ bill, caption, templateKey }) {
  const customerName =
    bill?.customer?.cus_name ||
    bill?.supplier?.sup_name ||
    bill?.name ||
    'Customer';
  const flowLabel = TEMPLATE_FLOW_LABELS[templateKey] || 'Receipt';
  const reference =
    bill?.invoice_no ||
    bill?.sale_id ||
    bill?.order_id ||
    bill?.payment_id ||
    '—';
  const amountOrDetail =
    bill?.total_amount != null
      ? `PKR ${Number(bill.total_amount).toLocaleString()}`
      : caption || '—';
  const date = new Date().toISOString().slice(0, 10);

  return {
    1: String(customerName),
    2: String(flowLabel),
    3: String(reference),
    4: `${amountOrDetail} · ${date}`,
  };
}

function stringifyVariables(vars) {
  // Twilio expects every value as a string
  const out = {};
  for (const [k, v] of Object.entries(vars || {})) {
    out[String(k)] = v == null ? '' : String(v);
  }
  return JSON.stringify(out);
}

export async function POST(request) {
  let cloudinaryPublicId = null;
  let cloudinaryResourceType = 'image';

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const FROM = process.env.TWILIO_WHATSAPP_FROM || SANDBOX_FROM;
  const MESSAGING_SERVICE_SID = (process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
  const mode = resolveMode(FROM);

  // Messaging Service is only meaningful in live mode — the sandbox number
  // isn't something you'd put inside a production Messaging Service.
  const useMessagingService =
    mode === 'live' && MESSAGING_SERVICE_SID.startsWith('MG');

  console.log(
    '🔍 WhatsApp mode:',
    mode,
    '|',
    useMessagingService
      ? `messagingServiceSid: ${MESSAGING_SERVICE_SID}`
      : `FROM: ${FROM}`
  );

  try {
    const body = await request.json();
    const {
      imageBase64,
      phone,
      bill,
      caption: customCaption,
      templateKey: rawTemplateKey,
      templateVariables: rawTemplateVariables,
    } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const toPhone = phone || bill?.customer?.cus_phone_no;
    const formattedTo = formatPhone(toPhone);
    if (!formattedTo) {
      return NextResponse.json({ error: 'No valid phone number found' }, { status: 400 });
    }

    // Some generators (e.g. jsPDF) emit non-standard data URIs like
    //   data:application/pdf;filename=generated.pdf;base64,...
    // Cloudinary's parser rejects those, so normalise to the canonical
    //   data:<mime>;base64,...
    // form before uploading.
    const sanitizedDataUri = imageBase64.replace(
      /^(data:[^;,]+)(?:;[^,;]+)*;base64,/i,
      '$1;base64,'
    );

    const isPdf = sanitizedDataUri.startsWith('data:application/pdf');
    const baseId = `receipt-${bill?.sale_id || Date.now()}`;
    const uploadOptions = {
      folder: 'ittefaq-receipts',
      // For raw uploads, include the .pdf extension in the public_id so the
      // resulting secure_url ends in `.pdf`. WhatsApp relies on the URL
      // extension to determine media type for documents.
      public_id: isPdf ? `${baseId}.pdf` : baseId,
      use_filename: false,
      unique_filename: false,
      overwrite: true,
      resource_type: isPdf ? 'raw' : 'auto',
    };

    const uploadResult = await cloudinary.uploader.upload(sanitizedDataUri, uploadOptions);
    cloudinaryPublicId = uploadResult.public_id;
    cloudinaryResourceType = uploadResult.resource_type || (isPdf ? 'raw' : 'image');
    const mediaUrl = uploadResult.secure_url;

    const isReturn = bill?.is_return || bill?.bill_type === 'SALE_RETURN';
    const defaultCaption = isReturn
      ? `🔄 Sale Return #${bill?.sale_id} - ${bill?.customer?.cus_name || ''}`
      : `🧾 Invoice #${bill?.sale_id} - ${bill?.customer?.cus_name || ''}`;
    const caption = customCaption || defaultCaption;

    // ── Choose transport: sandbox = freeform, live = content template ──────
    // When a Messaging Service SID is configured, use messagingServiceSid
    // in place of `from` so the service-level settings (validity, status
    // callback, rate limits, sender pool) are honoured.
    const senderFields = useMessagingService
      ? { messagingServiceSid: MESSAGING_SERVICE_SID }
      : { from: FROM };

    let twilioPayload;
    if (mode === 'sandbox') {
      twilioPayload = {
        ...senderFields,
        to: formattedTo,
        body: caption,
        mediaUrl: [mediaUrl],
      };
    } else {
      const templateKey = rawTemplateKey || inferTemplateKey(bill);
      const contentSid = resolveContentSid(templateKey);

      if (!contentSid) {
        return NextResponse.json(
          {
            error:
              `WhatsApp is in LIVE mode but no Twilio Content Template SID is configured. ` +
              `Set either TWILIO_CONTENT_SID_GENERIC (recommended — one template for every flow) ` +
              `or the flow-specific ${templateKey ? TEMPLATE_ENV_KEYS[templateKey] : 'TWILIO_CONTENT_SID_*'} ` +
              `for templateKey="${templateKey || 'unknown'}".`,
            mode,
            templateKey: templateKey || null,
            supportedTemplateKeys: Object.keys(TEMPLATE_ENV_KEYS),
          },
          { status: 400 }
        );
      }

      // Always compute sane defaults; let caller overrides win per-key so a
      // page can customise one variable without having to restate all four.
      const defaults = buildDefaultVariables({ bill, caption, templateKey });
      const mergedVariables = { ...defaults, ...(rawTemplateVariables || {}) };
      const templateVariables = stringifyVariables(mergedVariables);

      twilioPayload = {
        ...senderFields,
        to: formattedTo,
        contentSid,
        contentVariables: templateVariables,
        // Still attach the media URL so templates with a media header resolve
        // to the uploaded file. Twilio ignores this if the template has no
        // media header.
        mediaUrl: [mediaUrl],
      };

      console.log(
        '📄 Using template:',
        templateKey,
        '| contentSid:',
        contentSid,
        '| vars:',
        templateVariables
      );
    }

    console.log('📤 Sending WhatsApp to:', formattedTo);
    const result = await client.messages.create(twilioPayload);

    console.log(
      '✅ Twilio result — SID:',
      result.sid,
      '| Status:',
      result.status,
      '| To:',
      result.to,
      '| ErrorCode:',
      result.errorCode,
      '| ErrorMsg:',
      result.errorMessage
    );

    // Delete from Cloudinary after 5 minutes
    setTimeout(async () => {
      try {
        await cloudinary.uploader.destroy(cloudinaryPublicId, {
          resource_type: cloudinaryResourceType,
        });
      } catch (e) {
        console.error('Cloudinary cleanup error:', e.message);
      }
    }, 5 * 60 * 1000);

    return NextResponse.json({
      success: true,
      sid: result.sid,
      to: formattedTo,
      status: result.status,
      mode,
    });
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}
