import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatZAR } from './formatters';

interface ReceiptData {
  receipt_number: string;
  loan_id: string;
  customer_name: string;
  payment_date: string;
  amount: number;
  interest_paid: number;
  principal_paid: number;
  penalty_fee?: number;
  remaining_cow: number;
  new_calf: number;
  new_total_due: number;
}

export const generateReceiptPDF = async (data: ReceiptData) => {
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Helvetica; padding: 40px; color: #0D1B2A; }
         .header { text-align: center; margin-bottom: 30px; }
         .title { font-size: 24px; font-weight: bold; }
         .row { display: flex; justify-content: space-between; margin: 8px 0; }
         .total { font-size: 18px; border-top: 2px solid #0D1B2A; padding-top: 10px; }
         .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #778DA9; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">LMCC</div>
          <div>Payment Receipt</div>
        </div>
        <div class="row"><span>Receipt No:</span><span><b>${data.receipt_number}</b></span></div>
        <div class="row"><span>Date:</span><span>${new Date(data.payment_date).toLocaleDateString('en-ZA')}</span></div>
        <div class="row"><span>Loan ID:</span><span>${data.loan_id}</span></div>
        <div class="row"><span>Customer:</span><span><b>${data.customer_name}</b></span></div>
        <div class="row total"><span>Amount Paid:</span><span><b>${formatZAR(data.amount)}</b></span></div>
        <div class="row"><span>Interest Paid:</span><span>${formatZAR(data.interest_paid)}</span></div>
        <div class="row"><span>Principal Paid:</span><span>${formatZAR(data.principal_paid)}</span></div>
        ${data.penalty_fee? `<div class="row"><span>Penalty Fee:</span><span>${formatZAR(data.penalty_fee)}</span></div>` : ''}
        <div class="row"><span>Remaining Cow:</span><span><b>${formatZAR(data.remaining_cow)}</b></span></div>
        <div class="row"><span>New Calf:</span><span><b>${formatZAR(data.new_calf)}</b></span></div>
        <div class="row total"><span>New Balance:</span><span><b>${formatZAR(data.new_total_due)}</b></span></div>
        <div class="footer">Thank you for your payment.</div>
      </body>
    </html>
  `;
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Receipt' });
  return uri;
};
