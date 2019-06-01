workflow "Build on push" {
  resolves = ["Docker build, tag, and push"]
  on = "push"
}

action "Docker build, tag, and push" {
  uses = "pangzineng/Github-Action-One-Click-Docker@master"
  secrets = ["DOCKER_USERNAME", "DOCKER_PASSWORD"]
}
