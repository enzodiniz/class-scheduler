angular
.module('class-scheduler')
.controller('showAddDisciplina', function ($scope, $filter) {
  $scope.currentNavItem = 'dados';

  // $scope.disciplina = {
  //   horarios: []
  // }

  $scope.goTo = function (name) {
    $scope.currentNavItem = name;
  }

  $scope.cancel = function () {
    $mdDialog.cancel()
  }

  $scope.hide = function () {
    $scope.disciplina.professorId = $scope.professorSelected.id
    $mdDialog.hide($scope.disciplina)
  }

  $scope.exists = function(dia, indiceAula, horarios) {
    return $scope.horario[dia][indiceAula] || $scope.indexOf(dia, indiceAula, horarios) > -1
  }

  $scope.indexOf = function (dia, indiceAula, horarios) {
    let index = -1

    horarios.forEach((horario, position) => {
      if (horario.dia === dia && horario.indiceAula === indiceAula) {
        index = position
      }
    })

    return index
  }

  $scope.toggle = function(dia, indiceAula, horarios) {
    if ($scope.horario[dia][indiceAula] != null) return

    const index = $scope.indexOf(dia, indiceAula, horarios)

    if (index > -1) {
      horarios.splice(index, 1)
    } else {
      horarios.push({
        dia: dia,
        indiceAula: indiceAula
      })
    }

    console.log('horários da disciplina \n ', $scope.disciplina.horarios);
  }

  $scope.loadPeriodos = function () {
    $scope.listaPeriodos = []
    return $periodoSvc.loadPeriodos($scope.listaPeriodos)
  }

  $scope.loadCursos = function () {
    $scope.listaCursos = []
    return $cursoSvc.loadCursos($scope.listaCursos)
  }

  $scope.loadTurmas = function(periodoId, cursoId) {
    return $turmaSvc.getTurmas2(periodoId, cursoId)
      .then(query => {
        $scope.turmas = [];

        query.forEach(doc => {
          const turma = doc.data();
          turma.id = doc.id;
          turma.curso = $scope.cursoSelected;
          $scope.turmas.push(turma);
        })
      }).catch(e => {
        $alertSvc.showAlert('Ocorreu um erro ao carregar as turmas!')
        console.error('Ocorreu um erro ao carregar as turmas:', e);
      });
  }

  $scope.loadPeople = function (text) {
    return self.db.collection('pessoas')
      .orderBy('nome')
      .get()
      .then($scope.gotPeople)
      .catch(e => console.error(e))
  }

  $scope.gotPeople = function (query) {
    console.log('entrando em got people');
    const text = $scope.searchText2.toLowerCase()
    const people = []

    query.forEach(snapPessoa => {
      const pessoa = snapPessoa.data()

      const display = (pessoa.nome + ' ' + pessoa.sobrenome).toLowerCase()

      console.log('search: ', text);

      if (display.indexOf(text) > -1) {
        people.push(pessoa);
      }
    })
    return people;
  }

  $scope.queryProfessores = function (searchText) {
    $scope.suggestions = []

    return $profSvc.getProfessores()
      .then($scope.handleQueryProfessores)
      .catch(e => {
        console.error('showAddDisciplina -> Ocorreu um erro em queryProfessores2:', e);
        $alertSvc.showAlert('Ocorreu um erro ao buscar os professores!')
      })
  }

  $scope.handleQueryProfessores = function (query) {
    const personPromises = []
    const suggestions = []
    const text = $scope.searchText.toLowerCase()

    query.forEach(snapProfessor => {
      const professor = snapProfessor.data()
      professor.id = snapProfessor.id

      personPromises.push($scope.getPerson(professor))
    })


    return Promise.all(personPromises)
    .then(professores => {
      console.log('professores: ', professores);

      professores.forEach(professor => {
        const display = (professor.pessoa.nome + ' ' + professor.pessoa.sobrenome).toLowerCase()
        console.log('search: ', text);

        if (display.indexOf(text) > -1) {
          suggestions.push(professor);
        }
      })

      $scope.suggestions = suggestions
      return $scope.suggestions
    })
    .catch(e => {
      $alertSvc.showAlert('Ocorreu um erro ao buscar alguma pessoa de algum professor!')
      console.error('Erro em handleQueryProfessores:', e);
    })
  }

  $scope.getPerson = function (professor) {
    return new Promise(function(resolve, reject) {
      professor.refPessoa.get()
      .then(snapPessoa => {
        professor.pessoa = snapPessoa.data()
        resolve(professor)
      })
      .catch(e => reject(e))
    })
  }

  $scope.getHorario = function (turmaId) {
    $scope.dias = [{
      display: 'Segunda',
      chave: 1
    }, {
      display: 'Terça',
      chave: 2
    }, {
      display: 'Quarta',
      chave: 3
    }, {
      display: 'Quinta',
      chave: 4
    }, {
      display: 'Sexta',
      chave: 5
    },];

    $scope.horario = {
      1: new Array(15).fill(null),
      2: new Array(15).fill(null),
      3: new Array(15).fill(null),
      4: new Array(15).fill(null),
      5: new Array(15).fill(null)
    }

    self.db.collection('disciplinas').where('turmaId', '==', turmaId).get()
    .then(query => {
      console.log('query do getHorario is empty: ', query.empty);
      query.forEach(snapDisciplina => {
        const disciplina = snapDisciplina.data()

        disciplina.horarios.forEach(horario => {
          $scope.horario[horario.dia][horario.indiceAula] = disciplina
        })
      })
    })
    .catch(e => {
      $alertSvc.showAlert('Ocorreu um erro ao buscar horário da turma!')
      console.error('Ocorreu um erro em get horário: ', e);
    })
  }
})
