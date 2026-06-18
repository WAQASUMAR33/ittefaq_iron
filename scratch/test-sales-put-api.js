async function run() {
  const saleId = 195;
  try {
    console.log(`Fetching sale ${saleId} from API...`);
    const getRes = await fetch(`http://localhost:3001/api/sales?id=${saleId}`);
    console.log(`GET status: ${getRes.status} ${getRes.statusText}`);
    
    if (!getRes.ok) {
      const text = await getRes.text();
      console.log(`GET error: ${text}`);
      return;
    }

    const sale = await getRes.json();
    console.log(`GET Sale Details: cus_id=${sale.cus_id}, total_amount=${sale.total_amount}, payment=${sale.payment}`);
    console.log(`Split Payments:`, JSON.stringify(sale.split_payments, null, 2));

    // Modify total_amount and payment
    const updatedSale = {
      ...sale,
      id: sale.sale_id,
      total_amount: 20000,
      payment: 5000,
      cash_payment: 5000,
      bank_payment: 0,
      // Clear out relations so Next.js doesn't parse them as new inputs or fail
      customer: undefined,
      sale_details: sale.sale_details.map(d => ({
        pro_id: d.pro_id,
        qnty: d.qnty,
        unit: d.unit,
        unit_rate: d.unit_rate,
        total_amount: d.total_amount,
        discount: d.discount
      })),
      split_payments: [],
      transport_details: [] // no transporter for simplicity
    };

    console.log('Sending PUT request...');
    const putRes = await fetch(`http://localhost:3001/api/sales`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSale)
    });

    console.log(`PUT status: ${putRes.status} ${putRes.statusText}`);
    const resText = await putRes.text();
    console.log(`PUT response:`, resText);

  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
