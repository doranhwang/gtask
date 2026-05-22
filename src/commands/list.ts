import { Command } from 'commander';
import chalk from 'chalk';
import { listTasks, listTaskLists } from '../lib/tasks.js';
import { listAliases, getAccount } from '../lib/config.js';
import { formatTask, type TaskWithMeta } from '../lib/format.js';
import { saveListCache } from '../lib/cache.js';

export function listCommand(): Command {
  return new Command('list')
    .alias('ls')
    .description('Show tasks (merged across accounts by default)')
    .option('-a, --account <alias>', 'Filter by account alias')
    .option('-l, --list <listId>', 'Specific task list ID')
    .option('--all-lists', 'Include all task lists per account (not only @default)')
    .option('--completed', 'Include completed tasks')
    .action(
      async (opts: {
        account?: string;
        list?: string;
        allLists?: boolean;
        completed?: boolean;
      }) => {
        const aliases = opts.account ? [opts.account] : listAliases();
        if (aliases.length === 0) {
          console.log(chalk.dim('No accounts. Run: gtask auth add <alias>'));
          return;
        }

        const all: TaskWithMeta[] = [];

        for (const alias of aliases) {
          const account = getAccount(alias);
          if (!account) continue;

          let listIds: string[];
          if (opts.list) {
            listIds = [opts.list];
          } else if (opts.allLists) {
            const lists = await listTaskLists(alias);
            listIds = lists.map((l) => l.id!).filter(Boolean);
          } else {
            listIds = ['@default'];
          }

          for (const listId of listIds) {
            try {
              const items = await listTasks(alias, listId, opts.completed ?? false);
              for (const task of items) {
                all.push({ alias, listId, task });
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              console.error(chalk.red(`[${account.label}] ${alias}/${listId}: ${msg}`));
            }
          }
        }

        all.sort((a, b) => {
          const da = a.task.due ?? '';
          const db = b.task.due ?? '';
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return da.localeCompare(db);
        });

        if (all.length === 0) {
          console.log(chalk.dim('(no tasks)'));
          saveListCache([]);
          return;
        }

        saveListCache(
          all.map((t) => ({
            alias: t.alias,
            listId: t.listId,
            taskId: t.task.id ?? '',
          })),
        );

        const width = String(all.length).length;
        all.forEach((item, idx) => {
          const num = chalk.dim(`[${String(idx + 1).padStart(width)}]`);
          console.log(`${num} ${formatTask(item)}`);
        });
      },
    );
}
