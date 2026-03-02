"use client";

import { useCallback, useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  totalBudget: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "REJECTED";
};

export default function TaskApprovalPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actingTaskId, setActingTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "GET",
        credentials: "include",
      });
      const data = (await res.json()) as { tasks?: Task[]; error?: string };

      if (!res.ok) {
        setMessage(data.error ?? "Failed to load pending tasks");
        setTasks([]);
        return;
      }

      setTasks(data.tasks ?? []);
    } catch {
      setMessage("Network error while loading tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function updateTask(taskId: string, action: "ACTIVE" | "REJECTED") {
    setActingTaskId(taskId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        setMessage(data.error ?? `Failed to set task ${action}`);
        return;
      }

      setMessage(data.message ?? `Task ${action}`);
      await loadTasks();
    } catch {
      setMessage("Network error while updating task");
    } finally {
      setActingTaskId(null);
    }
  }

  if (loading) {
    return <p>Loading pending tasks...</p>;
  }

  return (
    <div>
      <h2>Pending Tasks</h2>
      {message ? <p>{message}</p> : null}
      {tasks.length === 0 ? <p>No pending tasks.</p> : null}
      {tasks.map((task) => (
        <div key={task.id}>
          <p>
            <strong>{task.title}</strong>
          </p>
          <p>{task.description}</p>
          <p>Reward: {task.reward}</p>
          <p>Total Budget: {task.totalBudget}</p>
          <button
            type="button"
            onClick={() => updateTask(task.id, "ACTIVE")}
            disabled={actingTaskId === task.id}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => updateTask(task.id, "REJECTED")}
            disabled={actingTaskId === task.id}
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}
