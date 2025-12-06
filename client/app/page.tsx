'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Status, User } from "@/service/app.interface";
import { useTasks } from "@/hooks/useTasks";
import { Header } from "@/components/layout/Header";
import { TaskToolbar } from "@/components/layout/Toolbar";
import { TaskListView } from "@/components/tasks/TaskList";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDialog } from "@/components/tasks/TaskDialog";

// Mock user for demo (in real app, this would come from auth context)
const mockUser: User = {
  id: "1",
  email: "user@example.com",
  name: "John Doe",
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(mockUser); // Start with mock user for demo
  const {
    tasks,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasksByStatus,
  } = useTasks();

  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<Status>("TODO");

  const handleLogout = () => {
    setUser(null);
    router.push("/login");
  };

  const handleCreateTask = (status?: Status) => {
    if (status) {
      setDefaultStatus(status);
    } else {
      setDefaultStatus("TODO");
    }
    setIsCreateDialogOpen(true);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={handleLogout} />

      <main className="container px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">My Tasks</h1>
          <p className="text-muted-foreground">
            Manage and organize your work efficiently
          </p>
        </div>

        <TaskToolbar
          view={view}
          onViewChange={setView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onCreateTask={() => handleCreateTask()}
        />

        {view === "list" ? (
          <TaskListView
            tasks={tasks}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        ) : (
          <KanbanBoard
            tasks={tasks}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onMove={moveTask}
            onAddTask={handleCreateTask}
            getTasksByStatus={getTasksByStatus}
          />
        )}

        <TaskDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={addTask}
          defaultStatus={defaultStatus}
        />
      </main>
    </div>
  );
}
