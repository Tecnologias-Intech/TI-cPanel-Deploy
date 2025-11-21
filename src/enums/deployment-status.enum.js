"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentStatus = void 0;
var DeploymentStatus;
(function (DeploymentStatus) {
    DeploymentStatus["PENDING"] = "pending";
    DeploymentStatus["SETTING_VERSION"] = "setting_version";
    DeploymentStatus["GENERATE_PR"] = "generate_pr";
    DeploymentStatus["APPROVE_PR"] = "approve_pr";
    DeploymentStatus["MERGE_PR"] = "merge_pr";
    DeploymentStatus["INSTALLING_DEPS"] = "installing_deps";
    DeploymentStatus["BUILD_APP"] = "build_app";
    DeploymentStatus["DEPLOY_SETUP"] = "deploy_setup";
    DeploymentStatus["GENERATE_RELEASE_N_TAG"] = "generate_release_n_tag";
    DeploymentStatus["UPDATE_INDEXES"] = "update_indexes";
    DeploymentStatus["DEPLOY_APP"] = "deploy_app";
    DeploymentStatus["UPDATE_DATABASE"] = "update_database";
    DeploymentStatus["DEPLOYED"] = "deployed";
})(DeploymentStatus || (exports.DeploymentStatus = DeploymentStatus = {}));
