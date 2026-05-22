import { Command } from 'commander';
import chalk from 'chalk';
import { listTaskLists } from '../lib/tasks.js';
import { listAliases, getAccount } from '../lib/config.js';

export function listsCommand(): Command {
  return new Command('lists')
    .description('Show all task lists (across accounts)')
    .option('-a, --account <alias>', 'Filter by account alias')
    .action(async (opts: { account?: string }) => {
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
            const idShort = id.length > 12 ? id.slice(0, 12) + '...' : id;
            console.log(`  ${chalk.dim(idShort)}  ${l.title ?? '(untitled)'}`);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(chalk.red(`[${account.label}] ${alias}: ${msg}`));
        }
      }
    });
}
