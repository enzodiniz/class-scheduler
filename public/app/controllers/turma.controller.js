angular
  .module("class-scheduler")
  .controller("turmaCtrl", turmaCtrl)

function turmaCtrl ($scope, $firebaseArray, $mdDialog) {
  var self = this;

  self.noCache = true;
  self.turmas = [];

  self.initFirebase = function () {
    self.db = firebase.firestore();
    self.getRealtimeUpdates();
  }

  self.getRealtimeUpdates = function () {
    self.db.collection("turmas").onSnapshot(function (querySnapshot) {
      let turmasTemp = [];
      querySnapshot.forEach(function (doc) {
        turmasTemp.push(doc.data());
      });
      $scope.$apply(function () {
        self.turmas = turmasTemp;        
      });
    })
  }

  self.salvarTurma = function (ev) {
    $mdDialog.show({
      templateUrl: 'app/routes/add-turma.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      targetEvent: ev,
      fullscreen: $scope.customFullscreen,
      controller: ['$scope', '$mdClassSchedulerToast', function ($scope, $mdClassSchedulerToast) {

        self.series = ['1', '2', '3', '4'];
        self.cursos = ['Geologia', 'Informática', 'Edificações'];

        $scope.salvar = function () {
          self.db.collection("turmas").add({
            curso: $scope.curso,
            serie: $scope.serie
          }).then(function (docRef) {
            $mdClassSchedulerToast.show("Uma nova turma foi salva");
            $scope.hide();
          }).catch(function (error) {
            console.log("Ocorreu um erro ao salvar turma: ", error);
            $mdClassSchedulerToast.show("Erro ao salvar a turma");
          });
        }

        $scope.cancel = function () {
          $mdDialog.cancel();
        }

        $scope.hide = function () {
          $mdDialog.hide();
        }
      }]
    }).then(function (resposta) {
      console.log("resposta", resposta);
    }, function () {
        console.log("cancelled dialog");
    })
  }

  self.querySearch = function (query) {
      var results = self.cursos;
      var deferred = $q.defer();
      $timeout(function () { deferred.resolve( results ); }, Math.random() * 1000, false);
      return deferred.promise;
  }

  self.initFirebase();
}
