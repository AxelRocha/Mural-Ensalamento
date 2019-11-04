'use strict';
const _         = require('lodash');
const { fork }      = require('child_process');
const loopback  = require('loopback');

var async = require('async');

var path = require("path");

var app = require('../../server/server');

const {Ensalador, EnsaladorPart, Schedule, ScheduleCollection, Room, RoomColection, CurrentSchedule} = require(path.resolve(__dirname,'../../bin/ensalador/ensalador.js'));

// Convert an instance of Horario into an Schedule (Ensalador) instance
function getScheduleInstance(h, cb){
  var Horario = app.models.Horario;
  Horario.getCode(h.id, (err,horarioCode) => {
    if(err) return cb(err,null);
    Horario.getTotalSize(h.id, (err,horarioSize) => {
      if(err) return cb(err,null);  
      // TODO: Type, klass_id, department and course must be corrected
      var schedule = new Schedule({
        code: horarioCode,
        id: h.id,
        day: h.dia,
        ini: h.horario_inicial,
        end: h.horario_final,
        size: horarioSize,
        type: 1,
        department: "d",
        course: "c",
        klass_id: 1
      });
      cb(null,schedule);
    });
  });
}


function getAllSchedulesInstances(newEnsalamento,cb){
  var Horario = app.models.Horario;

  // TODO: Filter by parameters specified by user
  var queryHorario = {};


  Horario.find(queryHorario, function(err, horarios){

    // Transform the horarios to objects
    horarios = horarios.map(h => {return h.toJSON()});

    // Transform all Horario instances in Schedule (Ensalador)
    async.map(horarios, getScheduleInstance, (err, schedules) => {
      cb(err, new ScheduleCollection(newEnsalamento.id,schedules));
    });
  });
}

function getAllRoomsInstances(newEnsalamento,cb){
  var Sala = app.models.Sala;
  var querySala = {};
  Sala.find(querySala, function(err, salas){
    if(err) return cb(err,null);
    var rooms = salas.map(s => {
      s = s.toJSON();

      // TODO: type must be an integer, but the model Sala contains a string
      return new Room({
        code: s.codigo,
        id: s._id,
        type: 1,
        size: s.capacidade,
        block: s.blocoCod,
        lat: s.localizacao.lat,
        log: s.localizacao.lng
      });
    });

    cb(err, new RoomColection(newEnsalamento.id,rooms));
  });
}

async function get_user(res) {
    var user_id = res.req.accessToken.userId;
    const Usuario = app.models.Usuario;
    return await Usuario.findById(user_id);

}

