angular
  .module('class-scheduler')
  .controller('cursoCtrl', cursoCtrl);

function cursoCtrl($scope, authSvc, $rootScope, $mdDialog, $cursoSvc, $periodoSvc,
  $turmaSvc, $mdClassSchedulerToast, temaSvc) {

  var self = this;

  self.initFirebase = function () {
    self.db = firebase.firestore();
    self.atualizarBarraMenu();
    self.getCursos();
    self.getPeriodos();
    getUsuario();
    getTema();
  }

  self.loadCursos = function () {
    self.listaCursos = [];

    return $cursoSvc.getCursos()
    .then(query => {
      query.forEach((snapCurso, i) => {
        const curso = snapCurso.data();
        curso.id = snapCurso.id;

        console.log(`Curso: ${curso} - Índice: ${i}`);
        
        self.listaCursos.push(curso);
      })
    })
    .catch(e => {
      console.error('Ocorreu um erro em loadCursos: ', e);
    })
  }

  // Envia para o mainCtrl as informações da barra de menu.
  self.atualizarBarraMenu = function () {
    $rootScope.$broadcast('tituloPagina', {
      titulo: "Cursos/Períodos",
      btVisible: false,
    });
  }

  // Instatâneo das modificações na coleção dos cursos
  self.getCursos = function () {
    self.carregandoCursos = true;
    self.db.collection("cursos").orderBy("titulo").onSnapshot(query => {
      self.cursos = [];

      query.forEach(doc => {
        $scope.$apply(function () {
          let dados = doc.data();
          dados.id = doc.id;
          self.cursos.push(dados);
        });
      });

      self.carregandoCursos = false;
    }, e => self.retornarErro(e));
  }

  self.getPeriodos = function () {
    self.carregandoPeriodos = true;
    self.db.collection("periodos")
    .orderBy("ano")
    .onSnapshot(query => self.gotPeriodos(query),
    e => self.retornarErro(e));
  }

  self.gotPeriodos = function (query) {
    self.periodos = [];
    query.forEach(doc => {
      $scope.$apply(function () {
        const periodo = doc.data();
        periodo.id = doc.id;
        self.periodos.push(periodo);
      });
    });
    self.ordenarPeriodos();
  }

  self.ordenarPeriodos = function() {
    for (let i = 0; i < self.periodos.length-1; i++) {
      let atual = self.periodos[i];
      let proximo = self.periodos[i+1];

      if (atual.ano === proximo.ano && atual.semestre > proximo.semestre) {
        let temp = self.periodos[i];
        self.periodos[i] = self.periodos[i+1];
        self.periodos[i+1] = temp;
      }
    }
    self.carregandoPeriodos = false;
  }

  function getUsuario() {
    authSvc.observarUsuario(usuario => {
        if (usuario.papeis.includes('administrador')) return;
        $location.path('/home');
    });
  }

  function getTema() {
    temaSvc.observarTema(tema => {
        self.themeSelected = tema;
    });
  }

  self.getTurmas = function () {
    let cursoRef = self.db.doc("cursos/" + self.cursoId);
    let periodoRef = self.db.doc("periodos/" + self.periodoId);
    self.carregandoTurmas = true;

    self.db.collection("turmas")
    .where("periodo", "==", periodoRef)
    .where("curso", "==", cursoRef)
    .onSnapshot(querySnapshot => {
      self.turmas = [];

      for (let i = 0; i < querySnapshot.size; i++) {
        const doc = querySnapshot.docs[i].data();
        doc.id = querySnapshot.docs[i].id;

        let promessas = [];
        promessas.push(new Promise(function (resolve, reject) {
          doc.curso.get().then(curso => {
            resolve(curso.data().titulo);
          }).catch(e => reject(e));
        }));

        promessas.push(new Promise(function (resolve, reject) {
          doc.periodo.get().then(p => {
            let pe = p.data();
            pe.id = p.id;
            resolve(pe);
          }).catch(e => reject(e));
        }));

        Promise.all(promessas).then(res => {
          $scope.$apply(function () {
            doc.curso = res[0];
            doc.periodo = res[1];
            self.turmas.push(doc);

            if (self.turmas.length == querySnapshot.size) {
              self.carregandoTurmas = false;
              $turmaSvc.juntarTurmas(self.turmas);
            }
          });
        }).catch(e => self.retornarErro(e));
      }
    }, (error) => self.retornarErro(error));
  }

  self.openMenu = function ($mdMenu, ev) {
    self.originatorEv = ev;
    $mdMenu.open(ev);
  }

  self.addCurso2 = function () {
    let curso = {
      titulo: self.titulo
    }
    $cursoSvc.addCurso(curso).then(function () {
      $mdClassSchedulerToast.show(`${self.titulo} foi adicionado aos cursos`)
      self.titulo = ""
    })
    .catch(e => self.retornarErro(e));
  }

  // Adicionar novo curso no firebase
  self.addCurso = function (ev) {
    $mdDialog.show({
        templateUrl: 'app/components/cursos/new-curso.tmpl.html',
        parent: angular.element(document.body),
        targetEvent: ev,
        clickOutsideToClose: true,
        fullscreen: $scope.customFullscreen, // Only for -xs, -sm breakpoints.
        controller: ['$scope', function ($scope) {

          $scope.hide = function () {
            $mdDialog.hide({
              titulo: $scope.titulo
            })
          }

          $scope.cancel = function () {
            $mdDialog.cancel();
          }
        }]
      })
      .then(function (curso) {
        $cursoSvc.addCurso(curso).catch(e => self.retornarErro(e));
      }, function () {

      });
  }

  // Excluir curso do Firebase
  self.excluirCurso = function (c) {
    $mdDialog.show({
      templateUrl: 'app/routes/dialog-delete.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      clickOutsideToClose: false,
      fullscreen: $scope.customFullscreen,
      locals: {
        curso: c
      },
      controller: ['$scope', 'curso', function ($scope, c) {
        $scope.display = c.titulo;
        $scope.cancel = function () {
          $mdDialog.cancel();
        }
        $scope.excluir = function () {
          $mdDialog.hide(c.id);
        }
      }]
    }).then(cursoId => {
      $cursoSvc.excluirCurso(cursoId).catch(e => self.retornarErro(e));
    }, () => {})
    self.originatorEv = null;
  }

  self.editarCurso = function (c) {
    $mdDialog.show({
      templateUrl: 'app/components/cursos/edit-curso.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      clickOutsideToClose: false,
      fullscreen: false,
      locals: {
        titulo: c.titulo
      },
      controller: ['$scope', 'titulo', function ($scope, titulo) {
        $scope.titulo = titulo;

        $scope.cancel = function () {
          $mdDialog.cancel();
        }
        $scope.salvar = function () {
          $mdDialog.hide($scope.titulo);
        }
      }]
    }).then(novoTitulo => {
      $cursoSvc.editarCurso(c.id, {
        titulo: novoTitulo
      }).catch(e => self.retornarErro(e));
    }, () => {})
    self.originatorEv = null;
  }

  // Excluir período do Firebase
  self.excluirPeriodo = function (p) {
    $mdDialog.show({
      templateUrl: 'app/routes/dialog-delete.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      clickOutsideToClose: false,
      fullscreen: $scope.customFullscreen,
      locals: {
        p: p
      },
      controller: ['$scope', 'p', function ($scope, p) {
        $scope.display = p.ano + "." + p.semestre;
        $scope.cancel = function () {
          $mdDialog.cancel();
        }
        $scope.excluir = function () {
          $mdDialog.hide(p.id);
        }
      }]
    }).then(periodoId => {
      $periodoSvc.excluirPeriodo(periodoId).catch(e => self.retornarErro(e));
    }, () => {})
    self.originatorEv = null;
  }

  // Adicionar novo curso no firebase
  self.addPeriodo = function (ev) {
    $mdDialog.show({
        templateUrl: 'app/components/cursos/new-periodo.tmpl.html',
        parent: angular.element(document.body),
        targetEvent: ev,
        clickOutsideToClose: true,
        fullscreen: $scope.customFullscreen, // Only for -xs, -sm breakpoints.
        controller: ['$scope', function ($scope) {
          $scope.anoMin = new Date().getFullYear();

          $scope.hide = function () {
            $mdDialog.hide($scope.ano);
          }

          $scope.cancel = function () {
            $mdDialog.cancel();
          }
        }]
      })
      .then(function (ano) {
        let periodo = {
          ano: ano,
          semestre: 1
        };
        $periodoSvc.addPeriodo(periodo).catch(e => self.retornarErro(e));
        periodo.semestre = 2;
        $periodoSvc.addPeriodo(periodo).catch(e => self.retornarErro(e));
      }, function () {
        // Popup cancelado.
      });
  }

  self.editarPeriodo = function (p) {
    $mdDialog.show({
      templateUrl: 'app/components/cursos/edit-periodo.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      clickOutsideToClose: false,
      fullscreen: false,
      locals: {
        periodo: p
      },
      controller: ['$scope', 'periodo', function ($scope, periodo) {
        $scope.ano = periodo.ano;

        $scope.cancel = function () {
          $mdDialog.cancel();
        }
        $scope.salvar = function () {
          $mdDialog.hide($scope.ano);
        }
      }]
    }).then(novoAno => {
      $periodoSvc.editarPeriodo(p.id, {
        ano: novoAno,
        semestre: p.semestre
      })
    }, () => {})
    self.originatorEv = null;
  }

  self.retornarErro = function (e) {
    console.error("Ocorreu um erro: ", e);
  }

  self.initFirebase();
}
