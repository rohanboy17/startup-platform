import type { UserLevel } from "@prisma/client";

const MARKETING_COMMISSION_BY_LEVEL: Record<UserLevel, number> = {
  L1: 0.45,
  L2: 0.4,
  L3: 0.35,
  L4: 0.3,
  L5: 0.25,
};

const ONE_TIME_COMMISSION = 0.3;

export function getSubmissionCommissionRate(params: {
  category: string;
  userLevel: UserLevel;
  oneTimeRateOverride?: number;
}) {
  if (params.category.toLowerCase() === "marketing") {
    return MARKETING_COMMISSION_BY_LEVEL[params.userLevel];
  }
  if (typeof params.oneTimeRateOverride === "number") {
    return Math.min(Math.max(params.oneTimeRateOverride, 0), 0.9);
  }
  return ONE_TIME_COMMISSION;
}

export function applyFundingFee(amount: number, feeRateOverride?: number) {
  const feeRate =
    typeof feeRateOverride === "number"
      ? Math.min(Math.max(feeRateOverride, 0), 0.5)
      : 0;
  const fee = Number((amount * feeRate).toFixed(2));
  const net = Number((amount - fee).toFixed(2));
  return { fee, net, feeRate };
}
