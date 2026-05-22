import chalk from 'chalk';
import type { tasks_v1 } from 'googleapis';
import { getAccount } from './config.js';

export interface TaskWithMeta {
  alias: string;
  listId: string;
  task: tasks_v1.Schema$Task;
}

export function formatTask(item: TaskWithMeta): string {
  const account = getAccount(item.alias);
  const label = account?.label ?? '?';
  const labelColored = chalk.cyan(`[${label}]`);
  const status = item.task.status === 'completed' ? chalk.green('☑') : chalk.gray('☐');
  const title = item.task.title ?? '(untitled)';
  const due = item.task.due ? chalk.yellow(` (due: ${item.task.due.slice(0, 10)})`) : '';
  const notes = item.task.notes ? chalk.dim(`  — ${item.task.notes.split('\n')[0]?.slice(0, 50)}`) : '';
  return `${labelColored} ${status}  ${title}${due}${notes}`;
}
