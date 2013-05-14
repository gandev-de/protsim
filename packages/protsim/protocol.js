Protocol = function (options) {
	options = options || {};
  this._id = options._id;
	this.name = options.name || "udp1";
	this.interface = options.interface || new Interface();
	this.telegrams = options.telegrams || [new Telegram()];
	this.test_responses = options.test_responses || [];
};

Protocol.fromJSONValue = function (value) {
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

  typeName: function () {
    return "Protocol";
  },

  equals: function (other) {
    return this._id == other._id &&
      this.name == other.name &&
      this.interface.equals(other.interface) &&
      _.isEqual(this.telegrams, other.telegrams) &&
      _.isEqual(this.test_responses, other.test_responses);
  },

  clone: function () {
    return new Protocol({
      _id: this._id,
      name: this.name,
      interface: this.interface,
      telegrams: this.telegrams,
      test_responses: this.test_responses
    });
  },

  toJSONValue: function () {
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