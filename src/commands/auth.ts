import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, unlinkSync } from 'fs';
import { authenticate } from '../lib/auth.js';
import { loadConfig, saveConfig, getTokenPath } from '../lib/config.js';

export function authCommand(): Command {
  const cmd = new Command('auth').description('Manage account authentication');

  cmd
    .command('add <alias>')
    .description('Add and authenticate a new account')
    .option('-e, --email <email>', 'Email address (for display)')
    .option('-l, --label <label>', 'Single-letter label (e.g., P, M, L)')
    .action(async (alias: string, opts: { email?: string; label?: string }) => {
      console.log(chalk.dim(`Opening browser to authenticate "${alias}"...`));
      await authenticate(alias);
      const config = loadConfig();
      config.accounts[alias] = {
        email: opts.email ?? '',
        label: opts.label ?? alias.charAt(0).toUpperCase(),
      };
      if (!config.default_alias) config.default_alias = alias;
      saveConfig(config);
      console.log(chalk.green(`✓ Account "${alias}" authenticated.`));
    });

  cmd
    .command('list')
    .description('List registered accounts')
    .action(() => {
      const config = loadConfig();
      const entries = Object.entries(config.accounts);
      if (entries.length === 0) {
        console.log(chalk.dim('No accounts. Run: gtask auth add <alias>'));
        return;
      }
      for (const [alias, info] of entries) {
        const star = alias === config.default_alias ? chalk.yellow(' *') : '';
        console.log(`[${info.label}] ${alias}${star}  ${chalk.dim(info.email)}`);
      }
    });

  cmd
    .command('rm <alias>')
    .description('Remove an account')
    .action((alias: string) => {
      const config = loadConfig();
      if (!config.accounts[alias]) {
        console.error(chalk.red(`Account "${alias}" not found.`));
        process.exit(1);
      }
      delete config.accounts[alias];
      if (config.default_alias === alias) {
        const remaining = Object.keys(config.accounts);
        config.default_alias = remaining[0];
      }
      saveConfig(config);
      const tokenPath = getTokenPath(alias);
      if (existsSync(tokenPath)) unlinkSync(tokenPath);
      console.log(chalk.green(`✓ Account "${alias}" removed.`));
    });

  cmd
    .command('default <alias>')
    .description('Set default account')
    .action((alias: string) => {
      const config = loadConfig();
      if (!config.accounts[alias]) {
        console.error(chalk.red(`Account "${alias}" not found.`));
        process.exit(1);
      }
      config.default_alias = alias;
      saveConfig(config);
      console.log(chalk.green(`✓ Default account set to "${alias}".`));
    });

  return cmd;
}
