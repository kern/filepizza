import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.vcs
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.PullRequests
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.commitStatusPublisher
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.pullRequests
import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot
import com.kotlin.v2019_2.buildTypes.DockerBuild


version = "2020.2"


project {
    params {
        // This makes it impossible to change the build settings through the UI
        param("teamcity.ui.settings.readOnly", "true")
    }

    vcsRoot(VCSExample)
}


object VCSExample : GitVcsRoot({
    name = "VCSExample"
    url = "https://github.com/freefox-do/filepizza.git"
    branch = "refs/heads/master"
    authMethod = password {
        userName = "wellyfox"
        password = "zxx010cfab59641ee19092b8307a116427c6ae958a7948f59e971b95cf982c6f2c5d196fb90892f7a6f775d03cbe80d301b"
    }
})
