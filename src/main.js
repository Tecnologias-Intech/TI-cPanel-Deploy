"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const FirebaseCLI_1 = require("./classes/FirebaseCLI");
const TiApi_1 = require("./classes/TiApi");
const GithubCLI_1 = require("./classes/GithubCLI");
const YarnCLI_1 = require("./classes/YarnCLI");
const deployment_status_enum_1 = require("./enums/deployment-status.enum");
const SFTP_1 = require("./classes/SFTP");
const run = () => __awaiter(void 0, void 0, void 0, function* () {
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
    const tiApi = new TiApi_1.TiApi({ projectId, deploymentId, apiUrl: tiApiUrl });
    try {
        yield (tiApi === null || tiApi === void 0 ? void 0 : tiApi.updateDeployment({ updateJobUrl: true }));
        const sfpt = new SFTP_1.SFTP({
            credentials: sftpCredentials,
            sshPrivateKey: sftpSshPrivateKey,
            sshPassphrase: sftpSshPassphrase,
            localPath: sftpLocalPath,
            remotePath: sftpRemotePath,
            tiApi
        });
        const githubCli = new GithubCLI_1.GithubCLIOperator({
            branch: branchRef,
            version: newVersion,
            filePath: versionFilePath,
            deployPat,
            botToken,
            tiApi
        });
        yield githubCli.newBranch();
        yield githubCli.setVersion();
        const yarnCli = new YarnCLI_1.YarnCLI(envSecret, tiApi);
        yield yarnCli.install();
        yield yarnCli.build();
        const firebaseCLI = new FirebaseCLI_1.FirebaseCLIOperator(tiApi);
        yield firebaseCLI.setup(firebaseServiceAccount);
        yield firebaseCLI.exportIndexes(devProject);
        yield firebaseCLI.deployIndexes(prodProject);
        yield sfpt.setCredentials();
        yield sfpt.deployHost();
        yield tiApi.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.UPDATE_DATABASE });
        yield tiApi.updateDatabaseVersion(updateVersionUrl, newVersion);
        yield githubCli.pushChanges();
        yield githubCli.generatePR();
        yield githubCli.approvePR();
        yield githubCli.mergePR();
        yield githubCli.tagAndRelease();
        yield tiApi.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.DEPLOYED });
        console.log(`\n\n
    ************************************
    *****   DEPLOYMENT FINISHED    *****
    ************************************
    \n\n`);
    }
    catch (error) {
        let message = '';
        if (error instanceof Error)
            message = error.message;
        else
            message = 'An unexpected error occur during execution.';
        yield tiApi.updateDeployment({ error: message });
        core.setFailed('PROCESS ENDED WITH ERROR: ' + message);
    }
});
run();
