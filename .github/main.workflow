workflow "Build on push" {
  resolves = ["Docker build, tag, and push"]
  on = "push"
}

action "Docker build, tag, and push" {
  resolves = ["AWS deployment"]
  uses = "pangzineng/Github-Action-One-Click-Docker@master"
  secrets = ["DOCKER_USERNAME", "DOCKER_PASSWORD"]
}

action "AWS deployment" {
  uses = "actions/aws/cli@efb074ae4510f2d12c7801e4461b65bf5e8317e6"
}
