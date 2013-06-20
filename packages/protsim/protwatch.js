if (Meteor.isClient) {
  Protwatch = new Meteor.Collection("protwatch", {
    transform: function(coll) {
      if (coll && coll.value)
        coll.value = EJSON.parse(coll.value);
      return coll;
    }
  });

  //Deps.autorun(function() {
  Meteor.subscribe("protwatch");
  //});
}

if (Meteor.isServer) {
  var dgram = Npm.require("dgram");
  var util = Npm.require('util');

  var watchs = {
    pub: undefined
  };

  ProtocolWatch = function(pub, protocol, watch_id) {
    this.pub = pub;
    this.protocol = protocol;
    this.watch_id = watch_id || protocol._id;
    this.telegram_counter = 0;
  };

  ProtocolWatch.prototype.new_telegram = function(msg) {
    var self = this;
    //identify telegram type
    var telegram = self.protocol.findTelegramByMessage(msg);
    if (telegram instanceof Telegram) {
      telegram.values = telegram.convertFromBuffer(msg);
      console.log("change..sub: ", self.pub._session.id);
      //change subscription
      self.pub.changed("protwatch", self.watch_id, {
        count: ++self.telegram_counter,
        raw: msg.toString(),
        value: EJSON.stringify(telegram)
      });
      //save last telegram for new subscriptions
      self.last_telegram = telegram;
    }
  };

  ProtocolWatch.prototype.createConnection = function() {
    var self = this;
    var transport = self.protocol.interface.transport;
    console.log("create connection type: " + transport.type);
    switch (transport.type) {
      case "udp":
        var udp = dgram.createSocket("udp4");
        udp.bind(transport.local_port, transport.local_ip);
        udp.on("message", function(msg, rinfo) {
          console.log("udp message received: " + msg.toString());
          self.new_telegram(msg);
        });
        self.connection = udp;
        break;
      default:
        //TODO
    }
  };

  ProtocolWatch.prototype.closeConnection = function() {
    var self = this;
    var transport = self.protocol.interface.transport;
    console.log("close connection type: " + transport.type);
    switch (transport.type) {
      case "udp":
        var udp = self.connection;
        if (udp && udp._bound) udp.close();
        break;
      default:
        //TODO
    }
  };

  ProtocolWatch.prototype.publish = function() {
    var self = this;
    console.log("initial publish..sub: ", self.pub._session.id);

    //add new watch to subscription
    self.pub.added("protwatch", self.watch_id, self.last_telegram);
    self.pub.ready();
  };

  ProtocolWatch.prototype.stopWatch = function() {
    var self = this;
    console.log("stop watch..sub: ", self.pub._session.id);

    self.closeConnection();
    //remove watch from subscription
    self.pub.removed("protwatch", self.watch_id);
  };

  //**********************************************************************************

  //Receive

  var start_watch = function(watch_id, protocol) {
    console.log("start watch..id: ", watch_id, "..sub:", watchs.pub._session.id);

    var new_watch = true;
    var watch;
    if (watchs[watch_id]) {
      new_watch = false;
      watch = watchs[watch_id];
    }

    var init_watch = function() {
      watch = new ProtocolWatch(watchs.pub, protocol, watch_id);
      watch.createConnection();
    };

    if (new_watch) {
      init_watch();
      watch.publish();
    }

    watchs[watch_id] = watch;
  };

  var end_watch = function(watch_id) {
    if (watchs[watch_id] instanceof ProtocolWatch) {
      watchs[watch_id].stopWatch();
    }
    delete watchs[watch_id];
  };

  //publish watch changes
  Meteor.publish("protwatch", function() {
    var self = this;

    if (watchs.pub) {
      watchs.pub.stop();
    }
    watchs.pub = self;

    for (var watch in watchs) {
      if (watchs[watch] instanceof ProtocolWatch) {
        watchs[watch].pub = self;
        watchs[watch].publish();
      }
    }

    self.onStop(function() {
      console.log("subscription stopped..sub: ", self._session.id);
    });
    console.log("subscription started..sub: ", self._session.id);
  });

  //**********************************************************************************

  //Send

  var sendMessage = function(watch_id, msg) {
    var watch = watchs[watch_id];
    if (watch.protocol && watch.protocol.interface && watch.connection) {
      var transport = watch.protocol.interface.transport;
      switch (transport.type) {
        case "udp":
          var udp = watch.connection;
          udp.send(msg, 0, msg.length, transport.remote_port, transport.remote_ip);
          console.log("message sended: " + msg.toString());
          break;
        default:
          //TODO
      }
    }
  };

  Meteor.methods({
    sendTelegram: function(watch_id, telegram, options) {
      options = options || {};
      var count = options.count || 1;
      if (telegram instanceof Telegram) {
        sendMessage(watch_id, telegram.convertToBuffer());
      } else {
        if (count > 0 && count <= 1000) {
          for (var i = 0; i < count; i++) {
            sendMessage(watch_id, new Buffer(telegram));
          }
        }
      }
    },

    startWatch: function(watch_id, protocol) {
      if (protocol instanceof Protocol) {
        start_watch(watch_id, protocol);
      }
    },

    endWatch: function(watch_id) {
      end_watch(watch_id);
    }
  });
}