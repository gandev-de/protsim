if(Meteor.isClient) {
  Protwatch = new Meteor.Collection("protwatch", {
    transform: function (coll) {
      if(coll && coll.value)
        coll.value = EJSON.parse(coll.value);
      return coll;
    }
  });

  Meteor.subscribe("protwatch");
}

if(Meteor.isServer) {
  var dgram = Npm.require("dgram");
  var util = Npm.require('util');

  var identifyTelegram = function(msg, telegrams) {
    var telegram;
    for(var i = 0; i < telegrams.length; i++) {
      //TODO select telegram by telegram identifier
      telegram = telegrams[i];
    }
    return telegram;
  };

  var watchs = {pub: undefined};

  ProtocolWatch = function(protocol, watch_id) {
    this.protocol = protocol;
    this.watch_id = watch_id || "w1";
    this.telegram_counter = 0;
  };

  ProtocolWatch.prototype.changeSubscription = function(msg) {
    var self = this;
    //identify telegram type
    var telegram = identifyTelegram(msg, self.protocol.telegrams);
    if(telegram instanceof Telegram) {
      telegram.values = telegram.convertFromBuffer(msg);
      //change subscription
      watchs.pub.changed("protwatch", self.watch_id,
        {count: ++self.telegram_counter, value: EJSON.stringify(telegram)});
    }
  };

  ProtocolWatch.prototype.createConnection = function() {
    var self = this;
    var transport = self.protocol.interface.transport;
    console.log("create connection type: " + transport.type);
    switch(transport.type) {
      case "udp":
        var udp = dgram.createSocket("udp4");
        udp.bind(transport.local_port, transport.local_ip);
        udp.on("message", function(msg, rinfo) {
          console.log("message received: " + msg.toString());
          self.changeSubscription(msg);
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
    switch(transport.type) {
      case "udp":
        var udp = self.connection;
        if(udp && udp._bound) udp.close();
        break;
      default:
         //TODO
    }
  };

  ProtocolWatch.prototype.setupWatch = function() {
    var self = this;
    //add new watch to subscription
    watchs.pub.added("protwatch", self.watch_id);
  };

  //**********************************************************************************

  //Receive

  var add_watch = function (watch_id, protocol) {
    var new_watch = true;
    var watch;
    if(watchs[watch_id]) {
      new_watch = false;
      watch = watchs[watch_id];
    }

    var init_watch = function () {
      watch = new ProtocolWatch(protocol, watch_id);
      watch.createConnection();
      watchs[watch_id] = watch;
    };

    if(new_watch) {
      init_watch();
      watch.setupWatch();
    } else if(!_.isEqual(watch.protocol.interface, protocol.interface)) {
      watch.closeConnection();
      init_watch();
    }
  };

  //publish watch changes
  Meteor.publish("protwatch", function() {
    var self = this;

    watchs.pub = self;

    self.ready();

    console.log("subscription started..");

    this.onStop(function () {
      console.log("subscription stopped..");
      //TODO close watchs or something
    });
  });

  //**********************************************************************************

  //Send

  var sendMessage = function (watch_id, msg) {
    var watch = watchs[watch_id];
    if(watch.protocol && watch.protocol.interface && watch.connection) {
      var transport = watch.protocol.interface.transport;
      switch(transport.type) {
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
    sendTelegram: function (watch_id, telegram) {
      sendMessage(watch_id, telegram.convertToBuffer());
    },

    addWatch: function (watch_id, protocol) {
      if(protocol)
        add_watch(watch_id, protocol);
    }
  });
}