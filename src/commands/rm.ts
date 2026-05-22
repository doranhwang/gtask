import { Command } from 'commander';
import chalk from 'chalk';
import { deleteTask } from '../lib/tasks.js';
import { resolveTaskRef } from '../lib/cache.js';
import { getAccount } from '../lib/config.js';

export function rmCommand(): Command {
  return new Command('rm')
    .description('Delete a task')
    .argument('<ref>', 'Task ref (numeric index from last list, or alias:listId:taskId)')
    .action(async (ref: string) => {
      const { alias, listId, taskId } = resolveTaskRef(ref);
      await deleteTask(alias, listId, taskId);
      const account = getAccount(alias);
      const label = account?.label ?? '?';
      console.log(chalk.green(`✓ Deleted [${label}] task ${ref}`));
    });
}
