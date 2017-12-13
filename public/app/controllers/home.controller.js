angular
  .module('class-scheduler')
  .controller('homeCtrl', homeCtrl)

function homeCtrl ($scope, $location, $firebaseArray, $mdDialog) {
  var self = this;
  self.pessoas = [];

  self.initFirebase = function () {
    self.auth = firebase.auth();
    self.db = firebase.firestore();
    self.getRealtimeUpdates();
  }

  self.getRealtimeUpdates = function () {
    self.db.collection("pessoas").onSnapshot(function (querySnapshot) {
      let pessoasTemp = [];
      querySnapshot.forEach((doc) => {
        pessoasTemp.push(doc);
      });
      $scope.$apply(function() {
        self.pessoas = pessoasTemp;
      });
    });
  }

  self.salvarPessoa = function (ev) {
    $mdDialog.show({
      templateUrl: 'app/routes/addPessoa.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      targetEvent: ev,
      fullscreen: $scope.customFullscreen,
      controller: ['$scope', '$mdClassSchedulerToast',
        function ($scope, $mdClassSchedulerToast) {
          $scope.nome;
          $scope.sobrenome;

          $scope.salvarPessoa = function () {
            self.db.collection("pessoas").add({
              nome: $scope.nome,
              sobrenome: $scope.sobrenome
            }).then(function (docRef) {
              console.log("docRef: ", docRef);
              $mdClassSchedulerToast.show("Uma nova pessoa foi salva.");
              $scope.cancel();
            }).catch(function (error) {
              console.log("Got an error: ", error);
            });
          }

          $scope.cancel = function () {
            $mdDialog.cancel();
          }
      }]
    }).then(function (answer) {
      console.log("answer", answer);
    }, function () {
      console.log("cancelled dialog");
    })
  }

  self.editarPessoa = function (ev, _pessoa) {
    $mdDialog.show({
      locals: {
        pessoa: _pessoa
      },
      controller: ['$scope', 'pessoa', '$mdClassSchedulerToast',
        function($scope, pessoa, $mdClassSchedulerToast) {

          $scope.pessoa = pessoa;
          $scope.nome = pessoa.data().nome;
          $scope.sobrenome = pessoa.data().sobrenome;

          $scope.removerPessoa = function () {
            let personRef = self.db.doc("pessoas/" + $scope.pessoa.id);
            personRef.delete().then(function () {
              $mdClassSchedulerToast.show("Uma pessoa foi excluída");
              $scope.cancel();
            }).catch(function (error) {
              $mdClassSchedulerToast.show("Erro ao excluir pessoa");
              console.log("Ocorreu um erro ao remover pessoa: ", error);
            });
          };

          $scope.salvar = function () {
            let personRef = self.db.doc("pessoas/" + $scope.pessoa.id);
            personRef.set({
              nome: $scope.nome,
              sobrenome: $scope.sobrenome
            }).then(function () {
              $mdClassSchedulerToast.show("Uma pessoa foi alterada");
              console.log("edição funcionou");
              $scope.cancel();
            }).catch(function (error) {
              console.log("Got an error on Edit person: ", error);
            });
          }

          $scope.cancel = function () {
            $mdDialog.cancel();
          }

          $scope.hide = function () {
            $mdDialog.hide();
          }
      }],
      templateUrl: 'app/routes/editPessoa.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true,
      fullscreen: $scope.customFullscreen
    })
    .then(function(answer) {
      console.log(answer);
    }, function() {
      console.log("cancelled dialog")
    })
  }

  self.initFirebase();
}
