export const INTEREST_RATE = 0.5; // 50% calf on issue
export const PARTIAL_CALF_FEE = 0.5; // 50% fee if you pay calf but not cow
export const OVERDUE_GRACE_DAYS = 30;
export const MAX_TOTAL_MULTIPLIER = 2; // 2x cap: total owed never exceeds 2x original_cow

export interface LoanState {
  id: string;
  original_cow: number;
  current_cow: number;
  current_calf: number;
  total_due: number;
  status: 'Active' | 'Paid' | 'Overdue' | 'Capped';
  due_date: string;
  last_compound_date?: string;
  total_paid: number;
}

export interface PaymentResult {
  interest_paid: number;
  principal_paid: number;
  penalty_fee: number;
  remaining_cow: number;
  new_calf: number;
  new_total_due: number;
  new_status: 'Active' | 'Paid' | 'Capped';
  calf_cleared: boolean;
  was_capped: boolean;
}

function applyMaxCap(loan: LoanState, calculatedCow: number, calculatedCalf: number): {
  cow: number; calf: number; total: number; capped: boolean;
} {
  const maxTotal = parseFloat((loan.original_cow * MAX_TOTAL_MULTIPLIER).toFixed(2));
  const calculatedTotal = parseFloat((calculatedCow + calculatedCalf).toFixed(2));
  if (calculatedTotal <= maxTotal) {
    return { cow: calculatedCow, calf: calculatedCalf, total: calculatedTotal, capped: false };
  }
  const excess = parseFloat((calculatedTotal - maxTotal).toFixed(2));
  let finalCalf = calculatedCalf;
  let finalCow = calculatedCow;
  if (excess <= finalCalf) {
    finalCalf = parseFloat((finalCalf - excess).toFixed(2));
  } else {
    const rem = parseFloat((excess - finalCalf).toFixed(2));
    finalCalf = 0;
    finalCow = Math.max(0, parseFloat((finalCow - rem).toFixed(2)));
  }
  return { cow: finalCow, calf: finalCalf, total: maxTotal, capped: true };
}

export function calculateNewLoan(amount: number) {
  if (amount <= 0) throw new Error('Loan amount must be greater than 0');
  const cow = parseFloat(amount.toFixed(2));
  const calf = parseFloat((cow * INTEREST_RATE).toFixed(2));
  return { original_cow: cow, current_cow: cow, current_calf: calf, total_due: parseFloat((cow + calf).toFixed(2)) };
}

export function applyPaymentToLoan(loan: LoanState, paymentAmount: number): PaymentResult {
  if (paymentAmount <= 0) throw new Error('Payment amount must be greater than 0');
  let remainingPayment = parseFloat(paymentAmount.toFixed(2));
  let interestPaid = 0, principalPaid = 0, penaltyFee = 0, calfCleared = false;

  // 1. Pay calf first
  if (remainingPayment >= loan.current_calf) {
    interestPaid = loan.current_calf;
    remainingPayment = parseFloat((remainingPayment - loan.current_calf).toFixed(2));
    calfCleared = true;
  } else {
    interestPaid = remainingPayment;
    const remainingCalf = parseFloat((loan.current_calf - interestPaid).toFixed(2));
    penaltyFee = parseFloat((remainingCalf * PARTIAL_CALF_FEE).toFixed(2));
    remainingPayment = 0;
  }

  // 2. Pay cow if calf cleared
  if (calfCleared && remainingPayment > 0) {
    principalPaid = Math.min(remainingPayment, loan.current_cow);
    remainingPayment = parseFloat((remainingPayment - principalPaid).toFixed(2));
  }

  const remaining_cow = parseFloat((loan.current_cow - principalPaid).toFixed(2));
  const uncappedCalf = parseFloat((remaining_cow * INTEREST_RATE).toFixed(2));
  const capped = applyMaxCap(loan, remaining_cow, uncappedCalf + penaltyFee);
  
  const new_status = capped.cow <= 0 ? 'Paid' : capped.capped ? 'Capped' : 'Active';
  return {
    interest_paid: interestPaid,
    principal_paid: principalPaid,
    penalty_fee: penaltyFee,
    remaining_cow: capped.cow,
    new_calf: capped.calf,
    new_total_due: capped.total,
    new_status,
    calf_cleared: calfCleared,
    was_capped: capped.capped
  };
}

export function checkOverdueStatus(loan: LoanState): Partial<LoanState> | null {
  if (loan.status === 'Paid' || loan.status === 'Capped') return null;
  const daysOverdue = Math.floor((Date.now() - new Date(loan.due_date).getTime()) / 86400000);
  if (daysOverdue < OVERDUE_GRACE_DAYS) return null;
  if (loan.status === 'Overdue') return null; // already flagged
  return { status: 'Overdue' };
                           }
