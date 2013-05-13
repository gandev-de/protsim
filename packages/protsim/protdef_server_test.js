var dgram = Npm.require("dgram");

PubMock = function () {
	this.activities = [];
};

PubMock.prototype = {
  constructor: PubMock,

  added: function (name, id) {
    this.activities.push({type: 'added', collection: name, id: id});
  },

  changed: function (name, id, tel) {
    this.activities.push({type: 'changed', collection: name, id: id, content: tel});
  },

  removed: function (name, id) {
    this.activities.push({type: 'removed', collection: name, id: id});
  },

  ready: function() {
    this.activities.push({type: 'ready'});
  },

  onStop: function (cb) {
    this._onStop = cb;
  },

  stop: function () {
    if(this._onStop()) this._onStop();
  }
};

var udpSend = function(send) {
	var udp = dgram.createSocket("udp4");

	var tb = new Buffer(send.length);

	tb.write(send, "utf-8");
	udp.sendto(tb, 0, send.length, 22000, "127.0.0.1");

	console.log("sended: " + tb.toString());
};

Tinytest.add("protdef - setup and change mocked sub", function (test) {
	console.log("protdef server tests started");

	//create sample Protocol definition
	var protocol = new Protocol();
	//DEBUG - console.log(protocol);

  var self = new PubMock();
  var watch_id = "w1";

	//setup the watch
	var watch = new ProtocolWatch(protocol, watch_id, self);
  watch.createConnection();
  //DEBUG - console.log(watch.connection);

  //initialize subscription
  watch.setupWatch();

  //test data for subscription change
  var testBuffer = new Buffer(5);
  testBuffer.write("12345");
  watch.changeSubscription(testBuffer); // manually

  //simulate udp telegram and subscription change
  udpSend("54321");
  udpSend("tests");

  //wait until subscription methods are called
  Meteor.setTimeout(function() {
    self.activities.forEach(function (activity) {
      console.log(activity);
    });
	}, 1000);

  test.length(self.activities, 3);
});