import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper for JSON errors
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// GET — Get all or one customer
// ========================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // optional: ?id=1

  try {
    if (id) {
      // Get single customer with category details
      const customer = await prisma.customer.findUnique({
        where: { cus_id: id },
        include: {
          customer_category: {
            select: {
              cus_cat_id: true,
              cus_cat_title: true
            }
          }
        },
      });

      if (!customer)
        return errorResponse('Customer not found', 404);

      return NextResponse.json(customer);
    }

    // Get all customers with category details
    const customers = await prisma.customer.findMany({
      include: {
        customer_category: {
          select: {
            cus_cat_id: true,
            cus_cat_title: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(customers);
  } catch (err) {
    console.error('❌ Error fetching customers:', err);
    return errorResponse('Failed to fetch customers', 500);
  }
}

// ========================================
// POST — Create a new customer
// ========================================
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      cus_category,
      cus_type,
      cus_name,
      cus_phone_no,
      cus_phone_no2,
      cus_address,
      cus_reference,
      cus_account_info,
      other,
      cus_balance
    } = body;

    // Validation for required fields
    if (!cus_category || cus_category.trim() === '')
      return errorResponse('Customer category is required');
    
    if (!cus_type)
      return errorResponse('Customer type is required');
    
    if (!cus_name || cus_name.trim() === '')
      return errorResponse('Customer name is required');
    
    if (!cus_phone_no || cus_phone_no.trim() === '')
      return errorResponse('Primary phone number is required');
    
    if (!cus_address || cus_address.trim() === '')
      return errorResponse('Customer address is required');

    // Validate customer type enum
    const validTypes = ['RETAIL', 'WHOLESALE', 'CORPORATE'];
    if (!validTypes.includes(cus_type))
      return errorResponse('Invalid customer type. Must be RETAIL, WHOLESALE, or CORPORATE');

    // Check if customer category exists
    const categoryExists = await prisma.customerCategory.findUnique({
      where: { cus_cat_id: cus_category }
    });

    if (!categoryExists)
      return errorResponse('Customer category not found', 404);

    // Check for duplicate phone number (primary phone)
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        cus_phone_no: cus_phone_no.trim(),
      },
    });

    if (existingCustomer)
      return errorResponse('Customer with this phone number already exists', 409);

    // Create new customer
    const newCustomer = await prisma.customer.create({
      data: {
        cus_category: cus_category.trim(),
        cus_type: cus_type,
        cus_name: cus_name.trim(),
        cus_phone_no: cus_phone_no.trim(),
        cus_phone_no2: cus_phone_no2?.trim() || null,
        cus_address: cus_address.trim(),
        cus_reference: cus_reference?.trim() || null,
        cus_account_info: cus_account_info?.trim() || null,
        other: other?.trim() || null,
        cus_balance: cus_balance ? parseFloat(cus_balance) : 0,
      },
      include: {
        customer_category: {
          select: {
            cus_cat_id: true,
            cus_cat_title: true
          }
        }
      }
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (err) {
    console.error('❌ Error creating customer:', err);
    return errorResponse('Failed to create customer', 500);
  }
}

// ========================================
// PUT — Update an existing customer
// ========================================
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      cus_category,
      cus_type,
      cus_name,
      cus_phone_no,
      cus_phone_no2,
      cus_address,
      cus_reference,
      cus_account_info,
      other,
      cus_balance
    } = body;

    if (!id) return errorResponse('Customer ID is required');

    // Validation for required fields
    if (!cus_category || cus_category.trim() === '')
      return errorResponse('Customer category is required');
    
    if (!cus_type)
      return errorResponse('Customer type is required');
    
    if (!cus_name || cus_name.trim() === '')
      return errorResponse('Customer name is required');
    
    if (!cus_phone_no || cus_phone_no.trim() === '')
      return errorResponse('Primary phone number is required');
    
    if (!cus_address || cus_address.trim() === '')
      return errorResponse('Customer address is required');

    // Validate customer type enum
    const validTypes = ['RETAIL', 'WHOLESALE', 'CORPORATE'];
    if (!validTypes.includes(cus_type))
      return errorResponse('Invalid customer type. Must be RETAIL, WHOLESALE, or CORPORATE');

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { cus_id: id },
    });

    if (!existing)
      return errorResponse('Customer not found', 404);

    // Check if customer category exists
    const categoryExists = await prisma.customerCategory.findUnique({
      where: { cus_cat_id: cus_category }
    });

    if (!categoryExists)
      return errorResponse('Customer category not found', 404);

    // Check for duplicate phone number (excluding current customer)
    const duplicatePhone = await prisma.customer.findFirst({
      where: {
        cus_phone_no: cus_phone_no.trim(),
        NOT: { cus_id: id },
      },
    });

    if (duplicatePhone)
      return errorResponse('Customer with this phone number already exists', 409);

    // Update customer
    const updated = await prisma.customer.update({
      where: { cus_id: id },
      data: {
        cus_category: cus_category.trim(),
        cus_type: cus_type,
        cus_name: cus_name.trim(),
        cus_phone_no: cus_phone_no.trim(),
        cus_phone_no2: cus_phone_no2?.trim() || null,
        cus_address: cus_address.trim(),
        cus_reference: cus_reference?.trim() || null,
        cus_account_info: cus_account_info?.trim() || null,
        other: other?.trim() || null,
        cus_balance: cus_balance ? parseFloat(cus_balance) : existing.cus_balance,
      },
      include: {
        customer_category: {
          select: {
            cus_cat_id: true,
            cus_cat_title: true
          }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('❌ Error updating customer:', err);
    return errorResponse('Failed to update customer', 500);
  }
}

// ========================================
// DELETE — Delete a customer
// ========================================
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // /api/customers?id=1

  if (!id)
    return errorResponse('Customer ID is required');

  try {
    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { cus_id: id },
    });

    if (!existing)
      return errorResponse('Customer not found', 404);

    // Check if customer has any related records (sales, purchases, etc.)
    const hasRelatedRecords = await prisma.$transaction(async (tx) => {
      const sales = await tx.sale.count({ where: { cus_id: id } });
      const purchases = await tx.purchase.count({ where: { cus_id: id } });
      const ledger = await tx.ledger.count({ where: { cus_id: id } });
      
      return sales > 0 || purchases > 0 || ledger > 0;
    });

    if (hasRelatedRecords)
      return errorResponse('Cannot delete customer with existing transactions. Please archive instead.', 409);

    // Delete customer
    await prisma.customer.delete({
      where: { cus_id: id },
    });

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting customer:', err);
    return errorResponse('Failed to delete customer', 500);
  }
}
