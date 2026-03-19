export function getManualBusinessFundingConfig() {
  return {
    upiId: process.env.BUSINESS_FUNDING_UPI_ID?.trim() || "",
    upiName: process.env.BUSINESS_FUNDING_UPI_NAME?.trim() || "FreeEarnHub",
    phoneNumber: process.env.BUSINESS_FUNDING_PHONE?.trim() || "",
    whatsappNumber:
      process.env.BUSINESS_FUNDING_WHATSAPP_NUMBER?.trim() ||
      process.env.BUSINESS_FUNDING_PHONE?.trim() ||
      "",
  };
}

export function generateFundingReferenceId() {
  return `FUND-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function buildBusinessFundingUpiLink(params: {
  upiId: string;
  upiName: string;
  amount: number;
  referenceId: string;
}) {
  const query = new URLSearchParams({
    pa: params.upiId,
    pn: params.upiName,
    am: params.amount.toFixed(2),
    cu: "INR",
    tn: params.referenceId,
  });

  return `upi://pay?${query.toString()}`;
}

export function buildFundingWhatsappLink(params: {
  whatsappNumber: string;
  amount: number;
  referenceId: string;
  utr?: string | null;
}) {
  const number = params.whatsappNumber.replace(/\D/g, "");
  if (!number) return null;

  const message = [
    "FreeEarnHub business funding receipt",
    `Amount: INR ${params.amount.toFixed(2)}`,
    `Reference ID: ${params.referenceId}`,
    params.utr ? `UTR: ${params.utr}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
