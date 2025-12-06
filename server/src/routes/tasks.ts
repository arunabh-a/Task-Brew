import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { Priority, TaskStatus } from "../generated/prisma/enums.js";

const router = Router();

// GET /tasks - Get all tasks with optional filtering by status and search by title/description
router.get('/tasks', requireAuth, async (req, res) => {
    try {
        const { user } = req as any;
        const { status, search, priority } = req.query;

        const where: any = { userId: user.userId };

        // Filter by status if provided
        if (status && typeof status === 'string') {
            where.status = status as TaskStatus;
        }

        // Filter by priority if provided
        if (priority && typeof priority === 'string') {
            where.priority = priority as Priority;
        }

        // Search by title or description if provided
        if (search && typeof search === 'string') {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const tasks = await prisma.task.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /tasks - Create a new task
router.post('/tasks', requireAuth, async (req, res) => {
    try {
        const { user } = req as any;
        const { title, description, dueDate, priority, status } = req.body;

        // Validate required field
        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Title is required' });
        }

        // Validate priority if provided
        if (priority && !Object.values(Priority).includes(priority)) {
            return res.status(400).json({ message: 'Invalid priority value. Must be LOW, MEDIUM, or HIGH' });
        }

        // Validate status if provided
        if (status && !Object.values(TaskStatus).includes(status)) {
            return res.status(400).json({ message: 'Invalid status value. Must be TODO, IN_PROGRESS, or DONE' });
        }

        const newTask = await prisma.task.create({
            data: {
                userId: user.userId,
                title: title.trim(),
                description: description?.trim() || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority: priority || Priority.LOW,
                status: status || TaskStatus.TODO,
            },
        });
        return res.status(201).json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /tasks/:id - Update an existing task
router.put('/tasks/:id', requireAuth, async (req, res) => {
    try {
        const { user } = req as any;
        const taskId = req.params.id;
        const { title, description, dueDate, priority, status } = req.body;

        // Check if task exists and belongs to user
        const existingTask = await prisma.task.findFirst({
            where: { id: taskId, userId: user.userId },
        });

        if (!existingTask) {
            return res.status(404).json({ message: 'Task not found or unauthorized' });
        }

        // Validate priority if provided
        if (priority && !Object.values(Priority).includes(priority)) {
            return res.status(400).json({ message: 'Invalid priority value. Must be LOW, MEDIUM, or HIGH' });
        }

        // Validate status if provided
        if (status && !Object.values(TaskStatus).includes(status)) {
            return res.status(400).json({ message: 'Invalid status value. Must be TODO, IN_PROGRESS, or DONE' });
        }

        // Build update data object with only provided fields
        const updateData: any = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) updateData.status = status;

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
        });

        return res.status(200).json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE /tasks/:id - Delete a task
router.delete('/tasks/:id', requireAuth, async (req, res) => {
    try {
        const { user } = req as any;
        const taskId = req.params.id;

        // Check if task exists and belongs to user
        const existingTask = await prisma.task.findFirst({
            where: { id: taskId, userId: user.userId },
        });

        if (!existingTask) {
            return res.status(404).json({ message: 'Task not found or unauthorized' });
        }

        await prisma.task.delete({
            where: { id: taskId },
        });

        return res.status(200).json({ message: 'Task deleted successfully', id: taskId });
    } catch (error) {
        console.error('Error deleting task:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;