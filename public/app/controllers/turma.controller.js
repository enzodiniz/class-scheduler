angular
  .module("class-scheduler")
  .controller("turmaCtrl", turmaCtrl)

function turmaCtrl ($scope, $firebaseArray, $mdDialog, $mdClassSchedulerToast) {
  var self = this;

  self.noCache = true;
  self.turmas = [];
  self.isOpen = false;
  self.selectedMode = "md-fling";
  self.direction = "left";

  self.initFirebase = function () {
    self.db = firebase.firestore();
    self.getRealtimeUpdates();
  }

  self.getRealtimeUpdates = function () {
    self.db.collection("turmas").onSnapshot(function (querySnapshot) {
      let turmasTemp = [];
      querySnapshot.forEach(function (doc) {
        turmasTemp.push(doc);
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

  self.editarTurma = function (ev, turma) {
    $mdDialog.show({
      templateUrl: 'app/routes/edit-turma.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      targetEvent: ev,
      fullscreen: $scope.customFullscreen,
      locals: {
        turma: turma
      },
      controller: ['$scope', '$mdClassSchedulerToast', 'turma', 
        function ($scope, $mdClassSchedulerToast, turma) {
          $scope.curso = turma.data().curso;
          $scope.serie = turma.data().serie;
          $scope.id = turma.id;

          $scope.salvar = function () {
            let turmaRef = self.db.doc("turmas/" + $scope.id);

            turmaRef.update({
              curso: $scope.curso || turma.data().curso,
              serie: $scope.serie || turma.data().serie
            }).then(function () {
              $scope.hide();
              $mdClassSchedulerToast.show("Turma modificada");
            }).catch(function (error) {
              console.log("Ocorreu um erro: ", error);
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
    });
  }

  self.excluirTurma = function (id) {
    let docRef = self.db.doc("turmas/" + id);

    docRef.delete().then(function () {
      $mdClassSchedulerToast.show("A turma foi removida");
    }).catch(function (error) {
      console.log("Ocorreu um erro ao excluir turma: ", error);
    });
  }

  self.openMenu = function (id) {
    if (self.isOpen) {
      self.id = "";
      self.direction = "left";
      let btO = document.getElementById(id + "btO");
      btO.style.removeProperty("opacity");

      let btE = document.getElementById(id + "btE");
      btE.style.removeProperty("opacity")

      let btX = document.getElementById(id + "btX");
      btX.style.removeProperty("opacity");

      let item = document.getElementById(id + "item");
      item.style.removeProperty("font-size");
      item.style.removeProperty("background-color");
    } else {
      self.id = id;
      self.direction = "bottom";
      let btO = document.getElementById(id + "btO");
      btO.style.opacity = "1";

      let btE = document.getElementById(id + "btE");
      btE.style.opacity = "1";

      let btX = document.getElementById(id + "btX");
      btX.style.opacity = "1";

      let item = document.getElementById(id + "item");
      item.style.fontSize = "16";
      item.style.backgroundColor = "rgb(211, 217, 226)";
    }
  }

  window.onclick = function () {
    if (self.isOpen && self.id != "") {
      self.openMenu(self.id);
    }
  }

  self.querySearch = function (query) {
      var results = self.cursos;
      var deferred = $q.defer();
      $timeout(function () { deferred.resolve( results ); }, Math.random() * 1000, false);
      return deferred.promise;
  }

  self.initFirebase();
}

