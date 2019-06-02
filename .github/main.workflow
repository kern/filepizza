workflow "Build on push" {
  on = "push"
  resolves = ["GitHub Action for AWS"]
}

action "Docker build, tag, and push" {
  uses = "pangzineng/Github-Action-One-Click-Docker@master"
  secrets = ["DOCKER_USERNAME", "DOCKER_PASSWORD"]
}

action "GitHub Action for AWS" {
  uses = "actions/aws/cli@efb074ae4510f2d12c7801e4461b65bf5e8317e6"
  needs = ["Docker build, tag, and push"]
  secrets = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
  runs = "aws"
}
