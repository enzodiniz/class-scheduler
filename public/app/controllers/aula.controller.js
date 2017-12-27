angular
  .module("class-scheduler")
  .controller("aulaCtrl", aulaCtrl)

function aulaCtrl ($scope, $firebaseArray, $mdDialog, $mdClassSchedulerToast) {
  var self = this;
  self.default = [];
  self.available = [];
  self.replaced = [];
  self.menu = {
    isOpen: false,
    direction: "left",
    selectedMode: "md-fling"
  };
  self.exist = {
    default: true,
    replaced: true,
    available: true
  };

  $scope.$on('user', function (event, args) {
    self.user = args.user;
  });

  self.initFirebase = function () {
    self.db = firebase.firestore();
    self.getAulas("ok", self.default);
    self.getAulas("disponivel", self.available);
    self.getAulas("substituida", self.replaced);
  }

  self.getAulas = function (status, list) {
    self.db.collection("aulas")
      .where('status.' + status, '==', true)
      .onSnapshot(function (querySnapshot) {
        let temp = [];
        querySnapshot.forEach(function (doc) {
          temp.push(doc);
        });
        $scope.$apply(function () {
          list = temp;
          if (status == "ok") {
            self.default = list;
            if (self.default.length == 0) {
              self.exist.default = false;
            }
          } else if (status == "disponivel") {
            self.available = list;
            if (self.available.length == 0) {
              self.exist.available = false;
            }
          } else {
            self.replaced = list;
            if (self.replaced.length == 0) {
              self.exist.replaced = false;
            }
          }
        });
      });
  }

  self.salvarAula = function (ev) {
    $mdDialog.show({
      templateUrl: 'app/routes/add-aula.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      targetEvent: ev,
      fullscreen: $scope.customFullscreen,
      controller: ['$scope', '$mdClassSchedulerToast',
        function ($scope, $mdClassSchedulerToast) {
          $scope.status = 'Ok';

          $scope.salvar = function () {
            $scope.setStart($scope.day);
            $scope.setEnd($scope.day);
            if ($scope.status == "Disponível") {
              $scope.ok = false;
              $scope.disponivel = true;
            } else {
              $scope.ok = true;
              $scope.disponivel = false;
            }
            self.db.collection("aulas").add({
              start: $scope.start,
              end: $scope.end,
              status: {
                ok: $scope.ok,
                disponivel: $scope.disponivel,
                substituida: false
              }
            }).then(function (docRef) {
              $mdClassSchedulerToast.show("Uma nova aula foi salva");
              $scope.hide();
            }).catch(function (error) {
              console.log("Ocorreu um erro: ", error);
              $mdClassSchedulerToast.show("Ocorreu um erro ao salvar a aula");
            });
          }

          $scope.setStart = function (day) {
            $scope.start = new Date();
            $scope.start.setTime(day.getTime());
            $scope.start.setHours($scope.hrI);
            $scope.start.setMinutes($scope.mnI);
          }

          $scope.setEnd = function (day) {
            $scope.end = new Date();
            $scope.end.setTime(day.getTime());
            $scope.end.setHours($scope.hrF);
            $scope.end.setMinutes($scope.mnF);
          }

          $scope.hide = function () {
            $mdDialog.hide();
          }

          $scope.cancel = function () {
            $mdDialog.cancel();
          }

          $scope.onlyWeekendsPredicate = function(date) {
            var day = date.getDay();
            return day > 0 && day < 6;
          };
      }]
    }).then(function (answer) {
      console.log("answer: ", answer);
    }, function () {
      console.log("cancelled dialog");
    })
  }

  self.editarAula = function (aula, ev) {
    $mdDialog.show({
      templateUrl: 'app/routes/edit-aula.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true,
      fullscreen: $scope.customFullscreen,
      locals: {
        aula: aula
      },
      controller: ['$scope', 'aula', function ($scope, aula) {

        $scope.init = function () {
          $scope.dados = aula.data();
          $scope.startHr = $scope.dados.start.getHours();
          $scope.startMt = $scope.dados.start.getMinutes();
          $scope.endHr = $scope.dados.end.getHours();
          $scope.endMt = $scope.dados.end.getMinutes();
          $scope.dia = $scope.dados.start;
          $scope.id = aula.id;

          let profRef = self.db.doc("professores/" + $scope.dados.prof_subs);
          profRef.get().then(function (doc) {
            if (doc.exists) {
              $scope.selectedItem = {
                nome: doc.data().nome,
                sobrenome: doc.data().sobrenome,
                email: doc.data().email,
                id: doc.id
              };
            }
          }).catch(function (error) {
            console.log("Ocorreu um erro: ", error);
          })

          if ($scope.dados.status.ok == true) {
            $scope.status = "Ok";
          }
          else if ($scope.dados.status.disponivel == true){         
            $scope.status = "Disponível";
          }
          else if ($scope.dados.status.substituida == true){
            $scope.status = "Substituída";
          }
          $scope.getProfs();
        }

        $scope.getProfs = function () {
          self.db.collection("professores").get()
            .then(function (query) {
              $scope.profs = [];
              $scope.$apply(function () {
                query.forEach(function (doc) {
                    $scope.profs.push({
                      nome: doc.data().nome,
                      sobrenome: doc.data().sobrenome,
                      email: doc.data().email,
                      id: doc.id
                    });                  
                });                
              });
            }).catch(function (error) {
              console.log("Ocorreu um erro: ", error);
            });
        }

        $scope.salvar = function () {
          $scope.setStart($scope.dia);
          $scope.setEnd($scope.dia);
          if ($scope.status == "Disponível") { 
            $scope.ok = false;
            $scope.disponivel = true;
            $scope.substituida = false;
          } else if ($scope.status == "Substituída") {
            if ($scope.dados.status.disponivel == false) {
              $mdClassSchedulerToast.show("Essa aula não está disponível")
              return;
            }
            $scope.ok = false;
            $scope.disponivel = false;
            $scope.substituida = true;
          } else {
            $scope.ok = true;
            $scope.disponivel = false;
            $scope.substituida = false;
          }
          let aulaRef = self.db.doc("aulas/" + $scope.id);

          if ($scope.status == "Substituída") {
            aulaRef.update({
              start: $scope.start || aula.data().start,
              end: $scope.end || aula.data().end,
              status: {
                ok: $scope.ok,
                disponivel: $scope.disponivel,
                substituida: $scope.substituida
              },
              prof_subs: $scope.selectedItem
            }).then(function () {              
              $mdClassSchedulerToast.show("A aula foi modificada");
              $scope.hide();
            }).catch(function (error) {
              console.log("Ocorreu um erro: ", error);
            });          
          } else {
            aulaRef.update({
              start: $scope.start || aula.data().start,
              end: $scope.end || aula.data().end,
              status: {
                ok: $scope.ok,
                disponivel: $scope.disponivel,
                substituida: $scope.substituida
              }
            }).then(function () {
              $mdClassSchedulerToast.show("A aula foi modificada");
              $scope.hide();
            }).catch(function (error) {
              console.log("Ocorreu um erro: ", error);
            });            
          }
        }

        $scope.setStart = function (day) {
          $scope.start = new Date();
          $scope.start.setTime(day.getTime());
          $scope.start.setHours($scope.startHr);
          $scope.start.setMinutes($scope.startMt);
        }

        $scope.setEnd = function (day) {
          $scope.end = new Date();
          $scope.end.setTime(day.getTime());
          $scope.end.setHours($scope.endHr);
          $scope.end.setMinutes($scope.endMt);
        }

        $scope.onlyWeekendsPredicate = function(date) {
          var day = date.getDay();
          return day > 0 && day < 6;
        };

        $scope.hide = function () {
          $mdDialog.hide();
        }

        $scope.cancel = function () {
          $mdDialog.cancel();
        }

        $scope.init();
      }]
    })
    .then(function(answer) {
      console.log('You said the information was "' + answer + '".');
    }, function() {
      console.log('You cancelled the dialog.');
    });
  }

  self.openMenu = function (id) {
    if (self.menu.isOpen) {
      self.menu.selecionado = "";
      self.menu.direction = "left";
      let btO = document.getElementById(id + "btO");
      btO.style.removeProperty("opacity");

      let btE = document.getElementById(id + "btE");
      btE.style.removeProperty("opacity")

      let btX = document.getElementById(id + "btX");
      btX.style.removeProperty("opacity");

      // let item = document.getElementById(id + "item");
      // item.style.removeProperty("font-size");
      // item.style.removeProperty("background-color");

    } else {
      self.menu.selecionado = id;
      self.menu.direction = "bottom";
      let btO = document.getElementById(id + "btO");
      btO.style.opacity = "1";

      let btE = document.getElementById(id + "btE");
      btE.style.opacity = "1";

      let btX = document.getElementById(id + "btX");
      btX.style.opacity = "1";

      // let item = document.getElementById(id + "item");
      // item.style.fontSize = "16";
      // item.style.backgroundColor = "rgb(211, 217, 226)";
    }
  }

  self.excluirAula = function (id) {
    let aulaRef = self.db.doc("aulas/" + id);
    aulaRef.delete().then(function () {
      $mdClassSchedulerToast.show("A aula foi removida");
    }).catch(function (error) {
      console.log("Ocorreu um erro: ", error);
    });
  }

  window.onclick = function () {
    if (self.menu.isOpen && self.menu.selecionado != "") {
      self.openMenu(self.menu.selecionado);
    }
  }

  self.initFirebase();
}
