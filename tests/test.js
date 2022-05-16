//const assert = require('assert');
const firebase = require('@firebase/testing');
require('dotenv').config();
const PROJETO_ID = process.env.PROJETO_ID;

const adminApp = firebase.initializeAdminApp({
    projectId: PROJETO_ID
}).firestore();

function getFirebaseAutenticado(auth) {
    return firebase.initializeTestApp({
        projectId: PROJETO_ID,
        auth: auth
    }).firestore();
}

async function criarPeriodoTeste() {
    const periodoRef = adminApp.doc('periodos/periodoTeste');
    await periodoRef.set({
        ano: 2022,
        semestre: 1
    })
    return periodoRef;
}

async function criarPessoa() {
    const pessoaRef = adminApp.doc('pessoas/teste@gmail.com');
    await pessoaRef.set({
        uid: 'teste@gmail.com',
        email: 'teste@gmail.com'
    });
    return pessoaRef;
}

async function criarCoordenadorTeste() {
    const coordenadorRef = adminApp.doc('pessoas/coordenador@gmail.com');
    await coordenadorRef.set({
        uid: 'coordenador@gmail.com',
        email: 'coordenador@gmail.com',
        papeis: ['coordenador']
    });
    return coordenadorRef; 
}

async function criarProfessorTeste() {
    const professorReferencia = adminApp.doc('pessoas/prof.teste@gmail.com');
    await professorReferencia.set({
        uid: 'prof.teste@gmail.com',
        email: 'prof.teste@gmail.com',
        papeis: ['professor']
    });
    return professorReferencia; 
}

async function criarPessoaAdministrador() {
    const administradorRef = adminApp.doc('pessoas/admin@gmail.com');
    await administradorRef.set({
        uid: 'admin@gmail.com',
        email: 'admin@gmail.com',
        papeis: ['administrador']
    });
    return administradorRef;
}

async function criarCursoTeste() {
    const cursoRef = adminApp.doc('cursos/teste');
    await cursoRef.set({
        titulo: 'Informática'
    });
    return cursoRef;
}

async function criarPeriodoTeste() {
    const periodoRef = adminApp.doc('periodos/teste');
    await periodoRef.set({
        ano: 2022,
        semestre: 1
    });
    return periodoRef;
}

async function criarTurmaTeste() {
    const turmaRef = adminApp.doc('turmas/teste');
    const cursoRef = await criarCursoTeste();
    const periodoRef = await criarPeriodoTeste();
    await turmaRef.set({
        serie: 1,
        curso: cursoRef,
        periodo: periodoRef
    });
    return turmaRef;
}

async function criarDisciplinaTeste() {
    const disciplinaRef = adminApp.doc('disciplinas/teste');
    const promessas = [
        criarPeriodoTeste(),
        criarProfessorTeste(),
        criarTurmaTeste()
    ];
    const referencias = await Promise.all(promessas);
    await disciplinaRef.set({
        titulo: "Teste",
        horarios: {
            dia: 1,
            indiceAula: 0 
        },
        periodoId: referencias[0].id,
        professorId: referencias[1].id,
        turmaId: referencias[2].id
    });
    return disciplinaRef;
}

// TODO: Fazer testes com relação aos email dos usuários.
describe("Testes da coleção /pessoas", () => {
    it('Deve conseguir obter seu próprio usuário', async () => {
        await criarPessoa();
        const db = getFirebaseAutenticado({
            uid: 'teste@gmail.com', 
            email: 'teste@gmail.com'
        });
        await firebase.assertSucceeds(db.doc('pessoas/teste@gmail.com').get());
    });

    it('Deve conseguir obter qualquer usuário', async () => {
        const promessas = [
            criarPessoa(), criarPessoaAdministrador()
        ];
        await Promise.all(promessas);
        const db = getFirebaseAutenticado({
            uid: 'teste@gmail.com', 
            email: 'teste@gmail.com'
        });
        await firebase.assertSucceeds(db.doc('pessoas/admin@gmail.com').get());
    });

    it('Deve conseguir listar pessoas', async () => {
        await criarPessoaAdministrador();
        const db = getFirebaseAutenticado({
            uid: 'admin@gmail.com', 
            email: 'admin@gmail.com'
        });
        await firebase.assertSucceeds(db.collection('pessoas').get());
    });

    it('Não deve conseguir listar pessoas', async () => {
        await criarPessoa();
        const db = getFirebaseAutenticado({
            uid: 'teste@gmail.com', 
            email: 'teste@gmail.com'
        });
        await firebase.assertFails(db.collection('pessoas').get());
    });    

    it('Deve alterar o próprio conteúdo', async () => {
        const pessoaRef = await criarPessoa();
        const db = getFirebaseAutenticado({ 
            uid: 'teste@gmail.com', 
            email: 'teste@gmail.com' 
        });
        await firebase.assertSucceeds(pessoaRef.set({
            photoUrl: 'teste.png'
        }, { merge: true }));
    });

    it('Não deve alterar conteúdo de outro usuário', async () => {
        await criarPessoa();
        const db = getFirebaseAutenticado({ 
            uid: 'teste@gmail.com', 
            email: 'teste@gmail.com' 
        });
        await firebase.assertFails(db.doc('pessoas/admin@gmail.com').set({
            photoUrl: 'outro.png'
        }));
    });
});

