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

    self.getRealtimeUpdates();

    self.getDisciplinas();
    self.getProfessores();
  }

  self.getRealtimeUpdates = function () {
    self.db.collection("aulas").onSnapshot(function (querySnapshot) {

      self.default = [];
      self.replaced = [];
      self.available = [];

      querySnapshot.forEach(function (doc) {
        let promises = [];
        let data = doc.data();

        promises.push(new Promise(function (resolve, reject) {

          let discRef = self.db.doc("disciplinas/" + data.disciplina);
          discRef.get().then(function (doc) {
            resolve({
              id: doc.id,
              titulo: doc.data().titulo,
              professor: doc.data().professor
            });
          }).catch(function (error) {
            reject(error);
          })
        }));


        Promise.all(promises).then(function (list) {
          let finalPromise = [];

          finalPromise.push(new Promise(function (resolve, reject) {
            let profRef = self.db.doc("professores/" + list[0].professor);

            profRef.get().then(function (doc) {
              resolve({
                id: doc.id,
                nome: doc.data().nome,
                sobrenome: doc.data().sobrenome,
                email: doc.data().email
              });
            }).catch(function (error) {
              reject(error);
            });
          }));

          Promise.all(finalPromise).then(function (finalList) {

            if (data.status.ok == true) {

              $scope.$apply(function () {
                self.default.push({
                  id: doc.id,
                  start: data.start,
                  end: data.end,
                  status: data.status,
                  disciplina: {
                    titulo: list[0].titulo,
                    id: list[0].id
                  },
                  professor: finalList[0]
                });              
              });
            }

            else if (data.status.disponivel == true) {
              $scope.$apply(function () {
                self.available.push({
                  id: doc.id,
                  start: data.start,
                  end: data.end,
                  status: data.status,
                  disciplina: {
                    titulo: list[0].titulo,
                    id: list[0].id
                  },
                  professor: finalList[0]
                });             
              });
            }

            else {
              let promiseReplaced = [];

              promiseReplaced.push(new Promise(function (resolve, reject) {
                let profRef = self.db.doc("professores/" + data.prof_subs);

                profRef.get().then(function (doc) {
                  let data = doc.data();
                  resolve({
                    id: doc.id,
                    nome: data.nome,
                    sobrenome: data.sobrenome,
                    email: data.email
                  });
                }).catch(function (error) {
                  reject(error);
                })
              }));

              Promise.all(promiseReplaced).then(function (list2) {
                $scope.$apply(function () {
                  self.replaced.push({
                    id: doc.id,
                    start: data.start,
                    end: data.end,
                    status: data.status,
                    disciplina: {
                      titulo: list[0].titulo,
                      id: list[0].id
                    },
                    professor: finalList[0],
                    prof_subs: list2[0]
                  });           
                });
              })
            }
          }).catch(function (error) {
            console.log("Ocorreu um erro: ", error);
          })
          
        }).catch(function (error) {
          console.log("Ocorreu um erro: ", error);
        });
      })
    });
  }

  self.getDisciplinas = function () {
    self.disciplinas = [];

    self.db.collection("disciplinas").get()
      .then(function (query) {
        query.forEach(function (doc) {
          self.disciplinas.push({
            id: doc.id,
            titulo: doc.data().titulo,
            professor: doc.data().professor
          });            
        });
      }).catch(function (error) {
        console.log("Ocorreu um erro: ", error);
      });
  }

  self.getProfessores = function () {
    self.db.collection("professores").get()
      .then(function (query) {
        self.profs = [];
        $scope.$apply(function () {
          query.forEach(function (doc) {
              self.profs.push({
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

  self.salvarAula = function (ev) {
    $mdDialog.show({
      templateUrl: 'app/routes/add-aula.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      targetEvent: ev,
      locals: {
        disciplinas: self.disciplinas
      },
      fullscreen: $scope.customFullscreen,
      controller: ['$scope', '$mdClassSchedulerToast', 'disciplinas',
        function ($scope, $mdClassSchedulerToast, disciplinas) {
          $scope.disciplinas = disciplinas;

          $scope.salvar = function () {
            $scope.setStart($scope.day);
            $scope.setEnd($scope.day);

            self.db.collection("aulas").add({
              start: $scope.start,
              end: $scope.end,
              status: {
                ok: true,
                disponivel: false,
                substituida: false
              },
              disciplina: $scope.disciplina.id
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
        aula: aula,
        disciplinas: self.disciplinas,
        professores: self.profs
      },
      controller: ['$scope', 'aula', 'disciplinas', 'professores',
        function ($scope, aula, disciplinas, professores) {

          $scope.profs = professores;
          $scope.disciplinas = disciplinas;
          $scope.aula =  aula;
          $scope.disciplina = aula.disciplina;

          $scope.dia = aula.start;
          $scope.startHr = aula.start.getHours();
          $scope.endHr = aula.end.getHours();

          $scope.startMt = aula.start.getMinutes();
          $scope.endMt = aula.end.getMinutes();

          if (aula.prof_subs)
            $scope.selectedItem = aula.prof_subs;

          $scope.init = function () {
            if ($scope.aula.status.ok == true) 
              $scope.status = "Ok";
            else if ($scope.aula.status.disponivel == true)
              $scope.status = "Disponível";
            else if ($scope.aula.status.substituida == true)
              $scope.status = "Substituída";
          }

          $scope.salvar = function () {
            $scope.setStart($scope.dia);
            $scope.setEnd($scope.dia);
            if ($scope.status == "Disponível") {
              if ($scope.aula.professor.id == self.user.id) {
                console.log("é prof da aula");
              } else {
                console.log("NÃO é prof da aula");
              }

              $scope.ok = false;
              $scope.disponivel = true;
              $scope.substituida = false;
            } else if ($scope.status == "Substituída") {
              // if ($scope.aula.status.disponivel == false) {
              //   $mdClassSchedulerToast.show("Essa aula não está disponível")
              //   return;
              // }
              $scope.ok = false;
              $scope.disponivel = false;
              $scope.substituida = true;
            } else {
              $scope.ok = true;
              $scope.disponivel = false;
              $scope.substituida = false;
            }
            let aulaRef = self.db.doc("aulas/" + $scope.aula.id);

            if ($scope.status == "Substituída") {
              aulaRef.update({
                start: $scope.start || aula.data().start,
                end: $scope.end || aula.data().end,
                status: {
                  ok: $scope.ok,
                  disponivel: $scope.disponivel,
                  substituida: $scope.substituida
                },
                disciplina: $scope.disciplina.id,
                prof_subs: $scope.selectedItem.id
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
                },
                disciplina: $scope.disciplina.id
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

  self.excluirAula = function (id) {
    let aulaRef = self.db.doc("aulas/" + id);
    aulaRef.delete().then(function () {
      $mdClassSchedulerToast.show("A aula foi removida");
    }).catch(function (error) {
      console.log("Ocorreu um erro: ", error);
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

      let item = document.getElementById(id + "item");
      item.style.removeProperty("font-size");
      item.style.removeProperty("background-color");

    } else {
      self.menu.selecionado = id;
      self.menu.direction = "bottom";
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
    if (self.menu.isOpen && self.menu.selecionado != "") {
      self.openMenu(self.menu.selecionado);
    }
  }

  self.initFirebase();
}
