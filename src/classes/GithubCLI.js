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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubCLIOperator = void 0;
const exec = __importStar(require("@actions/exec"));
const github = __importStar(require("@actions/github"));
const promises_1 = __importDefault(require("fs/promises"));
const Notifications_1 = require("./Notifications");
const deployment_status_enum_1 = require("../enums/deployment-status.enum");
class GithubCLIOperator {
    constructor({ branch, version, filePath, deployPat, botToken, tiApi }) {
        this.branch = '';
        this.version = '';
        this.filePath = '';
        this.versionBranch = '';
        this.owner = '';
        this.repo = '';
        this.prNumber = 0;
        this.patOctokit = null;
        this.botOctokit = null;
        this.notification = new Notifications_1.Notifications('[TI-Deploy/Github-Cli]');
        this.tiApi = null;
        this.branch = branch;
        this.version = version;
        this.filePath = filePath;
        this.versionBranch = `version-update-${this.version}`;
        this.owner = github.context.repo.owner;
        this.repo = github.context.repo.repo;
        this.patOctokit = github.getOctokit(deployPat);
        this.botOctokit = github.getOctokit(botToken);
        this.tiApi = tiApi;
    }
    newBranch() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.SETTING_VERSION }));
            try {
                this.notification.info(`Setting up new branch ${this.versionBranch}`);
                yield exec.exec('git', ['fetch', 'origin', this.branch]);
                yield exec.exec('git', ['checkout', '-b', this.versionBranch, `origin/${this.branch}`]);
            }
            catch (e) {
                this.notification.error(`Could not create new branch`);
                throw e;
            }
        });
    }
    setVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.notification.info(`Setting up new version ${this.version} into ${this.filePath}`);
                yield promises_1.default.writeFile(this.filePath, this.version, 'utf8');
            }
            catch (e) {
                this.notification.error(`Could not set new version`);
                throw e;
            }
        });
    }
    pushChanges() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.notification.info(`Setting up bot credentials`);
                yield exec.exec('git', ['config', 'user.name', 'github-actions[bot]']);
                yield exec.exec('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
            }
            catch (e) {
                this.notification.error(`Could not set bot credentials`, e);
                throw e;
            }
            try {
                this.notification.info(`Generating commit and pushing changes`);
                yield exec.exec('git', ['add', this.filePath]);
                yield exec.exec('git', ['commit', '-m', `New version release: v${this.version}`]);
                yield exec.exec('git', ['push', 'origin', '-u', this.versionBranch]);
            }
            catch (e) {
                this.notification.error(`Could not push changes`, e);
                throw e;
            }
        });
    }
    generatePR() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.GENERATE_PR }));
            try {
                this.notification.info(`Generating new pull request`);
                const prTitle = `New release v${this.version}`;
                const prBody = `This PR updated version to ${this.version} on production.`;
                const prResponse = yield this.botOctokit.rest.pulls.create({
                    owner: this.owner,
                    repo: this.repo,
                    title: prTitle,
                    head: this.versionBranch,
                    base: this.branch,
                    body: prBody
                });
                this.prNumber = prResponse.data.number;
                const prUrl = prResponse.data.html_url;
                this.notification.success(`Pull request generated: ${prUrl}`);
            }
            catch (e) {
                this.notification.error(`Pull request not generated`, e);
                throw e;
            }
        });
    }
    approvePR() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.APPROVE_PR }));
            try {
                this.notification.info(`Approving pull request - ${this.prNumber}`);
                yield this.patOctokit.rest.pulls.createReview({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: this.prNumber,
                    event: 'APPROVE'
                });
                this.notification.success(`Pull request approved`);
            }
            catch (e) {
                this.notification.error(`Pull request not approved`, e);
                throw e;
            }
        });
    }
    mergePR() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.MERGE_PR }));
            try {
                this.notification.info(`Merging pull request - ${this.prNumber}`);
                yield this.patOctokit.rest.pulls.merge({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: this.prNumber,
                    merge_method: 'merge'
                });
                this.notification.success(`Pull request merged`);
            }
            catch (e) {
                this.notification.error(`Pull request not merged`, e);
                throw e;
            }
        });
    }
    tagAndRelease() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.GENERATE_RELEASE_N_TAG }));
            const tagName = `v${this.version}`;
            try {
                this.notification.info(`Creating and pushing Git Tag: ${tagName}`);
                yield exec.exec('git', ['tag', tagName]);
                yield exec.exec('git', ['push', 'origin', tagName]);
                this.notification.success(`Tag ${tagName} created and pushed.`);
            }
            catch (e) {
                this.notification.error('Could not create or push Git Tag. Aborting Release', e);
                throw e;
            }
            try {
                this.notification.info(`Creating GitHub Release for ${tagName}`);
                const releaseName = `Release ${tagName}`;
                const releaseBody = `Manual release\n- Deployment from ${this.branch}\n- Version update to ${this.version}`;
                const releaseResponse = yield this.botOctokit.rest.repos.createRelease({
                    owner: this.owner,
                    repo: this.repo,
                    tag_name: tagName,
                    name: releaseName,
                    body: releaseBody,
                    draft: false,
                    prerelease: false,
                    target_commitish: this.branch
                });
                const releaseId = releaseResponse.data.id;
                const releaseUrl = releaseResponse.data.html_url;
                yield ((_b = this.tiApi) === null || _b === void 0 ? void 0 : _b.updateDeployment({
                    metadata: {
                        release: {
                            id: releaseId,
                            url: releaseUrl
                        }
                    }
                }));
                this.notification.success(`Release generated: ${releaseUrl}`);
                return { id: releaseId, url: releaseUrl };
            }
            catch (e) {
                this.notification.error('Could not create GitHub Release', e);
                throw e;
            }
        });
    }
}
exports.GithubCLIOperator = GithubCLIOperator;
