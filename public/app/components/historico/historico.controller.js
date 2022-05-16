// Componente que monta relatórios com base no histórico de substituições

angular
  .module('class-scheduler')
  .controller('historicoCtrl2', historicoCtrl);

function historicoCtrl($rootScope, $scope, $historicoSvc, authSvc, $turmaSvc, 
        $profSvc, $subSvc, $alertSvc, $mdDialog, $location, $pessoaSvc, temaSvc) {
  const self = this;

  self.initFirebase = function() {
      self.db = firebase.firestore();
      self.sendToolbarToMainCtrl();
      // self.setarValoresIniciais();
      getUsuario();
      getTema();
  }

  function getUsuario() {
    gotUsuario(authSvc.getUsuario());
    authSvc.observarUsuario(usuario => {
        $scope.$apply(() => {
            gotUsuario(usuario);
        });
    });
  }

  function gotUsuario(usuario) {
    self.loggedUser = usuario;
    if (self.loggedUser && !self.loggedUser.papeis.includes('administrador')) {
        self.returnError(null, 'verificar permissão de administrador');
        $location.path('/home');
    }
  }

  function getTema() {
    self.themeSelected = temaSvc.getTema();
    temaSvc.observarTema(tema => {
        self.themeSelected = tema;
    });
  }

  // Muda o título na barra de menu para Histórico
  self.sendToolbarToMainCtrl = function() {
    $rootScope.$broadcast('tituloPagina', {
      titulo: "Histórico"
    });
  }

  // self.setarValoresIniciais = function() {
  //   self.meses = [
  //     "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  //     "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  //   ];
  // }

  self.loading = function() {
    return self.buscandoProfs || self.buscandoHistoricos;
  }

  self.submit = function() {
    self.definirDatas();
    self.getProfs();
    self.getHistorico();
    // self.getHistorico2();
  }

  self.definirDatas = function() {
    if (self.tipoRelatorio == "mensal") {
      self.start = new Date();
      self.start.setDate(1);
      self.start.setMonth(self.monthSelected);

      self.end = new Date();
      self.end.setMonth(self.monthSelected + 1);
      self.end.setDate(0);
    }
    else if (self.tipoRelatorio == "semanal") {
      self.start = $subSvc.retornarDom(self.semana);
      self.end = $subSvc.retornarSab(self.start);
    }
    else if (self.tipoRelatorio == "anual") {
      self.start = new Date();
      self.start.setFullYear(self.ano);
      self.start.setDate(1);
      self.start.setMonth(0);

      self.end = new Date(self.start);
      self.end.setDate(31);
      self.end.setMonth(11);
    }
    else if (self.tipoRelatorio == "diario") {
      self.daySelected.setHours(0)
      self.daySelected.setMinutes(0)
      self.daySelected.setSeconds(0)
      self.daySelected.setMilliseconds(0)
      console.log("time: ", self.daySelected.getTime());
      return
    }

    self.start.setHours(0);
    self.start.setMinutes(0);
    self.start.setSeconds(0);

    self.end.setHours(23);
    self.end.setMinutes(59);
    self.end.setSeconds(59);

    console.log("start: ", self.start);
    console.log("end: ", self.end);
  }

  self.getProfs = function() {
    self.buscandoProfs = true;
    $profSvc.getProfs()
      .then(self.gotTeachers)
      .catch(error => self.returnError(error, 'buscar professores'))
  }

  self.gotTeachers = function (query) {
    self.professores = [];
    query.docs.forEach(snapTeacher => {
      const teacher = snapTeacher.data();
      teacher.id = snapTeacher.id;
      teacher.fullName = `${teacher.nome} ${teacher.sobrenome}`;
      self.professores.push(teacher);
    })

    self.buscandoProfs = false;
  }

  self.getHistorico = function() {
    self.historico = {}

    if (self.tipoRelatorio == "diario") {
      self.db.collection("historico")
        .where("substituicao.data", "==", self.daySelected.getTime())
        .get()
        .then(self.gotHistorico)
        .catch(e => {
          console.error("Erro em getHistorico diário:", e)
          $alertSvc.showError("Ocorreu um erro ao obter o histórico do servidor")
          $alertSvc.showAlert("Ocorreu um erro ao obter o histórico do servidor")
        })
    } else {
      $historicoSvc.getHistorico2(self.start.getTime(), self.end.getTime())
      // $historicoSvc.getHistorico2(self.start, self.end)
        .then(self.gotHistorico)
        .catch(e => console.error("Ocorreu um erro em getHistorico2: ", e));
    }
  }

  self.gotHistorico = function (query) {
    $scope.$apply(() => {
        console.log("query.empty: ", query.empty);
        console.log('histórico: ', self.historico);
        query.forEach(snap => {
            console.log("histórico: ", snap.data());
            const historico = snap.data()
            historico.date = historico.data.toDate()
            const professorId = historico.disciplina.professorId
            self.verifyTeacherInJSONHistorico(professorId)
            const action = historico.action
            if (action == "NL" || action == "NF")
                self._gotHistoricoNL(historico, professorId);
            else if (action == "LN" || action == "FN") 
                self._gotHistoricoLN(historico, professorId);
            else if (action === "LO") 
                self._gotHistoricoLO(historico);
            else if (action === "OL")
                self._gotHistoricoOL(historico);
        });
    });
  }

  self._gotHistoricoNL = function(historico, professorId) {
      historico.actionLabel = 'Faltou';
      self.historico[professorId]["numFaltas"]++
      self.historico[professorId]["faltas"].push(historico);
      self.getSubstituicao(historico, professorId)
  }

  self._gotHistoricoLN = function(historico, professorId) {
    historico.actionLabel = 'Cancelou falta';
    self.historico[professorId]["numFaltas"]--;
    self.historico[professorId]["faltas"].push(historico);
  }

  self._gotHistoricoLO = function(historico) {
    historico.actionLabel = 'Ocupou aula';
    console.log('entrou em livre -> ocupada');
    const authorId = historico.authorId
    self.verifyTeacherInJSONHistorico(authorId)
    self.historico[authorId]["numOcupadas"]++;
    self.historico[authorId]["ocupadas"].push(historico);
  }

  self._gotHistoricoOL = function(historico) {
    historico.actionLabel = 'Desocupou aula';
    console.log('entrou em ocupada -> livre');
    const authorId = historico.authorId
    self.verifyTeacherInJSONHistorico(authorId)
    self.historico[authorId]["numOcupadas"]--;
    self.historico[authorId]["ocupadas"].push(historico);
  }

  // self.getTurma = function (historico) {
  //   historico.turmaRef.get()
  //     .then(snapTurma => {
  //       const turma = snapTurma.data()
  //       self.getCurso(turma);
  //       historico.turma = turma
  //     })
  //     .catch(e => console.error("Erro em getTurma: ", e))
  // }

  // self.getCurso = function(turma) {
  //   turma.curso.get()
  //     .then(snapCurso => {
  //       turma.cursoTitulo = snapCurso.data().titulo
  //     })
  //     .catch(error => self.returnError(error, 'obter curso'))
  // }

  self.getSubstituicao = function (historico, teacherId) {
    const subsId = historico.substituicao._id

    $subSvc.getSubstituicao(subsId)
      .then(snapSubstituicao => {
        if (snapSubstituicao.exists) {
          const substituicao = snapSubstituicao.data()
          historico.substituicao = substituicao

          self.verificarJustificativa(historico, teacherId, substituicao)
        }
      })
      .catch(e => console.error("Erro ao obter substituição do histórico: ", e))
  }

  self.verificarJustificativa = function (historico, teacherId, substituicao) {
    if (substituicao.motivo) {
      self.historico[teacherId]["numJust"]++;
      self.historico[teacherId]["justificadas"].push(historico);
    }
  }

  self.verifyTeacherInJSONHistorico = function (teacherId) {
    if (!self.historico[teacherId]) {
      const json = {
        faltas: [],
        ocupadas: [],
        justificadas: [],
        numJust: 0,
        numFaltas: 0,
        numOcupadas: 0
      }
      self.historico[teacherId] = json
    }
  }

  self.showDetails = function(lista) {
    $mdDialog.show({
      templateUrl: 'app/components/historico2/show-details.tmpl.html',
      parent: angular.element(document.body),
      clickOutsideToClose: true,
      fullscreen: true,
      locals: {
        lista: lista,
        theme: self.themeSelected
      },
      controller: ['$scope', 'lista', 'theme',
        function($scope, lista, theme) {
          $scope.lista = lista;
          $scope.themeSelected = theme;

          $scope.init = function(lista) {
            if (!$scope.existeTurmas(lista)) {
              $scope.loading = true;
              $scope.getTurmas(lista)
            }
          }

          $scope.getTurmas = function(lista) {
            const promisesTurmas = [];

            for (historicoObj of lista) {
              console.log('historicoObj:', historicoObj);
              promisesTurmas.push(
                $turmaSvc.getTurmaByRef(historicoObj.turmaRef)
              )
            }

            Promise.all(promisesTurmas).then(turmas => {
              $scope.$apply(function() {
                for (let i = 0; i < turmas.length; i++) {
                  lista[i].turma = turmas[i]
                }
                $scope.loading = false;
              });              
            })
            .catch(error => self.returnError(error, 'buscar turmas'))
          }

          $scope.existeTurmas = function(lista) {
            return lista[0].turma;
          }

          $scope.cancel = function() {
            $mdDialog.cancel();
          }

          $scope.init($scope.lista);
        }
      ]
    }).then(function () {

    }, function() {

    })
  }

  self.returnError = function(error, operation) {
    $alertSvc.showAlert('Ocorre um erro ao', operation);
    console.error(`Ocorreu um erro ao ${operation}: ${error}`)
  }

  self.initFirebase();
}
