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
exports.FirebaseCLIOperator = void 0;
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs/promises"));
const Notifications_1 = require("./Notifications");
const deployment_status_enum_1 = require("../enums/deployment-status.enum");
class FirebaseCLIOperator {
    constructor(tiApi) {
        this.serviceAccountPath = 'service-account.json';
        this.firestoreIndexPath = 'firestore.indexes.json';
        this.notification = new Notifications_1.Notifications('[TI-Deploy/Firebase-Cli]');
        this.tiApi = null;
        this.env = Object.assign(Object.assign({}, process.env), { GOOGLE_APPLICATION_CREDENTIALS: this.serviceAccountPath, CI: 'true' });
        this.tiApi = tiApi;
    }
    setup(firebaseAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.DEPLOY_SETUP }));
            this.notification.info('Installing Firebase CLI...');
            try {
                yield exec.exec('npm', ['install', '-g', 'firebase-tools@14.15.2'], { env: this.env });
                this.notification.success('Firebase CLI Installed');
            }
            catch (e) {
                this.notification.error('Error installing Firebase CLI');
                throw e;
            }
            this.notification.info('Writing service credentials...');
            yield fs.writeFile(this.serviceAccountPath, firebaseAccount);
            this.notification.success('Service credentials written');
        });
    }
    exportIndexes(sourceProject) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.UPDATE_INDEXES }));
            try {
                this.notification.info(`Exporting Firestore indexes from ${sourceProject}...`);
                yield exec.exec('firebase', [`use`, sourceProject], { env: this.env });
                yield exec.exec('firebase', [`projects:list`], { env: this.env });
                yield exec.exec('bash', ['-c', `firebase firestore:indexes --project ${sourceProject} > ${this.firestoreIndexPath}`], { env: this.env });
                this.notification.success(`Indexes exported to ${this.firestoreIndexPath}`);
            }
            catch (e) {
                this.notification.error('Error exporting to firebase-indexes.json');
                throw e;
            }
        });
    }
    deployIndexes(targetProject) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.notification.info(`Deploying Firestore indexes to ${targetProject}`);
                yield exec.exec('firebase', [`use`, targetProject], { env: this.env });
                yield exec.exec('firebase', [`projects:list`], { env: this.env });
                yield exec.exec('firebase', [
                    'deploy',
                    '--project', targetProject,
                    '--only', 'firestore:indexes',
                    '--non-interactive',
                    '--force'
                ], { env: this.env });
                this.notification.success(`Index deployment completed`);
            }
            catch (e) {
                this.notification.error('Error deploying indexes to production');
                throw e;
            }
        });
    }
}
exports.FirebaseCLIOperator = FirebaseCLIOperator;
