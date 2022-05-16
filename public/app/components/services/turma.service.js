angular
  .module('class-scheduler')
  .service('$turmaSvc', turmaSvc);

function turmaSvc() {
  var self = this;

  self.initFirebase = function () {
    self.db = firebase.firestore();
    self.refColecao = self.db.collection("turmas");
  }

  self.getTurmaByRef = function(ref) {
    return new Promise(async (resolve, reject) => {
      try {
        const snapTurma = await ref.get();
        const turma = snapTurma.data();
        const snapCurso = await turma.curso.get();
        turma.cursoTitulo = snapCurso.data().titulo;

        resolve(turma)
      } catch (error) {
        reject(error);
      }      
    })
  }

  self.getTurmas = function () {
    return self.refColecao.get();
  }

  // Usado em na tela de horário.
  self.getTurmasPorPeriodo2 = function(periodoId) {
    const refPeriodo = self.db.doc("periodos/" + periodoId);
    return new Promise(async (resolve, reject) => {
        try {
            const turmas = [];
            const query = await self.refColecao.where("periodo", "==", refPeriodo).get();
            const cursosPromises = [];
            query.forEach(snapTurma => {
                const turma = snapTurma.data();
                turma.id = snapTurma.id;
                cursosPromises.push(getCurso(turma.curso))
                turmas.push(turma);
            })
    
            const cursos = await Promise.all(cursosPromises);
            cursos.forEach((curso, indice) => {
                turmas[indice].curso = curso;
            });
            resolve(turmas);
        } catch(erro) {
            reject(erro);
        }
    }); 
  }

  function getCurso(cursoRef) {
    return new Promise((resolve, reject) => {
        cursoRef.get()
            .then(snapCurso => gotCurso(snapCurso, resolve))
            .catch(error => reject(error))
    });
  }

  function gotCurso(snapCurso, resolve) {
    resolve(snapCurso.data());
  }
  
  // Usado em na tela de horário.
  self.getTurmasPorPeriodo = function(periodoId) {
    const refPeriodo = self.db.doc("periodos/" + periodoId);
    // return self.refColecao.where("periodo", "==", refPeriodo).orderBy("serie").get()
    return self.refColecao.where("periodo", "==", refPeriodo).get()
  }

  self.getSubturmasPorPeriodo = function(periodoId) {
    const refPeriodo = self.db.doc("periodos/" + periodoId);
    return self.db.collection('subturmas').where("periodo", "==", refPeriodo).get();
  }

  self.getTurmas2 = function (periodoID, cursoID) {
    const refPeriodo = self.db.doc("periodos/" + periodoID);
    const refCurso = self.db.doc("cursos/" + cursoID);

    return self.refColecao
            .where("periodo", "==", refPeriodo)
            .where("curso", "==", refCurso)
            .get();
  }

  self.getTurmasByCursoAndPeriodo = function (cursoID, periodoID) {
    const refPeriodo = self.db.doc("periodos/" + periodoID);
    const refCurso = self.db.doc("cursos/" + cursoID);

    return self.refColecao
            .where("periodo", "==", refPeriodo)
            .where("curso", "==", refCurso)
            .get();
  }

  self.getSubturmasByTurmaId = function (id) {
    return new Promise(async (resolve, reject) => {
        try {
            const subturmas = [];
            const query = await self.db.collection('subturmas')
                .where('turmaPrincipalId', '==', id)
                .get();
            if (query.empty) resolve(subturmas);
            query.forEach(snapSubturma => {
                const subturma = snapSubturma.data();
                subturma.id = snapSubturma.id;
                subturmas.push(subturma);
            });
            resolve(subturmas);
        } catch(erro) {
            reject(erro);
        }
    });
  }

  self.salvarTurma = function (turma) {
    return self.refColecao.add(turma);
  }

  self.salvarSubturma = function(subturma) {
    return self.db.collection('subturmas').add(subturma);
  }

  self.removerTurma = function (id) {
    return self.refColecao.doc(id).delete();
  }

  self.removerSubturma = function(id) {
    return self.db.collection('subturmas').doc(id).delete();
  }

  self.modificarTurma = function (id, newTurma) {
    return self.db.doc("turmas/" + id).update(newTurma);
  }

  self.initFirebase();
}
