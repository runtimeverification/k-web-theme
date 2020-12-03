pipeline {
  agent { dockerfile { } }
  options {
    ansiColor('xterm')
  }
  stages {
    stage("Init title") {
      when { changeRequest() }
      steps {
        script {
          currentBuild.displayName = "PR ${env.CHANGE_ID}: ${env.CHANGE_TITLE}"
        }
      }
    }
    stage('Initialize Git/SSH') {
      steps {
        sshagent(['2b3d8d6b-0855-4b59-864a-6b3ddf9c9d1a']) {
          sh '''
            git config --global user.email "admin@runtimeverification.com"
            git config --global user.name  "RV Jenkins"
            mkdir -p ~/.ssh
            cp tools/ssh_config ~/.ssh/config
            chmod go-rwx -R ~/.ssh
            ssh github.com || true
          '''
        }
      }
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
    stage('Release') {
      when { branch 'master' }
      environment {
        NPM_TOKEN = credentials('npmjs-ehildenb-token')
      }
      steps {
        sshagent(['2b3d8d6b-0855-4b59-864a-6b3ddf9c9d1a']) {
          sh '''
            tools/npm-version ./  k-web-theme  publish
          '''
        }
      }
      post {
        failure {
          slackSend color: '#cb2431'                                    \
                  , channel: '#firefly-web'                             \
                  , message: "k-web-theme Release Failed: ${env.BUILD_URL}"
        }
      }
    }
  }
}