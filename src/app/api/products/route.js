import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper for JSON errors
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// GET — Get all products with relational data
// ========================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const categoryId = searchParams.get('categoryId');
    const subCategoryId = searchParams.get('subCategoryId');

    if (id) {
      // Get single product
      const product = await prisma.product.findUnique({
        where: { pro_id: id },
        include: {
          category: {
            select: {
              cat_id: true,
              cat_name: true,
              cat_code: true
            }
          },
          sub_category: {
            select: {
              sub_cat_id: true,
              sub_cat_name: true,
              sub_cat_code: true
            }
          },
          updated_by_user: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              role: true
            }
          }
        },
      });

      if (!product) return errorResponse('Product not found', 404);
      return NextResponse.json(product);
    }

    // Build where clause for filtering
    let whereClause = {};
    if (categoryId) whereClause.cat_id = categoryId;
    if (subCategoryId) whereClause.sub_cat_id = subCategoryId;

    // Get all products with relational data
    try {
      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              cat_id: true,
              cat_name: true,
              cat_code: true
            }
          },
          sub_category: {
            select: {
              sub_cat_id: true,
              sub_cat_name: true,
              sub_cat_code: true
            }
          },
          updated_by_user: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
      });

      return NextResponse.json(products);
    } catch (includeError) {
      console.error('❌ Error with include:', includeError);
      // Fallback to simple query
      const products = await prisma.product.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
      });
      return NextResponse.json(products);
    }
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    return NextResponse.json([]);
  }
}

// ========================================
// POST — Create a new product
// ========================================
export async function POST(request) {
  try {
    console.log('✅ POST method called');
    
    const body = await request.json();
    console.log('✅ Request body received');
    
    // Simple validation
    if (!body.pro_title?.trim()) return errorResponse('Product title is required');
    
    // Get or create user
    let user = await prisma.users.findFirst();
    if (!user) {
      user = await prisma.users.create({
        data: {
          email: 'admin@example.com',
          full_name: 'System Administrator',
          password: 'hashedpassword',
          role: 'ADMIN',
          is_verified: true,
          status: 'ACTIVE'
        }
      });
    }

    // Validation for required fields
    if (!body.cat_id) return errorResponse('Category is required');
    if (!body.sub_cat_id) return errorResponse('Subcategory is required');

    // Verify category and subcategory exist
    const category = await prisma.categories.findUnique({
      where: { cat_id: body.cat_id }
    });
    if (!category) return errorResponse('Invalid category selected');

    const subcategory = await prisma.subCategory.findUnique({
      where: { sub_cat_id: body.sub_cat_id }
    });
    if (!subcategory) return errorResponse('Invalid subcategory selected');

    // Verify subcategory belongs to the selected category
    if (subcategory.cat_id !== body.cat_id) {
      return errorResponse('Selected subcategory does not belong to the selected category');
    }

    // Create new product with provided data
    const newProduct = await prisma.product.create({
      data: {
        cat_id: body.cat_id,
        sub_cat_id: body.sub_cat_id,
        pro_title: body.pro_title.trim(),
        pro_description: body.pro_description?.trim() || '',
        pro_cost_price: parseFloat(body.pro_cost_price) || 0,
        pro_sale_price: parseFloat(body.pro_sale_price) || 0,
        pro_baser_price: parseFloat(body.pro_baser_price) || 0,
        pro_stock_qnty: parseInt(body.pro_stock_qnty) || 0,
        pro_unit: body.pro_unit?.trim() || 'pcs',
        pro_packing: body.pro_packing?.trim() || null,
        updated_by: user.user_id,
      }
    });

    console.log('✅ Product created successfully');
    return NextResponse.json(newProduct, { status: 201 });
  } catch (err) {
    console.error('❌ Error creating product:', err);
    return errorResponse('Failed to create product', 500);
  }
}

// ========================================
// PUT — Update a product
// ========================================
export async function PUT(request) {
  try {
    const body = await request.json();
    
    if (!body.id) return errorResponse('Product ID is required');

    // Get or create user
    let user = await prisma.users.findFirst();
    if (!user) {
      user = await prisma.users.create({
        data: {
          email: 'admin@example.com',
          full_name: 'System Administrator',
          password: 'hashedpassword',
          role: 'ADMIN',
          is_verified: true,
          status: 'ACTIVE'
        }
      });
    }

    // Prepare update data
    const updateData = {
      pro_title: body.pro_title?.trim(),
      pro_description: body.pro_description?.trim(),
      pro_cost_price: body.pro_cost_price ? parseFloat(body.pro_cost_price) : undefined,
      pro_sale_price: body.pro_sale_price ? parseFloat(body.pro_sale_price) : undefined,
      pro_baser_price: body.pro_baser_price ? parseFloat(body.pro_baser_price) : undefined,
      pro_stock_qnty: body.pro_stock_qnty ? parseInt(body.pro_stock_qnty) : undefined,
      pro_unit: body.pro_unit?.trim(),
      pro_packing: body.pro_packing?.trim(),
      updated_by: user.user_id,
    };

    // Handle category and subcategory updates if provided
    if (body.cat_id && body.sub_cat_id) {
      // Verify category and subcategory exist
      const category = await prisma.categories.findUnique({
        where: { cat_id: body.cat_id }
      });
      if (!category) return errorResponse('Invalid category selected');

      const subcategory = await prisma.subCategory.findUnique({
        where: { sub_cat_id: body.sub_cat_id }
      });
      if (!subcategory) return errorResponse('Invalid subcategory selected');

      // Verify subcategory belongs to the selected category
      if (subcategory.cat_id !== body.cat_id) {
        return errorResponse('Selected subcategory does not belong to the selected category');
      }

      updateData.cat_id = body.cat_id;
      updateData.sub_cat_id = body.sub_cat_id;
    }

    const updatedProduct = await prisma.product.update({
      where: { pro_id: body.id },
      data: updateData,
      include: {
        category: {
          select: {
            cat_id: true,
            cat_name: true,
            cat_code: true
          }
        },
        sub_category: {
          select: {
            sub_cat_id: true,
            sub_cat_name: true,
            sub_cat_code: true
          }
        },
        updated_by_user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(updatedProduct);
  } catch (err) {
    console.error('❌ Error updating product:', err);
    return errorResponse('Failed to update product', 500);
  }
}

// ========================================
// DELETE — Delete a product
// ========================================
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return errorResponse('Product ID is required');

  try {
    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { pro_id: id },
      include: {
        _count: {
          select: {
            sale_details: true,
            purchase_details: true
          }
        }
      }
    });

    if (!existing) return errorResponse('Product not found', 404);

    // Check if product has related records
    if (existing._count.sale_details > 0) {
      return errorResponse('Cannot delete product with existing sales. Please archive instead.', 409);
    }
    if (existing._count.purchase_details > 0) {
      return errorResponse('Cannot delete product with existing purchases. Please archive instead.', 409);
    }

    // Delete product
    await prisma.product.delete({
      where: { pro_id: id },
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting product:', err);
    return errorResponse('Failed to delete product', 500);
  }
}