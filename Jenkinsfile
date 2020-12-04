pipeline {
  agent { dockerfile { label 'docker' } }
  options { ansiColor('xterm') }
  environment { LONG_REV = """${sh(returnStdout: true, script: 'git rev-parse HEAD').trim()}""" }
  stages {
    stage("Init title") {
      when { changeRequest() }
      steps { script { currentBuild.displayName = "PR ${env.CHANGE_ID}: ${env.CHANGE_TITLE}" } }
    }
    stage('Builds') {
      parallel {
        stage('Build the package') {
          steps {
            sh '''
              npm install
              npm run build
            '''
          }
        }
      }
    }
    stage('Update Submodules') {
      steps {
        build job: 'rv-devops/master', propagate: false, wait: false                                                      \
                  , parameters: [ booleanParam ( name: 'UPDATE_DEPS'         , value: true                              ) \
                                , string       ( name: 'UPDATE_DEPS_REPO'    , value: 'runtimeverification/k-web-theme' ) \
                                , string       ( name: 'UPDATE_DEPS_VERSION' , value: "${env.LONG_REV}")                  \
                                ]
      }
    }
  }
}
