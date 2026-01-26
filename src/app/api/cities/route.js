import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch all cities
export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json(cities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}

// POST - Create new city
export async function POST(request) {
  try {
    const body = await request.json();
    const { city_name, updated_by } = body;

    if (!city_name) {
      return NextResponse.json(
        { error: 'City name is required' },
        { status: 400 }
      );
    }

    const city = await prisma.city.create({
      data: {
        city_name,
        updated_by
      }
    });

    return NextResponse.json(city, { status: 201 });
  } catch (error) {
    console.error('Error creating city:', error);
    return NextResponse.json(
      { error: 'Failed to create city' },
      { status: 500 }
    );
  }
}

// PUT - Update city
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, city_name, updated_by } = body;

    if (!id || !city_name) {
      return NextResponse.json(
        { error: 'ID and city name are required' },
        { status: 400 }
      );
    }

    const city = await prisma.city.update({
      where: { city_id: id },
      data: {
        city_name,
        updated_by
      }
    });

    return NextResponse.json(city);
  } catch (error) {
    console.error('Error updating city:', error);
    return NextResponse.json(
      { error: 'Failed to update city' },
      { status: 500 }
    );
  }
}

// DELETE - Delete city
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;

    if (!id) {
      return NextResponse.json(
        { error: 'City ID is required' },
        { status: 400 }
      );
    }

    // Check if city is being used by any customers
    const customersUsingCity = await prisma.customer.count({
      where: { city_id: id }
    });

    if (customersUsingCity > 0) {
      return NextResponse.json(
        { error: 'Cannot delete city that is being used by customers' },
        { status: 400 }
      );
    }

    await prisma.city.delete({
      where: { city_id: id }
    });

    return NextResponse.json({ message: 'City deleted successfully' });
  } catch (error) {
    console.error('Error deleting city:', error);
    return NextResponse.json(
      { error: 'Failed to delete city' },
      { status: 500 }
    );
  }
}


