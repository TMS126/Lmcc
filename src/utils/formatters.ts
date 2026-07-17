export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount || 0)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Overdue': return '#EF4444'
    case 'Capped': return '#F59E0B'
    case 'Cleared': return '#10B981'
    default: return '#0D1B2A' // Active
  }
}

// ⚠️ Adjust this to your actual lending rate — 30%/month is just a placeholder.
export const DEFAULT_MONTHLY_RATE = 30
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function calculateLoan({ principal, monthlyRate, termWeeks, startDate }: {
  principal: number; monthlyRate: number; termWeeks: number; startDate: Date
}) {
  const months = termWeeks / 4.345
  let interest = principal * (monthlyRate / 100) * months
  interest = Math.min(interest, principal) // in duplum: interest ≤ principal
  const totalDue = principal + interest
  const dueDate = new Date(startDate.getTime() + termWeeks * MS_PER_WEEK)
  return {
    interest: Math.round(interest * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100,
    dueDate: dueDate.toISOString(),
    weeklyInstallment: Math.round((totalDue / termWeeks) * 100) / 100,
  }
}

export function recalculateLoanStatus(loan: {
  principal: number; monthly_rate: number; total_due: number
  accrued_interest: number; due_date: string; last_accrual_date: string; status: string
}, now: Date = new Date()) {
  if (loan.status === 'Cleared' || loan.total_due <= 0) {
    return { total_due: 0, accrued_interest: loan.accrued_interest, status: 'Cleared', last_accrual_date: now.toISOString() }
  }
  const dueDate = new Date(loan.due_date)
  const lastAccrual = new Date(loan.last_accrual_date)
  let totalDue = loan.total_due
  let accrued = loan.accrued_interest

  if (now > dueDate && now > lastAccrual) {
    const weeksElapsed = Math.max(0, Math.floor((now.getTime() - Math.max(lastAccrual.getTime(), dueDate.getTime())) / MS_PER_WEEK))
    if (weeksElapsed > 0) {
      const weeklyInterest = loan.principal * (loan.monthly_rate / 100) / 4.345
      const room = Math.max(0, loan.principal - accrued)
      const extra = Math.min(weeksElapsed * weeklyInterest, room)
      accrued += extra
      totalDue += extra
    }
  }

  const capped = accrued >= loan.principal - 0.01
  const status = capped ? 'Capped' : now > dueDate ? 'Overdue' : 'Active'

  return {
    total_due: Math.round(totalDue * 100) / 100,
    accrued_interest: Math.round(accrued * 100) / 100,
    status,
    last_accrual_date: now.toISOString(),
  }
}
