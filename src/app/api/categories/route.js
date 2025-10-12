import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper for JSON errors
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// GET — Get all or one category
// ========================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // optional: ?id=1

  try {
    if (id) {
      // Get single category with subcategories and products count
      const category = await prisma.categories.findUnique({
        where: { cat_id: id },
      include: {
        sub_categories: {
          select: {
            sub_cat_id: true,
            sub_cat_name: true,
            sub_cat_code: true,
            created_at: true,
            updated_at: true,
            _count: {
              select: {
                products: true
              }
            }
          }
        },
        _count: {
          select: {
            sub_categories: true,
            products: true
          }
        }
      },
      });

      if (!category)
        return errorResponse('Category not found', 404);

      return NextResponse.json(category);
    }

    // Get all categories with subcategories and products count
    const categories = await prisma.categories.findMany({
      include: {
        sub_categories: {
          select: {
            sub_cat_id: true,
            sub_cat_name: true,
            sub_cat_code: true,
            created_at: true,
            updated_at: true,
            _count: {
              select: {
                products: true
              }
            }
          }
        },
        _count: {
          select: {
            sub_categories: true,
            products: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(categories);
  } catch (err) {
    console.error('❌ Error fetching categories:', err);
    return errorResponse('Failed to fetch categories', 500);
  }
}

// ========================================
// POST — Create a new category
// ========================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { cat_name, cat_code } = body;

    // Validation for required fields
    if (!cat_name || cat_name.trim() === '')
      return errorResponse('Category name is required');
    
    if (!cat_code || cat_code.trim() === '')
      return errorResponse('Category code is required');

    // Validate category code format (alphanumeric, no spaces)
    const codeRegex = /^[A-Za-z0-9_-]+$/;
    if (!codeRegex.test(cat_code.trim()))
      return errorResponse('Category code must contain only letters, numbers, hyphens, and underscores');

    // Check for duplicate category code
    const existingCode = await prisma.categories.findUnique({
      where: { cat_code: cat_code.trim().toUpperCase() },
    });

    if (existingCode)
      return errorResponse('Category with this code already exists', 409);

    // Check for duplicate category name (case-insensitive)
    const existingName = await prisma.categories.findFirst({
      where: {
        cat_name: {
          equals: cat_name.trim(),
        },
      },
    });

    if (existingName)
      return errorResponse('Category with this name already exists', 409);

    // Create new category
    const newCategory = await prisma.categories.create({
      data: {
        cat_name: cat_name.trim(),
        cat_code: cat_code.trim().toUpperCase(),
      },
      include: {
        sub_categories: {
          select: {
            sub_cat_id: true,
            sub_cat_name: true,
            sub_cat_code: true,
            created_at: true,
            updated_at: true,
            _count: {
              select: {
                products: true
              }
            }
          }
        },
        _count: {
          select: {
            sub_categories: true,
            products: true
          }
        }
      }
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (err) {
    console.error('❌ Error creating category:', err);
    return errorResponse('Failed to create category', 500);
  }
}

// ========================================
// PUT — Update an existing category
// ========================================
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, cat_name, cat_code } = body;

    if (!id) return errorResponse('Category ID is required');

    // Validation for required fields
    if (!cat_name || cat_name.trim() === '')
      return errorResponse('Category name is required');
    
    if (!cat_code || cat_code.trim() === '')
      return errorResponse('Category code is required');

    // Validate category code format (alphanumeric, no spaces)
    const codeRegex = /^[A-Za-z0-9_-]+$/;
    if (!codeRegex.test(cat_code.trim()))
      return errorResponse('Category code must contain only letters, numbers, hyphens, and underscores');

    // Check if category exists
    const existing = await prisma.categories.findUnique({
      where: { cat_id: id },
    });

    if (!existing)
      return errorResponse('Category not found', 404);

    // Check for duplicate category code (excluding current category)
    const duplicateCode = await prisma.categories.findFirst({
      where: {
        cat_code: cat_code.trim().toUpperCase(),
        NOT: { cat_id: id },
      },
    });

    if (duplicateCode)
      return errorResponse('Category with this code already exists', 409);

    // Check for duplicate category name (excluding current category)
    const duplicateName = await prisma.categories.findFirst({
      where: {
        cat_name: {
          equals: cat_name.trim(),
        },
        NOT: { cat_id: id },
      },
    });

    if (duplicateName)
      return errorResponse('Category with this name already exists', 409);

    // Update category
    const updated = await prisma.categories.update({
      where: { cat_id: id },
      data: {
        cat_name: cat_name.trim(),
        cat_code: cat_code.trim().toUpperCase(),
      },
      include: {
        sub_categories: {
          select: {
            sub_cat_id: true,
            sub_cat_name: true,
            sub_cat_code: true,
            created_at: true,
            updated_at: true,
            _count: {
              select: {
                products: true
              }
            }
          }
        },
        _count: {
          select: {
            sub_categories: true,
            products: true
          }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('❌ Error updating category:', err);
    return errorResponse('Failed to update category', 500);
  }
}

// ========================================
// DELETE — Delete a category
// ========================================
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // /api/categories?id=1

  if (!id)
    return errorResponse('Category ID is required');

  try {
    // Check if category exists
    const existing = await prisma.categories.findUnique({
      where: { cat_id: id },
      include: {
        _count: {
          select: {
            sub_categories: true,
            products: true
          }
        }
      }
    });

    if (!existing)
      return errorResponse('Category not found', 404);

    // Check if category has subcategories or products
    if (existing._count.sub_categories > 0)
      return errorResponse('Cannot delete category with existing subcategories. Please delete subcategories first.', 409);

    if (existing._count.products > 0)
      return errorResponse('Cannot delete category with existing products. Please reassign or delete products first.', 409);

    // Delete category
    await prisma.categories.delete({
      where: { cat_id: id },
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting category:', err);
    return errorResponse('Failed to delete category', 500);
  }
}
