angular
  .module("class-scheduler", ['ngRoute', 'ngMaterial', 'firebase'])
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
		.otherwise({
			redirectTo: '/home'
		});
  })
