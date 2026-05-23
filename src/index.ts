#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { authCommand } from './commands/auth.js';
import { listsCommand } from './commands/lists.js';
import { listCommand } from './commands/list.js';
import { addCommand } from './commands/add.js';
import { doneCommand } from './commands/done.js';
import { rmCommand } from './commands/rm.js';
import { updateCommand } from './commands/update.js';

const requirePkg = createRequire(import.meta.url);
const pkg = requirePkg('../package.json') as { version: string };

const program = new Command();
program
  .name('gtask')
  .description('Google Tasks CLI with multi-account support')
  .version(pkg.version);

program.addCommand(authCommand());
program.addCommand(listsCommand());
program.addCommand(listCommand());
program.addCommand(addCommand());
program.addCommand(doneCommand());
program.addCommand(rmCommand());
program.addCommand(updateCommand());

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
