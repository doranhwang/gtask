import { Command } from 'commander';
import chalk from 'chalk';
import { updateTask } from '../lib/tasks.js';
import { resolveTaskRef } from '../lib/cache.js';
import { getAccount } from '../lib/config.js';

export function updateCommand(): Command {
  return new Command('update')
    .description('Update a task')
    .argument('<ref>', 'Task ref (numeric index or alias:listId:taskId)')
    .option('-t, --title <title>', 'New title')
    .option('-n, --notes <text>', 'New notes')
    .option('-d, --due <date>', 'New due date (YYYY-MM-DD), pass empty string to clear')
    .action(
      async (
        ref: string,
        opts: { title?: string; notes?: string; due?: string },
      ) => {
        const { alias, listId, taskId } = resolveTaskRef(ref);
        const body: Partial<{ title: string; notes: string; due: string | null }> = {};
        if (opts.title !== undefined) body.title = opts.title;
        if (opts.notes !== undefined) body.notes = opts.notes;
        if (opts.due !== undefined) {
          if (opts.due === '') {
            body.due = null;
          } else {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.due)) {
              console.error(chalk.red(`Invalid due date "${opts.due}". Use YYYY-MM-DD.`));
              process.exit(1);
            }
            body.due = new Date(opts.due + 'T00:00:00Z').toISOString();
          }
        }
        if (Object.keys(body).length === 0) {
          console.error(chalk.red('No update fields. Use -t, -n, or -d.'));
          process.exit(1);
        }
        await updateTask(alias, listId, taskId, body);
        const account = getAccount(alias);
        const label = account?.label ?? '?';
        console.log(chalk.green(`✓ Updated [${label}] task ${ref}`));
      },
    );
}
