import { POST } from '../src/app/api/purchases/route.js';

async function run() {
  console.log('POST handler imported successfully');
  
  // Construct a mock NextRequest / Request object
  const bodyData = {
    cus_id: 144,
    store_id: 2,
    total_amount: 11700,
    payment: 0,
    payment_type: 'CASH',
    cash_payment: 0,
    bank_payment: 0,
    purchase_details: [
      {
        pro_id: 1,
        qnty: 1,
        unit: 'pcs',
        unit_rate: 11700,
        total_amount: 11700
      }
    ],
    updated_by: 1
  };

  const req = new Request('http://localhost:3000/api/purchases', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(bodyData)
  });

  try {
    const res = await POST(req);
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response data:', data);
  } catch (err) {
    console.error('CRASH STACK TRACE:', err);
  }
}

run();
