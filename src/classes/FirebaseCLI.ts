import * as exec from '@actions/exec';
import * as fs from 'fs/promises';
import { Notifications } from './Notifications';
import { TiApi } from './TiApi';
import { DeploymentStatus } from '../enums/deployment-status.enum';

export class FirebaseCLIOperator {
  private serviceAccountPath = 'service-account.json';
  private firestoreIndexPath = 'firestore.indexes.json';
  private readonly env: { [key: string]: any };
  private notification = new Notifications('[TI-Deploy/Firebase-Cli]');
  tiApi: TiApi | null = null;

  constructor(tiApi: TiApi) {
    this.env = {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS: this.serviceAccountPath,
      CI: 'true'
    };

    this.tiApi = tiApi;
  }

  public async setup(firebaseAccount: string): Promise<void> {
    await this.tiApi?.updateDeployment({ status: DeploymentStatus.DEPLOY_SETUP });
    this.notification.info('Installing Firebase CLI...');

    try {
      await exec.exec('npm', ['install', '-g', 'firebase-tools@14.15.2'], { env: this.env });
      this.notification.success('Firebase CLI Installed');
    } catch (e) {
      this.notification.error('Error installing Firebase CLI');
      throw e;
    }

    this.notification.info('Writing service credentials...');
    await fs.writeFile(this.serviceAccountPath, firebaseAccount);
    this.notification.success('Service credentials written');
  }

  public async exportIndexes(sourceProject: string): Promise<void> {
    await this.tiApi?.updateDeployment({ status: DeploymentStatus.UPDATE_INDEXES });

    try {
      this.notification.info(`Exporting Firestore indexes from ${sourceProject}...`);
      await exec.exec('firebase', [`use`, sourceProject], { env: this.env });
      await exec.exec('firebase', [`projects:list`], { env: this.env });
      await exec.exec('bash', ['-c', `firebase firestore:indexes --project ${sourceProject} > ${this.firestoreIndexPath}`], { env: this.env });

      this.notification.success(`Indexes exported to ${this.firestoreIndexPath}`);
    } catch (e) {
      this.notification.error('Error exporting to firebase-indexes.json');
      throw e;
    }
  }

  public async deployIndexes(targetProject: string): Promise<void> {
    try {
      this.notification.info(`Deploying Firestore indexes to ${targetProject}`);
      await exec.exec('firebase', [`use`, targetProject], { env: this.env });
      await exec.exec('firebase', [`projects:list`], { env: this.env });
      await exec.exec('firebase', [
        'deploy',
        '--project', targetProject,
        '--only', 'firestore:indexes',
        '--non-interactive',
        '--force'
      ], { env: this.env });

      this.notification.success(`Index deployment completed`);
    } catch (e) {
      this.notification.error('Error deploying indexes to production');
      throw e;
    }
  }
}
