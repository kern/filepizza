workflow "Build on push" {
  on = "push"
  resolves = ["AWS deploy"]
}

action "Docker build, tag, and push" {
  uses = "pangzineng/Github-Action-One-Click-Docker@master"
  secrets = ["DOCKER_USERNAME", "DOCKER_PASSWORD"]
}

action "AWS deploy" {
  uses = "actions/aws/cli@efb074ae4510f2d12c7801e4461b65bf5e8317e6"
  needs = ["Docker build, tag, and push"]
  secrets = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ]
  args = "deploy --region us-west-2 create-deployment --application-name AppECS-filepizza-filepizza --deployment-config-name CodeDeployDefault.ECSAllAtOnce --deployment-group-name DgpECS-filepizza-filepizza --github-location repository=kern/filepizza,commitId=$GITHUB_REF"
  runs = "aws"
}
