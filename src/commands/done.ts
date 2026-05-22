import { Command } from 'commander';
import chalk from 'chalk';
import { completeTask } from '../lib/tasks.js';
import { resolveTaskRef } from '../lib/cache.js';
import { getAccount } from '../lib/config.js';

export function doneCommand(): Command {
  return new Command('done')
    .description('Mark a task as completed')
    .argument('<ref>', 'Task ref (numeric index from last list, or alias:listId:taskId)')
    .action(async (ref: string) => {
      const { alias, listId, taskId } = resolveTaskRef(ref);
      await completeTask(alias, listId, taskId);
      const account = getAccount(alias);
      const label = account?.label ?? '?';
      console.log(chalk.green(`✓ Completed [${label}] task ${ref}`));
    });
}
