import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function calcPayroll({ basic_salary, total_days, days_present, allowed_leaves, advance_deduction = 0, bonus = 0, other_deduction = 0 }) {
  const salary = parseFloat(basic_salary) || 0;
  const days = parseInt(total_days) || 30;
  const present = parseFloat(days_present) || 0;
  const allowed = parseInt(allowed_leaves) || 0;

  // Unattended / absent days in month
  const absentDays = Math.max(0, days - present);
  // Excess unpaid absent days beyond allowed paid leaves
  const excess = Math.max(0, absentDays - allowed);
  const perDay = days > 0 ? salary / days : 0;
  const leaveDeduction = excess * perDay;

  const advDeduction = parseFloat(advance_deduction) || 0;
  const bonusAmt = parseFloat(bonus) || 0;
  const othDeduction = parseFloat(other_deduction) || 0;
  const net = Math.max(0, salary - leaveDeduction - advDeduction + bonusAmt - othDeduction);

  return {
    leaves_taken: Math.round(absentDays),
    excess_leaves: Math.round(excess),
    deduction_per_day: perDay,
    total_deduction: leaveDeduction,
    advance_deduction: advDeduction,
    bonus: bonusAmt,
    other_deduction: othDeduction,
    net_salary: net,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;
    const emp_id = searchParams.get('emp_id') ? parseInt(searchParams.get('emp_id')) : null;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')) : null;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')) : null;

    let query = `
      SELECT p.*, e.emp_name, e.designation, e.department, e.basic_salary as emp_basic_salary
      FROM payrolls p
      LEFT JOIN employees e ON p.emp_id = e.emp_id
      WHERE 1=1
    `;
    if (id) query += ` AND p.payroll_id = ${id}`;
    if (emp_id) query += ` AND p.emp_id = ${emp_id}`;
    if (month) query += ` AND p.month = ${month}`;
    if (year) query += ` AND p.year = ${year}`;
    query += ` ORDER BY p.year DESC, p.month DESC, e.emp_name ASC`;

    const rows = await prisma.$queryRawUnsafe(query);
    const result = rows.map((r) => ({
      payroll_id: r.payroll_id,
      emp_id: r.emp_id,
      month: r.month,
      year: r.year,
      basic_salary: parseFloat(r.basic_salary || 0),
      total_days: r.total_days,
      days_present: parseFloat(r.days_present || 0),
      leaves_taken: r.leaves_taken,
      allowed_leaves: r.allowed_leaves,
      excess_leaves: r.excess_leaves,
      deduction_per_day: parseFloat(r.deduction_per_day || 0),
      total_deduction: parseFloat(r.total_deduction || 0),
      advance_deduction: parseFloat(r.advance_deduction || 0),
      bonus: parseFloat(r.bonus || 0),
      other_deduction: parseFloat(r.other_deduction || 0),
      net_salary: parseFloat(r.net_salary || 0),
      status: r.status,
      payment_date: r.payment_date,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      employee: {
        emp_id: r.emp_id,
        emp_name: r.emp_name,
        designation: r.designation,
        department: r.department,
        basic_salary: parseFloat(r.emp_basic_salary || 0),
      },
    }));

    if (id) return NextResponse.json(result[0] || null);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/payroll:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Generate payroll for a month — auto-calculates from attendance and pending advance salary
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

        // Find pending advances for employee
        let pendingAdvances = [];
        try {
          pendingAdvances = await prisma.$queryRaw`SELECT * FROM employee_advances WHERE emp_id = ${emp.emp_id} AND status = 'PENDING'`;
        } catch (e) {}

        const totalPendingAdvance = pendingAdvances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

        const presentCount = att.filter((a) => a.status === 'PRESENT').length;
        const halfDayCount = att.filter((a) => a.status === 'HALF_DAY').length;
        const days_present = presentCount + halfDayCount * 0.5;

        const derived = calcPayroll({
          basic_salary: emp.basic_salary,
          total_days: daysInMonth,
          days_present,
          allowed_leaves: allowedPerMonth,
          advance_deduction: totalPendingAdvance,
        });

        // Execute SQL upsert
        await prisma.$executeRawUnsafe(`
          INSERT INTO payrolls (
            emp_id, month, year, basic_salary, total_days, days_present, leaves_taken,
            allowed_leaves, excess_leaves, deduction_per_day, total_deduction, advance_deduction,
            bonus, other_deduction, net_salary, status, created_at, updated_at
          ) VALUES (
            ${emp.emp_id}, ${parseInt(month)}, ${parseInt(year)}, ${parseFloat(emp.basic_salary || 0)},
            ${daysInMonth}, ${days_present}, ${derived.leaves_taken}, ${allowedPerMonth},
            ${derived.excess_leaves}, ${derived.deduction_per_day}, ${derived.total_deduction}, ${derived.advance_deduction},
            0.00, 0.00, ${derived.net_salary}, 'PENDING', NOW(), NOW()
          ) ON DUPLICATE KEY UPDATE
            basic_salary = VALUES(basic_salary),
            total_days = VALUES(total_days),
            days_present = VALUES(days_present),
            leaves_taken = VALUES(leaves_taken),
            allowed_leaves = VALUES(allowed_leaves),
            excess_leaves = VALUES(excess_leaves),
            deduction_per_day = VALUES(deduction_per_day),
            total_deduction = VALUES(total_deduction),
            advance_deduction = VALUES(advance_deduction),
            net_salary = VALUES(net_salary),
            updated_at = NOW()
        `);

        results.push({ emp_id: emp.emp_id, month, year, net_salary: derived.net_salary });
      }
      return NextResponse.json(results);
    }

    // Single create
    const { emp_id, month, year, basic_salary, total_days, days_present, leaves_taken, allowed_leaves, advance_deduction, bonus, other_deduction, notes } = body;
    if (!emp_id || !month || !year) return NextResponse.json({ error: 'emp_id, month, year required' }, { status: 400 });

    const derived = calcPayroll({ basic_salary, total_days, leaves_taken, allowed_leaves, advance_deduction, bonus, other_deduction });
    const notesText = notes ? notes.replace(/'/g, "''") : '';

    await prisma.$executeRawUnsafe(`
      INSERT INTO payrolls (
        emp_id, month, year, basic_salary, total_days, days_present, leaves_taken,
        allowed_leaves, excess_leaves, deduction_per_day, total_deduction, advance_deduction,
        bonus, other_deduction, net_salary, status, notes, created_at, updated_at
      ) VALUES (
        ${parseInt(emp_id)}, ${parseInt(month)}, ${parseInt(year)}, ${parseFloat(basic_salary) || 0},
        ${parseInt(total_days) || 30}, ${parseFloat(days_present) || 0}, ${parseInt(leaves_taken) || 0}, ${parseInt(allowed_leaves) || 0},
        ${derived.excess_leaves}, ${derived.deduction_per_day}, ${derived.total_deduction}, ${derived.advance_deduction},
        ${derived.bonus}, ${derived.other_deduction}, ${derived.net_salary}, 'PENDING', '${notesText}', NOW(), NOW()
      )
    `);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/payroll:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { payroll_id, basic_salary, total_days, days_present, leaves_taken, allowed_leaves, advance_deduction, bonus, other_deduction, status, payment_date, notes } = body;
    if (!payroll_id) return NextResponse.json({ error: 'payroll_id required' }, { status: 400 });

    const derived = calcPayroll({ basic_salary, total_days, leaves_taken, allowed_leaves, advance_deduction, bonus, other_deduction });
    const notesText = notes ? notes.replace(/'/g, "''") : '';
    const payDate = payment_date ? `'${payment_date}'` : 'NULL';

    await prisma.$executeRawUnsafe(`
      UPDATE payrolls
      SET basic_salary = ${parseFloat(basic_salary) || 0},
          total_days = ${parseInt(total_days) || 30},
          days_present = ${parseFloat(days_present) || 0},
          leaves_taken = ${parseInt(leaves_taken) || 0},
          allowed_leaves = ${parseInt(allowed_leaves) || 0},
          excess_leaves = ${derived.excess_leaves},
          deduction_per_day = ${derived.deduction_per_day},
          total_deduction = ${derived.total_deduction},
          advance_deduction = ${derived.advance_deduction},
          bonus = ${derived.bonus},
          other_deduction = ${derived.other_deduction},
          net_salary = ${derived.net_salary},
          status = '${status || 'PENDING'}',
          payment_date = ${payDate},
          notes = '${notesText}',
          updated_at = NOW()
      WHERE payroll_id = ${parseInt(payroll_id)}
    `);

    // If marked as PAID, update pending advances for this employee to DEDUCTED
    if (status === 'PAID') {
      try {
        const rows = await prisma.$queryRawUnsafe(`SELECT emp_id FROM payrolls WHERE payroll_id = ${parseInt(payroll_id)}`);
        if (rows && rows.length > 0) {
          const emp_id = rows[0].emp_id;
          await prisma.$executeRawUnsafe(`
            UPDATE employee_advances
            SET status = 'DEDUCTED', payroll_id = ${parseInt(payroll_id)}, updated_at = NOW()
            WHERE emp_id = ${emp_id} AND status = 'PENDING'
          `);
        }
      } catch (e) {
        console.error('Failed to update advance statuses to DEDUCTED:', e);
      }
    }

    return NextResponse.json({ success: true, payroll_id });
  } catch (error) {
    console.error('Error in PUT /api/payroll:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await prisma.$executeRawUnsafe(`DELETE FROM payrolls WHERE payroll_id = ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
