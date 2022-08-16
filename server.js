const http = require("http");
const fs = require("fs");
const express = require("express");
const morgan = require("morgan");
const mongoose = require("mongoose");
const app = express();

const bodyParser = require("body-parser");
const server = http.createServer(app);
const path = require("path");
const events = require("events");
const { Server } = require("socket.io");
const io = new Server({});
const EventEmitter = require("events").EventEmitter;
const em = new EventEmitter();
const cookieParser = require("cookie-parser");
const passport = require("passport");
const { Strategy } = require("passport-discord");
const session = require("express-session");

const GoogleStrategy = require("passport-google-oauth2").Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: "GoogleAouth2ClientId",
      clientSecret: "GoogleAouth2ClientSecret",
      callbackURL: "url/google/callback",
      passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

let strategy = new Strategy(
  {
    clientID: "DiscordBotId",
    clientSecret: "DiscordBotSecret",
    callbackURL: "url/callback",
    scope: ["guilds", "identify"],
  },
  (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
  }
);

passport.use(strategy);

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUnitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());

const port = 3000;
//view engine
const ejs = require("ejs");
app.engine("ejs", ejs.renderFile);
app.set("view engine", "ejs");
//Body-parse
app.use(bodyParser.json()).use(
  bodyParser.urlencoded({
    extended: true,
  })
);
//Statik
app.use(express.static("public"));
app.set("src", "path/to/views");
//MongoDB
//Colections
const Sorular = require("./models/sorular.js");
const Kullanicilar = require("./models/kullanicilar.js");
const Soruyorum = require("./models/soruyorum.js");
//mongoDB panel ayarları
const dbURL = "MongoDbUrlsi";
mongoose
  .connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => {
    app.listen(3000, () => {
      console.log("mongoDB Bağlantı kuruldu");
    });
  })
  .catch((err) => console.log(err));
//mongoDB panel ayarları bitti
app.set("view engine", "ejs");
app.use(morgan("dev"));

app.get(
  "/google/login",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

app.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "/google/user/controle",
    failureRedirect: "/google/login/err",
  })
);

app.get("/google/user/controle", async (req, res, err) => {
  //evt
  var us = req.user;
  //burda id sub demek ee name name  evt basit bu ya yep ivt
  const user = await Kullanicilar.findOne({ newId: req.user.sub });
  console.log(req.user);
  if (user) {
    console.log("buldum");
    setTimeout(() => {
      res.cookie("id", user._id);
      res.cookie("token", user._id);
      res.cookie("userId", req.user.sub);
      res.redirect("/");
    }, 100);
  } else {
    //db ye kaydetmiyo
    var kullanicilar = new Kullanicilar({
      kullanici_adi: us.displayName,
      gmail: us.email,
      newId: us.sub,
      giris: "Google",
    });
    kullanicilar.save().then((result) => {
      setTimeout(() => {
        res.cookie("id", user._id);
        res.cookie("token", user._id);
        res.cookie("userId", req.user.sub);
        res.redirect("/");
      }, 100);
    });
    console.log("bulamadım");
  }
});

app.get(
  "/login",
  passport.authenticate("discord", {
    scope: ["guilds", "identify", "email"],
  })
);

app.get(
  "/callback",
  passport.authenticate("discord", {
    failureRedirect: "/hata",
  }),
  async (req, res) => {
    let us = req.user;
    //buraya async ekleye biirmiyiz
    const user = await Kullanicilar.findOne({ newId: req.user.id });
    if (user) {
      console.log("buldum");
      res.cookie("id", user._id);
      res.cookie("token", user._id);
      res.cookie("userId", us.id);
      res.redirect("/");
    } else {
      //günaydın amk qwdqs
      var kullanicilar = new Kullanicilar({
        kullanici_adi: us.username,
        gmail: us.email,
        newId: us.id,
        giris: "Discord",
      });
      kullanicilar.save().then((result) => {
        res.cookie("id", result._id);
        res.cookie("token", result._id);
        res.cookie("userId", us.id);
      });
      console.log("bulamadım");
    }
  }
);

