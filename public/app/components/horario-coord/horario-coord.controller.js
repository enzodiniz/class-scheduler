angular
  .module('class-scheduler')
  .controller('horarioCoordCtrl', horarioCtrl)

function horarioCtrl($scope, $mdDialog, $mdClassSchedulerToast, $rootScope, $disciplinaSvc,
  $authSvc, $turmaSvc, $subSvc, $horarioSvc, $historicoSvc, $periodoSvc, $pessoaSvc) {

    const self = this

    self.init = function() {
      self.initFirebase()
      self.sendToolbarToMainCtrl()
      self.dateSelected = new Date()
    }

    self.initFirebase = function() {
      self.auth = firebase.auth()
      self.auth.onAuthStateChanged(self.onAuthStateChanged.bind(this))
      self.db = firebase.firestore()
    }

    self.onAuthStateChanged = function (user) {
      if (user) {
        self.getLoggedUser(user)
      } else {
        $location.path("/login")
      }
    }

    self.getLoggedUser = function(user) {
      $pessoaSvc.getPessoaByEmail(user.email)
      .then(query => {
        const snapUser = query.docs[0]
        self.loggedUser = snapUser.data()
        self.loggedUser.id = snapUser.id
      })
      .catch(e => console.error("Erro em getLoggedUser: ", e))
    }

    self.sendToolbarToMainCtrl = function () {
      const toolbar = {
        titulo: "Registro de Aula Vaga"
      }
      $rootScope.$broadcast('tituloPagina', toolbar)
    }

    self.loadPeriodos = function() {
      return $periodoSvc.getPeriodos().then(query => {
        const periodos = []

        query.forEach(snapPeriodo => {
          const periodo = snapPeriodo.data()
          periodo["id"] = snapPeriodo["id"]
          periodos.push(periodo)
        })
        self.periodos = $periodoSvc.sortPeriodos(periodos)
      })
      .catch(e => console.error("Ocorreu um erro ao carregar os períodos: ", e))
    }

    self.query = function() {
      self.horariosTurma = {}
      self.substituicoes = {}
      self.sanitizarDatas()
      self.getTurmas()
    }

    self.sanitizarDatas = function () {
      self.dateSelected.setHours(0)
      self.dateSelected.setMinutes(0)
      self.dateSelected.setSeconds(0)
      self.dateSelected.setMilliseconds(0)

      self.dateSelectedTime = self.dateSelected.getTime()

      const day = self.dateSelected.getDay()
      self.dayString = self.convertDayInString(day)
    }

    self.getTurmas = function() {
      $turmaSvc.getTurmasPorPeriodo(self.periodo.id)
      .then(queryTurmas => self.gotTurmas(queryTurmas))
      .catch(e => console.error("Ocorreu um erro ao buscar as turmas: ", e))
    }

    self.gotTurmas = function (queryTurmas) {
      self.turmas = []
      self.turmasG2 = []

      queryTurmas.forEach(snapTurma => {
        const turma = snapTurma.data()
        const turmaId = snapTurma.id

        turma.id = turmaId
        if (turma.titulo != "G2") {
          self.turmas.push(turma)
        } else {
          self.turmasG2.push(turma)
        }

        self.substituicoes[turmaId] = []

        self.getCurso(turma)
        self.getHorario(turmaId)
        self.getSubstituicoes(turmaId)
      })

      console.log("horários das turmas: ", self.horariosTurma)
      console.log("JSON substituições: ", self.substituicoes);
      self.sortTurmas()
    }

    self.sortTurmas = function () {
      for (let i = 0; i < self.turmasG2.length; i++) {
        const turmaG2 = self.turmasG2[i]
        self.findTurmaG1(turmaG2)
      }
      delete self.turmasG2
    }

    self.findTurmaG1 = function (turmaG2) {
      for (let i = 0; i < self.turmas.length; i++) {
        const turmaG1 = self.turmas[i]
        if (turmaG1.turmaG2Id === turmaG2.id) {
          turmaG2.turmaG1Id = turmaG1.id
          self.turmas.splice(i+1, 0, turmaG2)
          break;
        }
      }
    }

    self.getCurso = function (turma) {
      turma.curso.get()
      .then(snapCurso => {
        turma.curso = snapCurso.data()
      })
      .catch(e => console.error("Ocorreu um erro ao obter o curso: ", e))
    }

    self.getHorario = function(turmaId) {
      $horarioSvc.getHorarioByDay(turmaId, self.dayString).then(response => {
        self.horariosTurma[turmaId] = response.data
      })
      .catch(e => console.error("Ocorreu um erro ao buscar horário: ", e))
    }

    self.convertDayInString = function(day) {
           if (day === 1) return "seg"
      else if (day === 2) return "ter"
      else if (day === 3) return "qua"
      else if (day === 4) return "qui"
      else if (day === 5) return "sex"
    }

    self.getSubstituicoes = function(turmaId) {
      // const refTurma = self.db.doc("turmas/" + turmaId)
      //
      // self.db.collection("substituicoes")
      //   .where("turma", "==", refTurma)
      //   .where("data2", "==", self.dateSelectedTime)
      //   .onSnapshot(query => self.gotSubstituicoes(query),
      //   error => {
      //     console.error("Erro em getSubstituicoes(): ", error)
      //   })
      //
      self.db.collection("substituicoes")
        .where("turmaId", "==", turmaId)
        .where("data", "==", self.dateSelectedTime)
        .onSnapshot(query => self.gotSubstituicoes(query, turmaId),
        error => {
          console.error("Erro em getSubstituicoes(): ", error)
        })
    }

    self.gotSubstituicoes = function (query, turmaId) {
      query.forEach(snapSubs => {
        const substituicao = snapSubs.data()
        substituicao.id = snapSubs.id

        // const turmaId = substituicao.turma.id

        const indice = substituicao.indiceAula

        self.definirStatus(substituicao)

        self.substituicoes[turmaId][indice] = substituicao
      })
    }

    self.definirStatus = function (substituicao) {
      if (substituicao.substitutoId) {
        substituicao.status = "substituida"
      } else if (substituicao.eFalta) {
        substituicao.status = "falta"
      } else {
        substituicao.status = "livre"
      }
    }

    self.showDialog = function(turma, index, ev) {
      self.originatorEv = ev
      const turmaId = turma.id

      const substituicao = self.substituicoes[turmaId][index]
      if (!substituicao) {
        self.showMarcarFalta(turma, index)
      }

      else if (substituicao.status == "falta") {
        self.showRemoverFalta(turma, index)
      }

      else if (substituicao.status == "substituida") {
        self.showAulaSubstituida(turmaId, index)
      }

      else if (substituicao.status == "livre") {
        self.showAulaLivre(turmaId, index)
      }
    }

    self.showMarcarFalta = function (turma, index) {
      $mdDialog.show({
        controller: self.dialogsController,
        templateUrl: 'app/components/horario-coord/marcar-falta.tmpl.html',
        parent: angular.element(document.body),
        targetEvent: self.originatorEv,
        clickOutsideToClose: true,
        locals: {
          disciplina: self.horariosTurma[turma.id][index],
          substituicao: self.substituicoes[turma.id][index]
        }
      }).then(() => self.adicionarFalta(turma, index),
      function() {

      })
      self.originatorEv = null
    }

    self.adicionarFalta = function (turma, indexAula) {
      const batch = self.db.batch()
      const historicos = []

      self._adicionarFaltaAoBatch(turma.id, indexAula, batch)
      historicos[0] = self.criarModificacao(turma.id, indexAula, "NF")

      if (self.verificarG1EMesmoProf(turma, indexAula)) {
        historicos[1] = self.criarModificacao(turma.turmaG2Id, indexAula, "NF")

        self._adicionarFaltaAoBatch(turma.turmaG2Id, indexAula, batch)
      }

      else if (self.verificarG2EMesmoProf(turma, indexAula)) {
        historicos[1] = self.criarModificacao(turma.turmaG1Id, indexAula, "NF")

        self._adicionarFaltaAoBatch(turma.turmaG1Id, indexAula, batch)
      }

      batch.commit()
      .then(function () {
        self.adicionarHistoricos(historicos)
        $mdClassSchedulerToast.show("Aula vaga registrada")
      })
      .catch(e => console.error("Erro no commit de adicionar falta:", e))
    }

    self.adicionarHistoricos = function (historicos) {
      for (let i = 0; i < historicos.length; i++) {
        const historico = historicos[i]

        // TODO: Olhar essa lógica aqui
        if (historico.action === "NF") {
          const turmaId = historico.turmaId
          const indexAula = historico.substituicao.aulaIndice
          const substituicaoCriadaId = self.substituicoes[turmaId][indexAula].id

          historico.substituicao._id = substituicaoCriadaId
          // historico.refSubstituicao = self.db.doc("substituicoes/" + substituicaoCriadaId)
        }

        console.log(`Histórico ${i}: `, historicos[i]);

        self.db.collection("historico").add(historico)
        .then(refHistorico => {
          console.log("histórico criado:", refHistorico.path);
          self.mudarAtributoData(refHistorico)
        })
        .catch(e => console.error("Erro ao criar histórico:", e))
      }
    }

    self.mudarAtributoData = function (refHistorico) {
      $historicoSvc.mudarAtributoData(refHistorico.id)
      .catch(e => console.error("Erro ao mudarAtributoData: ", e))
    }

    self.criarModificacao = function (turmaId, indexAula, action) {
      const authorId = self.loggedUser.id
      const disciplina = self.horariosTurma[turmaId][indexAula]

      const historico = $historicoSvc.getJSONHistorico(action, null, authorId, disciplina, turmaId, self.dateSelectedTime, indexAula)
      return historico
    }

    self._adicionarFaltaAoBatch = function (turmaId, indexAula, batch) {
      // Cria o ID automaticamente
      const refSubstituicao = self.db.collection("substituicoes").doc()

      const substituicao = $subSvc.returnFaltaJSON(turmaId, indexAula, self.dateSelectedTime)
      console.log("Substituição a ser adicionada: ", substituicao);

      batch.set(refSubstituicao, substituicao)
    }

    self.showRemoverFalta = function (turma, index) {
      $mdDialog.show({
        templateUrl: 'app/components/horario-coord/remover-falta.tmpl.html',
        parent: angular.element(document.body),
        targetEvent: self.originatorEv,
        clickOutsideToClose: true,
        locals: {
          disciplina: self.horariosTurma[turma.id][index],
          substituicao: self.substituicoes[turma.id][index]
        },
        controller: self.dialogsController
      })
      .then(() => self.removerFalta(turma, index), () => {})
      self.originatorEv = null
    }

    self.removerFalta = function (turma, index) {
      const turmaId = turma.id
      const batch = self.db.batch()
      const historicos = []

      historicos[0] = self.criarModificacao(turma.id, index, "FN")
      self._removerFaltaDoBatch(turmaId, index, batch);

      if (self.verificarG1EMesmoProf(turma, index)) {
        self._removerFaltaDoBatch(turma.turmaG2Id, index, batch)
        historicos[1] = self.criarModificacao(turma.turmaG2Id, index, "FN")
      }

      else if (self.verificarG2EMesmoProf(turma, index)) {
        self._removerFaltaDoBatch(turma.turmaG1Id, index, batch)
        historicos[1] = self.criarModificacao(turma.turmaG1Id, index, "FN")
      }

      batch.commit()
      .then(function () {
        $mdClassSchedulerToast.show("Falta removida")

        self.substituicoes[turmaId][index] = null;

        if (self.verificarG1EMesmoProf(turma, index)) {
          self.substituicoes[turma.turmaG2Id][index] = null;
        }

        else if (self.verificarG2EMesmoProf(turma, index)) {
          self.substituicoes[turma.turmaG1Id][index] = null;
        }

        self.adicionarHistoricos(historicos)
      })
      .catch(e => console.error("Erro no batch de remover falta:", e))
    }

    self.verificarG1EMesmoProf = function (turma, index) {
      if (turma.titulo == "G1") {
        const professorId = self.horariosTurma[turma.id][index].professorId;
        const professorIdG2 = self.horariosTurma[turma.turmaG2Id][index].professorId

        return professorId === professorIdG2
      } else {
        return false
      }
    }

    self.verificarG2EMesmoProf = function (turma, index) {
      if (turma.titulo == "G2") {
        const professorId = self.horariosTurma[turma.id][index].professorId;
        const professorIdG1 = self.horariosTurma[turma.turmaG1Id][index].professorId

        return professorId === professorIdG1
      } else {
        return false
      }
    }

    self._removerFaltaDoBatch = function (turmaId, indexAula, batch) {
      const substituicaoId = self.substituicoes[turmaId][indexAula].id
      const refSubstituicao = self.db.doc("substituicoes/" + substituicaoId)
      batch.delete(refSubstituicao)
    }

    self.showAulaSubstituida = function (turmaId, index) {
      $mdDialog.show({
        templateUrl: 'app/components/horario-coord/aula-substituida.tmpl.html',
        parent: angular.element(document.body),
        targetEvent: self.originatorEv,
        clickOutsideToClose: true,
        locals: {
          disciplina: self.horariosTurma[turmaId][index],
          substituicao: self.substituicoes[turmaId][index]
        },
        controller: self.dialogsController
      })
      .then(() => {}, () => {})
      self.originatorEv = null
    }

    self.aulaSubstituidaCtrl = function ($scope, disciplina, substituicao) {
      $scope.disciplina = disciplina
      $scope.substituicao = substituicao

      $scope.verificarSubstituto = function (substituicao) {
        if (!substituicao.substituto) {
          $scope.getProfessor(substituicao)
          $scope.getDisciplinaSubstituta(substituicao)
        }
      }
    }

    self.showAulaLivre = function (turmaId, index) {
      $mdDialog.show({
        templateUrl: 'app/components/horario-coord/aula-livre.tmpl.html',
        parent: angular.element(document.body),
        targetEvent: self.originatorEv,
        clickOutsideToClose: true,
        locals: {
          disciplina: self.horariosTurma[turmaId][index],
          substituicao: self.substituicoes[turmaId][index]
        },
        controller: self.dialogsController
      })
      .then(() => {}, () => {})
      self.originatorEv = null
    }

    self.dialogsController = function($scope, disciplina, substituicao) {
      $scope.disciplina = disciplina
      $scope.substituicao = substituicao

      $scope.init = function() {
        $scope.verifyTeacher()
        $scope.verificarSubstituto()
      }

      $scope.isLoading = function () {
        return $scope.disciplina.professor ? !$scope.disciplina.professor.pessoa : true;
      }

      $scope.isLoadingSubstituto = function () {
        return $scope.substituicao.substituto ? !$scope.substituicao.substituto.pessoa : true;
      }

      // TODO: refatorar aqui
      $scope.verificarSubstituto = function () {
        if ($scope.substituicao && $scope.substituicao.substitutoId && !$scope.substituicao.substituto) {
          $scope.getProfessor($scope.substituicao)
          $scope.getDisciplinaSubstituta($scope.substituicao)
        }
      }

      $scope.getDisciplinaSubstituta = function (substituicao) {
        const disciplinaId = substituicao.disciplinaSubstitutoId

        $disciplinaSvc.getDisciplina(disciplinaId)
        .then(snapDisciplina => {
          substituicao.disciplinaSubstituta = snapDisciplina.data()
        })
        .catch(e => {
          $alertSvc.showAlert("Ocorreu um erro ao buscar a disciplina do substituto!")
          console.error("Ocorreu um erro ao buscar a disciplina do substituto: ", e);
        })
      }

      // $scope.getDisciplinaSubstituta = function (disciplinaSubstituta) {
      //   // $scope.loadingSubstituto = true
      //   disciplinaSubstituta.get()
      //   .then(snapDisciplina => {
      //     const disciplina = snapDisciplina.data()
      //     $scope.substituicao.substituto = disciplina
      //     // $scope.loadingSubstituto = false
      //     $scope.getProfessor(disciplina)
      //     // disciplina.professor.get()
      //     // .then(snapProfessor => $scope.gotProfessor(snapProfessor, disciplina))
      //     // .catch(e => console.error("Erro ao buscar o professor substituto: ", e))
      //   })
      //   .catch(e => console.error("Erro ao obter disciplina substituta: ", e))
      // }

      $scope.verifyTeacher = function () {
        if (!$scope.disciplina.professor) {
          $scope.getProfessor($scope.disciplina)
        }
      }

      $scope.getProfessor = function (object) {
        const professorId = object.professorId;

        self.db.doc("professores/" + professorId).get()
        .then(snapProfessor => $scope.gotProfessor(snapProfessor, object))
        .catch(e => {
          console.error("Ocorreu um erro ao buscar professor: ", e);
        })
      }

      $scope.gotProfessor = function (snapProfessor, object) {
        object.professor = snapProfessor.data()
        $scope.getPerson(object.professor)
      }

      $scope.getPerson = function (professor) {
        professor.refPessoa.get()
        .then(snapPerson => {
          $scope.$apply(function () {
            professor.pessoa = snapPerson.data()
          })
        })
        .catch(e => {
          $alertSvc.showAlert("☹️ Ocorreu um erro ao buscar a pessoa do professor!")
          console.error("Ocorreu um erro ao buscar a pessoa do professor: ", e);
        })
      }

      $scope.cancel = function() {
        $mdDialog.cancel()
      }

      $scope.hide = function () {
        $mdDialog.hide()
        // $mdClassSchedulerToast.show(messageOnHide)
      }

      $scope.init()
    }

    self.gotProfessor = function (snapTeacher, disciplina) {
      const professor = snapTeacher.data()
      professor.id = snapTeacher.id
      disciplina.professor = professor

      self.getPerson(professor)
    }

    self.getPerson = function (professor) {
      professor.refPessoa.get()
      .then(snapPerson => {
        $scope.$apply(function () {
          professor.pessoa = snapPerson.data();
        })
      })
      .catch(error => console.error("Erro ao buscar pessoa do professor: ", e))
    }

    self.init()
}
