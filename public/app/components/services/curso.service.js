angular
  .module('class-scheduler')
  .service('$cursoSvc', cursoSvc);

function cursoSvc() {
  const self = this;

  self.init = function () {
    self.db = firebase.firestore();
    self.refColecao = self.db.collection('cursos');
  }

  self.getCursos = function () {
    return self.refColecao.orderBy("titulo").get();
  }

  self.loadCursos = function (array) {
    array.splice(0, array.length)

    return self.refColecao
    .orderBy('titulo')
    .get()
    .then(query => {
      query.forEach(snapCurso => {
        const curso = snapCurso.data();
        curso.id = snapCurso.id;

        array.push(curso);
      })
    })
    .catch(e => {
      console.error('cursoSvc -> Ocorreu um erro em loadCursos: ', e);
    })
  }

  self.addCurso = function (curso) {
    return self.refColecao.add(curso);
  }

  self.addCurso2 = function (titulo) {
    return self.refColecao.add( { titulo: titulo } );
  }

  self.excluirCurso = function (id) {
    return self.refColecao.doc(id).delete();
  }

  self.editarCurso = function (id, newData) {
    return self.refColecao.doc(id).set(newData);
  }

  self.init();
}
