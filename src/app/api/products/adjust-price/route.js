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

    // Calculate adjustment amount based on percentage of base price
    // This amount will be added or subtracted from all rates
    let updatedCount = 0;
    
    for (const product of products) {
      try {
        // Calculate the adjustment amount based on base price (convert to number first!)
        const basePrice = parseFloat(product.pro_baser_price) || 0;
        const adjustmentAmount = parseFloat((basePrice * (percentValue / 100)).toFixed(2));

        console.log(`📊 Product: ${product.pro_title}, Base: ${basePrice}, Adjustment: ${adjustmentAmount}`);

        const updatedData = {};

        // Apply adjustment to cost price (ensure numeric conversion BEFORE math)
        if (product.pro_cost_price !== null && product.pro_cost_price !== undefined) {
          const costPrice = parseFloat(product.pro_cost_price) || 0;
          const newPrice = type === 'increase'
            ? (costPrice + adjustmentAmount)
            : (costPrice - adjustmentAmount);
          const finalPrice = parseFloat(Math.max(0, newPrice).toFixed(2));
          updatedData.pro_cost_price = finalPrice;
          console.log(`  Cost: ${costPrice} (type: ${typeof costPrice}) ${type === 'increase' ? '+' : '-'} ${adjustmentAmount} = ${newPrice} → final: ${finalPrice}`);
        }

        // Apply adjustment to crate rate (ensure numeric conversion BEFORE math)
        if (product.pro_crate !== null && product.pro_crate !== undefined) {
          const crateRate = parseFloat(product.pro_crate) || 0;
          const newCrate = type === 'increase'
            ? (crateRate + adjustmentAmount)
            : (crateRate - adjustmentAmount);
          const finalCrate = parseFloat(Math.max(0, newCrate).toFixed(2));
          updatedData.pro_crate = finalCrate;
          console.log(`  Crate: ${crateRate} (type: ${typeof crateRate}) ${type === 'increase' ? '+' : '-'} ${adjustmentAmount} = ${newCrate} → final: ${finalCrate}`);
        }

        // Apply adjustment to sale price (ensure numeric conversion BEFORE math)
        if (product.pro_sale_price !== null && product.pro_sale_price !== undefined) {
          const salePrice = parseFloat(product.pro_sale_price) || 0;
          const newSalePrice = type === 'increase'
            ? (salePrice + adjustmentAmount)
            : (salePrice - adjustmentAmount);
          const finalSalePrice = parseFloat(Math.max(0, newSalePrice).toFixed(2));
          updatedData.pro_sale_price = finalSalePrice;
          console.log(`  Sale: ${salePrice} (type: ${typeof salePrice}) ${type === 'increase' ? '+' : '-'} ${adjustmentAmount} = ${newSalePrice} → final: ${finalSalePrice}`);
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
