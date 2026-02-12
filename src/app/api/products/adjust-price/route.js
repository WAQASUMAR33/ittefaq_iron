import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json();
    const { categoryId, percentage, type } = body;

    // Validation
    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    if (percentage === undefined || percentage === null || percentage === '') {
      return NextResponse.json({ error: 'Percentage is required' }, { status: 400 });
    }
    if (!type || (type !== 'increase' && type !== 'decrease')) {
      return NextResponse.json({ error: 'Type must be "increase" or "decrease"' }, { status: 400 });
    }

    const percentValue = parseFloat(percentage);
    if (isNaN(percentValue) || percentValue <= 0) {
      return NextResponse.json({ error: 'Percentage must be a positive number' }, { status: 400 });
    }

    // Get all products in the category
    const products = await prisma.product.findMany({
      where: { cat_id: parseInt(categoryId) }
    });

    if (products.length === 0) {
      return NextResponse.json({ 
        message: 'No products found in this category',
        updatedCount: 0 
      }, { status: 200 });
    }

    // Calculate multiplier based on type
    const multiplier = type === 'increase' 
      ? (1 + (percentValue / 100))
      : (1 - (percentValue / 100));

    // Update each product
    let updatedCount = 0;
    
    for (const product of products) {
      try {
        const updatedData = {};

        // Update cost price
        if (product.pro_cost_price) {
          updatedData.pro_cost_price = parseFloat((product.pro_cost_price * multiplier).toFixed(2));
        }

        // Update crate rate
        if (product.pro_crate) {
          updatedData.pro_crate = parseFloat((product.pro_crate * multiplier).toFixed(2));
        }

        // Update sale price
        if (product.pro_sale_price) {
          updatedData.pro_sale_price = parseFloat((product.pro_sale_price * multiplier).toFixed(2));
        }

        // Only update if there's data to update
        if (Object.keys(updatedData).length > 0) {
          await prisma.product.update({
            where: { pro_id: product.pro_id },
            data: updatedData
          });
          updatedCount++;
        }
      } catch (productError) {
        console.error(`Error updating product ${product.pro_id}:`, productError);
        // Continue with next product
      }
    }

    return NextResponse.json({
      message: `Successfully updated ${updatedCount} products`,
      updatedCount: updatedCount,
      totalInCategory: products.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error in adjust-price:', error);
    return NextResponse.json({ 
      error: 'Failed to adjust prices',
      details: error.message 
    }, { status: 500 });
  }
}
