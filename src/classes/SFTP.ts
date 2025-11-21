import * as exec from '@actions/exec';
import { Notifications } from './Notifications';
import { TiApi } from './TiApi';
import { DeploymentStatus } from '../enums/deployment-status.enum';
import * as fs from 'fs';

export class SFTP {
  private notification = new Notifications('[TI-Deploy/cPanel]');
  tiApi: TiApi | null = null;
  username: string = '';
  server: string = '';
  port: string = '';
  sshPrivateKey: string = '';
  sshPassphrase: string = '';
  localPath: string = '';
  remotePath: string = '';
  privateKeyPath = '/tmp/id_rsa_deploy';
  knownHostsPath = '/tmp/known_hosts_deploy';

  constructor({
    credentials,
    sshPrivateKey,
    sshPassphrase,
    localPath,
    remotePath,
    tiApi
  }: {
    credentials: string,
    sshPrivateKey: string,
    sshPassphrase: string,
    localPath: string,
    remotePath: string,
    tiApi: TiApi
  }) {
    const [server, userPort] = credentials.split('@');
    const [username, port] = userPort.split(':');

    this.tiApi = tiApi;
    this.username = username;
    this.server = server;
    this.port = port;
    this.sshPrivateKey = sshPrivateKey;
    this.sshPassphrase = sshPassphrase;
    this.localPath = localPath;
    this.remotePath = remotePath;
  }

  public async setCredentials(): Promise<void> {
    this.notification.info('Configuring SSH credentials...');

    const writeKeyCmd = `
cat << 'EOF' > ${this.privateKeyPath}
${this.sshPrivateKey}
EOF
`;
    await exec.exec('sh', ['-c', writeKeyCmd]);
    await exec.exec('chmod', ['600', this.privateKeyPath]);

    await exec.exec(
      'ssh-keyscan',
      ['-T', '5', '-H', '-p', this.port, this.server],
      {
        ignoreReturnCode: true,
        outStream: fs.createWriteStream(this.knownHostsPath, { flags: 'a' })
      }
    );

    await exec.exec('ssh-agent', ['-a', '/tmp/ssh-agent-sock']);
    const env = { ...process.env, SSH_AUTH_SOCK: '/tmp/ssh-agent-sock' };

    if (this.sshPassphrase) {
      await exec.exec(
        'sh',
        ['-c', `printf "%s" "${this.sshPassphrase}" | ssh-add ${this.privateKeyPath}`],
        { env }
      );
    } else {
      await exec.exec('ssh-add', [this.privateKeyPath], { env });
    }

    this.notification.success('SSH credentials configured.');
  }

  public async deployHost(): Promise<void> {
    await this.tiApi?.updateDeployment({ status: DeploymentStatus.DEPLOY_APP });

    try {
      this.notification.info(
        `Deploying ${this.localPath} to ${this.username}@${this.server}:${this.remotePath} via SFTP...`
      );

      const env = { ...process.env, SSH_AUTH_SOCK: '/tmp/ssh-agent-sock' };

      const batch = [
        `-mkdir ${this.remotePath}`,
        `put -r ${this.localPath}/* ${this.remotePath}`
      ].join('\n');

      const batchPath = '/tmp/sftp-batch.txt';
      fs.writeFileSync(batchPath, batch, 'utf8');

      await exec.exec(
        'sftp',
        [
          '-b', batchPath,
          '-o', 'StrictHostKeyChecking=yes',
          '-o', `UserKnownHostsFile=${this.knownHostsPath}`,
          '-o', 'ConnectTimeout=5',
          '-P', this.port.toString(),
          `${this.username}@${this.server}`
        ],
        { env }
      );

      this.notification.success('SFTP deployment completed.');
    } catch (err) {
      this.notification.error('Error during SFTP deployment', err);
      throw err;
    } finally {
      await exec.exec('sh', ['-c', 'kill $SSH_AGENT_PID'], { ignoreReturnCode: true });
      await exec.exec('rm', ['-f', this.privateKeyPath, this.knownHostsPath], { ignoreReturnCode: true });
    }
  }
}
