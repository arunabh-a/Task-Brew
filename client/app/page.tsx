"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Status } from "@/service/app.interface";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { TaskToolbar } from "@/components/layout/Toolbar";
import { TaskListView } from "@/components/tasks/TaskList";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDialog } from "@/components/tasks/TaskDialog";

export default function Dashboard() {
    const router = useRouter();
    const { user, loading: authLoading, logout } = useAuth();
    const {
        tasks,
        loading: tasksLoading,
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

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!authLoading && !user) {
            router.push("/home");
        }
    }, [user, authLoading, router]);

    const handleLogout = async () => {
        await logout();
    };

    const handleCreateTask = (status?: Status) => {
        if (status) {
            setDefaultStatus(status);
        } else {
            setDefaultStatus("TODO");
        }
        setIsCreateDialogOpen(true);
    };

    // Show loading state while checking authentication
    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render if not authenticated
    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-backgrond flex flex-col items-center">
            <Header user={user} onLogout={handleLogout} />

            <main className="container px-4 md:px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">
                        My Tasks
                    </h1>
                    <p className="text-muted-foreground">
                        Manage and organize your work efficiently
                    </p>
                </div>

                <TaskToolbar
                    view={view}
                    onViewChange={setView}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    statusFilter={statusFilter.toLowerCase() as Status | "all"}
                    onStatusFilterChange={(status) => setStatusFilter(status === "all" ? "ALL" : status)}
                    onCreateTask={() => handleCreateTask()}
                />

                {tasksLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">
                                Loading tasks...
                            </p>
                        </div>
                    </div>
                ) : view === "list" ? (
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
