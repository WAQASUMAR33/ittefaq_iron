import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function calcPayroll({ basic_salary, total_days, leaves_taken, allowed_leaves }) {
  const salary = parseFloat(basic_salary) || 0;
  const days = parseInt(total_days) || 30;
  const taken = parseInt(leaves_taken) || 0;
  const allowed = parseInt(allowed_leaves) || 0;
  const excess = Math.max(0, taken - allowed);
  const perDay = days > 0 ? salary / days : 0;
  const deduction = excess * perDay;
  const net = salary - deduction;
  return { excess_leaves: excess, deduction_per_day: perDay, total_deduction: deduction, net_salary: net };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;
    const emp_id = searchParams.get('emp_id') ? parseInt(searchParams.get('emp_id')) : null;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')) : null;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')) : null;

    if (id) {
      const p = await prisma.payroll.findUnique({ where: { payroll_id: id }, include: { employee: true } });
      return NextResponse.json(p);
    }

    const where = {};
    if (emp_id) where.emp_id = emp_id;
    if (month) where.month = month;
    if (year) where.year = year;

    const payrolls = await prisma.payroll.findMany({
      where,
      include: { employee: { select: { emp_id: true, emp_name: true, designation: true, department: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { employee: { emp_name: 'asc' } }],
    });
    return NextResponse.json(payrolls);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Generate payroll for a month — auto-calculates from attendance
export async function POST(request) {
  try {
    const body = await request.json();

    // Bulk generate: { month, year, generate: true }
    if (body.generate) {
      const { month, year } = body;
      const settings = await prisma.hrSettings.findFirst();
      const allowedPerMonth = settings?.allowed_leaves_per_month ?? 2;

      const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' } });
      const daysInMonth = new Date(year, month, 0).getDate();

      const results = [];
      for (const emp of employees) {
        const att = await prisma.attendance.findMany({
          where: {
            emp_id: emp.emp_id,
            att_date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
          },
        });

        const presentCount = att.filter(a => a.status === 'PRESENT').length;
        const halfDayCount = att.filter(a => a.status === 'HALF_DAY').length;
        const absentCount = att.filter(a => a.status === 'ABSENT').length;
        const leaveCount = att.filter(a => a.status === 'LEAVE').length;
        const days_present = presentCount + halfDayCount * 0.5;
        const leaves_taken = absentCount + leaveCount;

        const derived = calcPayroll({
          basic_salary: emp.basic_salary,
          total_days: daysInMonth,
          leaves_taken,
          allowed_leaves: allowedPerMonth,
        });

        const p = await prisma.payroll.upsert({
          where: { emp_id_month_year: { emp_id: emp.emp_id, month: parseInt(month), year: parseInt(year) } },
          update: {
            basic_salary: emp.basic_salary,
            total_days: daysInMonth,
            days_present,
            leaves_taken,
            allowed_leaves: allowedPerMonth,
            ...derived,
          },
          create: {
            emp_id: emp.emp_id,
            month: parseInt(month),
            year: parseInt(year),
            basic_salary: emp.basic_salary,
            total_days: daysInMonth,
            days_present,
            leaves_taken,
            allowed_leaves: allowedPerMonth,
            ...derived,
          },
        });
        results.push(p);
      }
      return NextResponse.json(results);
    }

    // Single create
    const { emp_id, month, year, basic_salary, total_days, days_present, leaves_taken, allowed_leaves, notes } = body;
    if (!emp_id || !month || !year) return NextResponse.json({ error: 'emp_id, month, year required' }, { status: 400 });

    const derived = calcPayroll({ basic_salary, total_days, leaves_taken, allowed_leaves });

    const payroll = await prisma.payroll.create({
      data: {
        emp_id: parseInt(emp_id),
        month: parseInt(month),
        year: parseInt(year),
        basic_salary: parseFloat(basic_salary) || 0,
        total_days: parseInt(total_days) || 30,
        days_present: parseFloat(days_present) || 0,
        leaves_taken: parseInt(leaves_taken) || 0,
        allowed_leaves: parseInt(allowed_leaves) || 0,
        notes: notes || null,
        ...derived,
      },
    });
    return NextResponse.json(payroll, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Payroll already exists for this period' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { payroll_id, basic_salary, total_days, days_present, leaves_taken, allowed_leaves, status, payment_date, notes } = body;
    if (!payroll_id) return NextResponse.json({ error: 'payroll_id required' }, { status: 400 });

    const derived = calcPayroll({ basic_salary, total_days, leaves_taken, allowed_leaves });

    const payroll = await prisma.payroll.update({
      where: { payroll_id: parseInt(payroll_id) },
      data: {
        basic_salary: parseFloat(basic_salary) || 0,
        total_days: parseInt(total_days) || 30,
        days_present: parseFloat(days_present) || 0,
        leaves_taken: parseInt(leaves_taken) || 0,
        allowed_leaves: parseInt(allowed_leaves) || 0,
        status: status || 'PENDING',
        payment_date: payment_date ? new Date(payment_date) : null,
        notes: notes || null,
        ...derived,
      },
    });
    return NextResponse.json(payroll);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await prisma.payroll.delete({ where: { payroll_id: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
