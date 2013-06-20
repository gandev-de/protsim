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

Tinytest.add("protwatch - setup and change mocked sub", function (test) {

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

Tinytest.add("protwatch - convert telegram to buffer and backwards", function (test) {
  //create sample Telegram definition
  var telegram = new Telegram();
  telegram.values[0].current = "12345";
  telegram.values[0].count = 5;
  telegram.values.push({count: 5, type: "UInt8", name: "test", current: "1#2#3#4#5", offset: "5"});

  var values_to_buffer = telegram.convertToBuffer();
  var values_from_buffer = telegram.convertFromBuffer(values_to_buffer);

  test.equal(values_from_buffer[0].current, telegram.values[0].current);
  test.equal(values_from_buffer[1].current, telegram.values[1].current);
});

Tinytest.add("protwatch - protocol find telegram by message", function (test) {
  //create sample Telegram definition
  var telegram = new Telegram();
  telegram.values[0].current = "12345";
  telegram.values[0].count = 5;
  telegram.values.push({count: 5, type: "UInt8", name: "test", current: "1#2#3#4#5", offset: "5"});

  var values_to_buffer = telegram.convertToBuffer();
  var values_from_buffer = telegram.convertFromBuffer(values_to_buffer);

  test.equal(values_from_buffer[0].current, telegram.values[0].current);
  test.equal(values_from_buffer[1].current, telegram.values[1].current);
});