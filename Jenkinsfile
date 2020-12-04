pipeline {
  agent { dockerfile { } }
  options {
    ansiColor('xterm')
  }
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
  }
}