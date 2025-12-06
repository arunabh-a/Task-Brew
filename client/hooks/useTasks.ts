import { useState, useCallback } from "react";
import { Task, Status, Priority } from "@/service/app.interface";
import { dummyTasks } from "@/lib/constants";

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>(dummyTasks);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

    const filteredTasks = tasks.filter((task) => {
        const matchesSearch =
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
            statusFilter === "all" || task.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const addTask = useCallback(
        (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
            const newTask: Task = {
                ...task,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            setTasks((prev) => [newTask, ...prev]);
        },
        []
    );

    const updateTask = useCallback((id: string, updates: Partial<Task>) => {
        setTasks((prev) =>
            prev.map((task) =>
                task.id === id
                    ? {
                          ...task,
                          ...updates,
                          updatedAt: new Date().toISOString(),
                      }
                    : task
            )
        );
    }, []);

    const deleteTask = useCallback((id: string) => {
        setTasks((prev) => prev.filter((task) => task.id !== id));
    }, []);

    const moveTask = useCallback((taskId: string, newStatus: Status) => {
        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId
                    ? {
                          ...task,
                          status: newStatus,
                          updatedAt: new Date().toISOString(),
                      }
                    : task
            )
        );
    }, []);

    const getTasksByStatus = useCallback(
        (status: Status) =>
            filteredTasks.filter((task) => task.status === status),
        [filteredTasks]
    );

    return {
        tasks: filteredTasks,
        allTasks: tasks,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        getTasksByStatus,
    };
}