module.exports = function(Ensalamento) {
  Ensalamento.ensalar = function(cb) {
    var Horario = app.models.Horario;
    // TODO: insert user id when create ensalamento instance
    app.models.Ensalamento.create({}, function(err, newEnsalamento){
          if(err) return cb(err,null);
        getAllRoomsInstances(newEnsalamento,(err, rooms) => {
            if(err) return cb(err,null);
          getAllSchedulesInstances(newEnsalamento,(err,schedules) => {
              if(err) return cb(err,null);
            
            // Save the files into ensalador/ensalador_executions
            // The id of new ensalamento is the identifier of
            // yaml new files
            rooms.save();
            schedules.save();
            var dataCurrent = schedules.toJSON().schedules.map(s =>{
                return new Schedule(s)
            });
            var current = new CurrentSchedule(newEnsalamento.id, dataCurrent);
            current.save();
            
            // Heuristic used to execute
            // Here you can specify the parameters of algorithm
            var parts = [
              new EnsaladorPart("Open", "open"),
              new EnsaladorPart("PAPC","exec","{block: [pa,pc], course: [08B,11A,11B,16A,17A,19A,21A,26A,29A,96A,40001016041P1]}"),
              new EnsaladorPart("CT","exec","{ block: [ct], course: [10F,15C,18F]}"),
              new EnsaladorPart("EQ","exec","{ block: [eq], course: [06A]}"),
              new EnsaladorPart("PD","exec","{ block: [pd], course: [01A,01B]}"),
              new EnsaladorPart("PG","exec","{ block: [pg], course: [05A,103A] }"),
              new EnsaladorPart("PKPL","exec","{ block: [pk,pk-2,pl], course: [03A,102A] }"),
              new EnsaladorPart("PQ","exec","{ block: [pq], course: [12E] }"),
              new EnsaladorPart("PF","exec","{ block: [pf], course: [02B] }"),
              new EnsaladorPart("PH","exec","{ block: [ph], course: [15C,09B] }"),
              new EnsaladorPart("PM","exec","{ block: [pm], course: [20A,2020,23A] }"),
              new EnsaladorPart("TODOS","exec","{ block: [ct,eq,pa,pc,pd,pf,pg,ph,pk,pl,pm,pq,pr], course: [04B,05A,06A,08B,09B,103A,104A,105A,10F,11A,11B,12E,13A,15C,16A,17A,18F,19A,2020,20A,21A,22B,23A,26A,29A,31C,32D,33A,35B,40001016041P1,40C,41A,45C,46A,60A,61A,64A,65A,67A,76B,95A,96A,ppgengprod,ppgq] }"),
              new EnsaladorPart("Restante","exec","{ block: [ct,eq,pa,pc,pd,pf,pg,ph,pk,pl,pm,pq,pr], course: [01A,01B,02B,03A,102A,24A] }"),
              
              new EnsaladorPart("Final", "exec","{day: [2,3,4,5,6,7]}"),
              new EnsaladorPart("Close", "close")
            ];
            // Insert in the blank line stuff for humanities and bio if all else fails
            
            var e = new Ensalador(
              parts,
              rooms.getFilePath(),
              schedules.getFilePath(),
              current.getFilePath(),
            );
    
            e.execute((err,schedules) => {
              if(err) return cb(err,null);
              async.each(schedules,
                (s,cb_s) => {
                  var query = {where:{id: s.id}};
                  Horario.findOne(query, (err, h) => {
                    if(err) return cb(err,null);
                    h.updateAttribute("salaCode", s.assigned, err => {
                      cb_s(err);
                    });
                  });
                },
                (err) => {
                  // If everything is ok
                  cb(err,schedules);
                }
              );
            });
          })
        });
    });
  };
/**
 * upload planilha do sie
 * @param {string} delimiter separador de campos do csv
 * @param {string} semester semestre label
 * @param {date} letiveInit inicio do periodo letivo
 * @param {date} letiveEnd fim do periodo letivo
 * @param {Function(Error, string)} callback
 */


Ensalamento.upload = async function(req, res) {
    var status = "ok";
    const Container = app.models.container;
    const FileUpload = app.models.FileUpload;
    const Semestre = app.models.Semestre;
    const container_name = `turma-${Math.round(Date.now())}-${Math.round(Math.random() * 1000)}`;

    // create a container (directory) for upload file
    var container = await Container.createContainer({name:container_name});
    // upload file (copy file in request to container)
    var arg1 = await Container.upload(req,res,{container:container.name});
    var args = arg1.fields //arguments as semester, letiveinit ... etc
    console.log(args)
    // create semester instance
    var semestre = {"semestre":args.semester}
    var s = await Semestre.create(semestre);

    var file =  await Container.getFiles(container.name,{});
    // create a instance of models FileUpload
    var file_upload = await FileUpload.create({
        'date': new Date(),
        'container_name':container.name,
        'letive_init': new Date(args.letiveInit),
        'letive_end': new Date(args.letiveEnd),
        "semestre": s.semestre,
        'status':"Em andamento"
    });
    //get user by token
    var user = await get_user(res);

    // fork process of populate data
    var param = {
       "fileUpload": file_upload.id,
       "root": app.datasources.container.settings.root,
       "container": container.name,
       "letive_init": file_upload.letive_init,
       "letive_end": file_upload.letive_end,
       "delimiter": (args.delimiter) ?args.delimiter : ";",
       "user": user.nome,
       "semester": semestre.semestre,
       "file": file[0].name
    };

    fork("/app/server/turma-import.js",[JSON.stringify(param)]);
    return file_upload;
};

};