//anasayfa
app.get("/", (req, res, err) => {
  var kullaniciId = req.cookies.id;
  Sorular.find()
    .sort({ createdAt: -1 })
    .then((sresult) => {
      Kullanicilar.find().then((kkresult) => {
        if (kullaniciId != null) {
          Kullanicilar.findById(req.cookies.id).then((kresult) => {
            res.render(__dirname + "/src/signed/index.ejs", {
              title: "Anasayfa",
              kullanici: kresult,
              soru: sresult,
            });
          });
        } else {
          res.render(__dirname + "/src/pages/index.ejs", {
            title: "Anasayfa",
            soru: sresult,
          });
        }
      });
    })
    .catch((err) => {
      console.log(err);
    });
});
app.get("/giris", (req, res) => {
  res.render(__dirname + "/src/pages/giris.ejs", { title: "Giriş yap" });
});
app.get("/kayit", (req, res) => {
  res.render(__dirname + "/src/pages/kayit.ejs", { title: "Kayıt ol" });
});
//Dashboard
app.get("/admin/dashboard", (req, res) => {
  var KullaniciId = req.cookies.id;
  Kullanicilar.findById(KullaniciId).then((result) => {
    var admin = result.admin;
    if (admin == "true") {
      Sorular.find()
        .sort({ createdAt: -1 })
        .then((sresult) => {
          Sorular.find()
            .count()
            .then((slresult) => {
              res.render(__dirname + "/src/admin/dashboard.ejs", {
                soru: sresult,
                kullanici: result,
                title: "Dashboard",
                sorusayi: slresult,
              });
            });
        });
    } else {
      res.redirect("/");
    }
  });
});
//sorular
app.get("/soru/:id", (req, res) => {
  var id = req.params.id;
  var kullaniciId = req.cookies.id;
  Sorular.findById(id)
    .then((result) => {
      Soruyorum.find({ soruId: id })
        .sort({ createdAt: -1 })
        .then((yresult) => {
          Kullanicilar.find().then((kkresult) => {
            if (kullaniciId != null) {
              Kullanicilar.findById(req.cookies.id).then((kresult) => {
                var goruntulenme = Number(result.goruntulenme);
                goruntulenme++;
                Sorular.findByIdAndUpdate(id, {
                  goruntulenme: goruntulenme,
                }).then((gresult) => {
                  res.render(__dirname + "/src/signed/soru.ejs", {
                    title: result.title,
                    kullanici: kresult,
                    soru: result,
                    yorum: yresult,
                  });
                });
              });
            } else {
              res.render(__dirname + "/src/pages/soru.ejs", {
                title: result.title,
                soru: result,
                yorum: yresult,
              });
            }
          });
        });
    })
    .catch((err) => {
      console.log(err);
    });
});

