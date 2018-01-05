angular
  .module("class-scheduler")
  .controller("discCtrl", discCtrl)

function discCtrl ($scope, $firebaseArray, $mdDialog, $mdClassSchedulerToast) {
  var self = this;
  self.id;
  self.direction = "left";
  self.isOpen = false;
  self.selectedMode = "md-scale";

  self.initFirebase = function () {
    self.db = firebase.firestore();
    self.getRealtimeUpdates();
    self.getProfessores();
    self.getTurmas();
  }

  self.getTurmas = function () {
    self.db.collection("turmas").get().then(function (querySnapshot) {
      self.turmas = [];
      querySnapshot.forEach((doc) => {
        let data = doc.data();
        self.turmas.push({
          id: doc.id,
          curso: data.curso,
          serie: data.serie
        });
      });
    }).catch(function () {
      console.log("Ocorreu um erro: ", error);
    });
  }

  self.getProfessores = function () {
    self.db.collection("professores").get()
      .then(function (query) {
        self.professores = [];
        query.forEach(function (doc) {

          self.professores.push({
            id: doc.id,
            nome: doc.data().nome,
            sobrenome: doc.data().sobrenome,
            email: doc.data().email
          });

        });
      }).catch(function (error) {
        console.log("Ocorreu um erro: ", error);
      });
  }

  self.getRealtimeUpdates = function () {
    

    self.db.collection("disciplinas").onSnapshot(function (querySnapshot) {
      self.disciplinas = [];

      querySnapshot.forEach(function (doc) {
        let data = doc.data();        

        let promessas = [];

        promessas.push(new Promise(function (resolve, reject) {
          let turmaRef = self.db.doc("turmas/" + data.turma);

          turmaRef.get().then(function (doc) {
            resolve({
              id: doc.id,
              curso: doc.data().curso,
              serie: doc.data().serie
            });
          }).catch(function (error) {
            reject(error);
          });
        }));

        Promise.all(promessas).then(function (turma) {
            let finalPromise = [];

            finalPromise.push(new Promise (function (resolve, reject) {
              let profRef = self.db.doc("professores/" + data.professor);

              profRef.get().then(function (doc) {
                resolve({
                  professor: {
                    id: doc.id,
                    nome: doc.data().nome,
                    sobrenome: doc.data().sobrenome,
                    email: doc.data().email,
                    isAdmin: doc.data().isAdmin // nem sei se precisa desse campo nas disc
                  },
                  turma: turma[0] 
                });
              }).catch(function (error) {
                reject(error);
              })
            })); 

            Promise.all(finalPromise).then(function (obj) {
              $scope.$apply(function () {
                self.disciplinas.push({
                  id: doc.id,
                  titulo: data.titulo,
                  turma: obj[0].turma,
                  professor: obj[0].professor
                });                
              });
            }).catch(function (error) {
              console.log("Ocorreu um erro: ", error);
            });

          }).catch(function (error) {
            console.log("Ocorreu um erro: ", error);
          });

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
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true,
      fullscreen: $scope.customFullscreen,
      locals: {
        disc: disc,
        professores: self.professores,
        turmas: self.turmas
      },
      controller: ['$scope', '$mdClassSchedulerToast', 'disc', 'professores',
        'turmas',
        function ($scope, $mdClassSchedulerToast, disc, professores, turmas) {
          $scope.disc = disc;

          $scope.titulo = disc.titulo;
          $scope.turmas = turmas;
          $scope.professores = professores;
          
          $scope.turma = disc.turma;
          $scope.professor = disc.professor;

          $scope.salvar = function () {
            let discRef = self.db.doc("disciplinas/" + disc.id);
            discRef.update({
              titulo: $scope.titulo || $scope.disc.titulo,
              turma: $scope.turma ? $scope.turma.id : $scope.disc.turma.id,
              professor: $scope.professor ? $scope.professor.id : $scope.disc.professor.id
            }).then(function () {
              $scope.hide();
              $mdClassSchedulerToast.show("A disciplina foi modificada");
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
      locals: { professores: self.professores, turmas: self.turmas },
      controller: ['$scope', '$mdClassSchedulerToast', 'professores', 'turmas',
        function ($scope, $mdClassSchedulerToast, professores, turmas) {
        $scope.selected = [];
        $scope.professores = professores;
        $scope.turmas = turmas;

        $scope.salvar = function () {
          self.db.collection("disciplinas").add({
            titulo: $scope.titulo,
            turma: $scope.turma.id,
            professor: $scope.professor.id
          }).then(function (docRef) {
            $mdClassSchedulerToast.show("Uma nova disciplina foi salva");
            $scope.cancel();
          }).catch(function (error) {
            console.log("Ocorreu um erro ao salvar disciplina: ", error);
            $mdClassSchedulerToast.show("Erro ao salvar a disciplina");
          });
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
      self.openMenu(self.id);
    }
  }

  self.initFirebase();
}
