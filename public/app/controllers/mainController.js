angular
  .module("class-scheduler")
  .controller('MainController', mainCtrl)

function mainCtrl($scope, $location, $mdSidenav) {
  var self = this;
  self.logado = false;
  self.demo = {
    isOpen: false,
    count: 0,
    selectedDirection: 'right'
  };

  self.initFirebase = function () {
    self.auth = firebase.auth();
    // self.database = firebase.database();
    // self.storage = firebase.storage();

    self.auth.onAuthStateChanged(self.onAuthStateChanged.bind(this));
  }

  self.onAuthStateChanged = function (user) {
    // if (user) {
    //   self.userName = user.displayName;
    //   self.img = user.photoURL;
    //   $location.path('/home');
    // } else {
    //   $location.path('/login');
    // }

    $scope.$apply(function() {
      if (user) {
        self.userName = user.displayName;
        self.img = user.photoURL;
        self.logado = true;
        $location.path('/home');
      } else {
        self.logado = false;
        $location.path('/login');
      }
    });
  }

  self.redirecionarTurma = function () {
    $location.path('/turmas');
  }

  self.redirecionarDisc = function () {
    $location.path('/disciplinas');
  }

  self.logOut = function () {
    self.auth.signOut();
  }

  self.initFirebase();
}
