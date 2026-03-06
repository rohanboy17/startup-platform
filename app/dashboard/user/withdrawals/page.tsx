import UserWithdrawalsLive from "@/components/user-withdrawals-live";

export default async function WithdrawalsPage() {
  const minWithdrawal = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 200);

  return <UserWithdrawalsLive minAmount={minWithdrawal} />;
}
