import { Command } from 'commander';
import chalk from 'chalk';
import { createTask, resolveListId } from '../lib/tasks.js';
import { getAccount, getDefaultAlias } from '../lib/config.js';

export function addCommand(): Command {
  return new Command('add')
    .description('Add a task')
    .argument('<title>', 'Task title')
    .option('-a, --account <alias>', 'Account alias (default: configured default)')
    .option('-l, --list <listId>', 'Task list ID', '@default')
    .option('-d, --due <date>', 'Due date (YYYY-MM-DD)')
    .option('-n, --notes <text>', 'Task notes')
    .action(
      async (
        title: string,
        opts: { account?: string; list: string; due?: string; notes?: string },
      ) => {
        const alias = opts.account ?? getDefaultAlias();
        if (!alias) {
          console.error(chalk.red('No account specified and no default set.'));
          console.error(chalk.dim('Run: gtask auth add <alias>'));
          process.exit(1);
        }
        const account = getAccount(alias);
        if (!account) {
          console.error(chalk.red(`Account "${alias}" not found.`));
          process.exit(1);
        }

        const body: { title: string; notes?: string; due?: string } = { title };
        if (opts.notes) body.notes = opts.notes;
        if (opts.due) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.due)) {
            console.error(chalk.red(`Invalid due date "${opts.due}". Use YYYY-MM-DD.`));
            process.exit(1);
          }
          body.due = new Date(opts.due + 'T00:00:00Z').toISOString();
        }

        const listId = await resolveListId(alias, opts.list);
        const created = await createTask(alias, listId, body);
        console.log(
          chalk.green(`✓ Added to [${account.label}] ${alias}: ${created.title ?? title}`),
        );
      },
    );
}
