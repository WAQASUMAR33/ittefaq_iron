import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateStoreStock, getStoreStock, checkStockAvailability } from '@/lib/storeStock';

// Helper function to get special accounts
async function getSpecialAccounts(tx) {
  const specialAccounts = await tx.customer.findMany({
    where: {
      cus_name: {
        in: ['Cash Account', 'Bank Account', 'Sundry Creditors', 'Sundry Debtors']
      }
    }
  });

  const accounts = {};
  specialAccounts.forEach(account => {
    if (account.cus_name === 'Cash Account') accounts.cash = account;
    if (account.cus_name === 'Bank Account') accounts.bank = account;
    if (account.cus_name === 'Sundry Creditors') accounts.sundryCreditors = account;
    if (account.cus_name === 'Sundry Debtors') accounts.sundryDebtors = account;
  });

  return accounts;
}

// Helper function to create ledger entry
async function createLedgerEntry(tx, data) {
  return await tx.ledger.create({
    data: {
      cus_id: data.cus_id,
      opening_balance: data.opening_balance,
      debit_amount: data.debit_amount || 0,
      credit_amount: data.credit_amount || 0,
      closing_balance: data.closing_balance,
      bill_no: data.bill_no,
      trnx_type: data.trnx_type,
      details: data.details,
      payments: data.payments || 0,
      updated_by: data.updated_by
    }
  });
}

