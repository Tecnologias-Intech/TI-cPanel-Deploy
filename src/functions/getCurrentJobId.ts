import * as core from '@actions/core';
import * as github from '@actions/github';

export const getJobId = async () => {
  const botToken = core.getInput('github-token', { required: true });
  const octokit = github.getOctokit(botToken);

  try {
    const runId = github.context.runId;
    const runner_name = process.env.RUNNER_NAME;
    const { owner, repo } = github.context.repo;

    const jobsResponse = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId
    });

    const currentJob = jobsResponse.data.jobs.find(job => job.runner_name === runner_name);

    if (currentJob) core.info(`Current job ID is: ${currentJob.id}`);
    else core.setFailed(`Could not find job with key: ${runner_name}`);

    return currentJob?.id;
  } catch (e: any) {
    core.setFailed(e.message);
  }
};
