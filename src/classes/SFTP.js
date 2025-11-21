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
exports.SFTP = void 0;
const exec = __importStar(require("@actions/exec"));
const Notifications_1 = require("./Notifications");
const deployment_status_enum_1 = require("../enums/deployment-status.enum");
const fs = __importStar(require("fs"));
class SFTP {
    constructor({ credentials, sshPrivateKey, sshPassphrase, localPath, remotePath, tiApi }) {
        this.notification = new Notifications_1.Notifications('[TI-Deploy/cPanel]');
        this.tiApi = null;
        this.username = '';
        this.server = '';
        this.port = '';
        this.sshPrivateKey = '';
        this.sshPassphrase = '';
        this.localPath = '';
        this.remotePath = '';
        this.privateKeyPath = '/tmp/id_rsa_deploy';
        this.knownHostsPath = '/tmp/known_hosts_deploy';
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
    setCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            this.notification.info('Configuring SSH credentials...');
            const writeKeyCmd = `
cat << 'EOF' > ${this.privateKeyPath}
${this.sshPrivateKey}
EOF
`;
            yield exec.exec('sh', ['-c', writeKeyCmd]);
            yield exec.exec('chmod', ['600', this.privateKeyPath]);
            yield exec.exec('ssh-keyscan', ['-T', '5', '-H', '-p', this.port, this.server], {
                ignoreReturnCode: true,
                outStream: fs.createWriteStream(this.knownHostsPath, { flags: 'a' })
            });
            yield exec.exec('ssh-agent', ['-a', '/tmp/ssh-agent-sock']);
            const env = Object.assign(Object.assign({}, process.env), { SSH_AUTH_SOCK: '/tmp/ssh-agent-sock' });
            if (this.sshPassphrase) {
                yield exec.exec('sh', ['-c', `printf "%s" "${this.sshPassphrase}" | ssh-add ${this.privateKeyPath}`], { env });
            }
            else {
                yield exec.exec('ssh-add', [this.privateKeyPath], { env });
            }
            this.notification.success('SSH credentials configured.');
        });
    }
    deployHost() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.DEPLOY_APP }));
            try {
                this.notification.info(`Deploying ${this.localPath} to ${this.username}@${this.server}:${this.remotePath} via SFTP...`);
                const env = Object.assign(Object.assign({}, process.env), { SSH_AUTH_SOCK: '/tmp/ssh-agent-sock' });
                const batch = [
                    `-mkdir ${this.remotePath}`,
                    `put -r ${this.localPath}/* ${this.remotePath}`
                ].join('\n');
                const batchPath = '/tmp/sftp-batch.txt';
                fs.writeFileSync(batchPath, batch, 'utf8');
                yield exec.exec('sftp', [
                    '-b', batchPath,
                    '-o', 'StrictHostKeyChecking=yes',
                    '-o', `UserKnownHostsFile=${this.knownHostsPath}`,
                    '-o', 'ConnectTimeout=5',
                    '-P', this.port.toString(),
                    `${this.username}@${this.server}`
                ], { env });
                this.notification.success('SFTP deployment completed.');
            }
            catch (err) {
                this.notification.error('Error during SFTP deployment', err);
                throw err;
            }
            finally {
                yield exec.exec('sh', ['-c', 'kill $SSH_AGENT_PID'], { ignoreReturnCode: true });
                yield exec.exec('rm', ['-f', this.privateKeyPath, this.knownHostsPath], { ignoreReturnCode: true });
            }
        });
    }
}
exports.SFTP = SFTP;
