import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function UserSubmissionsPage() {
  const session = await auth();

  const submissions = await prisma.submission.findMany({
    where: { userId: session!.user.id },
    include: {
      task: {
        select: {
          title: true,
          reward: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Submission History</h2>

      <div className="space-y-4">
        {submissions.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No submissions yet. Complete a task to get started.
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => (
            <Card key={submission.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="flex items-center justify-between gap-4 p-6">
                <div>
                  <p className="font-semibold">{submission.task.title}</p>
                  <p className="text-sm text-white/60">
                    {new Date(submission.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/70">Reward: INR {submission.task.reward}</p>
                  <p
                    className={`text-sm ${
                      submission.status === "APPROVED"
                        ? "text-emerald-400"
                        : submission.status === "REJECTED"
                          ? "text-red-400"
                          : "text-amber-300"
                    }`}
                  >
                    {submission.status}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
