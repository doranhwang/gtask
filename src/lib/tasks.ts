import { google, tasks_v1 } from 'googleapis';
import { getAuthClient } from './auth.js';

export async function getTasksClient(alias: string): Promise<tasks_v1.Tasks> {
  const auth = await getAuthClient(alias);
  return google.tasks({ version: 'v1', auth });
}

export async function listTaskLists(alias: string): Promise<tasks_v1.Schema$TaskList[]> {
  const client = await getTasksClient(alias);
  const res = await client.tasklists.list({ maxResults: 100 });
  return res.data.items ?? [];
}

export async function listTasks(
  alias: string,
  listId = '@default',
  showCompleted = false,
): Promise<tasks_v1.Schema$Task[]> {
  const client = await getTasksClient(alias);
  const res = await client.tasks.list({
    tasklist: listId,
    showCompleted,
    showHidden: false,
    maxResults: 100,
  });
  return res.data.items ?? [];
}

export async function createTask(
  alias: string,
  listId: string,
  body: { title: string; notes?: string; due?: string },
): Promise<tasks_v1.Schema$Task> {
  const client = await getTasksClient(alias);
  const res = await client.tasks.insert({ tasklist: listId, requestBody: body });
  return res.data;
}

export async function completeTask(
  alias: string,
  listId: string,
  taskId: string,
): Promise<tasks_v1.Schema$Task> {
  const client = await getTasksClient(alias);
  const res = await client.tasks.patch({
    tasklist: listId,
    task: taskId,
    requestBody: { status: 'completed' },
  });
  return res.data;
}

export async function deleteTask(alias: string, listId: string, taskId: string): Promise<void> {
  const client = await getTasksClient(alias);
  await client.tasks.delete({ tasklist: listId, task: taskId });
}

export async function updateTask(
  alias: string,
  listId: string,
  taskId: string,
  body: Partial<{ title: string; notes: string; due: string | null }>,
): Promise<tasks_v1.Schema$Task> {
  const client = await getTasksClient(alias);
  const res = await client.tasks.patch({
    tasklist: listId,
    task: taskId,
    requestBody: body,
  });
  return res.data;
}
