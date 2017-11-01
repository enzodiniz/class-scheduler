angular
  .module("class-scheduler", ['ngRoute', 'ngMaterial', 'firebase'])
  .service('$mdClassSchedulerToast', function($mdToast) {
    return {
      show: function(content) {
      return $mdToast.show(
        $mdToast.simple()
          .content(content)
          .position('bottom left')
          .hideDelay(1200)
      )}
    };
  })
  .config(function ($routeProvider) {
    $routeProvider
    .when('/home', {
			templateUrl: '../app/routes/home.html'
		})
		.when('/login', {
			templateUrl: '../app/routes/login.html'
		})
    .when('/turmas', {
      templateUrl: 'app/routes/turma.html'
    })
    .when('/disciplinas', {
      templateUrl: 'app/routes/disciplina.html'
    })
    .when('/professores', {
      templateUrl: 'app/routes/professor.html'
    })
		.otherwise({
			redirectTo: '/home'
		});
  })
