import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function WalletPage() {
  const session = await auth();
  const walletTransaction = (prisma as unknown as {
    walletTransaction?: {
      findMany: (args: {
        where: { userId: string };
        orderBy: { createdAt: "desc" };
      }) => Promise<
        Array<{
          id: string;
          note: string | null;
          createdAt: Date;
          type: "CREDIT" | "DEBIT";
          amount: number;
        }>
      >;
    };
  }).walletTransaction;

  const transactions = walletTransaction
    ? await walletTransaction.findMany({
        where: { userId: session!.user.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Wallet History</h2>

      <div className="divide-y divide-white/10 rounded-2xl bg-white/5">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex justify-between p-6">
            <div>
              <p className="font-medium">{tx.note}</p>
              <p className="text-sm text-white/50">
                {new Date(tx.createdAt).toLocaleDateString()}
              </p>
            </div>

            <span className={tx.type === "CREDIT" ? "text-green-400" : "text-red-400"}>
              {tx.type === "CREDIT" ? "+" : "-"} ₹ {tx.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
