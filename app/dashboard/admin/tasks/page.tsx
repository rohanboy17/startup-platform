import TaskApprovalPanel from "../task-approval-panel";

export default function AdminTasksPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">Task Approval</h2>
      <TaskApprovalPanel />
    </div>
  );
}
