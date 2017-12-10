angular
  .module("class-scheduler")
  .controller("discCtrl", discCtrl)

function discCtrl ($scope, $firebaseArray, $mdDialog) {
  var self = this;
  self.disciplinas = [];
  self.turmas = [];
  self.aulas = [];

  self.initFirebase = function () {
    self.db = firebase.firestore();
    self.getAulas();
    self.getRealtimeUpdates();
  }

  self.getAulas = function () {
    self.db.collection("aulas").onSnapshot(function (querySnapshot) {
      let aulas = [];
      querySnapshot.forEach(function (doc) {
        aulas.push(doc);
      });
      $scope.$apply(function () {
        self.aulas = aulas;
      });
    });
  }

  self.getRealtimeUpdates = function () {
    self.db.collection("disciplinas").onSnapshot(function (querySnapshot) {
      let discs = [];
      querySnapshot.forEach(function (doc) {
        discs.push(doc.data());
      });
      $scope.$apply(function () {
        self.disciplinas = discs;
      });
    })
  }

  self.salvarDisciplina = function (ev) {
    $mdDialog.show({
      templateUrl: 'app/routes/add-disc.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      targetEvent: ev,
      fullscreen: $scope.customFullscreen,
      locals: {
        aulas: self.aulas
      },
      controller: ['$scope', '$mdClassSchedulerToast', 'aulas', 
        function ($scope, $mdClassSchedulerToast, aulas) {
        $scope.aulas = aulas;
        
        $scope.salvar = function () {
          self.db.collection("disciplinas").add({
            titulo: $scope.titulo,
            turma: $scope.turma
          }).then(function (docRef) {
            $mdClassSchedulerToast.show("Uma nova disciplina foi salva");
            $scope.cancel();
          }).catch(function (error) {
            console.log("Ocorreu um erro ao salvar disciplina: ", error);
            $mdClassSchedulerToast.show("Erro ao salvar a disciplina");
          });
        }

        $scope.getTurmas = function () {
          let temp = [];
          self.db.collection("turmas").get().then(function (querySnapshot) {
            querySnapshot.forEach((doc) => {
              temp.push(doc);
            });
          })
          $scope.turmas = temp;
        }

        $scope.getAulas = function () {
          let temp = [];
          self.db.collection("aulas").get().then(function (querySnapshot) {
            querySnapshot.forEach((doc) => {
              temp.push(doc);
            });
          });
          // $scope.$apply(function () {
          //   $scope.aulas = temp;
          // });
          $scope.aulas = temp;
        }

        $scope.toggle = function (item, list) {
          let idx = list.indexOf(item);

          if (idx > -1) {
            list.splice(idx, 1);
          } else {
            list.push(item);
          }
        }

        $scope.exists = function (item, list) {
          return list.indexOf(item) > -1;
        }

        $scope.cancel = function () {
          $mdDialog.cancel();
        }

        $scope.hide = function () {
          $mdDialog.hide();
        }

        $scope.getTurmas();
        //$scope.getAulas();
      }]
    }).then(function (resposta) {
      console.log("resposta", resposta);
    }, function () {
      console.log("cancelled dialog");
    });
  }

  self.initFirebase();
}
