// Componente que cria e remove faltas. Só pode ser acessado por quem 
// tem o papel de coordenador.

angular
  .module('class-scheduler')
  .controller('horarioCoordCtrl2', horarioCtrl)

function horarioCtrl($scope, $mdDialog, $mdClassSchedulerToast, $rootScope, $disciplinaSvc, $turmaSvc,
 $subSvc, $horarioSvc, $historicoSvc, $periodoSvc, $pessoaSvc, $subSvc, $profSvc, $alertSvc, authSvc,
 $location, temaSvc) {

    const self = this;

    self.labelHorario = [
      {inicio: "07:00", final:"07:50"}, {inicio: "07:50", final:"08:40"},
      {inicio: "08:40", final:"09:30"}, {inicio: "09:50", final:"10:40"}, {inicio: "10:40", final:"11:30"},
      {inicio: "11:30", final:"12:20"}, {inicio: "13:00", final: "13:50"}, {inicio: "13:50", final:"14:40"},
      {inicio: "14:40", final:"15:30"}, {inicio: "15:50", final:"16:40"}, {inicio: "16:40", final:"17:30"}
    ];

    self.loadPeriodos = function() {
      self.listaPeriodos = []
      return $periodoSvc.loadPeriodos(self.listaPeriodos)
    }

    self.init = function() {
        self.initFirebase();
        self.sendToolbarToMainCtrl();
        getUsuario();
        getTema();
    }

    self.initFirebase = function() {
      self.db = firebase.firestore()
    }

    function getUsuario() {
        gotUsuario(authSvc.getUsuario());
        authSvc.observarUsuario(usuario => {
            $scope.$apply(() => {
                gotUsuario(usuario);
            });
        });
    }

    function AuthorizationException(message) {
        this.message = message;
        this.name = "AuthorizationException";
    }

    function gotUsuario(user) {
        self.user = user;
        if (user == null) return
        if(user.papeis.includes('coordenador')) return;

        const error = new AuthorizationException('Usuário sem papel de coordenador');
        self.returnError(error, 'verificar permissão de coordenador');
        $location.path('/home');
    }

    function getTema() {
        self.themeSelected = temaSvc.getTema();
        temaSvc.observarTema(tema => {
            self.themeSelected = tema;
        });
    }

    self.sendToolbarToMainCtrl = function () {
      $rootScope.$broadcast('tituloPagina', {
        titulo: "Registro de Aula Vaga"  
      })
    }

    self.getHorarios = function() {
      self.horarios = {};
      // self.substituicoes = {};

      self.getTurmas();
    }

    self.getTurmas = function() {
      $turmaSvc.getTurmasPorPeriodo(self.periodoSelected.id)
        .then(self.gotTurmas)
        .catch(error => self.returnError(error, 'buscar turmas'))

      $turmaSvc.getSubturmasPorPeriodo(self.periodoSelected.id)
        .then(self.gotTurmas)
        .catch(error => self.returnError(error, 'buscar turmas'))
    }

    self.gotTurmas = function(query) {
      query.forEach(snapTurma => {
        const turma = snapTurma.data();
        turma.id = snapTurma.id;

        self.getCurso(turma);

        self.horarios[turma.id] = {
          disciplinas: [],
          substituicoes: new Array(10).fill(null),
          turma: turma
        }

        console.log('substituições:', self.horarios[turma.id]['substituicoes']);
        
        const turmaRef = self.db.doc(snapTurma.ref.path);
        self.getHorario(turmaRef)
        self.getSubstituicoes(turmaRef)
      })
    }

    self.getCurso = function(turma) {
      turma.curso.get()
        .then(snapCurso => {
          turma.curso = snapCurso.data();
        })
        .catch(error => self.returnError(error, 'buscar curso'))
    }

    self.getHorario = function(turmaRef) {
      console.log('obtendo horário da turma: ', turmaRef);
      
      const turmaId = turmaRef.id;
      const day = self.dateSelected.getDay();

      $horarioSvc.getHorarioDay(turmaRef, day)
        .then(disciplinas => {
          $scope.$apply(function() {
            console.log(disciplinas);
            self.horarios[turmaId]['disciplinas'] = disciplinas;
          })          
        })
        .catch(error => self.returnError(error, 'buscar horários'))
    }

    self.getSubstituicoes = function(turmaRef, day) {
      const daySelectedInMs = self.dateSelected.getTime();
      self.db.collection('substituicoes')
        .where('turmaRef', '==', turmaRef)
        .where('data', '==', daySelectedInMs)
        .onSnapshot(self.gotSubstituicoes, error => self.returnError(error, 'buscar substituições'))
    }

    self.gotSubstituicoes = function(query) {
      console.log('query das subs empty:', query.empty);
      query.forEach(snapSubstituicao => {
        const substituicao = snapSubstituicao.data();
        substituicao.id = snapSubstituicao.id;
        $subSvc.setStatus(substituicao);
        console.log('substituição:', substituicao);
        const turmaId = substituicao.turmaRef.id;
        const indice = substituicao.aula.indice;
        self.horarios[turmaId]['substituicoes'][indice] = substituicao;
      })
    }

    self.actions = function(turmaId, index, event) {  
        if (!self.user) return;
        self.originatorEvent = event;
        const substituicao = self.horarios[turmaId]['substituicoes'][index];
        if (substituicao === null) {
          console.log('marcar falta');
          self.showAddFalta(turmaId, index);
        } 
        else if (substituicao['status'] === 'falta') {
          console.log('remover falta');
          self.showRemoverFalta(turmaId, index);
        }
        else if (substituicao['status'] === 'substituida') {
          console.log('aula substituída');
          self.showAulaSubstituida(turmaId, index);
        }
    }

    self.showAddFalta = function(turmaId, index) {
      const confirm = $mdDialog.confirm()
        .textContent('Marcar falta nesse professor?')
        .targetEvent(self.originatorEvent)
        .ok('Marcar')
        .cancel('Cancelar')
        .theme(self.themeSelected)

      $mdDialog.show(confirm).then(
        () => self.addFalta(turmaId, index), 
        () => {}
      )

      self.originatorEvent = null;
    }

    self.addFalta = function(turmaId, indiceAula) {
      const disciplina = self.horarios[turmaId]['disciplinas'][indiceAula];
      const substituicao = {
        data: self.dateSelected.getTime(),
        eFalta: true,
        disciplina: disciplina,
        indiceAula: indiceAula
      }
      $subSvc.addSubstituicao(substituicao)
        .then((substituicaoRef) => {
          console.log(`substituicao adicionada: ${substituicaoRef.path}`);
          $mdClassSchedulerToast.show('Falta marcada');
          
          self.addHistorico('NF', turmaId, indiceAula);
        })
        .catch(error => self.returnError(error, 'adicionar falta'))

      self.originatorEvent = null;
    }

    self.showRemoverFalta = function(turmaId, indiceAula) {
      const confirm = $mdDialog.confirm()
        .textContent('Remover marcação de falta desse professor?')
        .targetEvent(self.originatorEvent)
        .ok('Remover')
        .cancel('Cancelar')
        .theme(self.themeSelected)

      $mdDialog.show(confirm).then(
        () => self.removerFalta(turmaId, indiceAula), 
        () => {}
      )
  
      self.originatorEvent = null;
    }

    self.removerFalta = function(turmaId, indiceAula) {
      const substituicao = self.horarios[turmaId]['substituicoes'][indiceAula];

      $subSvc.deleteSubstituicao(substituicao.id) 
        .then(() => {
          $scope.$apply(function() {
            // TODO: Add histórico
            self.horarios[turmaId]['substituicoes'][indiceAula] = null;
            $mdClassSchedulerToast.show('Marcação de falta removida');
            
            self.addHistorico('FN', turmaId, indiceAula);
          })
        })
        .catch(error => self.returnError(error, 'remover substituição'))
    }

    self.showAulaSubstituida = function(turmaId, index) {
      const disciplina = self.horarios[turmaId]['disciplinas'][index];
      const substituicao = self.horarios[turmaId]['substituicoes'][index];

      console.log('disciplina:', disciplina);
      console.log('substituicao:', substituicao);

      $mdDialog.show({
        templateUrl: 'app/components/horario-coord/aula-substituida2.tmpl.html',
        parent: angular.element(document.body),
        targetEvent: self.originatorEvent,
        locals: { 
          disciplina,
          substituicao
        },
        controller: ['$scope', 'disciplina', 'substituicao',
          function($scope, disciplina, substituicao) {

            $scope.substituto = substituicao.substituto;
            $scope.professor = { professorId: disciplina.professorId};

            $scope.loading = function() {
              return !$scope.substituto.data || !$scope.professor.data;
            }

            $scope.verificarDados = function() {
              if (!$scope.professor.data) {
                $scope.getProfessor($scope.professor);
              }

              if (!$scope.substituto.data) {
                $scope.getProfessor($scope.substituto);
              }
            }

            $scope.getProfessor = function(substituto) {
              const professorId = substituto.professorId;

              $profSvc.getProfessorById(professorId)
                .then(professor => {
                  $scope.$apply(function() {
                    substituto.data = professor;
                  })
                })
                .catch(error => self.returnError(error, 'buscar substituto'))
            }

            $scope.cancel = function() {
              $mdDialog.cancel();
            }

            $scope.hide = function() {
              $mdDialog.hide();
            }

            $scope.verificarDados();
          }
        ]
      }).then(response => {

      }, function() {

      })

      self.originatorEvent = null;
    }

    self.addHistorico = function(action, turmaId, indiceAula) {
      if (self.loggedUser) {
        const disciplina = self.horarios[turmaId]['disciplinas'][indiceAula];
        const substituicao = self.horarios[turmaId]['substituicoes'][indiceAula];
        const turmaRef = self.db.doc(`turmas/${turmaId}`);
  
        const historico = { 
          action, 
          authorId: self.loggedUser.id, 
          disciplina, 
          substituicao, 
          turmaRef
        };
        $historicoSvc.addHistorico2(historico)
          .then((refHistorico) => {
            console.log('Adicionado ao histórico: ', refHistorico.path);
          })
          .catch(error => self.returnError(error, 'adicionar ao histórico'))      
      }
    }

    self.returnError = function(error, operation='') {
      console.error(`Ocorreu um erro ao ${operation}:`, error)
      $alertSvc.showAlert(`Ocorreu um erro ao ${operation}`)
    }

    self.init();
}
