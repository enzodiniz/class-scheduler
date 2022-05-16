// Componente principal.
angular
  .module("class-scheduler")
  .controller('MainController', mainCtrl);

function mainCtrl($scope, $location, $rootScope, $mdSidenav, authSvc, $pessoaSvc, $coordSvc, $profSvc, $timeout, $mdDialog, $mdPanel, $alertSvc, temaSvc) {

  const self = this;

  self.carregandoPessoa = carregandoPessoa;

  $scope.$on('tituloPagina', (ev, args) => self.onTituloPagina(args));
  $scope.$on('showAlert', (ev, args) => self.onShowAlert(ev, args))

  self.onTituloPagina = function (args) {
    self.toolbar = args;
    self.setTitlePage(args.titulo);
  }

  let panelRef = null;

  self._getPanelPosition = function() {
    return $mdPanel.newPanelPosition()
          .absolute()
          .top('20px')
          .end('2%');
  }

  self._getPanelAnimation = function(event) {
    return $mdPanel.newPanelAnimation()
          .openFrom(event)
          .duration(200)
          .closeTo('.show-button')
          .withAnimation($mdPanel.animation.SCALE);
  }
  self.showUserInfo2 = function($event) {
    const panelPosition = self._getPanelPosition(); 
    const panelAnimation = self._getPanelAnimation($event);
    var config = {
        attachTo: angular.element(document.body),
        controller: DialogController,
        controllerAs: 'ctrl',
        position: panelPosition,
        animation: panelAnimation,
        targetEvent: $event,
        templateUrl: 'app/components/main/user-info.tmpl.html',
        clickOutsideToClose: true,
        escapeToClose: true,
        focusOnOpen: true
      };

    $mdPanel.open(config)
          .then(function(result) {
            console.log('mostrado');
            panelRef = result;
          });
  }

  function DialogController($scope){
    $scope.user = self.user;
    $scope.themeSelected = self.themeSelected;
    $scope.bodyClass = self.themeSelected == 'dark' ? 'body-dark' : 'body-light';

    $scope.getThemeSelected = function() {
        return self.themeSelected;
    }

    $scope.close = function() {
        panelRef.close();
    }

    $scope.logout = function() {
        $scope.close();
        self.logOut();
    }
  }

  function carregandoPessoa() {
    return authSvc.estaLogado() && !self.user;
  }

  self.onShowAlert = function (ev, args) {
    console.log('Recebendo alert...');
    self.alert = {
      visible: true,
      message: args.message
    }
    // const container = document.getElementById('error-container')
    // container.classList.remove('hide-error')
    // container.classList.add('show-error')
  }

  self.hideAlert = function () {
    self.alert = {
      visible: false,
      message: ''
    }
    // const errorContainer = document.getElementById('error-container')
    // errorContainer.classList.remove('show-error')
    // errorContainer.classList.add('hide-error')

    // $timeout(function () {
    //   self.alert = {}
    // }, 800)

    // let opacity = 1;
    //
    // fadeOut()
    //
    // function fadeOut() {
    //   opacity -= 0.2;
    //
    //   errorContainer.style.opacity = opacity;
    //   if (opacity > 0) {
    //     setTimeout(fadeOut, 50);
    //   } else {
    //     self.alert = {}
    //   }
    // }

    // self.alert = {}
  }

  self.setTitlePage = function (title) {
    const titlePage = document.getElementById('titlePage');
    titlePage.innerText = title  + " ─ Class Scheduler";
  }

  self.addDoc = function (ev) {
    $rootScope.$broadcast('addDoc', { ev: ev });
  };

  // Abre e fechar o sidenav
  self.toggleLeft = function() {
    $mdSidenav('left').toggle();
  }

  self.isOpenLeft = function() {
    return $mdSidenav('left').isOpen();
  }

  self.initFirebase = function () {
    self.db = firebase.firestore();
    authSvc.observarUsuario(gotUsuario);
    temaSvc.observarTema(gotTema);
  }

  function gotUsuario(usuario) {
    $scope.$apply(() => {
        self.user = usuario;
    });
  }

  function gotTema(tema) {
    self.themeSelected = tema;
  }

  self.verifyDarkTheme = function () {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    self.setTheme(mediaQuery.matches)
    console.log('habilitando dark mode:', mediaQuery.matches);
    mediaQuery.addListener(event => {
      $scope.$apply(self.setTheme(event.matches))
    })
  }

  self.setTheme = function (isDarkMode) {
    const body = document.getElementsByTagName('body')[0]

    if (isDarkMode) {
      self.bodyClass = 'body-dark'
      self.themeSelected = 'dark'

      body.classList.remove('body-light')
      body.classList.add('body-dark')
    } else {
      self.bodyClass = 'body-light'
      self.themeSelected = 'default'

      body.classList.remove('body-dark')
      body.classList.add('body-light')
    }
  }

  self.onAuthStateChengedDisabled = function(user) {
    if (!user) {
        self.loggedIn = false;
        $location.path('/login');
        // return;
    }
    try {
        self.user = self._getUser(user.email);
        $temaSvc.verificarTema.bind(self)(self.user);
    } catch (error) {
        self.returnError(error, 'buscar usuário logado');
    }
  }

  self._getUser = function(email) {
    return new Promise((resolve, reject) => {
        $pessoaSvc.getPessoaByEmail(email)
            .then(query => self._gotUser(query, resolve))
            .catch(error => reject(error))
    });
  }

  function AuthorizationException(message) {
    this.message = message;
    this.name = "AuthorizationException";
  }

  self._gotUser = function(query, resolve) {
    if (query.empty) {
        throw new AuthorizationException('Usuário não cadastrado')
    }
    const pessoa = query.docs[0].data();
    pessoa.id = query.docs[0].id;
    resolve(pessoa);
  }

  self.onAuthStateChanged = function(user) {
    $scope.$apply(function () {
      if (user) {
        console.log('user:', user);
        self.loggedIn = true;
        self.imgUser = user.providerData[0].photoURL;
        self.email = user.email;

        self.loggedUser = {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.providerData[0].photoURL
        };

        let localUser = authSvc.getLocalUser();
        console.log("usuário do localStorage:", localUser);
        if (localUser) {
          self.user = localUser;
          self.verificarCoord(self.user.id);
          self.verificarProf(self.user.id);
        } else {
          self.buscandoPessoa = true;
          $pessoaSvc.getPessoaByEmail(user.email).then(query => {
            if (query.empty) {
                $scope.$apply(() => {
                    self.returnError(null, 'verificar usuário');
                    return;
                });
            }
            self.user = query.docs[0].data();
            self.user.id = query.docs[0].id;
            if (self.user.theme === 'system') {
              self.verifyDarkTheme();
            } 
            else if (self.user.theme === 'dark') {
              self.setTheme(true);
            } else {
              self.setTheme(false);
            }

            console.log(self.user);
            self.buscandoPessoa = false;
            // self.verificarCoord(self.user.id);
            // self.verificarProf(self.user.id);
          }).catch(e => console.error("Ocorreu um erro ao buscar pessoa: ", e));
        }
      } else {
        self.loggedIn = false;
        self.loggedUser = null;
        $location.path('/login');
      }
    });
  }
  
  self.getUserDisabled = function(email) {
    // authSvc.getUser2().then(query => {
    //   self.user = query.docs[0].data();
    //   self.user.id = query.docs[0].id;

    //   self.loadingUser = false;
    //   self.shareUser();
    //   self.saveUser();
    //   if (!self.user.photoUrl || (self.user.photoUrl !== self.imgUser)) {
    //     self.saveImage();
    //   }
    // }).catch(e => console.error(e.message));
  }

  // Compartilhar o usuário com os outros controllers.
  self.shareUser = function() {
    $scope.$broadcast('shareUser', self.user);
  }

  self.saveUser = function() {
    authSvc.saveUser(self.user);
    authSvc.saveLocalUser(self.user);
  
}

  // salva a foto do perfil do usuário no firestore
  self.saveImage = function() {
    self.db.doc("professores/" + self.user.id)
      .set({ photoUrl: self.imgUser }, { merge: true })
      .then(response => console.log(response))
      .catch(e => console.error("Ocorreu um erro: ", e));
  }

  self.logOut = function () {
    // self.toggleLeft();
    authSvc.sair().then(function () {
      self.loggedIn = false;
    }).catch(e => {
      self.loggedIn = true;
      alert("Erro ao sair. Você ainda está logado");
      console.error("Ocorreu um erro ao fazer logoff da aplicação: ", e);
    });
  }

  self.returnError = function(error, operation="") {
    $alertSvc.showAlert(`Ocorreu um erro ao ${operation}`);
    console.error('Ocorreu um erro ao', operation);
  }

  self.removeSpanLoading = function () {
    const spanLoading = document.getElementById('loadingAplicationSpan')
    spanLoading.remove()
  }

  window.onload = self.removeSpanLoading

  self.initFirebase();
}