describe('Testes da coleção /cursos', () => {
    it('Deveria conseguir obter os cursos', async () => {
        await criarPessoa();
        const db = getFirebaseAutenticado({
            uid: 'teste@gmail.com',
            email: 'teste@gmail.com'
        });
        await firebase.assertSucceeds(db.collection('cursos').get());
    });

    it('Não deveria conseguir obter os cursos', async() => {
        const db = getFirebaseAutenticado(null);
        await firebase.assertFails(db.collection('cursos').get());
    });

    it('Deveria conseguir criar curso', async() => {
        await criarPessoaAdministrador();
        const db = getFirebaseAutenticado({
            uid: 'admin@gmail.com',
            email: 'admin@gmail.com'
        });
        await firebase.assertSucceeds(db.collection('cursos').add({ titulo: 'teste' }));
    });

    it('Não deveria conseguir criar curso', async() => {
        await criarPessoa();
        const db = getFirebaseAutenticado({
            uid: 'teste@gmail.com',
            email: 'teste@gmail.com'
        });
        await firebase.assertFails(db.collection('cursos').add({ titulo: 'teste' }));
    });

    it('Não deveria criar curso com titulo inválido', async() => {
        await criarPessoaAdministrador();
        const db = getFirebaseAutenticado({
            uid: 'admin@gmail.com',
            email: 'admin@gmail.com'
        });
        await firebase.assertFails(db.doc('cursos/teste').set({
            titulo: null
        }));
    });
});

describe('Testes da coleção disciplinas', () => {
    it('Deveria conseguir obter todas as disciplinas', async() => {
        await criarPessoa()
        const db = getFirebaseAutenticado({
            uid: 'teste@gmail.com',
            email: 'teste@gmail.com'
        });
        await firebase.assertSucceeds(db.collection('disciplinas').get());
    });

    it('Não deveria obter disciplinas', async() => {
        const db = getFirebaseAutenticado(null);
        await firebase.assertFails(db.collection('disciplinas').get());
    });

    it('Deveria criar disciplina para professor', async() => {
        const promessas = [
                criarProfessorTeste(),
                criarPeriodoTeste(),
                criarCursoTeste(),
                criarPessoaAdministrador()
        ];
        const referencias = await Promise.all(promessas);
        await adminApp.collection('turmas').doc('turmaTeste').set({
            serie: 1,
            curso: referencias[2]
        });
        const db = getFirebaseAutenticado({
            uid: 'admin@gmail.com',
            email: 'admin@gmail.com'
        });
        await firebase.assertSucceeds(db.collection('disciplinas').add({
            professor: referencias[0],
            titulo: 'teste',
            refPeriodo: referencias[1],
            turma: adminApp.doc('turmas/turmaTeste')
        }));
    });

    it('Não deveria criar disciplina para não professor', async() => {
        const promessas = [
            criarPessoa(), criarPeriodoTeste(), criarCursoTeste()
        ];
        const referencias = await Promise.all(promessas);
        await adminApp.collection('turmas').doc('turmaTeste').set({
            serie: 1,
            curso: referencias[2]
        });
        const db = getFirebaseAutenticado({
            uid: 'teste@gmail.com',
            email: 'teste@gmail.com'
        });
        await firebase.assertFails(db.collection('disciplinas').add({
            titulo: 'teste',
            refPeriodo: referencias[1],
            professor: referencias[0],
            turma: adminApp.doc('turmas/turmaTeste')
        }));
    });

    it('Não deveria criar disciplina com titulo nulo', async() => {
        const promessas = [
            criarPessoa(), criarPeriodoTeste(), criarCursoTeste()
        ];
        const referencias = await Promise.all(promessas);
        await adminApp.collection('turmas').doc('turmaTeste').set({
            serie: 1,
            curso: referencias[2]
        });
        const db = getFirebaseAutenticado({
            uid: 'teste@gmail.com',
            email: 'teste@gmail.com'
        });
        await firebase.assertFails(db.collection('disciplinas').add({
            titulo: null,
            refPeriodo: referencias[1],
            professor: referencias[0],
            turma: adminApp.doc('turmas/turmaTeste')
        }));
    });
});

describe('Testes da coleção de substituições', () => {
    it('Professor deve conseguir criar falta para si', async () => {
        const promessas = [
            criarProfessorTeste(),
            criarTurmaTeste(),
            criarDisciplinaTeste(),
            criarPeriodoTeste()
        ];
        const referencias = await Promise.all(promessas);
        const db = getFirebaseAutenticado({
            uid: 'prof.teste@gmail.com',
            email: 'prof.teste@gmail.com'
        });
        await firebase.assertSucceeds(db.collection("substituicoes").add({
            eFalta: false,
            data: new Date().getTime(),
            motivo: "Teste",
            turmaRef: referencias[1],
            substituto: {
                disciplinaId: null,
                professorId: null
            },
            aula: {
                disciplinaId: referencias[2].id,
                indice: 0,
                periodoId: referencias[3].id,
                professorId: referencias[0].id
            }
        }));
    });

    it('Coordenador deve conseguir criar falta', async () => {
        const promessas = [
            criarProfessorTeste(),
            criarTurmaTeste(),
            criarDisciplinaTeste(),
            criarPeriodoTeste(),
            criarCoordenadorTeste()
        ];
        const referencias = await Promise.all(promessas);
        const db = getFirebaseAutenticado({
            uid: 'coordenador@gmail.com',
            email: 'coordenador@gmail.com'
        });
        await firebase.assertSucceeds(db.collection("substituicoes").add({
            eFalta: true,
            data: new Date().getTime(),
            motivo: "",
            turmaRef: referencias[1],
            substituto: {
                disciplinaId: null,
                professorId: null
            },
            aula: {
                disciplinaId: referencias[2].id,
                indice: 0,
                periodoId: referencias[3].id,
                professorId: referencias[0].id
            }
        }));
    });
});
