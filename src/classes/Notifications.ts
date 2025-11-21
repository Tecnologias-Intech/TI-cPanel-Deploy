import * as core from '@actions/core';

export class Notifications {
  prefix: string = '[TI-Deploy]';
  icons = {
    info: '🔵',
    success: '🟢',
    warning: '🟡',
    error: '🔴'
  };

  constructor(
    prefix?: string,
    icons?: {
      info?: string,
      success?: string,
      warning?: string,
      error?: string
    }) {
    if (prefix) this.prefix = prefix;
    if (icons) {
      this.icons = {
        ...this.icons,
        ...icons
      };
    }
  }

  error(message: string, error?: any): void {
    core.info(`${this.icons.error} ${this.prefix}: ${message}`);
    core.error(error);
  }

  info(message: string): void {
    core.info('\u200B');
    core.info(`${this.icons.info} ${this.prefix}: ${message}`);
  }

  success(message: string): void {
    core.info(`${this.icons.success} ${this.prefix}: ${message}`);
  }

  warning(message: string): void {
    core.warning(`${this.icons.warning} ${this.prefix}: ${message}`);
  }
}
