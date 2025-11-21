import * as core from '@actions/core';
import { FirebaseCLIOperator } from './classes/FirebaseCLI';
import { TiApi } from './classes/TiApi';
import { GithubCLIOperator } from './classes/GithubCLI';
import { YarnCLI } from './classes/YarnCLI';
import { DeploymentStatus } from './enums/deployment-status.enum';
import { SFTP } from './classes/SFTP';

const run = async (): Promise<void> => {
  console.log(`\n\n
    ***********************************
    *****   DEPLOYMENT STARTED    *****
    ***********************************
    \n\n`);

  const newVersion = core.getInput('new-version', { required: true });
  const projectId = core.getInput('project-id', { required: true });
  const deploymentId = core.getInput('deployment-id', { required: true });
  const branchRef = core.getInput('branch');
  const deployPat = core.getInput('github-pat', { required: true });
  const versionFilePath = core.getInput('file-path');
  const botToken = core.getInput('github-token', { required: true });
  const envSecret = core.getInput('env-secret', { required: true });
  const firebaseServiceAccount = core.getInput('firebase-service-account', { required: true });
  const devProject = core.getInput('firebase-dev', { required: true });
  const prodProject = core.getInput('firebase-prod', { required: true });
  const updateVersionUrl = core.getInput('update-version-url', { required: true });
  const tiApiUrl = core.getInput('ti-api', { required: true });
  const sftpCredentials = core.getInput('sftp-credentials', { required: true });
  const sftpLocalPath = core.getInput('sftp-local-path');
  const sftpRemotePath = core.getInput('sftp-remote-path', { required: true });
  const sftpSshPrivateKey = core.getInput('ssh_private_key', { required: true });
  const sftpSshPassphrase = core.getInput('ssh_passphrase', { required: true });

  const tiApi = new TiApi({ projectId, deploymentId, apiUrl: tiApiUrl });

  try {
    await tiApi?.updateDeployment({ updateJobUrl: true });

    const sfpt = new SFTP({
      credentials: sftpCredentials,
      sshPrivateKey: sftpSshPrivateKey,
      sshPassphrase: sftpSshPassphrase,
      localPath: sftpLocalPath,
      remotePath: sftpRemotePath,
      tiApi
    });

    const githubCli = new GithubCLIOperator({
      branch: branchRef,
      version: newVersion,
      filePath: versionFilePath,
      deployPat,
      botToken,
      tiApi
    });

    await githubCli.newBranch();
    await githubCli.setVersion();

    const yarnCli = new YarnCLI(envSecret, tiApi);
    await yarnCli.install();
    await yarnCli.build();

    const firebaseCLI = new FirebaseCLIOperator(tiApi);
    await firebaseCLI.setup(firebaseServiceAccount);
    await firebaseCLI.exportIndexes(devProject);
    await firebaseCLI.deployIndexes(prodProject);

    await sfpt.setCredentials();
    await sfpt.deployHost();

    await tiApi.updateDeployment({ status: DeploymentStatus.UPDATE_DATABASE });
    await tiApi.updateDatabaseVersion(updateVersionUrl, newVersion);

    await githubCli.pushChanges();
    await githubCli.generatePR();
    await githubCli.approvePR();
    await githubCli.mergePR();

    await githubCli.tagAndRelease();
    await tiApi.updateDeployment({ status: DeploymentStatus.DEPLOYED });

    console.log(`\n\n
    ************************************
    *****   DEPLOYMENT FINISHED    *****
    ************************************
    \n\n`);

  } catch (error) {
    let message = '';

    if (error instanceof Error) message = error.message;
    else message = 'An unexpected error occur during execution.';

    await tiApi.updateDeployment({ error: message });
    core.setFailed('PROCESS ENDED WITH ERROR: ' + message);
  }
};

run();
