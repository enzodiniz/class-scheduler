angular
  .module('class-scheduler')
  .service('$profSvc', profSvc)

function profSvc() {
  var self = this;

  self.initFirebase = function() {
    self.db = firebase.firestore();
    // self.refCollection = self.db.collection("professores")
    self.refCollection = self.db.collection("pessoas");
  }

  //self.excluirProf = function(id) {
    //return self.refCollection.doc(id).delete();
  //}

  //self.updateProf = function(id, newData) {
    //return self.refCollection.doc(id).set(newData);
  //}

  //self.addProfessor = function (personId) {
    //const personRef = self.db.doc("pessoas/" + personId)
    //const teacher = {
     // refPessoa: personRef
    //}
   // return self.refCollection.add(teacher)
  //}

  //self.getProfessor = function (personId) {
    //const personRef = self.db.doc("pessoas/" + personId)
    //return self.refCollection.where("refPessoa", "==", personRef).get();
  //}

  self.getProfessorById = function(professorId) {
    return self.refCollection.doc(professorId).get();
  }

  self.getProfessorByIdDisabled = function (professorId) {

    const promise = function (resolve, reject) {
      self.refCollection.doc(professorId).get()
        .then(async snapProfessor => {
          const professor = snapProfessor.data()

          const pessoa = await self._getPessoa(professor.refPessoa)

          resolve({
            id: snapProfessor.id,
            pessoa: pessoa
          })
        })
        .catch(error => reject(error))
    }
    return new Promise(promise)

    // return self.refCollection.doc(professorId).get()
    //   .then(async snapProfessor => {
    //     const professor = snapProfessor.data()
    //
    //     const pessoa = await self._getPessoa(professor.refPessoa)
    //
    //     return professor.pessoa = pessoa
    //   })
    //   .catch(error => {
    //     $alertSvc.showAlert('Ocorreu um erro ao obter professor:')
    //     console.error('Ocorreu um erro ao obter professor:', error);
    //   })
  }

  self._getPessoa = function (refPessoa) {
    return refPessoa.get()
      .then(snapPessoa => {
        const pessoa = snapPessoa.data()
        pessoa.photoUrl = pessoa.photoUrl || 'app/img/profile.png'

        return pessoa
      })
      .catch(error => {
        $alertSvc.showAlert('Ocorreu um erro ao obter pessoa do professor!')
        console.error('Ocorreu um erro ao obter pessoa do professor:', error);
      })
  }

  self.getProfs = function() {
    return self.refCollection.get();
  }

  self.getProfessores = function() {
    return self.refCollection.where("papeis", "array-contains", "professor").get();
  }

  self.getProfessoresDisabled = function() {
    return new Promise(async (resolve, reject) => {
        try {
            const professores = [];
            const promessasPessoa = [];
            const query = await self.refCollection.get();
            query.forEach(snapProfessor => {
                const professor = snapProfessor.data();
                professor.id = snapProfessor.id;
                professores.push(professor);
                promessasPessoa.push(self._getPessoa(professor.refPessoa));
            })

            const pessoas = await Promise.all(promessasPessoa);
            pessoas.forEach((pessoa, indice) => {
                professores[indice]['pessoa'] = pessoa;
            })
            resolve(professores);
        } catch(error) {
            reject(error);
        }
    }) 
  }

  self.initFirebase();
}
