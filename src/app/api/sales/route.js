import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { updateStoreStock, getStoreStock, checkStockAvailability } from '@/lib/storeStock';
import { calculateClosingBalance, createLedgerEntry } from '@/lib/ledger-helper';
import { reportSaleCreation } from '@/lib/ledger-reporter';

// Helper function to get special accounts (moved outside transaction for better performance)
async function getSpecialAccounts() {
  const specialAccounts = await prisma.customer.findMany({
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

        // Log payment fields to verify they're being returned
        console.log('📤 API returning sale with payment fields:', {
          sale_id: sale.sale_id,
          cash_payment: sale.cash_payment,
          bank_payment: sale.bank_payment,
          bank_title: sale.bank_title,
          payment: sale.payment,
          payment_type: sale.payment_type
        });

        return NextResponse.json(sale);
      } catch (prismaError) {
        console.error('❌ Prisma error:', prismaError.code, prismaError.message);
        
        // Handle missing advance_payment column
        if (prismaError.code === 'P2022' && prismaError.message?.includes('advance_payment')) {
          return NextResponse.json({ 
            error: 'Database migration required: advance_payment column is missing',
            details: 'Please run the migration SQL to add advance_payment column to sales table.',
            sql: 'ALTER TABLE `sales` ADD COLUMN `advance_payment` DOUBLE NOT NULL DEFAULT 0 AFTER `bank_title`;'
          }, { status: 500 });
        }
        
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

          // Fetch sale_details separately - explicitly select columns to avoid datetime issues
          const saleDetails = await prisma.$queryRaw`
            SELECT 
              sd.sale_detail_id, sd.sale_id, sd.pro_id, sd.vehicle_no, 
              sd.qnty, sd.unit, sd.unit_rate, sd.total_amount, sd.discount, 
              sd.net_total, sd.cus_id,
              p.pro_title, p.pro_stock_qnty
            FROM sale_details sd
            LEFT JOIN products p ON sd.pro_id = p.pro_id
            WHERE sd.sale_id = ${id}
          `;

          // Fetch split_payments separately for this sale
          const splitPayments = await prisma.$queryRaw`
            SELECT 
              sp.split_payment_id, sp.sale_id, sp.amount, sp.payment_type,
              sp.debit_account_id, sp.credit_account_id, sp.reference,
              debit.cus_id as debit_cus_id, debit.cus_name as debit_cus_name,
              credit.cus_id as credit_cus_id, credit.cus_name as credit_cus_name
            FROM split_payments sp
            LEFT JOIN customers debit ON sp.debit_account_id = debit.cus_id
            LEFT JOIN customers credit ON sp.credit_account_id = credit.cus_id
            WHERE sp.sale_id = ${id}
          `;

          // Transform split_payments to match Prisma format
          const transformedSplitPayments = splitPayments.map(sp => ({
            split_payment_id: sp.split_payment_id,
            sale_id: sp.sale_id,
            amount: sp.amount,
            payment_type: sp.payment_type,
            debit_account_id: sp.debit_account_id,
            credit_account_id: sp.credit_account_id,
            reference: sp.reference,
            debit_account: sp.debit_account_id ? {
              cus_id: sp.debit_cus_id,
              cus_name: sp.debit_cus_name
            } : null,
            credit_account: sp.credit_account_id ? {
              cus_id: sp.credit_cus_id,
              cus_name: sp.credit_cus_name
            } : null
          }));

          const result = {
            ...sale[0],
            sale_details: saleDetails || [],
            split_payments: transformedSplitPayments || []
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
        // If datetime parsing error or store_id column doesn't exist, use raw SQL
        if (prismaError.code === 'P2020' || (prismaError.code === 'P2022' && prismaError.message?.includes('store_id'))) {
          console.warn('⚠️ Prisma error detected (P2020/P2022), using raw SQL fallback to avoid datetime parsing issues');
          try {
            const sales = await prisma.$queryRaw`
              SELECT 
                s.sale_id, s.total_amount, s.discount, s.payment, s.payment_type,
                s.cash_payment, s.bank_payment, s.bank_title, s.advance_payment,
                s.shipping_amount, s.bill_type, s.reference, s.cus_id, s.loader_id,
                s.debit_account_id, s.credit_account_id, s.store_id,
                CASE 
                  WHEN s.created_at IS NULL OR s.created_at = '0000-00-00 00:00:00' THEN NULL
                  ELSE DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s')
                END as created_at,
                CASE 
                  WHEN s.updated_at IS NULL OR s.updated_at = '0000-00-00 00:00:00' THEN NULL
                  ELSE DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i:%s')
                END as updated_at,
                c.cus_id as customer_cus_id, c.cus_name as customer_cus_name, 
                c.cus_phone_no as customer_cus_phone_no, c.cus_category as customer_cus_category,
                c.cus_type as customer_cus_type, c.cus_balance as customer_cus_balance,
                c.cus_address as customer_cus_address, c.cus_reference as customer_cus_reference
              FROM sales s
              LEFT JOIN customers c ON s.cus_id = c.cus_id
              WHERE s.created_at IS NOT NULL 
                AND s.created_at != '0000-00-00 00:00:00'
                AND YEAR(s.created_at) > 1970
              ORDER BY s.created_at DESC
            `;

            console.log('📊 Raw SQL sales count:', sales?.length || 0);
            console.log('📊 Raw SQL sales data:', JSON.stringify(sales?.slice(0, 2), null, 2));

            if (!sales || sales.length === 0) {
              console.warn('⚠️ No sales found in database');
              return NextResponse.json([]);
            }

            // Fetch sale_details for all sales
            const saleIds = sales.map(s => Number(s.sale_id)).filter(id => id != null && !isNaN(id));
            console.log('📊 Sale IDs to fetch details for:', saleIds);
            let saleDetails = [];
            if (saleIds.length > 0) {
              try {
                // Try with subcategories first - use Prisma.join for safe IN clause
                saleDetails = await prisma.$queryRaw`
                  SELECT 
                    sd.sale_detail_id, sd.sale_id, sd.pro_id, sd.vehicle_no, 
                    sd.qnty, sd.unit, sd.unit_rate, sd.total_amount, sd.discount, 
                    sd.net_total, sd.cus_id,
                    p.pro_title, p.pro_stock_qnty, 
                    cat.cat_name, sub.sub_cat_name
                  FROM sale_details sd
                  LEFT JOIN products p ON sd.pro_id = p.pro_id
                  LEFT JOIN categories cat ON p.cat_id = cat.cat_id
                  LEFT JOIN subcategories sub ON p.sub_cat_id = sub.sub_cat_id
                  WHERE sd.sale_id IN (${Prisma.join(saleIds)})
                `;
                console.log('📊 Sale details fetched:', saleDetails?.length || 0);
              } catch (subcatError) {
                // If subcategories table doesn't exist, try without it
                if (subcatError.message?.includes('subcategories') || subcatError.message?.includes("doesn't exist") || subcatError.code === '1146') {
                  console.warn('⚠️ subcategories table not found, fetching without it');
                  saleDetails = await prisma.$queryRaw`
                    SELECT 
                      sd.sale_detail_id, sd.sale_id, sd.pro_id, sd.vehicle_no, 
                      sd.qnty, sd.unit, sd.unit_rate, sd.total_amount, sd.discount, 
                      sd.net_total, sd.cus_id,
                      p.pro_title, p.pro_stock_qnty, 
                      cat.cat_name, NULL as sub_cat_name
                    FROM sale_details sd
                    LEFT JOIN products p ON sd.pro_id = p.pro_id
                    LEFT JOIN categories cat ON p.cat_id = cat.cat_id
                    WHERE sd.sale_id IN (${Prisma.join(saleIds)})
                  `;
                  console.log('📊 Sale details fetched (without subcategories):', saleDetails?.length || 0);
                } else {
                  console.error('❌ Error fetching sale details:', subcatError);
                  throw subcatError;
                }
              }
            }

            // Fetch customer categories for nested structure (optional - don't fail if this fails)
            const customerCategoryIds = [...new Set(sales.map(s => s.customer_cus_category).filter(id => id != null))];
            let customerCategories = [];
            const categoriesMap = {};

            if (customerCategoryIds.length > 0) {
              try {
                // Use correct column name: cus_cat_id - convert to numbers
                const numericCatIds = customerCategoryIds.map(id => Number(id)).filter(id => !isNaN(id));
                customerCategories = await prisma.$queryRaw`
                  SELECT cus_cat_id, cus_cat_title 
                  FROM customer_categories 
                  WHERE cus_cat_id IN (${Prisma.join(numericCatIds)})
                `;
                console.log('📊 Customer categories fetched:', customerCategories?.length || 0);

                // Map categories
                customerCategories.forEach(cat => {
                  const catId = cat.cus_cat_id;
                  if (catId) {
                    categoriesMap[catId] = {
                      cus_cat_id: cat.cus_cat_id,
                      cus_cat_title: cat.cus_cat_title
                    };
                  }
                });
              } catch (catError) {
                // Silently skip customer categories if there's an error - not critical for sales display
                console.warn('⚠️ Could not fetch customer categories (non-critical):', catError.message);
                // Continue without categories - sales will still work
              }
            }

            // Group sale_details by sale_id and format properly
            // Convert sale_ids to numbers for consistent matching
            const detailsBySaleId = {};
            if (saleDetails && saleDetails.length > 0) {
              saleDetails.forEach(detail => {
                const detailSaleId = Number(detail.sale_id);
                if (!detailsBySaleId[detailSaleId]) {
                  detailsBySaleId[detailSaleId] = [];
                }
                detailsBySaleId[detailSaleId].push({
                  sale_detail_id: detail.sale_detail_id ? Number(detail.sale_detail_id) : null,
                  sale_id: detailSaleId,
                  pro_id: detail.pro_id ? Number(detail.pro_id) : null,
                  vehicle_no: detail.vehicle_no,
                  qnty: detail.qnty ? Number(detail.qnty) : 0,
                  unit: detail.unit,
                  unit_rate: detail.unit_rate ? Number(detail.unit_rate) : 0,
                  total_amount: detail.total_amount ? Number(detail.total_amount) : 0,
                  discount: detail.discount ? Number(detail.discount) : 0,
                  net_total: detail.net_total ? Number(detail.net_total) : 0,
                  cus_id: detail.cus_id ? Number(detail.cus_id) : null,
                  product: detail.pro_title ? {
                    pro_id: detail.pro_id ? Number(detail.pro_id) : null,
                    pro_title: detail.pro_title,
                    pro_name: detail.pro_title, // Also include as pro_name for backward compatibility
                    pro_stock_qnty: detail.pro_stock_qnty ? Number(detail.pro_stock_qnty) : 0,
                    category: detail.cat_name ? { cat_name: detail.cat_name } : null,
                    sub_category: detail.sub_cat_name ? { sub_cat_name: detail.sub_cat_name } : null
                  } : null
                });
              });
            }

            // Fetch split_payments for all sales
            let splitPayments = [];
            const splitPaymentsBySaleId = {};
            if (saleIds.length > 0) {
              try {
                splitPayments = await prisma.$queryRaw`
                  SELECT 
                    sp.split_payment_id, sp.sale_id, sp.amount, sp.payment_type,
                    sp.debit_account_id, sp.credit_account_id, sp.reference,
                    debit.cus_id as debit_cus_id, debit.cus_name as debit_cus_name,
                    credit.cus_id as credit_cus_id, credit.cus_name as credit_cus_name
                  FROM split_payments sp
                  LEFT JOIN customers debit ON sp.debit_account_id = debit.cus_id
                  LEFT JOIN customers credit ON sp.credit_account_id = credit.cus_id
                  WHERE sp.sale_id IN (${Prisma.join(saleIds)})
                `;
                console.log('📊 Split payments fetched:', splitPayments?.length || 0);

                // Group split_payments by sale_id
                splitPayments.forEach(sp => {
                  const spSaleId = Number(sp.sale_id);
                  if (!splitPaymentsBySaleId[spSaleId]) {
                    splitPaymentsBySaleId[spSaleId] = [];
                  }
                  splitPaymentsBySaleId[spSaleId].push({
                    split_payment_id: sp.split_payment_id ? Number(sp.split_payment_id) : null,
                    sale_id: spSaleId,
                    amount: Number(sp.amount) || 0,
                    payment_type: sp.payment_type,
                    debit_account_id: sp.debit_account_id ? Number(sp.debit_account_id) : null,
                    credit_account_id: sp.credit_account_id ? Number(sp.credit_account_id) : null,
                    reference: sp.reference,
                    debit_account: sp.debit_account_id ? {
                      cus_id: Number(sp.debit_cus_id),
                      cus_name: sp.debit_cus_name
                    } : null,
                    credit_account: sp.credit_account_id ? {
                      cus_id: Number(sp.credit_cus_id),
                      cus_name: sp.credit_cus_name
                    } : null
                  });
                });
              } catch (splitError) {
                console.warn('⚠️ Could not fetch split_payments (non-critical):', splitError.message);
                // Continue without split_payments - sales will still work
              }
            }

            // Format sales to match Prisma structure
            const result = sales.map(sale => {
              const saleIdNum = Number(sale.sale_id);
              // Handle BigInt values (like sale_id, total_amount) by converting to Number
              const formattedSale = {
                sale_id: saleIdNum,
                total_amount: Number(sale.total_amount) || 0,
                discount: Number(sale.discount) || 0,
                payment: Number(sale.payment) || 0,
                payment_type: sale.payment_type,
                cash_payment: Number(sale.cash_payment) || 0,
                bank_payment: Number(sale.bank_payment) || 0,
                bank_title: sale.bank_title || null,
                advance_payment: Number(sale.advance_payment) || 0,
                shipping_amount: Number(sale.shipping_amount) || 0,
                bill_type: sale.bill_type,
                reference: sale.reference,
                created_at: sale.created_at,
                updated_at: sale.updated_at,
                cus_id: sale.cus_id ? Number(sale.cus_id) : null,
                loader_id: sale.loader_id ? Number(sale.loader_id) : null,
                debit_account_id: sale.debit_account_id ? Number(sale.debit_account_id) : null,
                credit_account_id: sale.credit_account_id ? Number(sale.credit_account_id) : null,
                customer: sale.customer_cus_name ? {
                  cus_id: Number(sale.customer_cus_id),
                  cus_name: sale.customer_cus_name,
                  cus_phone_no: sale.customer_cus_phone_no,
                  cus_category: sale.customer_cus_category ? Number(sale.customer_cus_category) : null,
                  cus_type: sale.customer_cus_type ? Number(sale.customer_cus_type) : null,
                  cus_balance: Number(sale.customer_cus_balance) || 0,
                  cus_address: sale.customer_cus_address,
                  cus_reference: sale.customer_cus_reference,
                  customer_category: sale.customer_cus_category && categoriesMap[sale.customer_cus_category] ? {
                    cus_cat_id: categoriesMap[sale.customer_cus_category].cus_cat_id || categoriesMap[sale.customer_cus_category].cus_category_id,
                    cus_cat_title: categoriesMap[sale.customer_cus_category].cus_cat_title || categoriesMap[sale.customer_cus_category].title
                  } : null
                } : null,
                sale_details: detailsBySaleId[saleIdNum] || [],
                loader: null,
                debit_account: null,
                credit_account: null,
                split_payments: splitPaymentsBySaleId[saleIdNum] || []
              };
              return formattedSale;
            });

            if (result.length > 0) {
              console.log('📊 Sample formatted sale:', JSON.stringify(result[0], null, 2));
              console.log('📊 Sample sale keys:', Object.keys(result[0]));
              console.log('📊 Sample sale customer:', result[0].customer);
            }

            console.log('✅ Formatted sales result count:', result.length);
            console.log('✅ Response ready to send');
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
      cash_payment,
      bank_payment,
      bank_title,
      advance_payment, // Added advance_payment field
      debit_account_id,
      credit_account_id,
      loader_id,
      shipping_amount,
      bill_type,
      reference,
      sale_details,
      transport_details,
      split_payments,
      is_loaded_order, // Flag to indicate if this is a loaded order
      updated_by
    } = body;

    // Validate required fields
    console.log('🔍 Sales API - Validating fields:', { cus_id, store_id, total_amount, payment, sale_details });
    console.log('💰💰💰 SPLIT PAYMENTS IN REQUEST:', split_payments);
    console.log('💰💰💰 SPLIT PAYMENTS TYPE:', typeof split_payments);
    console.log('💰💰💰 SPLIT PAYMENTS IS ARRAY:', Array.isArray(split_payments));
    console.log('💰💰💰 SPLIT PAYMENTS LENGTH:', split_payments?.length);

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

    // Check if this is a quotation or order (skip stock check for quotations and orders)
    const isQuotation = bill_type === 'QUOTATION';

    // Stock validation removed - allow negative stock
    // if (!isQuotation) {
    // for (const detail of sale_details) {
    //   const hasStock = await checkStockAvailability(store_id, detail.pro_id, parseInt(detail.qnty));
    //   if (!hasStock) {
    //     const currentStock = await getStoreStock(store_id, detail.pro_id);
    //     return NextResponse.json({ 
    //       error: `Insufficient stock for product ${detail.pro_id}. Available: ${currentStock}, Required: ${detail.qnty}` 
    //     }, { status: 400 });
    //     }
    //   }
    // }

    // Get special accounts BEFORE transaction (for better performance)
    const specialAccounts = isQuotation ? null : await getSpecialAccounts();

    // Detect if this is a loaded order (order being converted to sale)
    // Check: (1) explicit flag, or (2) reference contains "Converted from Order"
    const actualIsLoadedOrder = is_loaded_order || (reference && reference.includes('Converted from Order'));
    
    console.log(`\n🔍 SALE/ORDER CREATION DEBUG:`);
    console.log(`   is_loaded_order flag: ${is_loaded_order}`);
    console.log(`   reference: ${reference}`);
    console.log(`   actualIsLoadedOrder: ${actualIsLoadedOrder}`);
    console.log(`   bill_type: ${bill_type}`);
    console.log(`   Customer ID: ${cus_id}`);

    // Use transaction to ensure data consistency with increased timeout (30 seconds)
    const result = await prisma.$transaction(async (tx) => {
      // Get customer's current balance
      const customer = await tx.customer.findUnique({
        where: { cus_id }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      console.log(`   Customer name: ${customer.cus_name}`);

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
            cash_payment: parseFloat(cash_payment || 0),
            bank_payment: parseFloat(bank_payment || 0),
            bank_title: bank_title || null,
            advance_payment: parseFloat(advance_payment || 0),
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
              cash_payment, bank_payment, bank_title, advance_payment,
              debit_account_id, credit_account_id, loader_id, shipping_amount,
              bill_type, reference, updated_by, created_at, updated_at
            ) VALUES (
              ${cus_id}, ${parseFloat(total_amount)}, ${parseFloat(discount || 0)},
              ${parseFloat(payment)}, ${payment_type},
              ${parseFloat(cash_payment || 0)}, ${parseFloat(bank_payment || 0)}, ${bank_title || null},
              ${parseFloat(advance_payment || 0)},
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
      console.log('💰 Split payments received:', split_payments);
      console.log('💰 Split payments length:', split_payments?.length);

      if (split_payments && split_payments.length > 0) {
        console.log('✅ Creating split payments for sale:', sale.sale_id);

        const splitPaymentPromises = split_payments.map((splitPayment, index) => {
          console.log(`   Split payment ${index + 1}:`, {
            amount: splitPayment.amount,
            type: splitPayment.payment_type,
            debit_account_id: splitPayment.debit_account_id
          });

          return tx.splitPayment.create({
            data: {
              sale_id: sale.sale_id,
              amount: parseFloat(splitPayment.amount),
              payment_type: splitPayment.payment_type,
              debit_account_id: splitPayment.debit_account_id || null,
              credit_account_id: splitPayment.credit_account_id || null,
              reference: splitPayment.reference || null
            }
          });
        });

        const createdSplitPayments = await Promise.all(splitPaymentPromises);
        console.log('✅ Split payments created:', createdSplitPayments.length);
      } else {
        console.log('⚠️ No split payments to create - array is', split_payments === null ? 'NULL' : split_payments === undefined ? 'UNDEFINED' : 'EMPTY');
      }

      // isQuotation is already defined above (before transaction)
      // Update store stock quantities (instead of global product stock) - Skip for quotations
      if (!isQuotation && store_id) {
        const storeStockUpdatePromises = sale_details.map(async detail => {
          await updateStoreStock(store_id, detail.pro_id, parseInt(detail.qnty), 'decrement', updated_by);
        });
        await Promise.all(storeStockUpdatePromises);
      }

      // Special accounts already fetched before transaction
      // Create comprehensive ledger entries (only for non-quotations)
      const ledgerEntries = [];
      let runningBalance = customer.cus_balance;

      if (!isQuotation) {
        // 1. Customer Bill Entry - Debit Customer Account
        // For NEW sales: Debit full netTotal
        // For LOADED orders: Skip bill entry (already debited when order was created) - ONLY create payment entries
        
        if (!actualIsLoadedOrder) {
          console.log(`\n📝 CREATING BILL ENTRY (New Sale Mode)`);
          // New sale from scratch: Debit full netTotal
          const debitAmount = netTotal;
          
          if (debitAmount > 0) {
            const billEntry = createLedgerEntry({
              cus_id,
              opening_balance: runningBalance,
              debit_amount: debitAmount,
              credit_amount: 0,
              bill_no: sale.sale_id.toString(),
              trnx_type: 'CASH',
              details: `Sale Bill - ${bill_type || 'BILL'} - Customer Account (Debit)`,
              payments: 0,
              updated_by
            });
            console.log(`📝 Bill Entry Created: Opening=${billEntry.opening_balance}, Debit=${billEntry.debit_amount}, Closing=${billEntry.closing_balance}`);
            ledgerEntries.push(billEntry);
            runningBalance = billEntry.closing_balance;  // Update running balance
          }
        } else {
          console.log(`\n⏭️  SKIPPING BILL ENTRY (Loaded Order Mode - Already Debited)`);
        }

        // 2. Customer Payment Entry - Credit Customer Account (only cash + bank, NOT advance payment)
        const cashAndBankPayment = parseFloat(cash_payment || 0) + parseFloat(bank_payment || 0);
        if (cashAndBankPayment > 0) {
          console.log(`\n💳 CREATING PAYMENT ENTRY: Amount=${cashAndBankPayment}`);
          console.log(`   Opening Balance: ${runningBalance}`);
          // Build description with payment breakdown
          let paymentDescription = `Payment Received - ${bill_type || 'BILL'} - Customer Account (Credit)`;
          
          // Add split payment details if split payments exist
          if (split_payments && split_payments.length > 0 && (parseFloat(cash_payment || 0) > 0 || parseFloat(bank_payment || 0) > 0)) {
            const paymentBreakdown = [];
            if (parseFloat(cash_payment || 0) > 0) {
              paymentBreakdown.push(`Cash: ${parseFloat(cash_payment).toFixed(2)}`);
            }
            if (parseFloat(bank_payment || 0) > 0) {
              paymentBreakdown.push(`Bank: ${parseFloat(bank_payment).toFixed(2)}`);
            }
            if (paymentBreakdown.length > 0) {
              paymentDescription += ` | Split: ${paymentBreakdown.join(', ')}`;
            }
          }
          
          const paymentEntry = createLedgerEntry({
            cus_id,
            opening_balance: runningBalance,  // Use previous entry's closing
            debit_amount: 0,
            credit_amount: cashAndBankPayment,
            bill_no: sale.sale_id.toString(),
            trnx_type: payment_type || 'CASH',
            details: paymentDescription,
            payments: cashAndBankPayment,
            updated_by
          });
          console.log(`💳 Payment Entry Created: Opening=${paymentEntry.opening_balance}, Credit=${paymentEntry.credit_amount}, Closing=${paymentEntry.closing_balance}`);
          ledgerEntries.push(paymentEntry);
          runningBalance = paymentEntry.closing_balance;  // Update running balance
        }


        // 3. Cash Account - DEBIT (when cash payment is received)
        // When cash payment is received, cash account balance INCREASES (debit increases asset)
        if (parseFloat(cash_payment || 0) > 0 && specialAccounts.cash) {
          console.log(`💵 CASH PAYMENT DETECTED: ${cash_payment}`);
          console.log(`💵 Cash Account Before: ID=${specialAccounts.cash.cus_id}, Name=${specialAccounts.cash.cus_name}, Balance=${specialAccounts.cash.cus_balance}`);
          
          const cashEntry = createLedgerEntry({
            cus_id: specialAccounts.cash.cus_id,
            opening_balance: specialAccounts.cash.cus_balance,
            debit_amount: parseFloat(cash_payment),
            credit_amount: 0,
            bill_no: sale.sale_id.toString(),
            trnx_type: 'CASH',
            details: `Payment Received - ${bill_type || 'BILL'} - CASH Account (Debit)`,
            payments: parseFloat(cash_payment),
            updated_by
          });
          console.log(`💵 Cash Ledger Entry: Opening=${cashEntry.opening_balance}, Debit=${cashEntry.debit_amount}, Closing=${cashEntry.closing_balance}`);
          ledgerEntries.push(cashEntry);
        }

        // 4. Bank Account - DEBIT (when bank payment is received)
        // When bank payment is received, bank account balance INCREASES (debit increases asset)
        if (parseFloat(bank_payment || 0) > 0 && specialAccounts.bank) {
          console.log(`🏦 BANK PAYMENT DETECTED: ${bank_payment}`);
          console.log(`🏦 Bank Account Before: ID=${specialAccounts.bank.cus_id}, Name=${specialAccounts.bank.cus_name}, Balance=${specialAccounts.bank.cus_balance}`);
          
          const bankEntry = createLedgerEntry({
            cus_id: specialAccounts.bank.cus_id,
            opening_balance: specialAccounts.bank.cus_balance,
            debit_amount: parseFloat(bank_payment),
            credit_amount: 0,
            bill_no: sale.sale_id.toString(),
            trnx_type: 'BANK_TRANSFER',
            details: `Payment Received - ${bill_type || 'BILL'} - BANK Account (Debit)`,
            payments: parseFloat(bank_payment),
            updated_by
          });
          console.log(`🏦 Bank Ledger Entry: Opening=${bankEntry.opening_balance}, Debit=${bankEntry.debit_amount}, Closing=${bankEntry.closing_balance}`);
          ledgerEntries.push(bankEntry);
        }

        // 4. Transporter Entry (if loader_id is provided - skip for now as Loader is not a customer)
        // Transporter charges are handled separately and not part of ledger entries
        // if (loader_id) {
        //   // Skip transporter ledger entry as loaders are not customer accounts
        // }


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
                const splitDebitEntry = createLedgerEntry({
                  cus_id: splitPayment.debit_account_id,
                  opening_balance: debitAccount.cus_balance,
                  debit_amount: splitAmount,
                  credit_amount: 0,
                  bill_no: sale.sale_id.toString(),
                  trnx_type: splitPayment.payment_type,
                  details: `Split Payment - ${bill_type || 'BILL'} - Debit Account`,
                  payments: splitAmount,
                  updated_by
                });
                ledgerEntries.push(splitDebitEntry);
              }
            }

            // Credit Split Payment Account
            if (splitPayment.credit_account_id) {
              const creditAccount = await tx.customer.findUnique({
                where: { cus_id: splitPayment.credit_account_id }
              });

              if (creditAccount) {
                const splitCreditEntry = createLedgerEntry({
                  cus_id: splitPayment.credit_account_id,
                  opening_balance: creditAccount.cus_balance,
                  debit_amount: 0,
                  credit_amount: splitAmount,
                  bill_no: sale.sale_id.toString(),
                  trnx_type: splitPayment.payment_type,
                  details: `Split Payment - ${bill_type || 'BILL'} - Credit Account`,
                  payments: splitAmount,
                  updated_by
                });
                ledgerEntries.push(splitCreditEntry);
              }
            }
          }
        }

      // Create all ledger entries (skip for quotations)
      if (!isQuotation) {
        console.log(`\n📊 CREATING LEDGER ENTRIES IN DATABASE`);
        console.log(`   Total entries to create: ${ledgerEntries.length}`);
        
        for (let i = 0; i < ledgerEntries.length; i++) {
          const entry = ledgerEntries[i];
          console.log(`   Entry ${i + 1}: Customer=${entry.cus_id}, Debit=${entry.debit_amount}, Credit=${entry.credit_amount}, Details=${entry.details.substring(0, 50)}...`);
          
          await tx.ledger.create({
            data: {
              cus_id: entry.cus_id,
              opening_balance: entry.opening_balance,
              debit_amount: entry.debit_amount,
              credit_amount: entry.credit_amount,
              closing_balance: entry.closing_balance,
              bill_no: entry.bill_no,
              trnx_type: entry.trnx_type,
              details: entry.details,
              payments: entry.payments,
              updated_by: entry.updated_by
            }
          });
          console.log(`   ✅ Entry ${i + 1} created in database`);
        }
        console.log(`📊 All ${ledgerEntries.length} ledger entries created successfully\n`);
        
        // Update customer balance to match the LAST customer ledger entry's closing balance
        // Find the LAST entry where cus_id matches the customer being invoiced
        const customerLedgerEntries = ledgerEntries.filter(e => e.cus_id === cus_id);
        if (customerLedgerEntries.length > 0) {
          const lastCustomerEntry = customerLedgerEntries[customerLedgerEntries.length - 1];
          const ledgerClosingBalance = parseFloat(lastCustomerEntry.closing_balance);
          
          console.log(`\n========== CUSTOMER BALANCE UPDATE START ==========`);
          console.log(`Customer: ${customer.cus_name} (ID: ${cus_id})`);
          console.log(`Bill Type: ${bill_type}`);
          console.log(`Found ${customerLedgerEntries.length} ledger entries for customer`);
          console.log(`Setting balance to match last customer ledger closing: ${ledgerClosingBalance}`);
          
          await tx.customer.update({
            where: { cus_id },
            data: {
              cus_balance: ledgerClosingBalance
            }
          });
          console.log(`✅ CUSTOMER BALANCE UPDATED: ${customer.cus_name} balance set to ${ledgerClosingBalance}`);
          console.log(`========== CUSTOMER BALANCE UPDATE END ==========\n`);
        }
      }


        // Update cash account balance - SET directly to closing balance
        if (parseFloat(cash_payment || 0) > 0 && specialAccounts.cash) {
          // Find the cash account ledger entry to get its closing balance
          const cashLedgerEntry = ledgerEntries.find(e => e.cus_id === specialAccounts.cash.cus_id);
          if (cashLedgerEntry) {
            console.log(`💵 UPDATING CASH ACCOUNT: Setting balance from ledger closing balance ${cashLedgerEntry.closing_balance}`);
            
            await tx.customer.update({
              where: { cus_id: specialAccounts.cash.cus_id },
              data: {
                cus_balance: cashLedgerEntry.closing_balance
              }
            });
            console.log(`💵 CASH ACCOUNT UPDATED: Balance now = ${cashLedgerEntry.closing_balance}`);
          }
        }

        // Update bank account balance - SET directly to closing balance
        if (parseFloat(bank_payment || 0) > 0 && specialAccounts.bank) {
          // Find the bank account ledger entry to get its closing balance
          const bankLedgerEntry = ledgerEntries.find(e => e.cus_id === specialAccounts.bank.cus_id);
          if (bankLedgerEntry) {
            console.log(`🏦 UPDATING BANK ACCOUNT: Setting balance from ledger closing balance ${bankLedgerEntry.closing_balance}`);
            
            await tx.customer.update({
              where: { cus_id: specialAccounts.bank.cus_id },
              data: {
                cus_balance: bankLedgerEntry.closing_balance
              }
            });
            console.log(`🏦 BANK ACCOUNT UPDATED: Balance now = ${bankLedgerEntry.closing_balance}`);
          }
        }

        // Update transporter balance (skip for quotations)
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

        // Update sundry debtors balance (skip for quotations)
        if (loader_id && specialAccounts && specialAccounts.sundryDebtors && parseFloat(shipping_amount || 0) > 0) {
          await tx.customer.update({
            where: { cus_id: specialAccounts.sundryDebtors.cus_id },
            data: {
              cus_balance: {
                decrement: parseFloat(shipping_amount || 0)
              }
            }
          });
        }

        // Update split payment account balances (skip for quotations)
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

        // 6. Transport Entries (if any) - Skip for quotations
        if (transport_details && transport_details.length > 0) {
          for (const transport of transport_details) {
            const transportAmount = parseFloat(transport.amount);

            if (transport.account_id && transportAmount > 0) {
              const transportAccount = await tx.customer.findUnique({
                where: { cus_id: transport.account_id }
              });

              if (transportAccount) {
                // Debit Transport Account
                await tx.ledger.create({
                  data: {
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
                  }
                });

                // Credit Sundry Debtors Account
                if (specialAccounts.sundryDebtors) {
                  await tx.ledger.create({
                    data: {
                      cus_id: specialAccounts.sundryDebtors.cus_id,
                      opening_balance: specialAccounts.sundryDebtors.cus_balance,
                      debit_amount: 0,
                      credit_amount: transportAmount,
                      closing_balance: specialAccounts.sundryDebtors.cus_balance - transportAmount,
                      bill_no: sale.sale_id.toString(),
                      trnx_type: 'CASH',
                      details: `Transport Charges - ${bill_type || 'BILL'} - Sundry Debtors`,
                      payments: 0,
                      updated_by: updated_by
                    }
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

      } // End of if (!isQuotation) for all financial transactions

      return sale;
    }, {
      timeout: 120000 // 120 seconds (2 minutes) timeout for complex transactions with ledger entries
    });

    // Generate comprehensive ledger report for this sale
    const updatedCustomer = await prisma.customer.findUnique({
      where: { cus_id }
    });

    const ledgerEntriesForReport = await prisma.ledger.findMany({
      where: { bill_no: result.sale_id.toString() }
    });

    reportSaleCreation({
      transactionType: 'SALE',
      saleId: result.sale_id,
      customerId: cus_id,
      customerName: updatedCustomer?.cus_name,
      previousBalance: parseFloat(updatedCustomer?.cus_balance || 0) - parseFloat(netTotal) + parseFloat(payment),
      netTotal: netTotal,
      totalAmount: parseFloat(total_amount),
      discount: parseFloat(discount || 0),
      shippingAmount: parseFloat(shipping_amount || 0),
      paymentReceived: parseFloat(payment),
      cashPayment: parseFloat(cash_payment || 0),
      bankPayment: parseFloat(bank_payment || 0),
      advancePayment: parseFloat(advance_payment || 0),
      newBalance: parseFloat(updatedCustomer?.cus_balance || 0),
      ledgerEntries: ledgerEntriesForReport,
      billType: bill_type || 'BILL',
      specialAccounts: specialAccounts || {}
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

    // Determine if this update is for a quotation (skip finance/stock)
    const isQuotationFromBody = bill_type === 'QUOTATION';

    // Get special accounts BEFORE transaction (for better performance)
    const specialAccounts = isQuotationFromBody ? null : await getSpecialAccounts();

    // Use transaction to ensure data consistency with increased timeout (30 seconds)
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

      // Delete existing ledger entries for this sale (cleanup if previously generated)
      await tx.ledger.deleteMany({
        where: { bill_no: id ? String(id) : null }
      });

      // Restore store stock quantities from old sale details
      // CRITICAL FIX: Only restore stock if the previous bill was NOT a quotation or order (since those didn't deduct stock)
      const wasStockDeducted = existingSale.bill_type !== 'QUOTATION' && existingSale.bill_type !== 'ORDER';

      if (existingSale.store_id && wasStockDeducted) {
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

      // Update store stock quantities - skip for quotations/orders
      const finalStoreIdForStock = store_id ? parseInt(store_id) : existingSale.store_id;

      // CRITICAL FIX: Determine if new bill type requires stock deduction
      const isNewBillQuotationOrOrder = bill_type === 'QUOTATION' || bill_type === 'ORDER';

      if (!isNewBillQuotationOrOrder && finalStoreIdForStock) {
        // Stock validation removed - allow negative stock
        // for (const detail of sale_details) {
        //   const hasStock = await checkStockAvailability(finalStoreIdForStock, detail.pro_id, parseInt(detail.qnty));
        //   if (!hasStock) {
        //     const currentStock = await getStoreStock(finalStoreIdForStock, detail.pro_id);
        //     throw new Error(`Insufficient stock for product ${detail.pro_id}. Available: ${currentStock}, Required: ${detail.qnty}`);
        //   }
        // }

        const storeStockUpdatePromises = sale_details.map(async detail => {
          await updateStoreStock(finalStoreIdForStock, detail.pro_id, parseInt(detail.qnty), 'decrement', updated_by);
        });
        await Promise.all(storeStockUpdatePromises);
      }

      // Special accounts already fetched before transaction
      // Create comprehensive ledger entries (skip for quotations)
      const ledgerEntries = [];

      // Calculate net amount owed by customer (total - payment received)
      const customerNetAmount = netTotal - parseFloat(payment);

      // 1. Customer Bill Entry - Debit Customer Account (skip for quotations)
      if (!isNewBillQuotationOrOrder) {
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
      }

      // 2. Customer Payment Entry - Credit Customer Account (skip for quotations)
      if (!isNewBillQuotationOrOrder && parseFloat(payment) > 0) {
        ledgerEntries.push({
          cus_id,
          opening_balance: customer.cus_balance + netTotal,
          debit_amount: 0,
          credit_amount: parseFloat(payment),
          closing_balance: customer.cus_balance + netTotal - parseFloat(payment),
          bill_no: sale.sale_id.toString(),
          trnx_type: payment_type || 'CASH',
          details: `Payment Received - ${bill_type || 'BILL'} - Customer Account (Credit)`,
          payments: parseFloat(payment),
          updated_by
        });

        // 3. Payment Entry - Credit Cash/Bank Account (payment received reduces cash/bank balance)
        const paymentAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
        if (paymentAccount) {
          ledgerEntries.push({
            cus_id: paymentAccount.cus_id,
            opening_balance: paymentAccount.cus_balance,
            debit_amount: 0,
            credit_amount: parseFloat(payment),
            closing_balance: paymentAccount.cus_balance - parseFloat(payment),
            bill_no: sale.sale_id.toString(),
            trnx_type: payment_type,
            details: `Payment Received - ${bill_type || 'BILL'} - ${payment_type} Account (Credit)`,
            payments: parseFloat(payment),
            updated_by
          });
        }
      }

      // 4. Transporter Entry (if loader_id is provided)
      if (!isQuotation && loader_id) {
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
          if (specialAccounts && specialAccounts.sundryDebtors) {
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
      if (!isQuotation && split_payments && split_payments.length > 0) {
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

      // Create all ledger entries and update balances (skip for quotations)
      if (!isQuotation) {
        for (const entry of ledgerEntries) {
          await tx.ledger.create({
            data: {
              cus_id: entry.cus_id,
              opening_balance: entry.opening_balance,
              debit_amount: entry.debit_amount,
              credit_amount: entry.credit_amount,
              closing_balance: entry.closing_balance,
              bill_no: entry.bill_no,
              trnx_type: entry.trnx_type,
              details: entry.details,
              payments: entry.payments,
              updated_by: entry.updated_by
            }
          });
        }

        // Update customer balance (skip for quotations)
        const currentBalance = parseFloat(customer.cus_balance) || 0;
        const newBalance = currentBalance + parseFloat(netTotal) - parseFloat(payment);

        await tx.customer.update({
          where: { cus_id },
          data: {
            cus_balance: newBalance
          }
        });
      }

      // Update special account balances
      if (!isQuotation && parseFloat(payment) > 0) {
        const paymentAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
        if (paymentAccount) {
          const accountCurrentBalance = parseFloat(paymentAccount.cus_balance) || 0;
          const accountNewBalance = accountCurrentBalance + parseFloat(payment);

          await tx.customer.update({
            where: { cus_id: paymentAccount.cus_id },
            data: {
              cus_balance: accountNewBalance
            }
          });
        }
      }

      // Update transporter balance
      if (!isQuotation && loader_id && parseFloat(shipping_amount || 0) > 0) {
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
      if (!isQuotation && loader_id && specialAccounts && specialAccounts.sundryDebtors && parseFloat(shipping_amount || 0) > 0) {
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
      if (!isQuotation && split_payments && split_payments.length > 0) {
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
      timeout: 120000 // 120 seconds (2 minutes) timeout for complex transactions with ledger entries
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
      // Only restore if it wasn't a QUOTATION or ORDER (which don't deduct stock)
      const shouldRestoreStock = existingSale.bill_type !== 'QUOTATION' && existingSale.bill_type !== 'ORDER';

      if (existingSale.store_id && shouldRestoreStock) {
        const stockRestorePromises = existingSale.sale_details.map(async detail => {
          await updateStoreStock(existingSale.store_id, detail.pro_id, detail.qnty, 'increment', updated_by || null);
        });
        await Promise.all(stockRestorePromises);
      }

      // Delete ledger entries for this sale
      await tx.ledger.deleteMany({
        where: { bill_no: id ? String(id) : null }
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
      timeout: 120000 // 120 seconds (2 minutes) timeout for complex transactions with ledger entries
    });

    return NextResponse.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}
