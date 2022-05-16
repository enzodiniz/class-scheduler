angular
  .module("class-scheduler", ['ngRoute', 'ngMaterial', 'ngMessages', 'firebase', 'alertEnzo', 'ngAnimate'])
  .service('$mdClassSchedulerToast', function($mdToast, $mdMedia) {
    
    function subirFabButton() {
        if (!$mdMedia('xs')) return;
        const fabButton = document.getElementsByClassName('bottom-right')[0];
        if (!fabButton) return;
        fabButton.classList.add('subir')
        setTimeout(() => {
            fabButton.classList.remove('subir')
        }, 2000);
    }

    function show(content) {
        subirFabButton();
        return $mdToast.show(
          $mdToast.simple()
            .textContent(content)
            .position('bottom left')
            .hideDelay(1200)
            .toastClass("my-toast")
        );
    }

    return { show };
  })
  .config(function ($mdThemingProvider) {
    $mdThemingProvider
      .theme('dark')
      .primaryPalette('indigo', {
        'default': 'A100'
      })
      .accentPalette('pink', {
        'default': 'A100'
      })
      .warnPalette('red', {
        'default': 'A100'
      })
      .backgroundPalette('grey')
      .dark()

    $mdThemingProvider.enableBrowserColor({});
  })
  .config(function ($routeProvider, $mdDateLocaleProvider) {
    $routeProvider
      .when('/home', {
  			templateUrl: '/app/routes/home.html'
  		})
      .when('/perfil', {
  			templateUrl: '/app/routes/perfil.html'
  		})
      .when('/login', {
            templateUrl: '/app/routes/login.html'
      })    
      .when('/turmas', {
        templateUrl: 'app/routes/turmas.html'
      })
      .when('/disciplinas', {
        templateUrl: 'app/routes/disciplina.html'
      })
      .when('/pessoas', {
        templateUrl: 'app/routes/pessoas.html'
      })
      .when('/cursos', {
        templateUrl: 'app/routes/cursos.html'
      })
      // Templates do professor
      .when('/horario-teste', {
        templateUrl: 'app/routes/horario-turma-teste.html'
      })
      .when('/minhasFaltas', {
        templateUrl: 'app/routes/minhasFaltas.html'
      })
      .when('/minhas-aulas', {
        templateUrl: 'app/routes/minhas-aulas.html'
      })
      .when('/minhas-aulas2', {
        templateUrl: 'app/routes/minhas-aulas-refat.html'
      })
      // Templates do coordenador de turno
      .when('/horario-coord', {
          templateUrl: 'app/routes/horario-coord.html'
      })
      .when('/historico', {
        templateUrl: 'app/routes/historico.html'
      })
      .otherwise({
        redirectTo: '/home'
      });
  })
