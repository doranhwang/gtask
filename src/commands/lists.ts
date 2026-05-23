import { Command } from 'commander';
import chalk from 'chalk';
import { listTaskLists, createTaskList, deleteTaskList, resolveListId } from '../lib/tasks.js';
import { listAliases, getAccount } from '../lib/config.js';

export function listsCommand(): Command {
  const cmd = new Command('lists')
    .description('Show task lists, or manage them via create/rm subcommands')
    .option('-a, --account <alias>', 'Filter by account alias')
    .option('--full', 'Show full list IDs (not truncated)')
    .action(async (opts: { account?: string; full?: boolean }) => {
      const aliases = opts.account ? [opts.account] : listAliases();
      if (aliases.length === 0) {
        console.log(chalk.dim('No accounts. Run: gtask auth add <alias>'));
        return;
      }
      for (const alias of aliases) {
        const account = getAccount(alias);
        if (!account) {
          console.error(chalk.red(`Account "${alias}" not found.`));
          continue;
        }
        try {
          const lists = await listTaskLists(alias);
          console.log(chalk.bold(`[${account.label}] ${alias}`));
          if (lists.length === 0) {
            console.log(chalk.dim('  (no lists)'));
            continue;
          }
          for (const l of lists) {
            const id = l.id ?? '';
            const idDisplay = opts.full
              ? id
              : id.length > 12
                ? id.slice(0, 12) + '...'
                : id;
            console.log(`  ${chalk.dim(idDisplay)}  ${l.title ?? '(untitled)'}`);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(chalk.red(`[${account.label}] ${alias}: ${msg}`));
        }
      }
    });

  cmd
    .command('create <name>')
    .description('Create a new task list')
    .requiredOption('-a, --account <alias>', 'Account alias')
    .action(async (name: string, opts: { account: string }) => {
      const account = getAccount(opts.account);
      if (!account) {
        console.error(chalk.red(`Account "${opts.account}" not found.`));
        process.exit(1);
      }
      const created = await createTaskList(opts.account, name);
      console.log(
        chalk.green(`✓ Created [${account.label}] task list "${created.title ?? name}"`),
      );
    });

  cmd
    .command('rm <name>')
    .description('Delete a task list (by name or ID)')
    .requiredOption('-a, --account <alias>', 'Account alias')
    .action(async (name: string, opts: { account: string }) => {
      const account = getAccount(opts.account);
      if (!account) {
        console.error(chalk.red(`Account "${opts.account}" not found.`));
        process.exit(1);
      }
      const listId = await resolveListId(opts.account, name);
      await deleteTaskList(opts.account, listId);
      console.log(chalk.green(`✓ Deleted [${account.label}] task list "${name}"`));
    });

  return cmd;
}