// GET - Fetch all sales with related data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;

    if (id) {
      // Fetch single sale
      try {
      const sale = await prisma.sale.findUnique({
        where: { sale_id: id },
        include: {
          customer: {
            include: {
              customer_category: true
            }
          },
          sale_details: {
            include: {
              product: {
                include: {
                  category: true,
                  sub_category: true
                }
              }
            }
          },
          debit_account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          credit_account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          loader: {
            select: {
              loader_id: true,
              loader_name: true,
              loader_number: true,
              loader_phone: true
            }
          },
          split_payments: {
            include: {
              debit_account: true,
              credit_account: true
            }
          },
          updated_by_user: {
            select: {
              full_name: true,
              role: true
            }
          }
        }
      });

      if (!sale) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }

      return NextResponse.json(sale);
      } catch (prismaError) {
        // If store_id column doesn't exist, use raw SQL
        if (prismaError.code === 'P2022' && prismaError.message?.includes('store_id')) {
          console.warn('⚠️ store_id column not found in GET, using raw SQL fallback');
          const sale = await prisma.$queryRaw`
            SELECT s.*, 
              c.cus_id as customer_cus_id, c.cus_name as customer_cus_name, c.cus_phone_no as customer_cus_phone_no,
              c.cus_category as customer_cus_category, c.cus_type as customer_cus_type
            FROM sales s
            LEFT JOIN customers c ON s.cus_id = c.cus_id
            WHERE s.sale_id = ${id}
            LIMIT 1
          `;
          
          if (!sale || sale.length === 0) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
          }
          
          // Fetch sale_details separately
          const saleDetails = await prisma.$queryRaw`
            SELECT sd.*, p.pro_name, p.pro_stock_qnty
            FROM sale_details sd
            LEFT JOIN products p ON sd.pro_id = p.pro_id
            WHERE sd.sale_id = ${id}
          `;
          
          const result = {
            ...sale[0],
            sale_details: saleDetails || []
          };
          
          return NextResponse.json(result);
        } else {
          throw prismaError;
        }
      }
    } else {
      // Fetch all sales
      try {
      const sales = await prisma.sale.findMany({
        include: {
          customer: {
            include: {
              customer_category: true
            }
          },
          sale_details: {
            include: {
              product: {
                include: {
                  category: true,
                  sub_category: true
                }
              }
            }
          },
          debit_account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          credit_account: {
            select: {
              cus_id: true,
              cus_name: true,
              cus_phone_no: true
            }
          },
          loader: {
            select: {
              loader_id: true,
              loader_name: true,
              loader_number: true,
              loader_phone: true
            }
          },
          split_payments: {
            include: {
              debit_account: true,
              credit_account: true
            }
          },
          updated_by_user: {
            select: {
              full_name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

        console.log('✅ Sales fetched via Prisma:', sales.length);
      return NextResponse.json(sales);
      } catch (prismaError) {
        console.error('❌ Prisma error:', prismaError.code, prismaError.message);
        // If store_id column doesn't exist, use raw SQL
        if (prismaError.code === 'P2022' && prismaError.message?.includes('store_id')) {
          console.warn('⚠️ store_id column not found in GET, using raw SQL fallback');
          try {
            const sales = await prisma.$queryRaw`
              SELECT s.*, 
                c.cus_id, c.cus_name, 
                c.cus_phone_no, c.cus_category,
                c.cus_type, c.cus_balance,
                c.cus_address, c.cus_reference
              FROM sales s
              LEFT JOIN customers c ON s.cus_id = c.cus_id
              ORDER BY s.created_at DESC
            `;
            
            console.log('📊 Raw SQL sales count:', sales?.length || 0);
            console.log('📊 Raw SQL sales data:', JSON.stringify(sales?.slice(0, 2), null, 2));
            
            if (!sales || sales.length === 0) {
              console.warn('⚠️ No sales found in database');
              return NextResponse.json([]);
            }
            
            // Fetch sale_details for all sales
            const saleIds = sales.map(s => s.sale_id).filter(id => id != null);
            console.log('📊 Sale IDs to fetch details for:', saleIds);
            let saleDetails = [];
            if (saleIds.length > 0) {
              // Build IN clause manually for raw SQL
              const placeholders = saleIds.map(() => '?').join(',');
              const query = `SELECT sd.*, p.pro_name, p.pro_stock_qnty, 
                cat.cat_name, sub.sub_cat_name
                FROM sale_details sd
                LEFT JOIN products p ON sd.pro_id = p.pro_id
                LEFT JOIN categories cat ON p.cat_id = cat.cat_id
                LEFT JOIN subcategories sub ON p.sub_cat_id = sub.sub_cat_id
                WHERE sd.sale_id IN (${placeholders})`;
              saleDetails = await prisma.$queryRawUnsafe(query, ...saleIds);
              console.log('📊 Sale details fetched:', saleDetails?.length || 0);
            }
            
            // Fetch customer categories for nested structure
            const customerCategoryIds = [...new Set(sales.map(s => s.cus_category).filter(id => id != null))];
            let customerCategories = [];
            if (customerCategoryIds.length > 0) {
              const catPlaceholders = customerCategoryIds.map(() => '?').join(',');
              const catQuery = `SELECT * FROM customer_categories WHERE cus_category_id IN (${catPlaceholders})`;
              customerCategories = await prisma.$queryRawUnsafe(catQuery, ...customerCategoryIds);
            }
            
            const categoriesMap = {};
            customerCategories.forEach(cat => {
              categoriesMap[cat.cus_category_id] = cat;
            });
            
            // Group sale_details by sale_id and format properly
            const detailsBySaleId = {};
            if (saleDetails && saleDetails.length > 0) {
              saleDetails.forEach(detail => {
                if (!detailsBySaleId[detail.sale_id]) {
                  detailsBySaleId[detail.sale_id] = [];
                }
                detailsBySaleId[detail.sale_id].push({
                  ...detail,
                  product: detail.pro_name ? {
                    pro_id: detail.pro_id,
                    pro_name: detail.pro_name,
                    pro_stock_qnty: detail.pro_stock_qnty,
                    category: detail.cat_name ? { cat_name: detail.cat_name } : null,
                    sub_category: detail.sub_cat_name ? { sub_cat_name: detail.sub_cat_name } : null
                  } : null
                });
              });
            }
            
            // Format sales to match Prisma structure
            const result = sales.map(sale => {
              // Handle BigInt values (like sale_id, total_amount) by converting to Number
              const formattedSale = {
                sale_id: Number(sale.sale_id),
                total_amount: Number(sale.total_amount) || 0,
                discount: Number(sale.discount) || 0,
                payment: Number(sale.payment) || 0,
                payment_type: sale.payment_type,
                shipping_amount: Number(sale.shipping_amount) || 0,
                bill_type: sale.bill_type,
                reference: sale.reference,
                created_at: sale.created_at,
                updated_at: sale.updated_at,
                cus_id: sale.cus_id ? Number(sale.cus_id) : null,
                loader_id: sale.loader_id ? Number(sale.loader_id) : null,
                debit_account_id: sale.debit_account_id ? Number(sale.debit_account_id) : null,
                credit_account_id: sale.credit_account_id ? Number(sale.credit_account_id) : null,
                customer: sale.cus_name ? {
                  cus_id: Number(sale.cus_id),
                  cus_name: sale.cus_name,
                  cus_phone_no: sale.cus_phone_no,
                  cus_category: sale.cus_category ? Number(sale.cus_category) : null,
                  cus_type: sale.cus_type ? Number(sale.cus_type) : null,
                  cus_balance: Number(sale.cus_balance) || 0,
                  cus_address: sale.cus_address,
                  cus_reference: sale.cus_reference,
                  customer_category: sale.cus_category && categoriesMap[sale.cus_category] ? categoriesMap[sale.cus_category] : null
                } : null,
                sale_details: detailsBySaleId[sale.sale_id] || [],
                loader: null,
                debit_account: null,
                credit_account: null,
                split_payments: []
              };
              return formattedSale;
            });
            
            console.log('✅ Formatted sales result count:', result.length);
            return NextResponse.json(result);
          } catch (rawSqlError) {
            console.error('❌ Raw SQL error:', rawSqlError);
            throw rawSqlError;
          }
        } else {
          throw prismaError;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching sales:', error);
    
    // Provide helpful error message for store_id issues
    if (error.code === 'P2022' && error.message?.includes('store_id')) {
      return NextResponse.json({
        error: 'Database migration required: store_id column is missing',
        details: 'Please run the migration SQL to add store_id column. See ADD_STORE_ID_TO_SALES_SIMPLE.sql'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch sales',
      details: error.message 
    }, { status: 500 });
  }
}

// POST - Create new sale
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('🔍 Sales API - Received data:', body);
    
    const {
      cus_id,
      store_id, // Added store_id for multi-store functionality
      total_amount,
      discount,
      payment,
      payment_type,
      debit_account_id,
      credit_account_id,
      loader_id,
      shipping_amount,
      bill_type,
      reference,
      sale_details,
      transport_details,
      split_payments,
      updated_by
    } = body;

    // Validate required fields
    console.log('🔍 Sales API - Validating fields:', { cus_id, store_id, total_amount, payment, sale_details });
    if (!cus_id || !store_id || !total_amount || payment === undefined || payment === null || !sale_details || sale_details.length === 0) {
      console.log('❌ Sales API - Missing required fields:', { cus_id, store_id, total_amount, payment, sale_details });
      return NextResponse.json({ error: 'Missing required fields including store_id' }, { status: 400 });
    }

    // Additional validation for numeric values
    if (isNaN(parseFloat(total_amount)) || parseFloat(total_amount) <= 0) {
      console.log('❌ Sales API - Invalid total_amount:', total_amount);
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 });
    }

    if (isNaN(parseFloat(payment)) || parseFloat(payment) < 0) {
      console.log('❌ Sales API - Invalid payment:', payment);
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    // Calculate net total (including shipping amount)
    const netTotal = parseFloat(total_amount) - parseFloat(discount || 0) + parseFloat(shipping_amount || 0);

    // Check stock availability for all products in the store
    for (const detail of sale_details) {
      const hasStock = await checkStockAvailability(store_id, detail.pro_id, parseInt(detail.qnty));
      if (!hasStock) {
        const currentStock = await getStoreStock(store_id, detail.pro_id);
        return NextResponse.json({ 
          error: `Insufficient stock for product ${detail.pro_id}. Available: ${currentStock}, Required: ${detail.qnty}` 
        }, { status: 400 });
      }
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get customer's current balance
      const customer = await tx.customer.findUnique({
        where: { cus_id }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Create sale - try with store_id first, fallback if column doesn't exist
      let sale;
      try {
        sale = await tx.sale.create({
        data: {
          cus_id,
          store_id: parseInt(store_id), // Added store_id
          total_amount: parseFloat(total_amount),
          discount: parseFloat(discount || 0),
          payment: parseFloat(payment),
          payment_type,
          debit_account_id: debit_account_id || null,
          credit_account_id: credit_account_id || null,
          loader_id: loader_id || null,
          shipping_amount: parseFloat(shipping_amount || 0),
          bill_type: bill_type || 'BILL',
          reference: reference || null,
          updated_by
        }
      });
      } catch (storeIdError) {
        // If store_id column doesn't exist, use raw SQL to create sale without store_id
        if (storeIdError.code === 'P2022' && storeIdError.message?.includes('store_id')) {
          console.warn('⚠️ store_id column not found, creating sale using raw SQL. Please run migration!');
          
          // Use raw SQL to insert sale without store_id column
          await tx.$executeRaw`
            INSERT INTO sales (
              cus_id, total_amount, discount, payment, payment_type,
              debit_account_id, credit_account_id, loader_id, shipping_amount,
              bill_type, reference, updated_by, created_at, updated_at
            ) VALUES (
              ${cus_id}, ${parseFloat(total_amount)}, ${parseFloat(discount || 0)},
              ${parseFloat(payment)}, ${payment_type},
              ${debit_account_id || null}, ${credit_account_id || null},
              ${loader_id || null}, ${parseFloat(shipping_amount || 0)},
              ${bill_type || 'BILL'}, ${reference || null}, ${updated_by},
              NOW(), NOW()
            )
          `;
          
          // Get the inserted sale using raw SQL
          const insertedSales = await tx.$queryRaw`
            SELECT * FROM sales 
            WHERE cus_id = ${cus_id} 
            AND total_amount = ${parseFloat(total_amount)}
            AND payment = ${parseFloat(payment)}
            AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
            ORDER BY sale_id DESC LIMIT 1
          `;
          
          if (!insertedSales || insertedSales.length === 0) {
            throw new Error('Failed to retrieve created sale');
          }
          
          sale = insertedSales[0];
        } else {
          throw storeIdError;
        }
      }

      // Create sale details - try with store_id first, fallback to raw SQL if column doesn't exist
      const saleDetailPromises = sale_details.map(async detail => {
        const detailData = {
            sale_id: sale.sale_id,
            pro_id: detail.pro_id,
            vehicle_no: detail.vehicle_no || null,
            qnty: parseInt(detail.qnty),
            unit: detail.unit,
            unit_rate: parseFloat(detail.unit_rate),
            total_amount: parseFloat(detail.total_amount),
            discount: parseFloat(detail.discount || 0),
            net_total: parseFloat(detail.total_amount) - parseFloat(detail.discount || 0),
            cus_id,
            updated_by: updated_by || null
        };

        // Try with store_id first
        try {
          return await tx.saleDetail.create({
            data: {
              ...detailData,
              store_id: parseInt(store_id)
            }
          });
        } catch (storeIdError) {
          // If store_id column doesn't exist, use raw SQL
          if (storeIdError.code === 'P2022' && storeIdError.message?.includes('store_id')) {
            console.warn('⚠️ store_id column not found in sale_details, creating using raw SQL');
            
            // Use raw SQL to insert sale_detail without store_id column
            await tx.$executeRaw`
              INSERT INTO sale_details (
                sale_id, pro_id, vehicle_no, qnty, unit, unit_rate,
                total_amount, discount, net_total, cus_id, updated_by
              ) VALUES (
                ${detailData.sale_id}, ${detailData.pro_id},
                ${detailData.vehicle_no}, ${detailData.qnty},
                ${detailData.unit}, ${detailData.unit_rate},
                ${detailData.total_amount}, ${detailData.discount},
                ${detailData.net_total}, ${detailData.cus_id},
                ${detailData.updated_by}
              )
            `;
            
            // Return a mock object that matches the expected structure
            return {
              sale_id: detailData.sale_id,
              pro_id: detailData.pro_id,
              vehicle_no: detailData.vehicle_no,
              qnty: detailData.qnty,
              unit: detailData.unit,
              unit_rate: detailData.unit_rate,
              total_amount: detailData.total_amount,
              discount: detailData.discount,
              net_total: detailData.net_total,
              cus_id: detailData.cus_id,
              updated_by: detailData.updated_by
            };
          } else {
            throw storeIdError;
          }
        }
      });

      await Promise.all(saleDetailPromises);

      // Create split payments if provided
      if (split_payments && split_payments.length > 0) {
        const splitPaymentPromises = split_payments.map(splitPayment => 
          tx.splitPayment.create({
            data: {
              sale_id: sale.sale_id,
              amount: parseFloat(splitPayment.amount),
              payment_type: splitPayment.payment_type,
              debit_account_id: splitPayment.debit_account_id || null,
              credit_account_id: splitPayment.credit_account_id || null,
              reference: splitPayment.reference || null
            }
          })
        );
        await Promise.all(splitPaymentPromises);
      }

      // Update store stock quantities (instead of global product stock)
      if (store_id) {
        const storeStockUpdatePromises = sale_details.map(async detail => {
          await updateStoreStock(store_id, detail.pro_id, parseInt(detail.qnty), 'decrement', updated_by);
        });
        await Promise.all(storeStockUpdatePromises);
      }

      // Get special accounts
      const specialAccounts = await getSpecialAccounts(tx);

      // Create comprehensive ledger entries
      const ledgerEntries = [];
      
      // Calculate net amount owed by customer (total - payment received)
      const customerNetAmount = netTotal - parseFloat(payment);

      // 1. Customer Bill Entry - Debit Customer Account
      ledgerEntries.push({
          cus_id,
          opening_balance: customer.cus_balance,
          debit_amount: netTotal,
          credit_amount: 0,
          closing_balance: customer.cus_balance + netTotal,
          bill_no: sale.sale_id.toString(),
          trnx_type: 'CASH',
        details: `Sale Bill - ${bill_type || 'BILL'} - Customer Account (Debit)`,
          payments: 0,
          updated_by
      });

      // 2. Cash/Bank Account - CREDIT (when payment is received)
      if (parseFloat(payment) > 0) {

        // 3. Payment Entry - Debit Cash/Bank Account
        const paymentAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
        if (paymentAccount) {
          ledgerEntries.push({
            cus_id: paymentAccount.cus_id,
            opening_balance: paymentAccount.cus_balance,
            debit_amount: parseFloat(payment),
            credit_amount: 0,
            closing_balance: paymentAccount.cus_balance + parseFloat(payment),
            bill_no: sale.sale_id.toString(),
            trnx_type: payment_type,
            details: `Payment Received - ${bill_type || 'BILL'} - ${payment_type} Account (Debit)`,
            payments: parseFloat(payment),
            updated_by
          });
        }
      }

      // 4. Transporter Entry (if loader_id is provided)
      if (loader_id) {
        const loader = await tx.loader.findUnique({
          where: { loader_id }
        });

        if (loader) {
          // Debit Transporter Account
          ledgerEntries.push({
            cus_id: loader_id,
            opening_balance: loader.loader_balance,
            debit_amount: parseFloat(shipping_amount || 0),
            credit_amount: 0,
            closing_balance: loader.loader_balance + parseFloat(shipping_amount || 0),
            bill_no: sale.sale_id.toString(),
            trnx_type: 'CASH',
                details: `Transporter Charges - ${bill_type || 'BILL'} - Transport Account (Debit)`,
            payments: 0,
            updated_by
          });

          // Credit Sundry Debtors Account
          if (specialAccounts.sundryDebtors) {
            ledgerEntries.push({
              cus_id: specialAccounts.sundryDebtors.cus_id,
              opening_balance: specialAccounts.sundryDebtors.cus_balance,
              debit_amount: 0,
              credit_amount: parseFloat(shipping_amount || 0),
              closing_balance: specialAccounts.sundryDebtors.cus_balance - parseFloat(shipping_amount || 0),
              bill_no: sale.sale_id.toString(),
              trnx_type: 'CASH',
                  details: `Transporter Charges - ${bill_type || 'BILL'} - Sundry Debtors (Credit)`,
              payments: 0,
              updated_by
            });
          }
        }
      }

      // 5. Split Payment Entries (if any)
      if (split_payments && split_payments.length > 0) {
        for (const splitPayment of split_payments) {
          const splitAmount = parseFloat(splitPayment.amount);
          
          // Debit Split Payment Account
          if (splitPayment.debit_account_id) {
            const debitAccount = await tx.customer.findUnique({
              where: { cus_id: splitPayment.debit_account_id }
            });
            
            if (debitAccount) {
              ledgerEntries.push({
                cus_id: splitPayment.debit_account_id,
                opening_balance: debitAccount.cus_balance,
                debit_amount: splitAmount,
                credit_amount: 0,
                closing_balance: debitAccount.cus_balance + splitAmount,
                bill_no: sale.sale_id.toString(),
                trnx_type: splitPayment.payment_type,
                details: `Split Payment - ${bill_type || 'BILL'} - Debit Account`,
                payments: splitAmount,
                updated_by
              });
            }
          }

          // Credit Split Payment Account
          if (splitPayment.credit_account_id) {
            const creditAccount = await tx.customer.findUnique({
              where: { cus_id: splitPayment.credit_account_id }
            });
            
            if (creditAccount) {
              ledgerEntries.push({
                cus_id: splitPayment.credit_account_id,
                opening_balance: creditAccount.cus_balance,
                debit_amount: 0,
                credit_amount: splitAmount,
                closing_balance: creditAccount.cus_balance - splitAmount,
                bill_no: sale.sale_id.toString(),
                trnx_type: splitPayment.payment_type,
                details: `Split Payment - ${bill_type || 'BILL'} - Credit Account`,
                payments: splitAmount,
                updated_by
              });
            }
          }
        }
      }

      // Create all ledger entries
      for (const entry of ledgerEntries) {
        await createLedgerEntry(tx, entry);
      }

      // Update customer balance
      await tx.customer.update({
        where: { cus_id },
        data: {
          cus_balance: customer.cus_balance + netTotal - parseFloat(payment)
        }
      });

      // Update special account balances
      if (parseFloat(payment) > 0) {
        const paymentAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
        if (paymentAccount) {
          await tx.customer.update({
            where: { cus_id: paymentAccount.cus_id },
        data: {
          cus_balance: paymentAccount.cus_balance + parseFloat(payment)
        }
          });
        }
      }

      // Update transporter balance
      if (loader_id && parseFloat(shipping_amount || 0) > 0) {
        await tx.loader.update({
          where: { loader_id },
          data: {
            loader_balance: {
              increment: parseFloat(shipping_amount || 0)
            }
          }
        });
      }

      // Update sundry debtors balance
      if (loader_id && specialAccounts.sundryDebtors && parseFloat(shipping_amount || 0) > 0) {
        await tx.customer.update({
          where: { cus_id: specialAccounts.sundryDebtors.cus_id },
          data: {
            cus_balance: {
              decrement: parseFloat(shipping_amount || 0)
            }
          }
        });
      }

      // Update split payment account balances
      if (split_payments && split_payments.length > 0) {
        for (const splitPayment of split_payments) {
          const splitAmount = parseFloat(splitPayment.amount);
          
          if (splitPayment.debit_account_id) {
            await tx.customer.update({
              where: { cus_id: splitPayment.debit_account_id },
              data: {
                cus_balance: {
                  increment: splitAmount
                }
              }
            });
          }

          if (splitPayment.credit_account_id) {
            await tx.customer.update({
              where: { cus_id: splitPayment.credit_account_id },
              data: {
                cus_balance: {
                  decrement: splitAmount
                }
              }
            });
          }
        }
      }

      // 6. Transport Entries (if any)
      if (transport_details && transport_details.length > 0) {
        for (const transport of transport_details) {
          const transportAmount = parseFloat(transport.amount);
          
          if (transport.account_id && transportAmount > 0) {
            const transportAccount = await tx.customer.findUnique({
              where: { cus_id: transport.account_id }
            });
            
            if (transportAccount) {
              // Debit Transport Account
              await createLedgerEntry(tx, {
                cus_id: transport.account_id,
                opening_balance: transportAccount.cus_balance,
                debit_amount: transportAmount,
                credit_amount: 0,
                closing_balance: transportAccount.cus_balance + transportAmount,
                bill_no: sale.sale_id.toString(),
                trnx_type: 'CASH',
                details: `Transport Charges - ${bill_type || 'BILL'} - ${transport.description || 'Transport'}`,
                payments: 0,
                updated_by
              });

              // Credit Sundry Debtors Account
              if (specialAccounts.sundryDebtors) {
                await createLedgerEntry(tx, {
                  cus_id: specialAccounts.sundryDebtors.cus_id,
                  opening_balance: specialAccounts.sundryDebtors.cus_balance,
                  debit_amount: 0,
                  credit_amount: transportAmount,
                  closing_balance: specialAccounts.sundryDebtors.cus_balance - transportAmount,
                  bill_no: sale.sale_id.toString(),
                  trnx_type: 'CASH',
                  details: `Transport Charges - ${bill_type || 'BILL'} - Sundry Debtors`,
                  payments: 0,
                  updated_by
                });
              }

              // Update transport account balance
              await tx.customer.update({
                where: { cus_id: transport.account_id },
                data: {
                  cus_balance: {
                    increment: transportAmount
                  }
                }
              });

              // Update sundry debtors balance
              if (specialAccounts.sundryDebtors) {
                await tx.customer.update({
                  where: { cus_id: specialAccounts.sundryDebtors.cus_id },
                  data: {
                    cus_balance: {
                      decrement: transportAmount
                    }
                  }
                });
              }
            }
          }
        }
      }

      return sale;
    }, {
      timeout: 15000 // 15 seconds timeout for complex transactions
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    const errorMessage = error.message || 'Failed to create sale';

    // Provide more specific error messages for store_id column missing
    if (error.code === 'P2022' && error.message?.includes('store_id')) {
      return NextResponse.json({
        error: 'Database migration required: store_id column is missing',
        details: 'Please run the migration SQL to add store_id column to sales and sale_details tables.',
        instructions: [
          '1. Open phpMyAdmin or your MySQL client',
          '2. Select your database',
          '3. Go to SQL tab',
          '4. Run the SQL from ADD_STORE_ID_TO_SALES_SIMPLE.sql file',
          '5. After migration, run: npx prisma generate',
          '6. Restart your server'
        ],
        sql: `
ALTER TABLE \`sales\` ADD COLUMN \`store_id\` INT NULL AFTER \`cus_id\`;
ALTER TABLE \`sales\` ADD INDEX \`sales_store_id_fkey\` (\`store_id\`);
ALTER TABLE \`sales\` ADD CONSTRAINT \`sales_store_id_fkey\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`storeid\`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE \`sale_details\` ADD COLUMN \`store_id\` INT NULL AFTER \`sale_id\`;
ALTER TABLE \`sale_details\` ADD INDEX \`sale_details_store_id_fkey\` (\`store_id\`);
ALTER TABLE \`sale_details\` ADD CONSTRAINT \`sale_details_store_id_fkey\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`storeid\`) ON DELETE SET NULL ON UPDATE CASCADE;
        `.trim()
      }, { status: 500 });
    }

    return NextResponse.json({
      error: errorMessage,
      type: error.name || 'UnknownError',
      code: error.code || 'UNKNOWN'
    }, { status: 500 });
  }
}

// PUT - Update sale
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      cus_id,
      store_id, // Added store_id for multi-store functionality
      total_amount,
      discount,
      payment,
      payment_type,
      debit_account_id,
      credit_account_id,
      loader_id,
      shipping_amount,
      bill_type,
      reference,
      sale_details,
      split_payments,
      updated_by
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    // Calculate net total (including shipping amount)
    const netTotal = parseFloat(total_amount) - parseFloat(discount || 0) + parseFloat(shipping_amount || 0);

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get existing sale
      const existingSale = await tx.sale.findUnique({
        where: { sale_id: id },
        include: {
          sale_details: true
        }
      });

      if (!existingSale) {
        throw new Error('Sale not found');
      }

      // Get customer's current balance
      const customer = await tx.customer.findUnique({
        where: { cus_id }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Delete existing sale details
      await tx.saleDetail.deleteMany({
        where: { sale_id: id }
      });

      // Delete existing ledger entries for this sale
      await tx.ledger.deleteMany({
        where: { bill_no: id }
      });

      // Restore store stock quantities from old sale details
      if (existingSale.store_id) {
        const stockRestorePromises = existingSale.sale_details.map(async detail => {
          await updateStoreStock(existingSale.store_id, detail.pro_id, detail.qnty, 'increment', updated_by);
        });
        await Promise.all(stockRestorePromises);
      }

      // Update sale
      const sale = await tx.sale.update({
        where: { sale_id: id },
        data: {
          cus_id,
          store_id: store_id ? parseInt(store_id) : existingSale.store_id, // Update store_id if provided
          total_amount: parseFloat(total_amount),
          discount: parseFloat(discount || 0),
          payment: parseFloat(payment),
          payment_type,
          debit_account_id: debit_account_id || null,
          credit_account_id: credit_account_id || null,
          loader_id: loader_id || null,
          shipping_amount: parseFloat(shipping_amount || 0),
          bill_type: bill_type || 'BILL',
          reference: reference || null,
          updated_by
        }
      });

      // Create new sale details
      const finalStoreId = store_id ? parseInt(store_id) : existingSale.store_id;
      const saleDetailPromises = sale_details.map(detail => 
        tx.saleDetail.create({
          data: {
            sale_id: sale.sale_id,
            store_id: finalStoreId, // Added store_id
            pro_id: detail.pro_id,
            vehicle_no: detail.vehicle_no || null,
            qnty: parseInt(detail.qnty),
            unit: detail.unit,
            unit_rate: parseFloat(detail.unit_rate),
            total_amount: parseFloat(detail.total_amount),
            discount: parseFloat(detail.discount || 0),
            net_total: parseFloat(detail.total_amount) - parseFloat(detail.discount || 0),
            cus_id,
            updated_by
          }
        })
      );

      await Promise.all(saleDetailPromises);

      // Delete existing split payments
      await tx.splitPayment.deleteMany({
        where: { sale_id: id }
      });

      // Create new split payments if provided
      if (split_payments && split_payments.length > 0) {
        const splitPaymentPromises = split_payments.map(splitPayment => 
          tx.splitPayment.create({
            data: {
              sale_id: sale.sale_id,
              amount: parseFloat(splitPayment.amount),
              payment_type: splitPayment.payment_type,
              debit_account_id: splitPayment.debit_account_id || null,
              credit_account_id: splitPayment.credit_account_id || null,
              reference: splitPayment.reference || null
            }
          })
        );
        await Promise.all(splitPaymentPromises);
      }

      // Update store stock quantities - use new store_id if provided, otherwise use existing
      const finalStoreIdForStock = store_id ? parseInt(store_id) : existingSale.store_id;
      if (finalStoreIdForStock) {
        // Check stock availability before updating
        for (const detail of sale_details) {
          const hasStock = await checkStockAvailability(finalStoreIdForStock, detail.pro_id, parseInt(detail.qnty));
          if (!hasStock) {
            const currentStock = await getStoreStock(finalStoreIdForStock, detail.pro_id);
            throw new Error(`Insufficient stock for product ${detail.pro_id}. Available: ${currentStock}, Required: ${detail.qnty}`);
          }
        }
        
        const storeStockUpdatePromises = sale_details.map(async detail => {
          await updateStoreStock(finalStoreIdForStock, detail.pro_id, parseInt(detail.qnty), 'decrement', updated_by);
        });
        await Promise.all(storeStockUpdatePromises);
      }

      // Get special accounts
      const specialAccounts = await getSpecialAccounts(tx);

      // Create comprehensive ledger entries
      const ledgerEntries = [];
      
      // Calculate net amount owed by customer (total - payment received)
      const customerNetAmount = netTotal - parseFloat(payment);

      // 1. Customer Bill Entry - Debit Customer Account
      ledgerEntries.push({
          cus_id,
          opening_balance: customer.cus_balance,
          debit_amount: netTotal,
          credit_amount: 0,
          closing_balance: customer.cus_balance + netTotal,
          bill_no: sale.sale_id.toString(),
          trnx_type: 'CASH',
        details: `Sale Bill - ${bill_type || 'BILL'} - Customer Account (Debit)`,
          payments: 0,
          updated_by
      });

      // 2. Cash/Bank Account - CREDIT (when payment is received)
      if (parseFloat(payment) > 0) {

        // 3. Payment Entry - Debit Cash/Bank Account
        const paymentAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
        if (paymentAccount) {
          ledgerEntries.push({
            cus_id: paymentAccount.cus_id,
            opening_balance: paymentAccount.cus_balance,
            debit_amount: parseFloat(payment),
            credit_amount: 0,
            closing_balance: paymentAccount.cus_balance + parseFloat(payment),
            bill_no: sale.sale_id.toString(),
            trnx_type: payment_type,
            details: `Payment Received - ${bill_type || 'BILL'} - ${payment_type} Account (Debit)`,
            payments: parseFloat(payment),
            updated_by
          });
        }
      }

      // 4. Transporter Entry (if loader_id is provided)
      if (loader_id) {
        const loader = await tx.loader.findUnique({
          where: { loader_id }
        });

        if (loader) {
          // Debit Transporter Account
          ledgerEntries.push({
            cus_id: loader_id,
            opening_balance: loader.loader_balance,
            debit_amount: parseFloat(shipping_amount || 0),
            credit_amount: 0,
            closing_balance: loader.loader_balance + parseFloat(shipping_amount || 0),
            bill_no: sale.sale_id.toString(),
            trnx_type: 'CASH',
                details: `Transporter Charges - ${bill_type || 'BILL'} - Transport Account (Debit)`,
            payments: 0,
            updated_by
          });

          // Credit Sundry Debtors Account
          if (specialAccounts.sundryDebtors) {
            ledgerEntries.push({
              cus_id: specialAccounts.sundryDebtors.cus_id,
              opening_balance: specialAccounts.sundryDebtors.cus_balance,
              debit_amount: 0,
              credit_amount: parseFloat(shipping_amount || 0),
              closing_balance: specialAccounts.sundryDebtors.cus_balance - parseFloat(shipping_amount || 0),
              bill_no: sale.sale_id.toString(),
              trnx_type: 'CASH',
                  details: `Transporter Charges - ${bill_type || 'BILL'} - Sundry Debtors (Credit)`,
              payments: 0,
              updated_by
            });
          }
        }
      }

      // 5. Split Payment Entries (if any)
      if (split_payments && split_payments.length > 0) {
        for (const splitPayment of split_payments) {
          const splitAmount = parseFloat(splitPayment.amount);
          
          // Debit Split Payment Account
          if (splitPayment.debit_account_id) {
            const debitAccount = await tx.customer.findUnique({
              where: { cus_id: splitPayment.debit_account_id }
            });
            
            if (debitAccount) {
              ledgerEntries.push({
                cus_id: splitPayment.debit_account_id,
                opening_balance: debitAccount.cus_balance,
                debit_amount: splitAmount,
                credit_amount: 0,
                closing_balance: debitAccount.cus_balance + splitAmount,
                bill_no: sale.sale_id.toString(),
                trnx_type: splitPayment.payment_type,
                details: `Split Payment - ${bill_type || 'BILL'} - Debit Account`,
                payments: splitAmount,
                updated_by
              });
            }
          }

          // Credit Split Payment Account
          if (splitPayment.credit_account_id) {
            const creditAccount = await tx.customer.findUnique({
              where: { cus_id: splitPayment.credit_account_id }
            });
            
            if (creditAccount) {
              ledgerEntries.push({
                cus_id: splitPayment.credit_account_id,
                opening_balance: creditAccount.cus_balance,
                debit_amount: 0,
                credit_amount: splitAmount,
                closing_balance: creditAccount.cus_balance - splitAmount,
                bill_no: sale.sale_id.toString(),
                trnx_type: splitPayment.payment_type,
                details: `Split Payment - ${bill_type || 'BILL'} - Credit Account`,
                payments: splitAmount,
                updated_by
              });
            }
          }
        }
      }

      // Create all ledger entries
      for (const entry of ledgerEntries) {
        await createLedgerEntry(tx, entry);
      }

      // Update customer balance
      await tx.customer.update({
        where: { cus_id },
        data: {
          cus_balance: customer.cus_balance + netTotal - parseFloat(payment)
        }
      });

      // Update special account balances
      if (parseFloat(payment) > 0) {
        const paymentAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
        if (paymentAccount) {
          await tx.customer.update({
            where: { cus_id: paymentAccount.cus_id },
        data: {
          cus_balance: paymentAccount.cus_balance + parseFloat(payment)
        }
          });
        }
      }

      // Update transporter balance
      if (loader_id && parseFloat(shipping_amount || 0) > 0) {
        await tx.loader.update({
          where: { loader_id },
          data: {
            loader_balance: {
              increment: parseFloat(shipping_amount || 0)
            }
          }
        });
      }

      // Update sundry debtors balance
      if (loader_id && specialAccounts.sundryDebtors && parseFloat(shipping_amount || 0) > 0) {
        await tx.customer.update({
          where: { cus_id: specialAccounts.sundryDebtors.cus_id },
          data: {
            cus_balance: {
              decrement: parseFloat(shipping_amount || 0)
            }
          }
        });
      }

      // Update split payment account balances
      if (split_payments && split_payments.length > 0) {
        for (const splitPayment of split_payments) {
          const splitAmount = parseFloat(splitPayment.amount);
          
          if (splitPayment.debit_account_id) {
            await tx.customer.update({
              where: { cus_id: splitPayment.debit_account_id },
              data: {
                cus_balance: {
                  increment: splitAmount
                }
              }
            });
          }

          if (splitPayment.credit_account_id) {
            await tx.customer.update({
              where: { cus_id: splitPayment.credit_account_id },
              data: {
                cus_balance: {
                  decrement: splitAmount
                }
              }
            });
          }
        }
      }

      return sale;
    }, {
      timeout: 15000 // 15 seconds timeout for complex transactions
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
  }
}

// DELETE - Delete sale
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;

    if (!id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Get existing sale with details
      const existingSale = await tx.sale.findUnique({
        where: { sale_id: id },
        include: {
          sale_details: true
        }
      });

      if (!existingSale) {
        throw new Error('Sale not found');
      }

      // Restore store stock quantities
      if (existingSale.store_id) {
        const stockRestorePromises = existingSale.sale_details.map(async detail => {
          await updateStoreStock(existingSale.store_id, detail.pro_id, detail.qnty, 'increment', updated_by || null);
        });
        await Promise.all(stockRestorePromises);
      }

      // Delete ledger entries for this sale
      await tx.ledger.deleteMany({
        where: { bill_no: id }
      });

      // Delete sale details (cascade should handle this, but being explicit)
      await tx.saleDetail.deleteMany({
        where: { sale_id: id }
      });

      // Delete sale
      await tx.sale.delete({
        where: { sale_id: id }
      });
    }, {
      timeout: 15000 // 15 seconds timeout for complex transactions
    });

    return NextResponse.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}
