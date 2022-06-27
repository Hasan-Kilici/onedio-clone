const mongoose = require("mongoose")
const Schema = mongoose.Schema

var kullanicilarSchema = new Schema ({
ip :{
type:String,
require:true,
},
kullanici_adi:{
type:String,
require:true,
},
gmail:{
type:String,
require:true,
},
sifre:{
type:String,
require:true,
},
newId:{
type:String,
require:true
},
giris:{
type:String,
require:true,
},
admin:{
type:String,
require:true,
}
})

var kullanicilar = mongoose.model('Kullanicilar', kullanicilarSchema)
module.exports = kullanicilar
