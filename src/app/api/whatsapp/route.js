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
// Template variable convention (3-variable Media template — recommended):
//   {{1}} = customer / counterparty name
//   {{2}} = one line: "Flow label – ref <id> | PKR … · date" (or caption if no amount)
//   {{3}} = receipt image URL (Media field only — set TWILIO_CONTENT_MEDIA_VAR=3)
//
// Legacy 4th/5th variables: if TWILIO_CONTENT_MEDIA_VAR=4, amount text is copied to {{5}}.
//
// In LIVE mode, set `TWILIO_CONTENT_MEDIA_VAR` to the Media URL variable index.
// Default is `3`. Set `TWILIO_CONTENT_MEDIA_VAR=` (empty) for text-only templates
// that send the image in a follow-up message instead.
//
// In SANDBOX mode we still use `body` + `mediaUrl` (freeform).
//
// Media URL (Meta): do not use Media = `{{3}}` only — use a static prefix +
//   https://res.cloudinary.com/CLOUD_NAME/image/upload/{{3}}?t=0
// and this API sends {{3}} = path only (see `cloudinaryPathForMediaVariable`).
// Set `TWILIO_WHATSAPP_MEDIA_PATH_ONLY=0` to pass the full URL in {{3}} (legacy).
//
// If your live template is **text only** (no `twilio/media` header variable),
// variable `5` is ignored. We optionally send a **second** free-form message
// with `mediaUrl` so the image still arrives in many cases (works best inside
// the 24h user session). Set `TWILIO_WHATSAPP_DISABLE_IMAGE_FOLLOWUP=1` if you
// use a template with a real dynamic media variable and the image is already
// in the first message (avoids a duplicate image).

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
    bill?.return_id ||
    bill?.order_id ||
    bill?.payment_id ||
    bill?.id ||
    '—';
  const date = new Date().toISOString().slice(0, 10);

  const rawTotal =
    bill?.total_amount != null && bill?.total_amount !== ''
      ? bill.total_amount
      : bill?.total_return_amount;

  let amountOrDetail;
  if (rawTotal != null && rawTotal !== '' && !Number.isNaN(Number(rawTotal))) {
    amountOrDetail = `PKR ${Number(rawTotal).toLocaleString()}`;
  } else if (caption) {
    amountOrDetail = String(caption).replace(/\s+/g, ' ').trim().slice(0, 200);
  } else {
    amountOrDetail = '—';
  }

  const line2 = `${flowLabel} – ref ${String(reference)} | ${amountOrDetail} · ${date}`;

  return {
    1: String(customerName),
    2: String(line2),
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

/**
 * Meta rejects Media URL fields that are only {{3}}. Twilio body must be like:
 *   https://res.cloudinary.com/<cloud>/image/upload/{{3}}?t=0
 * So variable {{3}} is only the path after /image/upload/ (not the full URL).
 */
function cloudinaryPathForMediaVariable(secureUrl) {
  const s = String(secureUrl || '');
  const marker = '/image/upload/';
  const i = s.indexOf(marker);
  if (i === -1) return s;
  return s.slice(i + marker.length).split('?')[0] || s;
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
      // PDF: include `.pdf` in public_id. PNG: use id *without* `.png` — adding
      // `receipt-89.png` made Cloudinary emit URLs like `...receipt-89.png.png`.
      public_id: isPdf ? `${baseId}.pdf` : baseId,
      use_filename: false,
      unique_filename: false,
      overwrite: true,
      resource_type: isPdf ? 'raw' : 'image',
    };

    const uploadResult = await cloudinary.uploader.upload(sanitizedDataUri, uploadOptions);
    cloudinaryPublicId = uploadResult.public_id;
    cloudinaryResourceType = uploadResult.resource_type || (isPdf ? 'raw' : 'image');
    let mediaUrl = uploadResult.secure_url;
    if (typeof mediaUrl === 'string') {
      mediaUrl = mediaUrl.replace(/\.png\.png/gi, '.png');
    }

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

    // Live: template variable for image URL (if any). Empty = all body vars stay text; image sent in 2nd message.
    let mediaVarKey = '';
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

      // Defaults: {{1}} name, {{2}} combined detail line. Caller may override 1–2.
      const defaults = buildDefaultVariables({ bill, caption, templateKey });
      const mergedVariables = { ...defaults, ...(rawTemplateVariables || {}) };
      const rawMediaVar = process.env.TWILIO_CONTENT_MEDIA_VAR;
      // Default `3` = third variable is the Media image URL (2 text + 1 image).
      // Set env to empty string for text-only body + image follow-up message.
      mediaVarKey =
        rawMediaVar === undefined || rawMediaVar === null
          ? '3'
          : String(rawMediaVar).trim();
      if (mediaVarKey === '4') {
        const amountLine = mergedVariables['4'];
        if (amountLine != null && String(amountLine).trim() !== '') {
          mergedVariables['5'] = String(amountLine);
        }
      }
      if (mediaVarKey) {
        const usePathOnly =
          process.env.TWILIO_WHATSAPP_MEDIA_PATH_ONLY !== '0' &&
          process.env.TWILIO_WHATSAPP_MEDIA_PATH_ONLY !== 'false' &&
          String(mediaUrl).includes('res.cloudinary.com') &&
          String(mediaUrl).includes('/image/upload/');
        mergedVariables[mediaVarKey] = usePathOnly
          ? cloudinaryPathForMediaVariable(mediaUrl)
          : String(mediaUrl);
      }
      const templateVariables = stringifyVariables(mergedVariables);

      twilioPayload = {
        ...senderFields,
        to: formattedTo,
        contentSid,
        contentVariables: templateVariables,
      };

      console.log(
        '📄 Using template:',
        templateKey,
        '| contentSid:',
        contentSid,
        '| mediaVarKey:',
        mediaVarKey || '(none — no image variable)',
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

    // Live: text-only templates have no image in the first (template) message.
    // A follow-up with `mediaUrl` delivers the receipt image. If you bind the
    // image in the template via `TWILIO_CONTENT_MEDIA_VAR`, do not send a
    // duplicate (unless you force; see `TWILIO_WHATSAPP_FORCE_IMAGE_FOLLOWUP`).
    let imageFollowUpSid = null;
    let imageFollowUpError = null;
    const followUpDisabled =
      process.env.TWILIO_WHATSAPP_DISABLE_IMAGE_FOLLOWUP === '1' ||
      process.env.TWILIO_WHATSAPP_DISABLE_IMAGE_FOLLOWUP === 'true';
    const followUpOverride =
      process.env.TWILIO_WHATSAPP_FORCE_IMAGE_FOLLOWUP === '1' ||
      process.env.TWILIO_WHATSAPP_FORCE_IMAGE_FOLLOWUP === 'true';
    const shouldSendImageFollowup =
      mode === 'live' &&
      !followUpDisabled &&
      (!mediaVarKey || followUpOverride);
    if (shouldSendImageFollowup) {
      const followUpBody = (
        (process.env.TWILIO_WHATSAPP_IMAGE_CAPTION || '').trim() ||
        'Receipt'
      ).slice(0, 1600);
      const delayMs = Math.min(
        10000,
        Math.max(0, parseInt(process.env.TWILIO_WHATSAPP_FOLLOWUP_DELAY_MS || '800', 10) || 0)
      );
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      try {
        const imgMsg = await client.messages.create({
          ...senderFields,
          to: formattedTo,
          body: followUpBody,
          mediaUrl: [mediaUrl],
        });
        imageFollowUpSid = imgMsg.sid;
        console.log(
          '✅ Image follow-up SID:',
          imgMsg.sid,
          '| Status:',
          imgMsg.status
        );
      } catch (followErr) {
        imageFollowUpError = followErr.message || String(followErr);
        console.warn(
          '⚠️ WhatsApp image follow-up failed (template media var, or outside 24h session):',
          imageFollowUpError
        );
      }
    }

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
      imageFollowUpSid: imageFollowUpSid || null,
      imageFollowUpError: imageFollowUpError || null,
      ...(mode === 'live' && {
        contentTemplateNote:
          'Use a 3-variable Media template: {{1}} name, {{2}} detail line, {{3}} image URL in the Media field only. Set TWILIO_CONTENT_MEDIA_VAR=3 (default) or empty for text + follow-up image.',
      }),
    });
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}
