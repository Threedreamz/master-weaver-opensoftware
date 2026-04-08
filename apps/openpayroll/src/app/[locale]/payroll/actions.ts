"use server";

import { db, schema } from "@/db";
import { eq, sql, and } from "drizzle-orm";

export interface DashboardStats {
  activeEmployees: number;
  monthlyTotal: number;
  avgSalary: number;
  nextPayrollDate: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const employees = await db
    .select()
    .from(schema.payMitarbeiter)
    .where(eq(schema.payMitarbeiter.status, "aktiv"));

  const activeCount = employees.length;
  const totalBrutto = employees.reduce((sum, e) => sum + (e.bruttoGehalt ?? 0), 0);
  const avgSalary = activeCount > 0 ? totalBrutto / activeCount : 0;

  // Next payroll date: last day of current month
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const nextPayrollDate = lastDay.toISOString().split("T")[0]!;

  return {
    activeEmployees: activeCount,
    monthlyTotal: totalBrutto,
    avgSalary,
    nextPayrollDate,
  };
}

export interface MonthlyPayrollSummary {
  month: string;
  total: number;
}

export async function getMonthlyPayrollSummary(): Promise<MonthlyPayrollSummary[]> {
  const now = new Date();
  const results: MonthlyPayrollSummary[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monat = date.getMonth() + 1;
    const jahr = date.getFullYear();

    const rows = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.payLohnabrechnungen.bruttoGesamt}), 0)` })
      .from(schema.payLohnabrechnungen)
      .where(
        and(
          eq(schema.payLohnabrechnungen.monat, monat),
          eq(schema.payLohnabrechnungen.jahr, jahr)
        )
      );

    const monthNames = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    results.push({
      month: `${monthNames[monat - 1]} ${jahr}`,
      total: rows[0]?.total ?? 0,
    });
  }

  return results;
}
