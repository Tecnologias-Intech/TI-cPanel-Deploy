import * as exec from '@actions/exec';
import * as fs from 'fs/promises';
import { Notifications } from './Notifications';
import { TiApi } from './TiApi';
import { DeploymentStatus } from '../enums/deployment-status.enum';

export class YarnCLI {
  environment: string;
  tiApi: TiApi | null = null;

  private notification = new Notifications('[TI-Deploy/Yarn-Cli]');

  constructor(environment: string, tiApi: TiApi) {
    this.environment = environment;
    this.tiApi = tiApi;
  }

  public async install(): Promise<void> {
    await this.tiApi?.updateDeployment({ status: DeploymentStatus.INSTALLING_DEPS });

    try {
      this.notification.info('Installing dependencies...');
      await exec.exec('yarn', ['install', '--frozen-lockfile']);
    } catch (e) {
      this.notification.error('Error installing dependencies');
      throw e;
    }
  }

  public async build(): Promise<void> {
    await this.tiApi?.updateDeployment({ status: DeploymentStatus.BUILD_APP });

    try {
      if (this.environment) {
        this.notification.info('Configuring .env file');
        await fs.writeFile('.env', this.environment);
        this.notification.success('.env file configured');
      } else {
        throw new Error('No env-secret was provided');
      }

      this.notification.info('Building application');
      await exec.exec('yarn', ['run', 'build']);
      this.notification.success('Application built');
    } catch (e) {
      this.notification.error('Error building application');
      throw e;
    }
  }
}
