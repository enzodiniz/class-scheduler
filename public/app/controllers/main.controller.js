angular
  .module("class-scheduler")
  .controller('MainController', mainCtrl)

function mainCtrl($scope, $location, $mdSidenav, $firebaseArray, $rootScope, 
    $timeout) {
  var self = this;
  self.logado = false;
  self.demo = {
    isOpen: false,
    count: 0,
    selectedDirection: 'right'
  };

  self.initFirebase = function () {
    self.auth = firebase.auth();
    self.db = firebase.firestore();
    self.auth.onAuthStateChanged(self.onAuthStateChanged.bind(this));
  }

  self.sentUser = function () {
    $timeout(function () {
      $rootScope.$broadcast('user', {
        user: self.user 
      });
    }, 2000);
  }

  self.getUser = function (email) {
    self.db.collection("professores")
      .where("email", "==", email)
      .get()
      .then(function (querySnapshot) {
        querySnapshot.forEach(function (doc) {
          let data = doc.data();
          $scope.$apply(function () {
            $rootScope.$broadcast('user', {
              user: {
                nome: data.nome,
                sobrenome: data.sobrenome,
                isAdmin: data.isAdmin,
                email: data.email,
                id: doc.id
              } 
            });

            self.user = {
              nome: data.nome,
              sobrenome: data.sobrenome,
              isAdmin: data.isAdmin,
              email: data.email,
              id: doc.id
            };
          });

        });
      }).catch(function (error) {
        console.log("Ocorreu um erro: ", error);
      });
  }

  self.onAuthStateChanged = function (user) {
    $scope.$apply(function() {
      if (user) {
        self.logado = true;
        self.getUser(user.email);        
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

  self.redirecionarAula = function () {
    self.sentUser();
    $location.path('/aulas');
  }

  self.redirecionarProf = function () {
    $location.path('/professores');
  }

  self.logOut = function () {
    self.auth.signOut();
  }
  
  self.initFirebase();
}
