async function run() {
  const saleId = 195;
  try {
    console.log(`Fetching sale ${saleId} from port 3005...`);
    const getRes = await fetch(`http://localhost:3005/api/sales?id=${saleId}`);
    console.log(`GET status: ${getRes.status} ${getRes.statusText}`);
    
    if (!getRes.ok) {
      const text = await getRes.text();
      console.log(`GET error: ${text}`);
      return;
    }

    const sale = await getRes.json();
    console.log(`GET Sale Details: cus_id=${sale.cus_id}, total_amount=${sale.total_amount}, payment=${sale.payment}`);

    // Modify total_amount and payment
    const updatedSale = {
      ...sale,
      id: sale.sale_id,
      total_amount: 20000,
      payment: 5000,
      cash_payment: 2500,
      bank_payment: 2500,
      payment_type: 'CASH', // normalized
      customer: undefined,
      sale_details: sale.sale_details.map(d => ({
        pro_id: d.pro_id,
        qnty: d.qnty,
        unit: d.unit,
        unit_rate: d.unit_rate,
        total_amount: d.total_amount,
        discount: d.discount
      })),
      split_payments: [
        {
          amount: 2500,
          payment_type: 'CASH',
          debit_account_id: null,
          credit_account_id: null,
          reference: 'Cash payment edit'
        },
        {
          amount: 2500,
          payment_type: 'BANK_TRANSFER',
          debit_account_id: 148, // UBL
          credit_account_id: null,
          reference: 'Bank payment edit'
        }
      ],
      transport_details: sale.transport_details.map(t => ({
        account_id: t.account_id,
        amount: t.amount
      }))
    };

    console.log('Sending PUT request...');
    const putRes = await fetch(`http://localhost:3005/api/sales`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSale)
    });

    console.log(`PUT status: ${putRes.status} ${putRes.statusText}`);
    const resText = await putRes.text();
    console.log(`PUT response:`, resText.slice(0, 1000));

  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
