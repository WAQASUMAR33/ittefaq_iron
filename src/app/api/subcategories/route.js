import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper for JSON errors
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// GET — Get all or one subcategory
// ========================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // optional: ?id=1
  const categoryId = searchParams.get('categoryId'); // optional: ?categoryId=1

  try {
    if (id) {
      // Get single subcategory with category details
      const subcategory = await prisma.subCategory.findUnique({
        where: { sub_cat_id: id },
        include: {
          category: {
            select: {
              cat_id: true,
              cat_name: true,
              cat_code: true
            }
          },
          _count: {
            select: {
              products: true
            }
          }
        },
      });

      if (!subcategory)
        return errorResponse('Subcategory not found', 404);

      return NextResponse.json(subcategory);
    }

    // Build where clause for filtering
    let whereClause = {};
    if (categoryId) {
      whereClause.cat_id = categoryId;
    }

    // Get all subcategories with category details
    const subcategories = await prisma.subCategory.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            cat_id: true,
            cat_name: true,
            cat_code: true
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(subcategories);
  } catch (err) {
    console.error('❌ Error fetching subcategories:', err);
    return errorResponse('Failed to fetch subcategories', 500);
  }
}

// ========================================
// POST — Create a new subcategory
// ========================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { cat_id, sub_cat_name, sub_cat_code } = body;

    // Validation for required fields
    if (!cat_id || cat_id.trim() === '')
      return errorResponse('Category ID is required');
    
    if (!sub_cat_name || sub_cat_name.trim() === '')
      return errorResponse('Subcategory name is required');
    
    if (!sub_cat_code || sub_cat_code.trim() === '')
      return errorResponse('Subcategory code is required');

    // Validate subcategory code format (alphanumeric, no spaces)
    const codeRegex = /^[A-Za-z0-9_-]+$/;
    if (!codeRegex.test(sub_cat_code.trim()))
      return errorResponse('Subcategory code must contain only letters, numbers, hyphens, and underscores');

    // Check if parent category exists
    const parentCategory = await prisma.categories.findUnique({
      where: { cat_id: cat_id.trim() }
    });

    if (!parentCategory)
      return errorResponse('Parent category not found', 404);

    // Check for duplicate subcategory code (globally unique)
    const existingCode = await prisma.subCategory.findUnique({
      where: { sub_cat_code: sub_cat_code.trim().toUpperCase() },
    });

    if (existingCode)
      return errorResponse('Subcategory with this code already exists', 409);

    // Check for duplicate subcategory name within the same category
    const existingName = await prisma.subCategory.findFirst({
      where: {
        cat_id: cat_id.trim(),
        sub_cat_name: {
          equals: sub_cat_name.trim(),
        },
      },
    });

    if (existingName)
      return errorResponse('Subcategory with this name already exists in this category', 409);

    // Create new subcategory
    const newSubcategory = await prisma.subCategory.create({
      data: {
        cat_id: cat_id.trim(),
        sub_cat_name: sub_cat_name.trim(),
        sub_cat_code: sub_cat_code.trim().toUpperCase(),
      },
      include: {
        category: {
          select: {
            cat_id: true,
            cat_name: true,
            cat_code: true
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    return NextResponse.json(newSubcategory, { status: 201 });
  } catch (err) {
    console.error('❌ Error creating subcategory:', err);
    return errorResponse('Failed to create subcategory', 500);
  }
}

// ========================================
// PUT — Update an existing subcategory
// ========================================
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, cat_id, sub_cat_name, sub_cat_code } = body;

    if (!id) return errorResponse('Subcategory ID is required');

    // Validation for required fields
    if (!cat_id || cat_id.trim() === '')
      return errorResponse('Category ID is required');
    
    if (!sub_cat_name || sub_cat_name.trim() === '')
      return errorResponse('Subcategory name is required');
    
    if (!sub_cat_code || sub_cat_code.trim() === '')
      return errorResponse('Subcategory code is required');

    // Validate subcategory code format (alphanumeric, no spaces)
    const codeRegex = /^[A-Za-z0-9_-]+$/;
    if (!codeRegex.test(sub_cat_code.trim()))
      return errorResponse('Subcategory code must contain only letters, numbers, hyphens, and underscores');

    // Check if subcategory exists
    const existing = await prisma.subCategory.findUnique({
      where: { sub_cat_id: id },
    });

    if (!existing)
      return errorResponse('Subcategory not found', 404);

    // Check if parent category exists
    const parentCategory = await prisma.categories.findUnique({
      where: { cat_id: cat_id.trim() }
    });

    if (!parentCategory)
      return errorResponse('Parent category not found', 404);

    // Check for duplicate subcategory code (excluding current subcategory)
    const duplicateCode = await prisma.subCategory.findFirst({
      where: {
        sub_cat_code: sub_cat_code.trim().toUpperCase(),
        NOT: { sub_cat_id: id },
      },
    });

    if (duplicateCode)
      return errorResponse('Subcategory with this code already exists', 409);

    // Check for duplicate subcategory name within the same category (excluding current subcategory)
    const duplicateName = await prisma.subCategory.findFirst({
      where: {
        cat_id: cat_id.trim(),
        sub_cat_name: {
          equals: sub_cat_name.trim(),
        },
        NOT: { sub_cat_id: id },
      },
    });

    if (duplicateName)
      return errorResponse('Subcategory with this name already exists in this category', 409);

    // Update subcategory
    const updated = await prisma.subCategory.update({
      where: { sub_cat_id: id },
      data: {
        cat_id: cat_id.trim(),
        sub_cat_name: sub_cat_name.trim(),
        sub_cat_code: sub_cat_code.trim().toUpperCase(),
      },
      include: {
        category: {
          select: {
            cat_id: true,
            cat_name: true,
            cat_code: true
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('❌ Error updating subcategory:', err);
    return errorResponse('Failed to update subcategory', 500);
  }
}

// ========================================
// DELETE — Delete a subcategory
// ========================================
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // /api/subcategories?id=1

  if (!id)
    return errorResponse('Subcategory ID is required');

  try {
    // Check if subcategory exists
    const existing = await prisma.subCategory.findUnique({
      where: { sub_cat_id: id },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!existing)
      return errorResponse('Subcategory not found', 404);

    // Check if subcategory has products
    if (existing._count.products > 0)
      return errorResponse('Cannot delete subcategory with existing products. Please reassign or delete products first.', 409);

    // Delete subcategory
    await prisma.subCategory.delete({
      where: { sub_cat_id: id },
    });

    return NextResponse.json({ message: 'Subcategory deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting subcategory:', err);
    return errorResponse('Failed to delete subcategory', 500);
  }
}
