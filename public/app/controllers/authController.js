angular
  .module("class-scheduler")
  .controller('authController', authCtrl)

function authCtrl ($scope, $location) {
  var self = this;

  self.initFirebase = function () {
    self.auth = firebase.auth();
    self.database = firebase.database();
    self.storage = firebase.storage();

    self.auth.onAuthStateChanged(self.onAuthStateChanged.bind(this));
  }

  self.onAuthStateChanged = function (user) {
    $scope.$apply(function() {
      if (user) {
        self.userName = user.displayName;
        self.img = user.photoURL;
        $location.path('/home');
      } else {
        $location.path('/login');
      }
    });
  }

  self.login = function () {
    var provider = new firebase.auth.GoogleAuthProvider();
    self.auth.signInWithPopup(provider)
      .then(function () {
        console.log("você está logado.");
      })
  }

  self.initFirebase();
}
