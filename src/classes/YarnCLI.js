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
exports.YarnCLI = void 0;
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs/promises"));
const Notifications_1 = require("./Notifications");
const deployment_status_enum_1 = require("../enums/deployment-status.enum");
class YarnCLI {
    constructor(environment, tiApi) {
        this.tiApi = null;
        this.notification = new Notifications_1.Notifications('[TI-Deploy/Yarn-Cli]');
        this.environment = environment;
        this.tiApi = tiApi;
    }
    install() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.INSTALLING_DEPS }));
            try {
                this.notification.info('Installing dependencies...');
                yield exec.exec('yarn', ['install', '--frozen-lockfile']);
            }
            catch (e) {
                this.notification.error('Error installing dependencies');
                throw e;
            }
        });
    }
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.tiApi) === null || _a === void 0 ? void 0 : _a.updateDeployment({ status: deployment_status_enum_1.DeploymentStatus.BUILD_APP }));
            try {
                if (this.environment) {
                    this.notification.info('Configuring .env file');
                    yield fs.writeFile('.env', this.environment);
                    this.notification.success('.env file configured');
                }
                else {
                    throw new Error('No env-secret was provided');
                }
                this.notification.info('Building application');
                yield exec.exec('yarn', ['run', 'build']);
                this.notification.success('Application built');
            }
            catch (e) {
                this.notification.error('Error building application');
                throw e;
            }
        });
    }
}
exports.YarnCLI = YarnCLI;
