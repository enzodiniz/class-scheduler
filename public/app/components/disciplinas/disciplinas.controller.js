// Componente que cria, remove e atualiza disciplinas.

angular
  .module("class-scheduler")
  .controller("discCtrl2", discCtrl)

function discCtrl($scope, authSvc, $rootScope, $cursoSvc, $periodoSvc, $mdDialog, $alertSvc, $turmaSvc,
  $profSvc, $horarioSvc, $disciplinaSvc, $location, $mdClassSchedulerToast, $routeParams, $pessoaSvc, temaSvc) {

  const self = this;

  self.initCtrl = function() {
    self.initFirebase()
    self.sendToolbarToMainCtrl();
    console.log('route params:', $routeParams.turmaId);
    self.verificarTurmaIdInUrl()
    getUsuario();
    getTema();
  }

  self.initFirebase = function() {
    self.db = firebase.firestore();
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
    if(usuario && usuario.papeis.includes('administrador'))
        return;

    self.handleError(null, 'verificar permissão de administrador');
    $location.path('/home');
  }

  function getTema() {
    self.themeSelected = temaSvc.getTema();
  }

  self.verificarTurmaIdInUrl = function () {
    const turmaId = $location.search().turmaId
    if (!turmaId) return;

    self.db.doc('turmas/' + turmaId).get()
    .then(snapTurma => {
      const turma = snapTurma.data()
      turma.id = snapTurma.id
      self.getDisciplinas(turma)
      self.getPromiseCurso(turma)
      .then(curso => {
        turma.curso = curso
      })
      .catch(error => {
        console.error('Ocorreu um erro ao obter curso da turma da query:', error);
      })

      self.turmaSelected = turma
    })
    .catch(error => {
      console.error('Ocorreu um erro ao obter turma da query:', error);
    })

  }

  self.sendToolbarToMainCtrl = function() {
    $rootScope.$broadcast('tituloPagina', {
      titulo: "Disciplinas",
      btVisible: false
    });
  }

  self.loadCursos = function () {
    self.listaCursos = []
    return $cursoSvc.loadCursos(self.listaCursos)
  }

  self.loadPeriodos = function () {
    self.listaPeriodos = []
    return $periodoSvc.loadPeriodos(self.listaPeriodos)
  }

  self.loadTurmas = function () {
    self.listaTurmas = []
    return $turmaSvc.getTurmasByCursoAndPeriodo(self.cursoSelected.id, self.periodoSelected.id)
      .then(self._gotTurmas)
      .catch(error => self.handleError(error, 'carregar turmas'));
  }

  self._gotTurmas = async function(query) {
    const promisesCursos = []
    query.forEach(snapTurma => {
      const turma = snapTurma.data()
      turma.id = snapTurma.id
      promisesCursos.push(self.getPromiseCurso(turma))
      self.listaTurmas.push(turma)
    })

    await Promise.all(promisesCursos)
      .then(self._gotCursos)
      .catch(error => self.handleError(error, 'buscar cursos'));
  }

  self._gotCursos = function(cursos) {
    cursos.forEach((curso, index) => {
      self.listaTurmas[index].curso = curso
    })
  }

  self.getPromiseCurso = function (turma) {
    return new Promise(function(resolve, reject) {
      turma.curso.get()
        .then(snapCurso => resolve(snapCurso.data()))
        .catch(error => reject(error))
    })
  }

  self.updateStateDisciplinas = function() {
    const promessasHorarios = [];
    promessasHorarios.push(self._getHorario(self.db.doc('turmas/' + self.turmaSelected.id)));
    promessasHorarios.push(self._getHorario(self.db.doc('subturmas/' + self.turmaG1Selected.id)));
    promessasHorarios.push(self._getHorario(self.db.doc('subturmas/' + self.turmaG2Selected.id)));
       
    Promise.all(promessasHorarios)
        .then(self._gotHorarios)
        .catch(error => self.handleError(error, 'buscar disciplinas'))
  }
  
  self.getDisciplinas = async function(turma) {
    try {
        self.loadingHorarios = true;
        const promessasHorarios = [];
        promessasHorarios.push(self._getHorario(self.db.doc('turmas/' + turma.id)));
        const subturmas = await $turmaSvc.getSubturmasByTurmaId(turma.id);
        if (subturmas.length > 0) {
            promessasHorarios.push(self._getHorario(self.db.doc('subturmas/' + subturmas[0].id)));
            promessasHorarios.push(self._getHorario(self.db.doc('subturmas/' +  subturmas[1].id)));
        }
        Promise.all(promessasHorarios)
        .then(self._gotHorarios)
        .catch(error => self.handleError(error, 'buscar disciplinas'))
    } catch (error) {
        self.handleError(error, 'buscar disciplinas');
    }
  }

  self._getHorario = function(refTurma) {
    return new Promise((resolve, reject) => {
        self.db.collection('disciplinas')
            .where('turmaRef', '==', refTurma)
            .get()
            .then(query => self._gotHorario(query, resolve))
            .catch(error => reject(error));
    });
  }

  self._gotHorario = function(query, resolve) {
    const horarioGeral = self.getEmptyJSON();
    query.forEach(snapDisciplina => {
        const disciplina = snapDisciplina.data();
        disciplina.id = snapDisciplina.id;
        disciplina.horarios.forEach(horarioDisciplina => {
            horarioGeral[horarioDisciplina.dia][horarioDisciplina.indiceAula] = disciplina;
        })
    });
    
    resolve(horarioGeral);
  }

  self._gotHorarios = function(horarios) {
    $scope.$apply(() => {
        self.loadingHorarios = false;
        self.horario = horarios[0];
        if (horarios.length === 1) return;
        self.horarioG1 = horarios[1];
        self.horarioG2 = horarios[2];
    });
  }

  self.getEmptyJSON = function () {
    return {
      1: new Array(15).fill(null),
      2: new Array(15).fill(null),
      3: new Array(15).fill(null),
      4: new Array(15).fill(null),
      5: new Array(15).fill(null)
    }
  }

  self.getProfessor = function (disciplina) {
    $profSvc.getProfessorById(disciplina.professorId)
      .then(professor => {
        disciplina.professor = professor
      })
      .catch(error => {
        console.error('Ocorreu um erro ao obter professor de disciplina:', error);
      })
  }

  async function getHorariosOcupados(turmaId, turmaG1Id, turmaG2Id) {
    const horariosOcupados = [];
    const promessasHorario = [];
    promessasHorario.push($horarioSvc.getHorarioTurmaByRef(self.db.doc('turmas/' + turmaId)));
    if (turmaG1Id)
        promessasHorario.push($horarioSvc.getHorarioTurmaByRef(self.db.doc('subturmas/' + turmaG1Id)));
    if (turmaG2Id)
        promessasHorario.push($horarioSvc.getHorarioTurmaByRef(self.db.doc('subturmas/' + turmaG2Id)));
    await Promise.all(promessasHorario)
      .then(horarios => _gotHorarios(horarios, horariosOcupados))
      .catch(error => self.handleError(error, 'buscar horários'))

    return horariosOcupados;
  }

  function _gotHorarios(horarios, ocupacoes) {
    for (const horario of horarios) {
        const SEGUNDA = 1, SEXTA = 5;
        for (let dia = SEGUNDA; dia <= SEXTA; dia++) {
            for (let indiceAula in horario[dia]) {
                indiceAula = Number(indiceAula);
                 if (horario[dia][indiceAula] && !existeHorario(dia, indiceAula, ocupacoes))
                     ocupacoes.push({
                         dia, indiceAula
                    })
             }
        }
    }
  }

  function existeHorario(dia, indiceAula, listaHorarios) {
    for (let horario of listaHorarios) {
        if (horario.dia === dia && horario.indiceAula === indiceAula)
            return true;
    }
    return false;
  }

  function removeHorario(dia, indiceAula, listaHorarios) {
    const NUM_REMOVIDOS = 1;
    for (let indice = 0; indice < listaHorarios.length; indice++) {
        const horario = listaHorarios[indice];
        if (horario.dia === dia && horario.indiceAula === indiceAula) {
            listaHorarios.splice(indice, NUM_REMOVIDOS);
            break;
        }
    }
  }

  self.showEditDisciplina = function(ev, disciplina) {
    $mdDialog.show({
      templateUrl: 'app/components/disciplinas2/edit-disciplina.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      // targetEvent: ev,
      fullscreen: true,
      locals: {
        turma: self.turmaSelected,
        turmaG1: self.turmaG1Selected,
        turmaG2: self.turmaG2Selected,
        disciplina: disciplina,
        themeSelected: self.themeSelected
      },
      controller: ['$scope', '$filter', 'disciplina', 'turma', 'turmaG1', 'turmaG2', 'themeSelected',
        function($scope, $filter, disciplina, turma, turmaG1, turmaG2, themeSelected) {
            $scope.disciplina = disciplina;
            $scope.themeSelected = themeSelected;
            $scope.horariosOcupados = [];
            console.log('disciplina...');
            console.log($scope.disciplina);

            $scope.init = function() {
                $scope.getProfessor();
                $scope.getOcupacoes();
            }

            $scope.cancel = function() {
                $mdDialog.cancel();
            }

            $scope.hide = function() {
                $scope.disciplina.professorId = $scope.professorSelected.id;
                $mdDialog.hide($scope.disciplina);
            }

            $scope.isLoading = function() {
                return $scope.loadingProfessor || $scope.loadingOcupacoes;
            }

            $scope.tipoTurma = function() {
                if ($scope.disciplina.turmaRef.id === turma.id)
                    return "principal";
                else if ($scope.disciplina.turmaRef.id === turmaG1.id)
                    return "G1";
                else if ($scope.disciplina.turmaRef.id === turmaG2.id)
                    return "G2";
            }

            $scope.getOcupacoes = function() {
                $scope.loadingOcupacoes = true;
                let parametros = [];
                if ($scope.tipoTurma() == 'principal') {
                    parametros = [turma.id, turmaG1.id, turmaG2.id]
                } else if ($scope.tipoTurma() == 'G1') {
                    parametros = [turma.id, turmaG1.id, null];
                } else if ($scope.tipoTurma() == 'G2') {
                    parametros = [turma.id, null, turmaG2.id];
                }
                getHorariosOcupados(parametros[0], parametros[1], parametros[2])
                .then($scope.gotOcupacoes)
                .catch(error => self.handleError(error, 'buscar ocupações'))
            }

            $scope.gotOcupacoes = function(ocupacoes) {
                $scope.$apply(() => {
                    $scope.horariosOcupados = ocupacoes;
                    console.log('ocupações...');
                    console.log(ocupacoes);
                    $scope.loadingOcupacoes = false;
                });
            }

            $scope.getProfessor = function() {
                $scope.loadingProfessor = true;
                $profSvc.getProfessorById($scope.disciplina.professorId)
                    .then($scope.gotProfessor)
                    .catch(error => self.handleError(error, 'buscar professor'))
            }

            $scope.gotProfessor = function(snapProfessor) {
                $scope.$apply(() => {
                    $scope.professorSelected = snapProfessor.data();
                    $scope.professorSelected.id = snapProfessor.id;
                    $scope.loadingProfessor = false;
                });
            }

            $scope.queryProfessores = function(searchText) {
                return $profSvc.getProfessores()
                    .then(query => $scope._gotProfessores(query, searchText))
                    .catch(error => self.handleError(error, 'buscar professores'))
            }

            $scope._gotProfessores = function(query, search) {
                $scope.suggestions = [];
                query.forEach(snapProfessor => {
                    const professor = snapProfessor.data();
                    professor.id = snapProfessor.id;
                    professor.fullName = `${professor.nome} ${professor.sobrenome}`.toLowerCase();
                    if (professor.fullName.indexOf(search.toLowerCase()) !== -1)
                        $scope.suggestions.push(professor);
                });
                return $scope.suggestions;
            }

            $scope.isDisabled = function(dia, indiceAula) {
                return existeHorario(dia, indiceAula, $scope.horariosOcupados) &&
                       !existeHorario(dia, indiceAula, $scope.disciplina.horarios);
            }

            $scope.estaSelecionado = function(dia, indiceAula) {
                return existeHorario(dia, indiceAula, $scope.horariosOcupados) ||
                    existeHorario(dia, indiceAula, $scope.disciplina.horarios);
            }

            $scope.toggleHorario = function(dia, indiceAula) {
                if (existeHorario(dia, indiceAula, $scope.disciplina.horarios)) {
                    removeHorario(dia, indiceAula, $scope.disciplina.horarios);
                    removeHorario(dia, indiceAula, $scope.horariosOcupados);
                } else {
                    $scope.disciplina.horarios.push({
                        dia, indiceAula
                    });
                }
            }

            $scope.init();
        }
      ]
    }).then(self.updateDisciplina, function(){})
  }

  self.updateDisciplina = function (updatedDisciplina) {
    console.log('response:', updatedDisciplina);
    const id = updatedDisciplina.id

    delete updatedDisciplina.id
    delete updatedDisciplina.professor

    $disciplinaSvc.updateDisciplina(id, updatedDisciplina)
      .then(function () {
        console.log('atualizada com sucesso /disciplinas/' + id);
        $mdClassSchedulerToast.show('Dados da disciplinas atualizados')
        self.updateStateDisciplinas();
      })
      .catch(error => {
        $alertSvc.showAlert('Ocorreu um erro ao atualizar os dados da disciplina!')
        console.error('Ocorreu um erro ao atualizar disciplina: ', error);
      })
  }

  self.showAddDisciplina = function(ev) {
        console.log('tá sendo chamado')
        $mdDialog.show({
           templateUrl: 'app/components/disciplinas2/add-disciplina2.tmpl.html',
           clickOutsideToClose: true,
           parent: angular.element(document.body),
           fullscreen: true,
           locals: {
             turmaSelected: self.turmaSelected,
             theme: self.themeSelected
           },
           controller: ['$scope', '$filter', 'theme', function($scope, $filter, theme) {
                $scope.currentNavItem = 'dados';
                $scope.theme = theme;
                $scope.horariosOcupados = [];
                $scope.disciplina = {
                    horarios: []
                }

                $scope.estaBloqueado = function(dia, indiceAula) {
                    return existeHorario(dia, indiceAula, $scope.horariosOcupados);
                }

                $scope.estaSelecionado = function(dia, indiceAula) {
                    return existeHorario(dia, indiceAula, $scope.horariosOcupados) ||
                           existeHorario(dia, indiceAula, $scope.disciplina.horarios);
                 }

                $scope.adicionarHorario = function(dia, indiceAula) {
                    if (existeHorario(dia, indiceAula, $scope.horariosOcupados))
                        return;

                    if (existeHorario(dia, indiceAula, $scope.disciplina.horarios)) {
                        removeHorario(dia, indiceAula, $scope.disciplina.horarios);
                    } else {
                        $scope.disciplina.horarios.push({
                            dia, indiceAula
                        });
                    }
                }

               $scope.goTo = function (name) {
                   $scope.currentNavItem = name;
               }

                $scope.cancel = function () {
                   $mdDialog.cancel()
                }

                $scope.hide = function() {
                    $scope.disciplina.professorId = $scope.professorSelected.id;
                    $scope.disciplina.turmaRef = $scope.turmaSelected.ref;
                    $mdDialog.hide($scope.disciplina);
                }
                
                $scope.loadPeriodos = function () {
                  $scope.listaPeriodos = []
                  return $periodoSvc.loadPeriodos($scope.listaPeriodos)
                }
                
                $scope.loadCursos = function () {
                  $scope.listaCursos = []
                  return $cursoSvc.loadCursos($scope.listaCursos)
                }

                $scope.loadTurmas2 = function (periodoId, cursoId) {
                  $scope.turmas = []
                  const promises = []
                  promises.push(new Promise((resolve, reject) => {
                    $turmaSvc.getTurmasByCursoAndPeriodo(cursoId, periodoId)
                      .then(query => $scope.gotTurmas(query, resolve))
                      .catch(error => reject(error)) 
                  }))
                
                  promises.push(new Promise((resolve, reject) => {
                    const refCurso = self.db.doc('cursos/' + cursoId)
                    const refPeriodo = self.db.doc('periodos/' + periodoId)
                    self.db.collection('subturmas')
                      .where('curso', '==', refCurso)
                      .where('periodo', '==', refPeriodo)
                      .get().then(query => $scope.gotSubturmas(query, resolve))
                      .catch(error => reject(error))
                  }))
                
                  return Promise.all(promises).then(lista => {
                    $scope.turmas = lista[0].concat(lista[1])
                  })
                  .catch(error => self.handleError(error, "buscar turmas"))
                }

                $scope.gotTurmas = function(query, resolve) {
                    const turmasList = []
                    query.forEach(doc => {
                        const turma = doc.data();
                        turma.id = doc.id;
                        turma.curso = $scope.cursoSelected;
                        turma.ref = self.db.doc('turmas/' + turma.id)
                        turmasList.push(turma);
                    })
                    resolve(turmasList)
                }

                $scope.gotSubturmas = function(query, resolve) {
                    let turmasList = []
                    query.forEach(doc => {
                        const subturma = doc.data();
                        subturma.id = doc.id;
                        subturma.curso = $scope.cursoSelected;
                        subturma.ref = self.db.doc('subturmas/' + subturma.id)
                        turmasList.push(subturma);
                    })
                    resolve(turmasList)
                }

                $scope.getHorarios = function(turma) { 
                    $scope.buscandoHorario = true;
                    const turmaPrincipalId = turma.turmaPrincipalId ? turma.turmaPrincipalId : turma.id;
                    const subturmas = $scope.getSubturmasDeTurma(turmaPrincipalId);
                    let parametros = [];
                    const tipoTurma = $scope.turmaSelected.titulo || 'principal';
                    if (tipoTurma === 'G1')
                        parametros = [turmaPrincipalId, subturmas[0].id, null];
                    else if (tipoTurma === 'G2')
                        parametros = [turmaPrincipalId, null, subturmas[1].id];
                    else 
                        parametros = [turmaPrincipalId, subturmas[0].id, subturmas[1].id]
                    getHorariosOcupados(parametros[0], parametros[1], parametros[2])
                    .then(ocupacoes => {
                        $scope.horariosOcupados = ocupacoes;
                        $scope.buscandoHorario = false;
                    })
                    .catch(error => self.handleError(error, 'buscar ocupações'))                    
                }

                $scope.getSubturmasDeTurma = function(turmaId) {
                    const subturmas = [];
                    for(let turmaAtual of $scope.turmas){
                        if (turmaAtual.turmaPrincipalId === turmaId) {
                            subturmas.push(turmaAtual);
                        }    
                    }

                    return subturmas;
                }

                $scope.getHorario = function(turmaRef) {
                    $horarioSvc.getHorarioTurmaByRef(turmaRef)
                    .then($scope.gotHorario)
                    .catch(error => self.handleError(error, 'buscar horário'))
                }

                $scope.gotHorario = function(horario) {
                    const SEGUNDA = 1, SEXTA = 5;
                    for (let dia = SEGUNDA; dia <= SEXTA; dia++) {
                        for (let indiceAula = 0; indiceAula < horario[dia].length; indiceAula++) {
                            if (horario[dia][indiceAula]) {
                                $scope.horariosOcupados.push({
                                    dia, indiceAula
                                });
                            }
                        }
                    }
                    console.log('horários ocupados...');
                    console.log($scope.horariosOcupados);
                }

                $scope.queryProfessores = function (searchText) {
                    $scope.suggestions = [];
                    return $profSvc.getProfessores()
                    .then($scope.gotProfessores)
                    .catch(error => self.handleError(error, 'buscar professores'));
                }

                $scope.gotProfessores = function(professores) {
                    const sugestoes = [];
                    professores.forEach((snapProfessor) => {
                        const professor = snapProfessor.data();
                        professor.id = snapProfessor.id;
                        const search = $scope.searchText.toLowerCase();
                        const fullName = `${professor.nome} ${professor.sobrenome}`.toLowerCase();
                        console.log('search:', search);
                        console.log('fullName:', fullName);
                        if (fullName.indexOf(search) > -1) {
                            sugestoes.push(professor);
                        }
                    })
                    $scope.suggestions = sugestoes;
                    return $scope.suggestions;
                }
           }]
        }).then(self.salvarDisciplina, function() {})
  }

  self.salvarDisciplina = function (disciplina) {
    console.log("disciplina: ", disciplina)
    $disciplinaSvc.addDisciplina(disciplina)
      .then(refDisciplina => {
        $mdClassSchedulerToast.show('Disciplina adicionada')
        console.log('Disciplina salva:', refDisciplina.path)
        self.updateStateDisciplinas();
      })
      .catch(e => {
        console.error('Ocorreu um erro ao salvar disciplina: ', e);
        $alertSvc.showAlert('Ocorreu um erro ao salvar a disciplina!')
      })
  }

  self.showRemoverDisciplina = function (event, disciplina) {
    console.log('Disciplina a ser excluída:', disciplina);
    $mdDialog.show({
        templateUrl: 'app/components/disciplinas2/excluir.tmpl.html',
        targetEvent: event,
        parent: angular.element(document.body),
        clickOutsideToClose: true,
        locals: { disciplina },
        controller: ['$scope', 'disciplina', function($scope, disciplina) {
            $scope.disciplina = disciplina;

            $scope.cancel = function() {
                $mdDialog.cancel();
            }

            $scope.hide = function(disciplinaId) {
                $mdDialog.hide(disciplinaId);
            }
        }]
    }).then(self.deleteDisciplina, function() {})
  }

  self.deleteDisciplina = function (disciplinaId) {
    $disciplinaSvc.deleteDisciplina(disciplinaId)
      .then(() => {
        $mdClassSchedulerToast.show('Disciplina foi excluída')
        self.updateStateDisciplinas();
      })
      .catch(error => {
        $alertSvc.showAlert('Ocorreu um erro ao excluir a disciplina!')
        console.error('Ocorreu um erro ao excluir a disciplina:', error);
      })
  }

  self.handleError = function (error, operation = '') {
    const msg = 'Ocorreu um erro ao ' + operation;
    $alertSvc.showAlert(msg);
    console.error(msg, error);
  }

  self.initCtrl();
}