//Kayıt olma
app.post("/kayit-ol", (req, res) => {
  Kullanicilar.findOne({ kullanici_adi: req.body.username }, (err, user) => {
    if (user) {
      res.send("Bu isim kullanılmakta");
    } else {
      var kullanicilar = new Kullanicilar({
        kullanici_adi: req.body.username,
        sifre: req.body.sifre,
        gmail: req.body.gmail,
      });
      kullanicilar.save().then((result) => {
        res.cookie("id", result._id);
        res.cookie("token", result._id);
        res.cookie("userId", result._id);
        res.send("Kayıt olundu & Giriş yapıldı");
      });
    }
  });
});
//Giriş yapma
app.post("/giris-yap", (req, res) => {
  var kullanici_adi = req.body.username;
  var sifre = req.body.sifre;
  Kullanicilar.find({ kullanici_adi: kullanici_adi, sifre: sifre }).then(
    (result) => {
      Kullanicilar.findOne(
        { kullanici_adi: kullanici_adi, sifre: sifre },
        (req, res, user) => {
          if (user) {
            res.cookie("id", result[0]._id);
            res.cookie("token", result[0]._id);
            res.cookie("userId", result[0]._id);
            res.send("Giriş yapıldı");
          } else {
            res.send("Böyle bi kullanıcı yok");
          }
        }
      );
    }
  );
});
app.get("/cikis-yap", (req, res) => {
  res.clearCookie("id");
  res.clearCookie("token");
  res.clearCookie("userId");
  res.clearCookie("connect.sid");
  res.redirect("/");
  res.end();
});
app.get("/soru-yap", (req, res) => {
  res.render(__dirname + "/src/pages/soruyap.ejs");
});
//Soru oluşturma
app.post("/soru-olustur", (req, res) => {
  var sorular = new Sorular({
    title: req.body.title,
    short: req.body.short,
    soru1: "false",
    soru2: "false",
    soru3: "false",
    soru4: "false",
    soru5: "false",
    soru6: "false",
    soru7: "false",
    soru8: "false",
    goruntulenme: 0,
    vote: "false",
    haha: 0,
    alkis: 0,
    dislike: 0,
    kizgin: 0,
  });
  sorular.save().then((result) => {
    res.redirect("/admin/dashboard");
  });
});
//Soru Sil
app.post("/soru-sil/:id", (req, res) => {
  const id = req.params.id;
  Sorular.findByIdAndDelete(id)
    .then((result) => {
      res.redirect("/admin/dashboard");
    })
    .catch((err) => {
      console.log(err);
    });
});
//Soru güncelleme
app.post("/soru-guncellestir/:id", (req, res) => {
  var id = req.params.id;
  var userId = req.cookies.id;
  Sorular.findById(id).then((result) => {
    Kullanicilar.findById(userId).then((kresult) => {
      res.render(__dirname + "/src/admin/edit-soru.ejs", {
        title: "Soru Düzenleme",
        soru: result,
        kullanici: kresult,
      });
    });
  });
});
app.post("/soru-guncelle/:id", (req, res) => {
  var id = req.params.id;
  Sorular.findByIdAndUpdate(id, {
    title: req.body.title,
    short: req.body.short,
    soru1: req.body.soru1,
    sik1: req.body.sik1,
    sik2: req.body.sik2,
    sik3: req.body.sik3,
    sik4: req.body.sik4,
    soru2: req.body.soru2,
    sik5: req.body.sik5,
    sik6: req.body.sik6,
    sik7: req.body.sik7,
    sik8: req.body.sik8,
    soru3: req.body.soru3,
    sik9: req.body.sik9,
    sik10: req.body.sik10,
    sik11: req.body.sik11,
    sik12: req.body.sik12,
    soru4: req.body.soru4,
    sik13: req.body.sik13,
    sik14: req.body.sik14,
    sik15: req.body.sik15,
    sik16: req.body.sik16,
    soru5: req.body.soru5,
    sik17: req.body.sik17,
    sik18: req.body.sik18,
    sik19: req.body.sik19,
    sik20: req.body.sik20,
    soru6: req.body.soru6,
    sik21: req.body.sik21,
    sik22: req.body.sik22,
    sik23: req.body.sik23,
    sik24: req.body.sik24,
    soru7: req.body.soru7,
    sik25: req.body.sik25,
    sik26: req.body.sik26,
    sik27: req.body.sik27,
    sik28: req.body.sik28,
    soru8: req.body.soru8,
    sik29: req.body.sik29,
    sik30: req.body.sik30,
    sik31: req.body.sik31,
    sik32: req.body.sik32,
    cevap1: req.body.cevap1,
    cevap2: req.body.cevap2,
    cevap3: req.body.cevap3,
    aciklama1: req.body.aciklama1,
    aciklama2: req.body.aciklama2,
    aciklama3: req.body.aciklama3,
  }).then((result) => {
    res.redirect("/admin/dashboard");
  });
});
//Oylar
//Olumlu
//Like ( Alkış )
app.post("/vote-like/:id", (req, res) => {
  var id = req.params.id;
  Sorular.findById(id).then((result) => {
    var like = Number(result.alkis);
    like++;
    Sorular.findByIdAndUpdate(id, { alkis: like }).then((gresult) => {
      res.redirect("/soru/" + id);
    });
  });
});
//HAHA
app.post("/vote-haha/:id", (req, res) => {
  var id = req.params.id;
  Sorular.findById(id).then((result) => {
    var haha = Number(result.haha);
    haha++;
    Sorular.findByIdAndUpdate(id, { haha: haha }).then((gresult) => {
      res.redirect("/soru/" + id);
    });
  });
});
//Olumsuz
app.post("/vote-dislike/:id", (req, res) => {
  var id = req.params.id;
  Sorular.findById(id).then((result) => {
    var dislike = Number(result.dislike);
    dislike++;
    Sorular.findByIdAndUpdate(id, { dislike: dislike }).then((gresult) => {
      res.redirect("/soru/" + id);
    });
  });
});
//HAHA
app.post("/vote-angry/:id", (req, res) => {
  var id = req.params.id;
  Sorular.findById(id).then((result) => {
    var kizgin = Number(result.kizgin);
    kizgin++;
    Sorular.findByIdAndUpdate(id, { kizgin: kizgin }).then((gresult) => {
      res.redirect("/soru/" + id);
    });
  });
});
//Yorum ekleme
app.post("/yorum-ekle/:id", (req, res) => {
  var id = req.params.id;
  Sorular.findById(id).then((result) => {
    Kullanicilar.findById(req.cookies.id).then((kresult) => {
      var yorum = new Soruyorum({
        kullanici_adi: kresult.kullanici_adi,
        soru: result.title,
        soruId: result._id,
        mesaj: req.body.yorum,
        like: 0,
      });
      yorum.save().then((yresult) => {
        res.redirect("/soru/" + id);
      });
    });
  });
});
app.post("/like-comment/:id", (req, res) => {
  Soruyorum.findById(req.params.id).then((result) => {
    Sorular.findById({ _id: result.soruId }).then((sresult) => {
      var like = result.like;
      like++;
      Soruyorum.findByIdAndUpdate(req.params.id, {
        like: like,
      }).then((ssresult) => {
        res.redirect("/soru/" + sresult._id);
      });
    });
  });
});
