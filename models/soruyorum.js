const mongoose = require("mongoose")
const Schema = mongoose.Schema

var soruyorumSchema = new Schema({
kullanici_adi:{
type : String,
require : true,
},
mesaj:{
type: String,
require: true,  
},
soru:{
type:String,
require : true,
},
soruId:{
type : String,
require : true,
},
like:{
type:Number,
require:true,
},
}, {timestamps:true})

var soruyorum = mongoose.model('Soruyorum', soruyorumSchema)
module.exports = soruyorum
