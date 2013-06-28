Protocol = function(options) {
  options = options || {};
  this._id = options._id;
  this.name = options.name || "udp1";
  this.interface = options.interface || new Interface();
  this.telegrams = options.telegrams || [new Telegram()];
  this.test_responses = options.test_responses || [];
  //test conversation data
  this.conversation = [{
    from: {x: 50, y: 50},
    to: {x: 300, y: 50},
    idx: 0
  },{
    from: {x: 300, y: 50},
    to: {x: 50, y: 200},
    idx: 1
  }];
};

Protocol.fromJSONValue = function(value) {
  return new Protocol({
    _id: value._id,
    name: value.name,
    interface: EJSON.fromJSONValue(value.interface),
    telegrams: EJSON.fromJSONValue(value.telegrams),
    test_responses: value.test_responses
  });
};

Protocol.prototype = {
  constructor: Protocol,

  findTelegramById: function(telegram_id) {
    var protocol = this;
    var telegrams = protocol.telegrams;
    var telegram = _.find(telegrams, function(tel) {
      return tel._id === telegram_id;
    });
    return telegram || new Telegram();
  },

  typeName: function() {
    return "Protocol";
  },

  equals: function(other) {
    return this._id == other._id &&
      this.name == other.name &&
      this.interface.equals(other.interface) &&
      _.isEqual(this.telegrams, other.telegrams) &&
      _.isEqual(this.test_responses, other.test_responses);
  },

  clone: function() {
    return new Protocol({
      _id: this._id,
      name: this.name,
      interface: this.interface,
      telegrams: this.telegrams,
      test_responses: this.test_responses
    });
  },

  toJSONValue: function() {
    return {
      _id: this._id,
      name: this.name,
      interface: EJSON.toJSONValue(this.interface),
      telegrams: EJSON.toJSONValue(this.telegrams),
      test_responses: this.test_responses
    };
  }
};

EJSON.addType("Protocol", Protocol.fromJSONValue);

if(Meteor.isServer) {
  _.extend(Protocol.prototype, {
      findTelegramByMessage: function(msg) {
        var protocol = this;
        var telegrams = protocol.telegrams;
        var telegram = _.find(telegrams, function(telegram) {
          var telegram_identifier = [];
          var values_expected = {};
          _.each(telegram.values, function(value) {
            if(value.ident_val && value.identifier) {
              telegram_identifier.push(value);
              values_expected[value.offset] = value.identifier;
            }
          });
          if(telegram_identifier.length === 0) return false;

          var values_received = {};
          _.each(telegram_identifier, function(value) {
            values_received[value.offset] = telegram.valueFromBuffer(msg, value);
          });

          return _.isEqual(values_expected, values_received);
        });
        return telegram || new Telegram();
      }
  });
}