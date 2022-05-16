// Serviço busca disciplinas e entrega em forma de JSON
// Forma horários de turma e de professores.

angular
  .module('class-scheduler')
  .service('$horarioSvc', horarioSvc)

function horarioSvc($http, $turmaSvc) {
  const self = this;

  self.initFirebase = function() {
    self.db = firebase.firestore();
    // self.horariosRef = self.db.collection("horarios");
  }

  // self.getHorario = function(turmaId) {
    // return self.horariosRef.where("turma", "==", turmaId).get();
  // }

  self.getHorarioPorDia = function(dia) {
    const horario = {};
    return new Promise((resolve, reject) => {
        // TODO: vê se consegue consultar apenas disciplinas
        // de determinado dia  
    });
  }

  self.getHorarioDay = function(turmaRef, dayReq) {
    // const turmaRef = self.db.doc('/turmas/' + turmaId);
    console.log('obtendo horário de:', turmaRef);

    function query(resolve, reject) {
      self.db.collection('disciplinas')
        .where('turmaRef', '==', turmaRef)
        .get()
        .then(query => self.gotDisciplinasDay(query, resolve, dayReq))
        .catch(error => reject(error))
    }

    return new Promise(query);
  }

  self.gotDisciplinasDay = function (query, resolve, dayReq) {
    const disciplinas = new Array(10).fill(null);

    query.forEach(snapDisciplina => {
      const disciplina = snapDisciplina.data();
      disciplina['id'] = snapDisciplina.id;

      disciplina.horarios.forEach(horario => {
        if (horario.dia === dayReq) {
          disciplinas[horario.indiceAula] = disciplina;
        }
      })
    })

    resolve(disciplinas);
  }

  function getEmptyJSON() {
    return {
        1: new Array(15).fill(null),
        2: new Array(15).fill(null),
        3: new Array(15).fill(null),
        4: new Array(15).fill(null),
        5: new Array(15).fill(null)
    }
  }

  self.getHorarioProfessor = function(professorId, periodoId) {
    return new Promise(async (resolve, reject) => {
        try {
            // get disciplinas
            const promessasTurma = [];
            const disciplinas = await self._getDisciplinasProfessor(professorId, periodoId)
            disciplinas.forEach(disciplina => {
                promessasTurma.push($turmaSvc.getTurmaByRef(disciplina.turmaRef));
            })

            // atribuir turmas a disciplinas
            const horario = getEmptyJSON();
            const turmas = await Promise.all(promessasTurma)
            for (let indice = 0; indice < turmas.length; indice++) {
                const disciplina = disciplinas[indice];
                disciplina['turma'] = turmas[indice];
                // adicionar ao horário
                disciplina.horarios.forEach(horarioDisciplina => {
                    horario[horarioDisciplina.dia][horarioDisciplina.indiceAula] = disciplina;
                });
            }
            resolve(horario);
        } catch(error) {
            reject(error);
        }
    });
  }

  self._getDisciplinasProfessor = function(professorId, periodoId) {
    return new Promise((resolve, reject) => {
        self.db.collection('disciplinas')
        .where('professorId', '==', professorId)
        .where('periodoId', '==', periodoId)
        .get()
        .then(query => {
            const disciplinas = [];
            query.forEach(snapDisciplina => {
                const disciplina = snapDisciplina.data();
                disciplina.id = snapDisciplina.id;
                disciplinas.push(disciplina);
            })
            resolve(disciplinas);
        })
        .catch(error => reject(error))
    });
  }

  self.getHorarioProfessorDisabled = function (professorId, periodoId) {
    const horario = {
      1: new Array(15).fill(null),
      2: new Array(15).fill(null),
      3: new Array(15).fill(null),
      4: new Array(15).fill(null),
      5: new Array(15).fill(null)
    }

    function query(resolve, reject) {
      self.db.collection('disciplinas')
        .where('professorId', '==', professorId)
        .where('periodoId', '==', periodoId)
        .get()
        .then(query => self.gotDisciplinasProfessor(query, resolve, reject, horario))
        .catch(error => reject(error))
    }

    return new Promise(query)
  }

  self.gotDisciplinasProfessor = function (query, resolve, reject, horarioJSON) {
    query.forEach(snapDisciplina => {
      const disciplina = snapDisciplina.data()
      disciplina.id = snapDisciplina.id

      console.log('disciplina:', disciplina);

      disciplina.turmaRef.get().then(snapTurma => {
        const turma = snapTurma.data()
        disciplina.turma = turma
        self.getDataOfTurma(turma, reject)
      })
      .catch(error => reject(error))

      disciplina.horarios.forEach(horario => {
        horarioJSON[horario.dia][horario.indiceAula] = disciplina
      })

      delete disciplina.horarios
    })

    resolve(horarioJSON)
  }

  self.getDataOfTurma = function (turma, reject) {
    turma.curso.get()
      .then(snapCurso => {
        turma.curso = snapCurso.data()
      })
      .catch(error => reject(error))

    turma.periodo.get()
      .then(snapPeriodo => {
        turma.periodo = snapPeriodo.data()
      })
      .catch(error => reject(error))
  }

  self.getHorarioTurmaByRef = function (turmaRef) {
    const horario = {
      1: new Array(15).fill(null),
      2: new Array(15).fill(null),
      3: new Array(15).fill(null),
      4: new Array(15).fill(null),
      5: new Array(15).fill(null)
    }

    // const promises = []

    function query(resolve, reject) {
      self.db.collection('disciplinas')
        .where('turmaRef', '==', turmaRef)
        .get()
        .then(query => self.gotDisciplinasByRef(query, resolve, horario))
        .catch(error => reject(error))
    }

    // promises.push(query)

    return new Promise(query)
  }

  self.gotDisciplinasByRef = function (query, resolve, horarioJSON) {
    query.forEach(snapDisciplina => {
      const disciplina = snapDisciplina.data()
      disciplina.id = snapDisciplina.id

      disciplina.horarios.forEach(horario => {
        horarioJSON[horario.dia][horario.indiceAula] = disciplina
      })

      delete disciplina.horarios
    })

    resolve(horarioJSON)
  }

  self.getHorarioTurma = function (turmaId) {
    const horario = {
      1: new Array(15).fill(null),
      2: new Array(15).fill(null),
      3: new Array(15).fill(null),
      4: new Array(15).fill(null),
      5: new Array(15).fill(null)
    }

    function query(resolve, reject) {
      self.db.collection('disciplinas')
        .where('turmaId', '==', turmaId)
        .get()
        .then(query => self.gotDisciplinas(query, resolve, horario))
        .catch(error => reject(error))
    }

    return new Promise(query)
  }

  self.gotDisciplinas = function (query, resolve, horarioJSON) {
    query.forEach(snapDisciplina => {
      const disciplina = snapDisciplina.data()
      disciplina.id = snapDisciplina.id

      disciplina.horarios.forEach(horario => {
        horarioJSON[horario.dia][horario.indiceAula] = disciplina
      })

      delete disciplina.horarios
    })

    resolve(horarioJSON)
  }

  self.getHorario2 = function(turmaId) {
    const URL = "http://localhost:5001/class-scheduler-c27ae/us-central1/getHorario?turmaId=" + turmaId;
    // const URL = "https://us-central1-class-scheduler-c27ae.cloudfunctions.net/getHorario?turmaId=" + turmaId
    return $http.get(URL)
  }

  self.getHorarioByDay = function(turmaId, day) {
    const URL = "http://localhost:5001/class-scheduler-c27ae/us-central1/getHorarioByDay?turmaId=" + turmaId + "&day=" + day;
    // const URL = "https://us-central1-class-scheduler-c27ae.cloudfunctions.net/getHorarioByDay?turmaId=" + turmaId + "&day=" + day
    return $http.get(URL)
  }

  self.updateHorario = function(id, newHorario) {
    let ref = self.horariosRef.doc(id);
    return ref.set(newHorario);
  }

  // self.createHorario = function(newHorario) {
    // return self.horariosRef.add(newHorario);
  // }

  self.initFirebase();
}
