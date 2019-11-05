'use strict';
const _         = require('lodash');
var app = require('../../server/server');
const async     = require('async');
const { fork }      = require('child_process');
const loopback  = require('loopback');
const Disciplina = app.models.Disciplina;
const DEBUG = true

module.exports = function(Turma) {
    Turma.validatesPresenceOf('disciplinaCod');
    /**
 * junta turmas
 * @param {array} turmas lista de turmas a serem unidas
 * @param {Function(Error)} callback
 */

    // transform array of json in turmas instance
    async function get_turmas(turmas) {
        var _turmas = [];
        for(var i=0; i < turmas.length ; i++) {
            var turma = turmas[i];
            var t = await app.models.Turma.findById(turma.id)
            _turmas.push(t);
        }
        return _turmas
    }

    async function check_horario(t1,t2) {
        var h_x = t1.horarios.find()
        var h_y = t2.horarios.find()
        var mesmo_horario = false;
        for(var i=0; i<h_x.length; i++){
            for(var j=0; j<h_y.length && !mesmo_horario; j++){
                if (h_x[i].horario_inicial == h_y[j].horario_inicial &&
                    h_x[i].horario_final == h_y[j].horario_final &&
                    h_x[i].dia == h_y[j].dia)
                    mesmo_horario = true;
                
            }
            if (mesmo_horario == false)
               return false;

            mesmo_horario = false;
            
        }
        return true;
    }
    async function check_disciplina(t1,t2) {
        var disciplina_x = t1.disciplina.get()
        var disciplina_y = t2.disciplina.get()
        //var equivalencias_x = await disciplina_x.getEquivalencias()
        //console.log(equivalencias_x)
        //if (Array.isArray(equivalencias_x)) {
        //    for(var i=0; i < equivalencias_x.length; i++)
        //        if (equivalencias_x[i].codigo == disciplina_y.codigo)
        //            return true;
        //}
        //else {
        //    if (disciplina_y.codigo == equivalencias_x.codigo)
        //        return true;
        //}
        if (disciplina_x.codigo == disciplina_y.codigo)
            return true;

        return false;
    }

    Turma.juntar = async function(_turmas) {
        if (!_turmas ||  !_turmas.length)
            return {"status":0, "msg": "Lista de turmas vazia"}
        var turmas = await get_turmas(_turmas);

        console.log(turmas)
        turmas.map(async (i)=>{
            var horarios = await i.horarios.find()
            var disciplina = await i.disciplina.get()
            console.log("Horarios: ",horarios,"disciplina: ",disciplina)
        });
        var turma_x = turmas[0];
        console.log("turma x antes",turma_x)
        var turmas_to_merged = []
        for(var j=1; j < turmas.length; j++) {
            var turma_y = turmas[j];
            // verificar se são a mesma disciplina ou disciplina equivalentes
            var disciplina_result = await check_disciplina(turma_x,turma_y);
            if(!disciplina_result)
                return {"status":1,
                        "msg":"As disciplinas não são equivalentes",
                        "turmas":[ turma_x, turma_y] 
                        };
            // verificar se são o mesmo horario ou horario logo apos
            var horarios_result = await check_horario(turma_x,turma_y);
            if(!horarios_result)
                return {"status":2,
                        "msg":"Horarios não são compatíveis",
                        "turmas":[ turma_x, turma_y] 
                };
            // se positivo adicionar turma_y na lista de turmas a serem  unidas
            turmas_to_merged.push(turma_y);
        }
        // se todas as turmas forem compativeis então une todas na primeira
        for (var i = 0; i < turmas_to_merged.length; i++) {
            turma_y = turmas_to_merged[i]
            turma_x.vagas += turma_y.vagas
            turma_y.horarios.destroyAll()
        }
        turma_y.destroy()
        turma_x.save()

        return turmas;
    };
    async function check_horario_merge(horarios) {
        var horarios_iguais = true
        var horario = horarios[0].horario
        for (var i=1; i<horarios.length && horarios_iguais; i++) {
            var _horario = horarios[i]
            if (DEBUG)
                console.log("Comparacao de horario merge: horario e _horario ",horario,_horario)
            if (_horario.horario.horario_inicial != horario.horario_inicial ||
                _horario.horario.horario_final != horario.horario_final ||
                _horario.horario.dia != horario.dia)
                horarios_iguais = false;
        }
        return horarios_iguais;

    }
    //itera todas as turmas e todos os horarios, para verificar se existe
    //alguma turma com relação com horario
    async function check_exist_turma(allturmas,horario) {
        for (var i=0; i<allturmas.length; i++) {
            var horarios_turma = allturmas[i];
            for (var j=0; j<horarios_turma; j++) {
                if (horarios_turma[j].id == horario.id)
                    return true;
            }
        }
        return false;
    }
    /**
    * juntar dois horarios de turmas diferentes
    * @param {array} horarios array de objetos horarios, incluindo turma
    * @param {Function(Error, object)} callback
    */

    Turma.mergehorario = async function(horarios) {
        var status = {"status":0, "msg":"inicio"};
        var horarios_m = {};
        var _horarios = []
        for (var i = 0; i < horarios.length; i++) {
            var h = horarios[i]
            var _horario = await app.models.Horario.findById(h.id);
            var t = await app.models.Turma.findById(h.turma);
            _horarios.push({"horario":_horario,"turma":t});
        }

        if (_horarios.length <= 1)
            return {"status":1, "msg":"lista de horarios possui menos de dois horarios"}
        // verifica se todos os horarios são no mesmo dia e possui a mesma hora
        // de inicio e fim. se sim então une, caso contrário retorna mensagem
        // dizendo que os horarios são diferentes
        if (!check_horario_merge(_horarios))
            return {"status":2, "msg":"horarios são divergentes no dia ou hora de inicio ou fim"}


        var allturmas = await app.models.Turma.find({include:{relation:"horarios"}})
        // faz a uniao
        var horario = _horarios[0];
        for(var i=1; i < _horarios.length; i++ ) {
            var h = _horarios[i];
            await h.turma.horarios.remove(h.horario); //remove a relação de horario i com turma i
            await h.turma.horarios.add(horario.horario) // adiciona a relação do horario 0 com a turma i
            // verifica se o horario i possui alguma relação com alguma turma,
            // se não tiver então deleta
            if(!check_exist_turma(allturmas,h.horario)) 
                h.horario.destroy();
        }   

        return {"status":3,"msg":"união de horarios feita com sucesso"};
    };
    /**
 * cria ou atualiza turma
 * @param {object} turma turma a ser inserida, contendo horarios
 * @param {Function(Error, object)} callback
 */

Turma.create = async function(turma) {
    var status;
    console.log("turma entrada: ",turma)
    return turma;
    //verifica se existe o campo id, se sim encontra modelo correspondente,
    //caso contrário cria
    var _turma = await app.models.Turma.findOrCreate({where:{id:turma._id}},turma);
    console.log("_turma: ",_turma)
    for(var i=0; i< turma.horarios.length; i++) {
        var horario = await app.models.Horario.findOrCreate({where:turma.horarios[i]},turma.horarios[i]);
        console.log("horario: ",horario);
        for (var j=0; j<horario.length; j++)
            await _turma[0].horarios.add(horario[j])
    }
    
    return status
};




};
