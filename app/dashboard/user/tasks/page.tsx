import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import SubmitTaskModal from "@/components/submit-task-modal";

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    where: {
      status: "ACTIVE",
      remainingBudget: { gt: 0 },
    },
  });

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Available Tasks</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {tasks.length === 0 ? (
          <div className="py-20 text-center text-white/50 md:col-span-2">
            No tasks available right now.
          </div>
        ) : (
          tasks.map((task) => (
            <Card
              key={task.id}
              className="rounded-2xl border-white/10 bg-white/5 backdrop-blur-md transition hover:scale-[1.02] hover:shadow-xl hover:ring-1 hover:ring-white/20"
            >
              <CardContent className="space-y-4 p-6">
                <h3 className="text-xl font-semibold">{task.title}</h3>
                <p className="text-sm text-white/60">{task.description}</p>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-green-400">₹ {task.reward}</span>
                  <SubmitTaskModal taskId={task.id} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
