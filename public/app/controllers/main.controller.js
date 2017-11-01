angular
  .module("class-scheduler")
  .controller('MainController', mainCtrl)

function mainCtrl($scope, $location, $mdSidenav, $firebaseArray) {
  var self = this;
  self.logado = false;
  self.profs = [];
  self.demo = {
    isOpen: false,
    count: 0,
    selectedDirection: 'right'
  };

  self.initFirebase = function () {
    self.auth = firebase.auth();
    // self.database = firebase.database();
    // self.storage = firebase.storage();

    self.db = firebase.firestore();

    self.auth.onAuthStateChanged(self.onAuthStateChanged.bind(this));
  }

  self.carregarProfs = function () {
    self.profs = $firebaseArray(self.database.ref().child('professores'));
  }

  self.isProfAdmin = function (user) {
    for (p of self.profs) {
      if (p.uid == user.uid) {
        if (p.isAdmin) {
          return true;
        } else {
          return false;
        }
      }
    }

    return false;
  }

  self.onAuthStateChanged = function (user) {
    $scope.$apply(function() {
      if (user) {
        //self.carregarProfs();
        //if (self.isProfAdmin(user)) {
          //console.log("é admin");
        //}

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
