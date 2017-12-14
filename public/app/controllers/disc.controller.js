angular
  .module("class-scheduler")
  .controller("discCtrl", discCtrl)

function discCtrl ($scope, $firebaseArray, $mdDialog, $mdClassSchedulerToast) {
  var self = this;
  self.id;
  self.disciplinas = [];
  self.turmas = [];
  self.aulas = [];
  self.direction = "left";
  self.isOpen = false;
  self.selectedMode = "md-scale";

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

  self.excluirDisciplina = function (id) {
    let discRef = self.db.doc("disciplinas/" + id);
    discRef.delete().then(function () {
      self.id = "";
      $mdClassSchedulerToast.show("A disciplina foi excluida");
    }).catch(function (error) {
      console.log("Ocorreu um erro: ", error);
    });
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
                    $scope.$apply(function () {
                      $scope.aulas.push(doc);                      
                    });
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

  self.openMenu = function (id) {
    if (self.isOpen) {
      self.direction = "left";
      let btO = document.getElementById(id + "btO");
      btO.style.removeProperty("opacity");

      let btE = document.getElementById(id + "btE");
      btE.style.removeProperty("opacity");

      let btX = document.getElementById(id + "btX");
      btX.style.removeProperty("opacity");

      let listItem = document.getElementById(id + "item");
      listItem.style.removeProperty("font-size");
      listItem.style.removeProperty("background-color");
    } else {
      self.id = id;
      self.direction = "bottom";
      let btO = document.getElementById(id + "btO");
      btO.style.opacity = "1";

      let btE = document.getElementById(id + "btE");
      btE.style.opacity = "1";

      let btX = document.getElementById(id + "btX");
      btX.style.opacity = "1"; 

      let listItem = document.getElementById(id + "item");
      listItem.style.fontSize = "16px"; 
      listItem.style.backgroundColor = "rgb(211, 217, 226)";
    }
  }

  window.onclick = function () {
    if (self.isOpen && self.id != "") {
      self.direction = "left";
      let btO = document.getElementById(self.id + "btO");
      btO.style.removeProperty("opacity");
      let btE = document.getElementById(self.id + "btE");
      btE.style.removeProperty("opacity");
      let btX = document.getElementById(self.id + "btX");
      btX.style.removeProperty("opacity");
      let listItem = document.getElementById(self.id + "item");
      listItem.style.removeProperty("font-size"); 
      listItem.style.removeProperty("background-color");
    }
  }

  self.initFirebase();
}
