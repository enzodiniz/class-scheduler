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
        discs.push(doc);
      });
      $scope.$apply(function () {
        self.disciplinas = discs;
        self.getAulas();
      });
    })
  }

  self.editarDisciplina = function (ev, disc) {
    $mdDialog.show({
      templateUrl: 'app/routes/edit-disc.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      targetEvent: ev,
      fullscreen: $scope.customFullscreen,
      locals: {
        disc: disc
      },
      controller: ['$scope', '$mdClassSchedulerToast', 'disc', 
        function ($scope, $mdClassSchedulerToast, disc) {
          $scope.aulas = []; //documento das aulas(ids)
          $scope.titulo = disc.data().titulo;
          $scope.turma = disc.data().turma;

          $scope.excluirAula = function (id) {
            for (var i = 0; i < $scope.aulas.length; i++) {
              if ($scope.aulas[i].id == id) {
                $scope.aulas.splice(i, 1);
                return;
              }
            }
          }

          $scope.getAulas = function () {
              let aulasId = disc.data().aulas;
              if (aulasId) {
                for (a of aulasId) {
                  aulaRef = self.db.doc("aulas/" + a);
                  aulaRef.get().then(function (doc) {
                    $scope.aulas.push(doc);
                  }).catch(function (error) {
                    console.log("Error getting document:", error);
                  });
                }                
              }
          }

          $scope.salvar = function () {
            let aulasTemp = [];
            let discRef = self.db.doc("disciplinas/" + disc.id);

            for (a of $scope.aulas) {
              aulasTemp.push(a.id);
            }
            discRef.update({
              titulo: $scope.titulo,
              turma: $scope.turma,
              aulas: aulasTemp
            }).then(function () {
              $scope.hide();
              $mdClassSchedulerToast.show("A turma foi modificada");
            }).catch(function (error) {
              console.log("Ocorreu um erro: ", error);
            });
          }

          $scope.hide = function () {
            $mdDialog.hide();
          }

          $scope.cancel = function () {
            $mdDialog.cancel();
          }

          $scope.getAulas();
        }]
    }); 
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
        $scope.selected = [];
        
        $scope.salvar = function () {
          self.db.collection("disciplinas").add({
            titulo: $scope.titulo,
            turma: $scope.turma,
            aulas: $scope.selected
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

        $scope.toggle = function (item, list) {
          let idx = list.indexOf(item);

          if (idx > -1) {
            list.splice(idx, 1);
          } else {
            list.push(item.id);
          }
        }

        $scope.exists = function (item, list) {
          return list.indexOf(item.id) > -1;
        }

        $scope.cancel = function () {
          $mdDialog.cancel();
        }

        $scope.hide = function () {
          $mdDialog.hide();
        }

        $scope.getTurmas();
      }]
    }).then(function (resposta) {
      console.log("resposta", resposta);
    }, function () {
      console.log("cancelled dialog");
    });
  }

  self.initFirebase();
}
