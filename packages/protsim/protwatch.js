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

var watchs = {};

ProtocolWatch = function(protocol, watch_id, pub) {
  this.protocol = protocol;
  this.watch_id = watch_id || "w1";
  this.pub = pub;
  this.telegram_counter = 0;
};

ProtocolWatch.prototype.changeSubscription = function(msg) {
  var self = this;
  //identify telegram type
  var telegram = identifyTelegram(msg, self.protocol.telegrams);
  if(telegram instanceof Telegram) {
    telegram.values = telegram.convertFromBuffer(msg);
    //change subscription
    self.pub.changed("protwatch", self.watch_id,
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
  //initialize subscription
  self.pub.added("protwatch", self.watch_id);
  self.pub.ready();
};

//**********************************************************************************

//Receive

//publish watch changes
Meteor.publish("protwatch", function(watch_id, protocol) {
  var self = this;

  if(!protocol) return;

  var new_watch = true;
  var watch;
  if(watchs[watch_id]) {
    new_watch = false;
    watch = watchs[watch_id];
    watch.pub = self; //set current subscription handle
  }

  var init_watch = function () {
    watch = new ProtocolWatch(protocol, watch_id, self);
    watch.createConnection();
    watchs[watch_id] = watch;
  };

  if(new_watch) {
    init_watch();
  } else if(!_.isEqual(watch.protocol.interface, protocol.interface)) {
    watch.closeConnection();
    init_watch();
  }

  watch.setupWatch();

  console.log("subscription status: " + new_watch);

  this.onStop(function () {
    console.log("subscription stopped");
  });
});

//**********************************************************************************

//Send

var sendMessage = function (watch_id, msg) {
  var watch = watchs[watch_id];
  if(watch.protocol.interface && watch.connection) {
    var transport = watch.protocol.interface.transport;
    switch(transport.type) {
      case "udp":
        var udp = watch.connection;
        udp.sendto(msg, 0, msg.length, transport.remote_port, transport.remote_ip);
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
  }
});